import { Hono } from 'hono';
import { IStorageAdapter, MemoryStorageAdapter, CloudflareR2StorageAdapter, normalizeEtag } from '../storage/r2StorageAdapter';
import { CloudflareD1StorageAdapter, D1Database } from '../storage/d1StorageAdapter';
import { ContentStore, ValidationError, NotFoundError, ConcurrencyError } from '../storage/contentStore';
import { ContentMutationService } from '../services/contentMutationService';
import { validateAccessJwt, AccessAuthConfig, AccessJwtPayload } from '../auth/accessJwtValidator';
import { WebAuthnStore } from '../auth/webauthnStore';
import { WebAuthnService } from '../auth/webauthnService';
import { verifySession, buildSessionCookie, buildClearSessionCookies } from '../auth/sessionCookie';
import { SessionPayload } from '../auth/webauthnTypes';
import {
  validateProfilePhoto,
  validateResumePdf,
  generateAvatarKey,
  getActiveResumeKey,
  generateArchivedResumeKey,
} from '../storage/mediaValidator';
import { MediaAsset, Resume } from '../types/portfolio';
import {
  generateRouteSeo,
  generateSitemapXml,
  generateRobotsTxt,
  generateJsonLd,
  injectSeoMetadata,
} from '../services/seoService';
import { sendContactInquiry, checkRateLimit, WorkerRateLimiterBinding } from '../services/contactService';

export interface WorkerBindings {
  ASSETS?: { fetch: (request: Request) => Promise<Response> };
  DB?: D1Database;
  PORTFOLIO_BUCKET?: unknown;
  ENVIRONMENT?: string;
  PUBLIC_DOMAIN?: string;
  ADMIN_API_SECRET?: string;
  ADMIN_SESSION_SECRET?: string;
  ADMIN_ENROLLMENT_TOKEN?: string;
  CF_ACCESS_TEAM_DOMAIN?: string;
  CF_ACCESS_AUD?: string;
  CF_ACCESS_OWNER_EMAIL?: string;
  CF_ACCESS_SECRET?: string;
  // Contact & Resend Email Integrations
  RESEND_API_KEY?: string;
  RESEND_FROM_EMAIL?: string;
  CONTACT_DELIVERY_EMAIL?: string;
  // Optional Cloudflare Native Rate Limiting Binding
  RATE_LIMITER?: WorkerRateLimiterBinding;
}

export interface AuthContextVariables {
  user?: AccessJwtPayload;
  session?: SessionPayload;
}

export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

/**
 * Validates production session secret against length, entropy, and known insecure placeholders.
 * Never logs or reveals the secret value.
 */
export function validateProductionSessionSecret(secret: string | undefined, adminApiSecret?: string): string {
  if (!secret || typeof secret !== 'string' || secret.trim().length === 0) {
    throw new ConfigurationError(
      "Missing required 'ADMIN_SESSION_SECRET' in production environment. A high-entropy secret of at least 32 characters is required."
    );
  }

  const trimmed = secret.trim();

  if (trimmed.length < 32) {
    throw new ConfigurationError(
      `Insecure 'ADMIN_SESSION_SECRET' in production: secret length (${trimmed.length}) is below the required 32-character minimum.`
    );
  }

  const lower = trimmed.toLowerCase();
  const knownInsecurePatterns = [
    'dev-',
    'development',
    'fallback',
    'placeholder',
    'example',
    'changeme',
    'change-me',
    'change_me',
    'password123',
    'default-secret',
  ];

  for (const pattern of knownInsecurePatterns) {
    if (lower.includes(pattern)) {
      throw new ConfigurationError(
        `Insecure 'ADMIN_SESSION_SECRET' in production: secret contains prohibited placeholder pattern '${pattern}'.`
      );
    }
  }

  if (adminApiSecret && trimmed === adminApiSecret.trim()) {
    throw new ConfigurationError(
      "Insecure 'ADMIN_SESSION_SECRET' in production: session secret must not match ADMIN_API_SECRET."
    );
  }

  // Check unique character variety (entropy check)
  const uniqueChars = new Set(trimmed.split('')).size;
  if (uniqueChars < 10) {
    throw new ConfigurationError(
      "Insecure 'ADMIN_SESSION_SECRET' in production: secret lacks sufficient character entropy (less than 10 unique characters)."
    );
  }

  return trimmed;
}

/**
 * Validates production enrollment token against length, pattern, and development secret reuse.
 * Never logs or reveals the token value.
 */
export function validateProductionEnrollmentToken(token: string | undefined, adminApiSecret?: string): string {
  if (!token || typeof token !== 'string' || token.trim().length === 0) {
    throw new ConfigurationError(
      "Missing required 'ADMIN_ENROLLMENT_TOKEN' in production environment. A secure enrollment token is required for initial setup."
    );
  }

  const trimmed = token.trim();
  if (trimmed.length < 16) {
    throw new ConfigurationError(
      `Insecure 'ADMIN_ENROLLMENT_TOKEN' in production: token length (${trimmed.length}) is below the required 16-character minimum.`
    );
  }

  const lower = trimmed.toLowerCase();
  const knownInsecurePatterns = [
    'dev-',
    'development',
    'placeholder',
    'example',
    'changeme',
    'change-me',
    'change_me',
    'default',
  ];

  for (const pattern of knownInsecurePatterns) {
    if (lower.includes(pattern)) {
      throw new ConfigurationError(
        `Insecure 'ADMIN_ENROLLMENT_TOKEN' in production: token contains prohibited placeholder pattern '${pattern}'.`
      );
    }
  }

  if (adminApiSecret && trimmed === adminApiSecret.trim()) {
    throw new ConfigurationError(
      "Insecure 'ADMIN_ENROLLMENT_TOKEN' in production: enrollment token must not match ADMIN_API_SECRET."
    );
  }

  return trimmed;
}

/**
 * Creates and configures the Hono application with full public and admin routes.
 * Supports passing a custom storage adapter (e.g., MemoryStorageAdapter for testing).
 */
export function createPortfolioApp(customAdapter?: IStorageAdapter) {
  const app = new Hono<{ Bindings: WorkerBindings; Variables: AuthContextVariables }>();

  // Global structured error handler
  app.onError((err, c) => {
    return handleApiError(c, err);
  });

  // Lazy-initialize or get storage adapter per request
  const getServices = (c: { env: WorkerBindings }) => {
    const isProduction = c.env?.ENVIRONMENT === 'production';

    let adapter: IStorageAdapter;
    if (customAdapter) {
      adapter = customAdapter;
    } else if (c.env?.DB) {
      adapter = new CloudflareD1StorageAdapter(c.env.DB);
    } else if (!isProduction && c.env?.PORTFOLIO_BUCKET) {
      adapter = new CloudflareR2StorageAdapter(c.env.PORTFOLIO_BUCKET);
    } else if (!isProduction) {
      // Default fallback memory adapter for non-production environments
      if (!globalThis.__portfolio_memory_adapter) {
        globalThis.__portfolio_memory_adapter = new MemoryStorageAdapter();
      }
      adapter = globalThis.__portfolio_memory_adapter;
    } else {
      throw new ConfigurationError(
        "Missing required Cloudflare D1 database binding 'DB' in production environment. Falling back to R2 or in-memory storage is strictly prohibited."
      );
    }

    const store = new ContentStore(adapter);
    const mutations = new ContentMutationService(store);
    const webauthnStore = new WebAuthnStore(adapter);

    let sessionSecret: string;
    if (isProduction) {
      sessionSecret = validateProductionSessionSecret(c.env?.ADMIN_SESSION_SECRET, c.env?.ADMIN_API_SECRET);
    } else {
      sessionSecret =
        c.env?.ADMIN_SESSION_SECRET ||
        (typeof process !== 'undefined' ? process.env?.ADMIN_SESSION_SECRET : undefined) ||
        c.env?.ADMIN_API_SECRET ||
        (typeof process !== 'undefined' ? process.env?.ADMIN_API_SECRET : undefined) ||
        'dev-fallback-session-secret-min-32-chars-long!';
    }

    const ownerEmail = c.env?.CF_ACCESS_OWNER_EMAIL || 'dasariravid145@gmail.com';
    const webauthnService = new WebAuthnService(webauthnStore, sessionSecret, ownerEmail);

    return { adapter, store, mutations, webauthnStore, webauthnService, sessionSecret, ownerEmail };
  };

  // Helper to parse cookies from Cookie header
  const parseCookies = (cookieHeader?: string): Record<string, string> => {
    if (!cookieHeader) return {};
    const cookies: Record<string, string> = {};
    cookieHeader.split(';').forEach((part) => {
      const [key, ...vals] = part.trim().split('=');
      if (key) {
        cookies[key.trim()] = decodeURIComponent(vals.join('=').trim());
      }
    });
    return cookies;
  };

  // Helper to validate CSRF headers on mutating requests
  const validateCsrf = (
    req: {
      method: string;
      url: string;
      header: (name: string) => string | undefined;
    },
    env?: WorkerBindings
  ): { valid: boolean; reason?: string } => {
    const method = req.method.toUpperCase();
    if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
      return { valid: true };
    }

    // 1. Sec-Fetch-Site check
    const secFetchSite = req.header('sec-fetch-site') || req.header('Sec-Fetch-Site');
    if (secFetchSite && secFetchSite.toLowerCase() === 'cross-site') {
      return { valid: false, reason: 'Cross-site request blocked by CSRF defense' };
    }

    // 2. Origin check (if present)
    const originHeader = req.header('origin') || req.header('Origin');
    if (originHeader) {
      try {
        const originUrl = new URL(originHeader);
        const originHost = originUrl.hostname.toLowerCase();
        const isLocal = originHost === 'localhost' || originHost === '127.0.0.1';
        const configuredDomain = (env?.PUBLIC_DOMAIN || 'ravi-portfolio.dsecops88.online')
          .toLowerCase()
          .replace(/^https?:\/\//, '')
          .split(':')[0];

        if (!isLocal && originHost !== configuredDomain && !originHost.endsWith(`.${configuredDomain}`)) {
          return { valid: false, reason: `Origin ${originHeader} is not permitted` };
        }
      } catch {
        return { valid: false, reason: 'Malformed Origin header' };
      }
    }

    return { valid: true };
  };

  // Cookie helpers for session management
  const setSessionCookie = (c: any, token: string) => {
    const isSecure = c.req.url.startsWith('https://') || c.env?.ENVIRONMENT === 'production';
    const cookie = buildSessionCookie(token, isSecure);
    c.header('Set-Cookie', cookie.cookieString);
  };

  const clearSessionCookies = (c: any) => {
    const isSecure = c.req.url.startsWith('https://') || c.env?.ENVIRONMENT === 'production';
    const clearList = buildClearSessionCookies(isSecure);
    clearList.push('CF_Authorization=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict');
    for (const str of clearList) {
      c.header('Set-Cookie', str, { append: true });
    }
  };

  // Helper to extract ETag header from request with RFC 7232 weak/strong normalization
  const getIfMatchHeader = (req: { header: (name: string) => string | undefined }): string | undefined => {
    const raw = req.header('if-match') || req.header('If-Match');
    return normalizeEtag(raw);
  };

  // Helper to parse JSON body safely with malformed JSON detection
  const parseJsonBody = async <T>(req: { json: () => Promise<T> }): Promise<
    { data: T; errorResponse?: undefined } | { data?: undefined; errorResponse: Response }
  > => {
    try {
      const data = await req.json();
      return { data };
    } catch {
      return {
        errorResponse: new Response(
          JSON.stringify({ success: false, error: 'Malformed JSON payload', code: 'BAD_REQUEST' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        ),
      };
    }
  };

  // Helper to extract binary payload from multipart/form-data or direct binary request body
  const parseBinaryUpload = async (
    req: {
      header: (name: string) => string | undefined;
      formData?: () => Promise<FormData>;
      arrayBuffer: () => Promise<ArrayBuffer>;
    }
  ): Promise<{ buffer: ArrayBuffer; mimeType: string; filename?: string }> => {
    const contentType = req.header('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData!();
      const file = formData.get('file');

      if (file && typeof file === 'object' && 'arrayBuffer' in file) {
        const uploadedFile = file as File;
        const buffer = await uploadedFile.arrayBuffer();
        const mimeType = uploadedFile.type || 'application/octet-stream';
        return { buffer, mimeType, filename: uploadedFile.name };
      }
    }

    // Direct binary body
    const buffer = await req.arrayBuffer();
    const declaredMime = contentType.split(';')[0].trim() || 'application/octet-stream';
    const filename = req.header('x-filename') || undefined;
    return { buffer, mimeType: declaredMime, filename };
  };

  // ==========================================
  // GLOBAL SECURITY & PERFORMANCE MIDDLEWARES
  // ==========================================

  // 1. Global Security Headers & Admin Cache-Control
  app.use('*', async (c, next) => {
    await next();

    // Standard defense-in-depth headers on all responses
    c.header('X-Content-Type-Options', 'nosniff');
    c.header('X-Frame-Options', 'DENY');
    c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    c.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
    c.header('Access-Control-Expose-Headers', 'ETag, Content-Type, Content-Length');
    c.header(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https: blob:; connect-src 'self'; frame-ancestors 'none';"
    );

    // HSTS enforcement for HTTPS/production
    if (c.env?.ENVIRONMENT === 'production' || c.req.url.startsWith('https://')) {
      c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    }

    // Cache-Control: Private admin responses must NEVER be cached publicly or privately
    if (c.req.path.startsWith('/api/admin/')) {
      c.header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
      c.header('Pragma', 'no-cache');
    }
  });

  // 2. Request Payload Size Limiting (2 MB JSON, 12 MB binary uploads)
  app.use('*', async (c, next) => {
    const contentLength = c.req.header('content-length');
    if (contentLength) {
      const bytes = parseInt(contentLength, 10);
      const isUpload =
        c.req.path.includes('/photo') ||
        c.req.path.includes('/upload') ||
        c.req.path.includes('/resume');
      const maxLimit = isUpload ? 12 * 1024 * 1024 : 2 * 1024 * 1024;

      if (!isNaN(bytes) && bytes > maxLimit) {
        return c.json(
          {
            success: false,
            error: `Payload exceeds maximum permitted size of ${(maxLimit / (1024 * 1024)).toFixed(0)} MB.`,
            code: 'PAYLOAD_TOO_LARGE',
          },
          413
        );
      }
    }
    await next();
  });

  // 3. Sliding-Window Rate Limiter
  const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

  app.use('*', async (c, next) => {
    const isTest =
      c.env?.ENVIRONMENT === 'test' ||
      (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test');

    const clientIp =
      c.req.header('cf-connecting-ip') ||
      c.req.header('x-forwarded-for')?.split(',')[0].trim() ||
      '127.0.0.1';

    const isAdminMutation =
      c.req.path.startsWith('/api/admin/') &&
      ['POST', 'PUT', 'DELETE', 'PATCH'].includes(c.req.method.toUpperCase());

    // In test environment: default to 5000 unless overridden by test header x-test-rate-limit
    const limitHeader = c.req.header('x-test-rate-limit');
    const limit = limitHeader
      ? parseInt(limitHeader, 10)
      : isTest
        ? 5000
        : isAdminMutation
          ? 30
          : 150;

    const windowMs = 60 * 1000;
    const now = Date.now();
    const key = `${clientIp}:${isAdminMutation ? 'mutation' : 'general'}`;

    let record = rateLimitMap.get(key);
    if (!record || now > record.resetTime) {
      record = { count: 1, resetTime: now + windowMs };
      rateLimitMap.set(key, record);
    } else {
      record.count += 1;
    }

    c.header('X-RateLimit-Limit', limit.toString());
    c.header('X-RateLimit-Remaining', Math.max(0, limit - record.count).toString());
    c.header('X-RateLimit-Reset', Math.ceil(record.resetTime / 1000).toString());

    if (record.count > limit) {
      c.header('Retry-After', '60');
      return c.json(
        {
          success: false,
          error: 'Rate limit exceeded. Please slow down and try again later.',
          code: 'RATE_LIMIT_EXCEEDED',
        },
        429
      );
    }

    await next();
  });

  // ==========================================
  // HEALTH & SYSTEM CHECKS
  // ==========================================
  app.get('/api/health', (c) => {
    return c.json({
      status: 'healthy',
      runtime: 'Cloudflare Worker (Hono)',
      environment: c.env?.ENVIRONMENT || 'development',
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/api/public/version', (c) => {
    return c.json({
      version: '1.0.0',
      phase: 'Prompt 08 Profile Photo and Resume Management',
    });
  });

  // ==========================================
  // PUBLIC SEO & CRAWLER-VISIBLE METADATA
  // ==========================================

  const getSeoOrigin = (c: any): string => {
    if (c.env?.PUBLIC_DOMAIN) {
      const pubDomain = c.env.PUBLIC_DOMAIN;
      if (pubDomain.startsWith('http://') || pubDomain.startsWith('https://')) {
        return pubDomain;
      }
      if (pubDomain.includes('localhost') || pubDomain.includes('127.0.0.1')) {
        return `http://${pubDomain}`;
      }
      return `https://${pubDomain}`;
    }
    try {
      const u = new URL(c.req.url);
      if (!u.hostname || u.hostname === 'localhost' || u.hostname === '127.0.0.1') {
        return 'https://ravi-portfolio.dsecops88.online';
      }
      return u.origin;
    } catch {
      return 'https://ravi-portfolio.dsecops88.online';
    }
  };

  const handleHtmlSeoRoute = async (c: any) => {
    const { store } = getServices(c);
    const origin = getSeoOrigin(c);
    const pathname = new URL(c.req.url).pathname;
    const [seo, jsonLd] = await Promise.all([
      generateRouteSeo(pathname, store, origin),
      generateJsonLd(pathname, store, origin),
    ]);

    let baseHtml = `<!DOCTYPE html>
<html lang="en" class="light">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Ravi Dasari — DevOps Engineer</title>
    <meta name="description" content="Portfolio of Ravi Dasari, DevOps Engineer with 6.6 years of IT experience across AWS cloud infrastructure, Terraform, Docker, Kubernetes, CI/CD pipelines, and Java backend development." />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  </head>
  <body class="bg-white text-slate-700 antialiased min-h-screen">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`;

    if (c.env?.ASSETS) {
      try {
        const assetReq = new Request(new URL('/', c.req.url), { method: 'GET' });
        const assetRes = await c.env.ASSETS.fetch(assetReq);
        if (assetRes.ok) {
          baseHtml = await assetRes.text();
        }
      } catch {
        // fallback to baseHtml
      }
    }

    const renderedHtml = injectSeoMetadata(baseHtml, seo, jsonLd);
    c.header('Content-Type', 'text/html; charset=utf-8');
    c.header('Cache-Control', 'public, max-age=60, s-maxage=600');
    return c.html(renderedHtml, 200);
  };

  // Dynamic XML Sitemap
  app.get('/sitemap.xml', async (c) => {
    const { store } = getServices(c);
    const origin = getSeoOrigin(c);
    const xml = await generateSitemapXml(store, origin);
    return c.body(xml, 200, {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
    });
  });

  // Robots.txt
  app.get('/robots.txt', (c) => {
    const origin = getSeoOrigin(c);
    const txt = generateRobotsTxt(origin);
    c.header('Content-Type', 'text/plain; charset=utf-8');
    c.header('Cache-Control', 'public, max-age=86400');
    return c.text(txt, 200);
  });

  // Crawler-Visible Server-Rendered HTML Routes (when Accept: text/html is requested)
  app.get('/', async (c, next) => {
    const accept = c.req.header('accept') || '';
    if (accept.includes('text/html')) {
      return handleHtmlSeoRoute(c);
    }
    return next();
  });

  app.get('/projects', async (c, next) => {
    const accept = c.req.header('accept') || '';
    if (accept.includes('text/html')) {
      return handleHtmlSeoRoute(c);
    }
    return next();
  });

  app.get('/projects/:slug', async (c, next) => {
    const accept = c.req.header('accept') || '';
    if (accept.includes('text/html')) {
      return handleHtmlSeoRoute(c);
    }
    return next();
  });

  app.get('/ai-solutions', async (c, next) => {
    const accept = c.req.header('accept') || '';
    if (accept.includes('text/html')) {
      return handleHtmlSeoRoute(c);
    }
    return next();
  });

  app.get('/ai-solutions/:slug', async (c, next) => {
    const accept = c.req.header('accept') || '';
    if (accept.includes('text/html')) {
      return handleHtmlSeoRoute(c);
    }
    return next();
  });

  // ==========================================
  // PUBLIC READ ENDPOINTS (Sub-15ms edge read)
  // ==========================================

  // Unified Portfolio Data
  app.get('/api/public/content', async (c) => {
    const { store } = getServices(c);
    const data = await store.getUnifiedPublicData();

    c.header('Cache-Control', 'public, max-age=120, s-maxage=86400, stale-while-revalidate=600');
    c.header('ETag', `w/"portfolio-v${data.version}"`);
    return c.json({
      success: true,
      data,
      cachedAt: new Date().toISOString(),
    });
  });

  // Profile
  app.get('/api/public/profile', async (c) => {
    const { store } = getServices(c);
    await store.ensureInitialized();
    const profile = await store.getProfile();
    if (profile?.etag) {
      c.header('ETag', profile.etag);
    }
    c.header('Cache-Control', 'public, max-age=60');
    return c.json({
      success: true,
      data: profile?.data,
    });
  });

  // Projects (Only published projects returned to public)
  app.get('/api/public/projects', async (c) => {
    const { store } = getServices(c);
    await store.ensureInitialized();
    const projectsObj = await store.getProjects();
    const published = (projectsObj?.data || [])
      .filter((p) => p.published === true)
      .sort((a, b) => a.displayOrder - b.displayOrder);

    return c.json({
      success: true,
      data: published,
    });
  });

  // Project by Slug (Strictly returns 404 if draft or non-existent)
  app.get('/api/public/projects/:slug', async (c) => {
    const { store } = getServices(c);
    await store.ensureInitialized();
    const slug = c.req.param('slug');
    const projectsObj = await store.getProjects();
    const project = (projectsObj?.data || []).find((p) => p.slug === slug);

    if (!project || project.published !== true) {
      return c.json(
        { success: false, error: `Project not found: ${slug}`, code: 'NOT_FOUND' },
        404
      );
    }

    const publicProject = {
      ...project,
      architectureDiagrams: (project.architectureDiagrams || []).filter((d) => d.published !== false),
    };

    return c.json({
      success: true,
      data: publicProject,
    });
  });

  // Skills & Categories
  app.get('/api/public/skills', async (c) => {
    const { store } = getServices(c);
    await store.ensureInitialized();
    const [skillsObj, categoriesObj] = await Promise.all([
      store.getSkills(),
      store.getSkillCategories(),
    ]);

    const rawCategories = categoriesObj?.data || [];
    const publishedCategories = rawCategories
      .filter((cat) => cat.published !== false)
      .sort((a, b) => a.order - b.order);
    const publishedCategoryIds = new Set(publishedCategories.map((cat) => cat.id));

    const rawSkills = skillsObj?.data || [];
    const publishedSkills = rawSkills
      .filter((s) => s.published !== false && publishedCategoryIds.has(s.categoryId))
      .sort((a, b) => a.order - b.order);

    return c.json({
      success: true,
      data: publishedSkills,
      categories: publishedCategories,
    });
  });

  // Experience
  app.get('/api/public/experience', async (c) => {
    const { store } = getServices(c);
    await store.ensureInitialized();
    const expObj = await store.getExperience();
    const published = (expObj?.data || [])
      .filter((e) => e.published === true)
      .sort((a, b) => a.order - b.order);
    return c.json({
      success: true,
      data: published,
    });
  });

  // Certifications
  app.get('/api/public/certifications', async (c) => {
    const { store } = getServices(c);
    await store.ensureInitialized();
    const certsObj = await store.getCertifications();
    const published = (certsObj?.data || [])
      .filter((cert) => cert.published === true)
      .sort((a, b) => a.order - b.order);
    return c.json({
      success: true,
      data: published,
    });
  });

  // Education
  app.get('/api/public/education', async (c) => {
    const { store } = getServices(c);
    await store.ensureInitialized();
    const eduObj = await store.getEducation();
    const published = (eduObj?.data || [])
      .filter((edu) => edu.published === true)
      .sort((a, b) => a.order - b.order);
    return c.json({
      success: true,
      data: published,
    });
  });

  // AI Services Public Endpoints
  app.get('/api/public/ai-services', async (c) => {
    const { store } = getServices(c);
    await store.ensureInitialized();
    const [aiObj, catsObj] = await Promise.all([
      store.getAIServices(),
      store.getAIServiceCategories(),
    ]);

    const rawCats = catsObj?.data || [];
    const publishedCats = rawCats
      .filter((cat) => cat.published !== false)
      .sort((a, b) => a.order - b.order);
    const publishedCatIds = new Set(publishedCats.map((cat) => cat.id));

    const rawServices = aiObj?.data || [];
    const publishedServices = rawServices
      .filter((s) => s.published === true && publishedCatIds.has(s.categoryId))
      .sort((a, b) => a.order - b.order);

    return c.json({
      success: true,
      data: publishedServices,
      categories: publishedCats,
    });
  });

  app.get('/api/public/ai-services/:slug', async (c) => {
    const { store } = getServices(c);
    const slug = c.req.param('slug').toLowerCase();
    await store.ensureInitialized();

    const [aiObj, catsObj, projectsObj] = await Promise.all([
      store.getAIServices(),
      store.getAIServiceCategories(),
      store.getProjects(),
    ]);

    const service = (aiObj?.data || []).find((s) => s.slug.toLowerCase() === slug);
    if (!service || service.published !== true) {
      return c.json({ success: false, error: 'AI service not found' }, 404);
    }

    // Verify category is not hidden
    const rawCats = catsObj?.data || [];
    const category = rawCats.find((cat) => cat.id === service.categoryId);
    if (category && category.published === false) {
      return c.json({ success: false, error: 'AI service not found' }, 404);
    }

    // Resolve related projects, strictly filtering out unpublished draft projects
    const allProjects = projectsObj?.data || [];
    const publishedProjects = allProjects.filter((p) => p.published === true);
    const relatedProjectIds = new Set(service.relatedProjectIds || []);
    const relatedProjects = publishedProjects
      .filter((p) => relatedProjectIds.has(p.id))
      .map((p) => ({
        id: p.id,
        title: p.title,
        slug: p.slug,
        summary: p.summary,
        category: p.category,
        deploymentStatus: p.deploymentStatus,
        coverImage: p.coverImage,
      }));

    return c.json({
      success: true,
      data: {
        ...service,
        relatedProjects,
      },
    });
  });

  // Site Settings
  app.get('/api/public/site-settings', async (c) => {
    const { store } = getServices(c);
    await store.ensureInitialized();
    const settingsObj = await store.getSettings();
    const raw = settingsObj?.data;
    // Strictly sanitize public site settings (no private credentials or tokens)
    const sanitized = raw
      ? {
          siteTitle: raw.siteTitle,
          metaDescription: raw.metaDescription,
          ogImage: raw.ogImage,
          contactEmail: raw.contactEmail,
          footerText: raw.footerText,
          turnstileSiteKey: raw.turnstileSiteKey,
          analyticsEnabled: raw.analyticsEnabled,
          keywords: raw.keywords,
          seoAuthor: raw.seoAuthor,
        }
      : null;
    return c.json({
      success: true,
      data: sanitized,
    });
  });

  // Resume Info (Public summary)
  app.get('/api/public/resume', async (c) => {
    const { store } = getServices(c);
    await store.ensureInitialized();
    const resumeObj = await store.getResume();
    const resume = resumeObj?.data;

    // Redact private resume metadata if unpublished
    if (!resume || resume.published !== true) {
      return c.json({
        success: true,
        data: {
          published: false,
          activeResume: null,
          lastUpdated: null,
          fileSizeBytes: 0,
        },
      });
    }

    // Return sanitized public resume (strictly exclude internal auditHistory)
    return c.json({
      success: true,
      data: {
        published: true,
        activeResume: resume.activeResume
          ? {
              id: resume.activeResume.id,
              key: resume.activeResume.key,
              url: resume.activeResume.url,
              filename: resume.activeResume.filename,
              sizeBytes: resume.activeResume.sizeBytes,
              uploadedAt: resume.activeResume.uploadedAt,
              mimeType: resume.activeResume.mimeType,
            }
          : null,
        format: resume.format,
        versionTag: resume.versionTag,
        lastUpdated: resume.lastUpdated,
        fileSizeBytes: resume.fileSizeBytes,
      },
    });
  });

  // Public Media Asset Stream (Avatars, Screenshots, Icons)
  app.get('/api/public/media/*', async (c) => {
    const { adapter } = getServices(c);
    const rawPath = c.req.path.replace(/^\/api\/public\//, '');
    let key: string;
    try {
      key = decodeURIComponent(rawPath);
    } catch {
      return c.json(
        { success: false, error: 'Malformed media asset path', code: 'INVALID_PATH' },
        400
      );
    }

    // Path Traversal and Structure Defense
    if (
      !key.startsWith('media/') ||
      key.includes('..') ||
      key.includes('\0') ||
      key.includes('\\')
    ) {
      return c.json(
        { success: false, error: 'Invalid or prohibited media asset path', code: 'INVALID_PATH' },
        400
      );
    }

    // Prohibit direct unauthenticated access to resume PDFs via public media stream
    // Resume documents must strictly be served via /api/public/resume/download
    if (key.startsWith('media/resume/') || key.startsWith('media/resumes/')) {
      return c.json(
        {
          success: false,
          error: 'Resume assets cannot be accessed directly via media stream. Use /api/public/resume/download.',
          code: 'FORBIDDEN',
        },
        403
      );
    }

    const binary = await adapter.getBinary(key);

    if (!binary) {
      return c.json(
        { success: false, error: 'Media asset not found in storage', code: 'NOT_FOUND' },
        404
      );
    }

    // Safe Media Stream MIME Whitelist
    const ALLOWED_STREAM_MIMES = new Set([
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/svg+xml',
      'image/gif',
      'image/x-icon',
    ]);

    const mimeLower = (binary.mimeType || '').toLowerCase();
    if (!ALLOWED_STREAM_MIMES.has(mimeLower)) {
      return c.json(
        {
          success: false,
          error: 'Requested asset format is not allowed for public media streaming.',
          code: 'FORBIDDEN',
        },
        403
      );
    }

    return new Response(binary.data as any, {
      status: 200,
      headers: {
        'Content-Type': binary.mimeType,
        'X-Content-Type-Options': 'nosniff',
        ETag: binary.etag,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  });

  // Public Resume Download Endpoint (Strictly 404 if unpublished)
  app.get('/api/public/resume/download', async (c) => {
    const { store, adapter } = getServices(c);
    await store.ensureInitialized();
    const resumeObj = await store.getResume();
    const resume = resumeObj?.data;

    // Reject if not uploaded or unpublished
    if (!resume?.activeResume || resume.published !== true) {
      return c.json(
        {
          success: false,
          error: 'No resume is currently published for public download.',
          code: 'NOT_FOUND',
        },
        404
      );
    }

    const binary = await adapter.getBinary(resume.activeResume.key);
    if (!binary) {
      return c.json(
        {
          success: false,
          error: 'Published resume object not found in storage.',
          code: 'NOT_FOUND',
        },
        404
      );
    }

    return new Response(binary.data as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="Ravi_Dasari_Resume.pdf"',
        'Cache-Control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=60',
      },
    });
  });

  // ==========================================
  // PUBLIC CONTACT FORM SUBMISSION ENDPOINT
  // ==========================================
  app.post('/api/public/contact', async (c) => {
    const isProduction = c.env?.ENVIRONMENT === 'production';

    // 1. IP extraction & Safe Rate Limiting
    // In production: Strictly requires native RATE_LIMITER binding (5 requests / 60 seconds).
    // Zero D1 / database storage is used for contact inquiries or rate limiting.
    const clientIp =
      c.req.header('cf-connecting-ip') ||
      c.req.header('x-real-ip') ||
      c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ||
      '127.0.0.1';

    const rateLimitCheck = await checkRateLimit(
      clientIp,
      c.env?.RATE_LIMITER,
      isProduction,
      5,
      60 * 1000
    );

    if (!rateLimitCheck.allowed) {
      if (rateLimitCheck.status === 503 || rateLimitCheck.code === 'RATE_LIMITER_UNAVAILABLE') {
        return c.json(
          {
            success: false,
            error:
              rateLimitCheck.error ||
              'Rate limiting service is temporarily unavailable. Please try again shortly.',
            code: 'SERVICE_UNAVAILABLE',
          },
          503
        );
      }

      c.header('Retry-After', String(rateLimitCheck.retryAfterSeconds || 60));
      return c.json(
        {
          success: false,
          error: `Too many inquiries sent. Please wait ${rateLimitCheck.retryAfterSeconds || 60} seconds before trying again.`,
          code: 'RATE_LIMIT_EXCEEDED',
        },
        429
      );
    }

    // 2. Parse request body safely
    const { data: body, errorResponse } = await parseJsonBody<any>(c.req);
    if (errorResponse) return errorResponse;

    // 3. Dispatch to ContactService
    const result = await sendContactInquiry(body, {
      resendApiKey: c.env?.RESEND_API_KEY,
      fromEmail: c.env?.RESEND_FROM_EMAIL,
      deliveryEmail: c.env?.CONTACT_DELIVERY_EMAIL || 'dasariravid145@gmail.com',
      environment: c.env?.ENVIRONMENT,
    });

    if (!result.success) {
      return c.json(
        {
          success: false,
          error: result.error,
          code: result.code,
          details: result.details,
        },
        (result.status as any) || 400
      );
    }

    return c.json(
      {
        success: true,
        message: result.message || 'Your message has been sent successfully.',
        id: result.id,
      },
      200
    );
  });

  // ==========================================
  // ADMIN AUTHENTICATION & SECURITY MIDDLEWARE
  // ==========================================
  app.use('/api/admin/*', async (c, next) => {
    // 1. Enforce No-Store / No-Cache headers on all admin responses
    c.header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    c.header('Pragma', 'no-cache');
    c.header('Expires', '0');
    c.header('X-Content-Type-Options', 'nosniff');
    c.header('X-Frame-Options', 'DENY');

    // 2. Allow unauthenticated authentication lifecycle endpoints to proceed
    const unauthenticatedPaths = [
      '/api/admin/auth/status',
      '/api/admin/auth/setup-options',
      '/api/admin/auth/setup-verify',
      '/api/admin/auth/login-options',
      '/api/admin/auth/login-verify',
      '/api/admin/auth/recover',
      '/api/admin/auth/test-reset',
    ];

    if (unauthenticatedPaths.includes(c.req.path)) {
      const csrf = validateCsrf(c.req, c.env);
      if (!csrf.valid) {
        return c.json({ success: false, error: `Forbidden: ${csrf.reason}`, code: 'FORBIDDEN' }, 403);
      }
      await next();
      return;
    }

    // 3. For all other admin routes, enforce CSRF defense on mutating requests
    const csrf = validateCsrf(c.req, c.env);
    if (!csrf.valid) {
      return c.json({ success: false, error: `Forbidden: ${csrf.reason}`, code: 'FORBIDDEN' }, 403);
    }

    const { webauthnStore, sessionSecret, ownerEmail } = getServices(c);
    const authHeader = c.req.header('Authorization');
    const cookieHeader = c.req.header('Cookie') || '';
    const cookies = parseCookies(cookieHeader);
    const cfAccessJwt =
      c.req.header('cf-access-jwt-assertion') ||
      c.req.header('Cf-Access-Jwt-Assertion');

    // 4. Check for signed WebAuthn session cookie or Bearer session token (2-part HMAC token)
    const rawSessionCookie =
      cookies['__Host-portfolio_session'] ||
      cookies['portfolio_admin_session'];

    const bearerToken = authHeader?.startsWith('Bearer ')
      ? authHeader.substring(7).trim()
      : null;

    const candidateSessionToken =
      rawSessionCookie ||
      (bearerToken && bearerToken.split('.').length === 2 ? bearerToken : null);

    if (candidateSessionToken) {
      const verifiedSession = await verifySession(candidateSessionToken, sessionSecret);
      if (verifiedSession) {
        const isRevoked = await webauthnStore.isSessionRevoked(verifiedSession.sessionId);
        if (!isRevoked) {
          c.set('session', verifiedSession);
          c.set('user', {
            iss: 'webauthn-session',
            aud: 'portfolio-admin',
            sub: verifiedSession.sessionId,
            email: verifiedSession.email,
            iat: Math.floor(verifiedSession.createdAt / 1000),
            exp: Math.floor(verifiedSession.expiresAt / 1000),
          });
          await next();
          return;
        }
      }
    }

    // 5. Fallback check for testing secret strictly ONLY in non-production environments
    const isProduction = c.env?.ENVIRONMENT === 'production';
    if (!isProduction) {
      const adminSecret =
        c.env?.ADMIN_API_SECRET ||
        (typeof process !== 'undefined' ? process.env?.ADMIN_API_SECRET : undefined);

      const candidateDevToken =
        bearerToken ||
        cookies['portfolio_admin_session'] ||
        (authHeader || '');

      const isDirectSecretMatch =
        Boolean(adminSecret) &&
        (candidateDevToken === adminSecret ||
          authHeader === `Bearer ${adminSecret}` ||
          cookieHeader.includes(`portfolio_admin_session=${adminSecret}`));

      if (isDirectSecretMatch && candidateDevToken && !candidateDevToken.includes('.')) {
        c.set('user', {
          iss: c.env?.CF_ACCESS_TEAM_DOMAIN || 'https://dsecops88.cloudflareaccess.com',
          aud: c.env?.CF_ACCESS_AUD || 'test-access-aud-12345',
          sub: 'admin-developer-uuid',
          email: c.env?.CF_ACCESS_OWNER_EMAIL || ownerEmail,
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 3600,
        });
        await next();
        return;
      }
    }

    // 6. Dual-mode / backward compatibility: Cloudflare Access JWT Verification
    const candidateJwt =
      cfAccessJwt ||
      (bearerToken && bearerToken.split('.').length === 3 ? bearerToken : null) ||
      cookies['CF_Authorization'] ||
      (bearerToken && !candidateSessionToken ? bearerToken : null);

    if (candidateJwt) {
      const authConfig: AccessAuthConfig = {
        teamDomain: c.env?.CF_ACCESS_TEAM_DOMAIN,
        aud: c.env?.CF_ACCESS_AUD,
        ownerEmail: c.env?.CF_ACCESS_OWNER_EMAIL || ownerEmail,
        environment: c.env?.ENVIRONMENT || 'development',
        secretKey: c.env?.CF_ACCESS_SECRET || (!isProduction ? c.env?.ADMIN_API_SECRET : undefined),
      };

      const validation = await validateAccessJwt(candidateJwt, authConfig);
      if (validation.valid && validation.payload) {
        c.set('user', validation.payload);
        await next();
        return;
      }

      // If a JWT or authorization token was explicitly provided and failed validation:
      return c.json(
        {
          success: false,
          error: validation.error || 'Unauthorized: Admin authentication session or token required',
          code: validation.code || 'UNAUTHORIZED',
        },
        validation.status
      );
    }

    // If all validation avenues fail, reject with 401 Unauthorized
    return c.json(
      {
        success: false,
        error: 'Unauthorized: Admin authentication session or token required',
        code: 'UNAUTHORIZED',
      },
      401
    );
  });

  // ==========================================
  // WEBAUTHN & ADMIN SESSION ENDPOINTS
  // ==========================================

  // Public/Unauthenticated Auth Status
  app.get('/api/admin/auth/status', async (c) => {
    const { webauthnStore, ownerEmail } = getServices(c);
    const store = await webauthnStore.getCredentialsStore();
    const enrolled = Boolean(store && store.enrolled && store.credentials.length > 0);
    const rpId =
      c.req.url.includes('localhost') || c.req.url.includes('127.0.0.1')
        ? 'localhost'
        : c.env?.PUBLIC_DOMAIN || 'ravi-portfolio.dsecops88.online';

    return c.json({
      success: true,
      enrolled,
      ownerEmail,
      rpId,
      credentialCount: store?.credentials?.length || 0,
    });
  });

  // Non-production test helper to reset credentials (strictly prohibited in production)
  app.post('/api/admin/auth/test-reset', async (c) => {
    if (c.env?.ENVIRONMENT === 'production') {
      return c.json({ error: 'Endpoint not available in production' }, 404);
    }
    const { adapter } = getServices(c);
    await adapter.delete('auth/admin_credentials.json');
    return c.json({ success: true, message: 'Auth credentials reset for testing' });
  });

  // Setup Options (Requires short-lived ADMIN_ENROLLMENT_TOKEN)
  app.post('/api/admin/auth/setup-options', async (c) => {
    try {
      const isProduction = c.env?.ENVIRONMENT === 'production';
      const expectedToken = isProduction
        ? validateProductionEnrollmentToken(c.env?.ADMIN_ENROLLMENT_TOKEN, c.env?.ADMIN_API_SECRET)
        : c.env?.ADMIN_ENROLLMENT_TOKEN ||
          (typeof process !== 'undefined' ? process.env?.ADMIN_ENROLLMENT_TOKEN : undefined) ||
          c.env?.ADMIN_API_SECRET ||
          (typeof process !== 'undefined' ? process.env?.ADMIN_API_SECRET : undefined) ||
          'dev-enrollment-token';

      const { webauthnService } = getServices(c);
      const bodyResult = await parseJsonBody<{ enrollmentToken?: string }>(c.req);
      const bodyToken = bodyResult.data?.enrollmentToken;
      const headerToken = c.req.header('x-enrollment-token');
      const token = bodyToken || headerToken;

      const res = await webauthnService.getSetupRegistrationOptions(
        token,
        expectedToken,
        c.req.url,
        c.env?.PUBLIC_DOMAIN
      );
      return c.json({ success: true, ...res });
    } catch (err: any) {
      if (err instanceof ConfigurationError) {
        return handleApiError(c, err);
      }
      const msg = err.message || 'Setup error';
      if (msg.includes('UNAUTHORIZED_SETUP_TOKEN')) {
        return c.json(
          {
            success: false,
            error: 'Unauthorized: Invalid or missing setup enrollment token',
            code: 'UNAUTHORIZED_SETUP_TOKEN',
          },
          401
        );
      }
      if (msg.includes('ALREADY_ENROLLED')) {
        return c.json(
          {
            success: false,
            error: 'Admin authentication is already initialized. Public registration is prohibited.',
            code: 'ALREADY_ENROLLED',
          },
          400
        );
      }
      return c.json({ success: false, error: msg, code: 'SETUP_ERROR' }, 400);
    }
  });

  // Setup Verification (Completes initial enrollment & returns recovery codes)
  app.post('/api/admin/auth/setup-verify', async (c) => {
    try {
      const isProduction = c.env?.ENVIRONMENT === 'production';
      const expectedToken = isProduction
        ? validateProductionEnrollmentToken(c.env?.ADMIN_ENROLLMENT_TOKEN, c.env?.ADMIN_API_SECRET)
        : c.env?.ADMIN_ENROLLMENT_TOKEN ||
          (typeof process !== 'undefined' ? process.env?.ADMIN_ENROLLMENT_TOKEN : undefined) ||
          c.env?.ADMIN_API_SECRET ||
          (typeof process !== 'undefined' ? process.env?.ADMIN_API_SECRET : undefined) ||
          'dev-enrollment-token';

      const { webauthnService } = getServices(c);
      const bodyResult = await parseJsonBody<{
        enrollmentToken?: string;
        challengeId: string;
        response: any;
        name?: string;
      }>(c.req);
      if (bodyResult.errorResponse) return bodyResult.errorResponse;

      const { enrollmentToken, challengeId, response, name } = bodyResult.data;
      const headerToken = c.req.header('x-enrollment-token');
      const token = enrollmentToken || headerToken;

      if (!challengeId || !response) {
        return c.json(
          { success: false, error: 'Missing challengeId or WebAuthn response', code: 'BAD_REQUEST' },
          400
        );
      }

      const res = await webauthnService.verifySetupRegistration(
        token,
        expectedToken,
        challengeId,
        response,
        name || 'Primary Passkey',
        c.req.url,
        c.env?.PUBLIC_DOMAIN
      );

      setSessionCookie(c, res.sessionToken);

      return c.json({
        success: true,
        user: res.user,
        recoveryCodes: res.recoveryCodes,
      });
    } catch (err: any) {
      if (err instanceof ConfigurationError) {
        return handleApiError(c, err);
      }
      const msg = err.message || 'Setup verification failed';
      const status = msg.includes('UNAUTHORIZED') ? 401 : 400;
      return c.json({ success: false, error: msg, code: 'SETUP_VERIFICATION_FAILED' }, status);
    }
  });

  // Login Options (WebAuthn assertion challenge)
  app.post('/api/admin/auth/login-options', async (c) => {
    const { webauthnService } = getServices(c);
    try {
      const res = await webauthnService.getLoginAuthenticationOptions(c.req.url, c.env?.PUBLIC_DOMAIN);
      if (!res.enrolled) {
        return c.json(
          {
            success: false,
            error: 'Admin passkey is not enrolled yet. Complete initial setup first.',
            code: 'NOT_ENROLLED',
          },
          400
        );
      }
      return c.json({ success: true, ...res });
    } catch (err: any) {
      return c.json({ success: false, error: err.message, code: 'LOGIN_OPTIONS_ERROR' }, 400);
    }
  });

  // Login Verification (Validates passkey assertion signature & anti-replay counter)
  app.post('/api/admin/auth/login-verify', async (c) => {
    const { webauthnService } = getServices(c);
    const bodyResult = await parseJsonBody<{ challengeId: string; response: any }>(c.req);
    if (bodyResult.errorResponse) return bodyResult.errorResponse;

    const { challengeId, response } = bodyResult.data;
    if (!challengeId || !response) {
      return c.json(
        { success: false, error: 'Missing challengeId or WebAuthn assertion response', code: 'BAD_REQUEST' },
        400
      );
    }

    try {
      const res = await webauthnService.verifyLoginAuthentication(
        challengeId,
        response,
        c.req.url,
        c.env?.PUBLIC_DOMAIN
      );
      setSessionCookie(c, res.sessionToken);
      return c.json({ success: true, user: res.user });
    } catch (err: any) {
      const msg = err.message || 'Login verification failed';
      return c.json({ success: false, error: msg, code: 'AUTH_FAILED' }, 401);
    }
  });

  // Emergency Account Recovery with Single-Use Code
  app.post('/api/admin/auth/recover', async (c) => {
    const { webauthnService } = getServices(c);
    const bodyResult = await parseJsonBody<{ recoveryCode: string }>(c.req);
    if (bodyResult.errorResponse) return bodyResult.errorResponse;

    const { recoveryCode } = bodyResult.data;
    if (!recoveryCode || typeof recoveryCode !== 'string') {
      return c.json({ success: false, error: 'Recovery code is required', code: 'BAD_REQUEST' }, 400);
    }

    try {
      const res = await webauthnService.recoverWithCode(recoveryCode);
      setSessionCookie(c, res.sessionToken);
      return c.json({
        success: true,
        user: res.user,
        remainingCodes: res.remainingCodes,
        message: 'Emergency recovery successful. You may now manage passkeys or regenerate backup codes.',
      });
    } catch (err: any) {
      return c.json({ success: false, error: err.message, code: 'RECOVERY_FAILED' }, 401);
    }
  });

  // Current Authenticated Admin Identity
  app.get('/api/admin/auth/me', (c) => {
    const user = c.get('user');
    const session = c.get('session');
    return c.json({
      success: true,
      user: {
        email: user?.email || session?.email || c.env?.CF_ACCESS_OWNER_EMAIL || 'dasariravid145@gmail.com',
        sub: user?.sub || session?.sessionId || 'owner',
        role: 'owner',
        authenticated: true,
      },
    });
  });

  // Logout & Session Revocation
  app.post('/api/admin/auth/logout', async (c) => {
    const { webauthnStore, sessionSecret } = getServices(c);
    const session = c.get('session');
    if (session?.sessionId) {
      await webauthnStore.revokeSession(session.sessionId);
    } else {
      const cookieHeader = c.req.header('Cookie') || '';
      const cookies = parseCookies(cookieHeader);
      const token = cookies['__Host-portfolio_session'] || cookies['portfolio_admin_session'];
      if (token) {
        const verified = await verifySession(token, sessionSecret);
        if (verified?.sessionId) {
          await webauthnStore.revokeSession(verified.sessionId);
        }
      }
    }

    clearSessionCookies(c);
    return c.json({
      success: true,
      message: 'Logged out successfully. Administrative session has been terminated.',
    });
  });

  // List Enrolled Passkeys (Authenticated)
  app.get('/api/admin/auth/passkeys', async (c) => {
    const { webauthnStore } = getServices(c);
    const store = await webauthnStore.getCredentialsStore();
    const passkeys = (store?.credentials || []).map((cred) => ({
      id: cred.id,
      name: cred.name,
      createdAt: cred.createdAt,
      lastUsedAt: cred.lastUsedAt,
      deviceType: cred.deviceType,
      backedUp: cred.backedUp,
    }));
    return c.json({ success: true, passkeys });
  });

  // Add Backup Passkey Options (Authenticated)
  app.post('/api/admin/auth/passkeys/add-options', async (c) => {
    const { webauthnService } = getServices(c);
    try {
      const res = await webauthnService.getAddBackupPasskeyOptions(c.req.url, c.env?.PUBLIC_DOMAIN);
      return c.json({ success: true, ...res });
    } catch (err: any) {
      return c.json({ success: false, error: err.message, code: 'BACKUP_OPTIONS_ERROR' }, 400);
    }
  });

  // Verify & Add Backup Passkey (Authenticated)
  app.post('/api/admin/auth/passkeys/add-verify', async (c) => {
    const { webauthnService } = getServices(c);
    const bodyResult = await parseJsonBody<{ challengeId: string; response: any; name?: string }>(c.req);
    if (bodyResult.errorResponse) return bodyResult.errorResponse;

    const { challengeId, response, name } = bodyResult.data;
    if (!challengeId || !response) {
      return c.json({ success: false, error: 'Missing challengeId or response', code: 'BAD_REQUEST' }, 400);
    }

    try {
      const res = await webauthnService.verifyAddBackupPasskey(
        challengeId,
        response,
        name || 'Backup Passkey',
        c.req.url,
        c.env?.PUBLIC_DOMAIN
      );
      return c.json({ success: true, passkey: res.passkey });
    } catch (err: any) {
      return c.json({ success: false, error: err.message, code: 'BACKUP_REGISTRATION_FAILED' }, 400);
    }
  });

  // Delete Enrolled Passkey (Authenticated)
  app.delete('/api/admin/auth/passkeys/:id', async (c) => {
    const { webauthnStore } = getServices(c);
    const id = c.req.param('id');
    try {
      await webauthnStore.removePasskey(id);
      return c.json({ success: true, message: 'Passkey deleted successfully' });
    } catch (err: any) {
      return c.json({ success: false, error: err.message, code: 'DELETE_PASSKEY_FAILED' }, 400);
    }
  });

  // Regenerate Recovery Codes (Authenticated)
  app.post('/api/admin/auth/recovery-codes/regenerate', async (c) => {
    const { webauthnService } = getServices(c);
    try {
      const res = await webauthnService.regenerateRecoveryCodes();
      return c.json({ success: true, recoveryCodes: res.plainCodes });
    } catch (err: any) {
      return c.json({ success: false, error: err.message, code: 'REGENERATE_FAILED' }, 400);
    }
  });

  // ==========================================
  // ADMIN OVERVIEW & DASHBOARD METRICS ENDPOINT
  // ==========================================
  app.get('/api/admin/overview', async (c) => {
    const { store } = getServices(c);
    await store.ensureInitialized();

    const [
      profileObj,
      projectsObj,
      skillsObj,
      categoriesObj,
      expObj,
      certsObj,
      aiObj,
      resumeObj,
      settingsObj,
    ] = await Promise.all([
      store.getProfile(),
      store.getProjects(),
      store.getSkills(),
      store.getSkillCategories(),
      store.getExperience(),
      store.getCertifications(),
      store.getAIServices(),
      store.getResume(),
      store.getSettings(),
    ]);

    const projects = projectsObj?.data || [];
    const publishedProjects = projects.filter((p) => p.published).length;
    const draftProjects = projects.filter((p) => !p.published).length;

    const user = c.get('user');

    return c.json({
      success: true,
      data: {
        metrics: {
          totalProjects: projects.length,
          publishedProjects,
          draftProjects,
          totalSkills: (skillsObj?.data || []).length,
          totalSkillCategories: (categoriesObj?.data || []).length,
          totalExperience: (expObj?.data || []).length,
          totalCertifications: (certsObj?.data || []).length,
          totalAIServices: (aiObj?.data || []).length,
        },
        lastUpdated: projectsObj?.updatedAt || profileObj?.updatedAt || new Date().toISOString(),
        ownerEmail: user?.email || c.env?.CF_ACCESS_OWNER_EMAIL || 'dasariravid145@gmail.com',
        activeResume: resumeObj?.data?.activeResume ? true : false,
        resumeVersion: resumeObj?.data?.versionTag || 'None',
        resumePublished: resumeObj?.data?.published ?? false,
        siteTitle: settingsObj?.data?.siteTitle || 'Ravi Dasari Portfolio',
        analyticsEnabled: settingsObj?.data?.analyticsEnabled || false,
      },
    });
  });

  // ==========================================
  // PROFILE PHOTO MANAGEMENT ENDPOINTS
  // ==========================================

  // Upload or Replace Profile Photo
  app.post('/api/admin/profile/photo', async (c) => {
    const { adapter, mutations, store } = getServices(c);
    await store.ensureInitialized();

    try {
      const { buffer, mimeType, filename } = await parseBinaryUpload(c.req);

      // Validate image buffer, magic bytes, and size
      const validation = validateProfilePhoto(buffer, mimeType, filename);
      if (!validation.valid) {
        return c.json(
          { success: false, error: validation.error, code: 'VALIDATION_ERROR' },
          400
        );
      }

      // Safe replacement sequence:
      // 1. Get existing profile to identify previous avatar key for post-write cleanup
      const profileObj = await store.getProfile();
      const previousKey = profileObj?.data?.avatar?.key;
      const ifMatch = getIfMatchHeader(c.req);

      // 2. Generate immutable key and store binary in R2
      const ext = filename?.split('.').pop() || mimeType.split('/')[1] || 'webp';
      const newKey = generateAvatarKey(ext);

      const putResult = await adapter.putBinary(newKey, buffer, mimeType);
      if (!putResult) {
        return c.json(
          { success: false, error: 'Failed to write image binary to storage.', code: 'STORAGE_ERROR' },
          500
        );
      }

      // 3. Build new MediaAsset descriptor
      const avatarAsset: MediaAsset = {
        id: crypto.randomUUID(),
        key: newKey,
        url: `/api/public/${newKey}`,
        filename: filename || `avatar.${ext}`,
        mimeType: mimeType as any,
        sizeBytes: buffer.byteLength,
        uploadedAt: new Date().toISOString(),
        altText: 'Ravi Dasari — DevOps Engineer',
      };

      // 4. Update profile.json with new avatar pointer via OCC
      try {
        const updateResult = await mutations.updateProfileAvatar(avatarAsset, ifMatch);

        // 5. If replacement succeeded, clean up previous avatar object from R2
        if (previousKey && previousKey !== newKey) {
          await adapter.delete(previousKey);
        }

        c.header('ETag', updateResult.etag);
        return c.json({ success: true, data: updateResult.profile }, 200);
      } catch (err) {
        // Rollback: if updating profile.json failed, delete the newly written object
        await adapter.delete(newKey);
        throw err;
      }
    } catch (err) {
      return handleApiError(c, err);
    }
  });

  // Delete Profile Photo (Revert to SVG Monogram fallback)
  app.delete('/api/admin/profile/photo', async (c) => {
    const { adapter, mutations, store } = getServices(c);
    await store.ensureInitialized();

    try {
      const profileObj = await store.getProfile();
      const previousKey = profileObj?.data?.avatar?.key;
      const ifMatch = getIfMatchHeader(c.req);

      // Update profile with null avatar
      const updateResult = await mutations.updateProfileAvatar(null, ifMatch);

      // Clean up previous avatar object from R2
      if (previousKey) {
        await adapter.delete(previousKey);
      }

      c.header('ETag', updateResult.etag);
      return c.json({ success: true, data: updateResult.profile }, 200);
    } catch (err) {
      return handleApiError(c, err);
    }
  });

  // ==========================================
  // RESUME MANAGEMENT ENDPOINTS
  // ==========================================

  // Upload or Replace Resume PDF
  app.post('/api/admin/resume/upload', async (c) => {
    const { adapter, mutations, store } = getServices(c);
    await store.ensureInitialized();

    try {
      const { buffer, mimeType, filename } = await parseBinaryUpload(c.req);

      // Validate PDF buffer, signature (%PDF-), and size (<= 10MB)
      const validation = validateResumePdf(buffer, mimeType, filename);
      if (!validation.valid) {
        return c.json(
          { success: false, error: validation.error, code: 'VALIDATION_ERROR' },
          400
        );
      }

      const ifMatch = getIfMatchHeader(c.req);
      const resumeObj = await store.getResume();
      const currentResume = resumeObj?.data || {
        activeResume: null,
        format: 'application/pdf',
        lastUpdated: new Date().toISOString().split('T')[0],
        fileSizeBytes: 0,
        versionTag: 'v2026.1',
        published: true,
        auditHistory: [],
      };

      const activeKey = getActiveResumeKey();

      // If active resume existed, archive it to preserve history
      if (currentResume.activeResume) {
        const archiveKey = generateArchivedResumeKey(currentResume.versionTag);
        const existingBinary = await adapter.getBinary(activeKey);
        if (existingBinary) {
          await adapter.putBinary(archiveKey, existingBinary.data, 'application/pdf');
          currentResume.auditHistory.unshift({
            key: archiveKey,
            filename: currentResume.activeResume.filename || 'Ravi_Dasari_Resume.pdf',
            uploadedAt: currentResume.activeResume.uploadedAt || new Date().toISOString(),
            sizeBytes: currentResume.fileSizeBytes,
          });
        }
      }

      // Store new active PDF in R2
      const putResult = await adapter.putBinary(activeKey, buffer, 'application/pdf', {
        httpMetadata: {
          contentType: 'application/pdf',
          contentDisposition: 'attachment; filename="Ravi_Dasari_Resume.pdf"',
        },
      });

      if (!putResult) {
        return c.json(
          { success: false, error: 'Failed to write resume PDF to storage.', code: 'STORAGE_ERROR' },
          500
        );
      }

      // Increment version tag
      const nextVersionNum = (currentResume.auditHistory?.length || 0) + 1;
      const versionTag = `v${new Date().getFullYear()}.${nextVersionNum}`;

      const updatedResume: Resume = {
        activeResume: {
          id: crypto.randomUUID(),
          key: activeKey,
          url: '/api/public/resume/download',
          filename: filename || 'Ravi_Dasari_Resume.pdf',
          mimeType: 'application/pdf',
          sizeBytes: buffer.byteLength,
          uploadedAt: new Date().toISOString(),
        },
        format: 'application/pdf',
        lastUpdated: new Date().toISOString().split('T')[0],
        fileSizeBytes: buffer.byteLength,
        versionTag,
        published: true,
        auditHistory: currentResume.auditHistory,
      };

      const updateResult = await mutations.updateResume(updatedResume, ifMatch);
      c.header('ETag', updateResult.etag);
      return c.json({ success: true, data: updateResult.resume }, 200);
    } catch (err) {
      return handleApiError(c, err);
    }
  });

  // Toggle Resume Publication Status (Publish / Unpublish)
  app.post('/api/admin/resume/publish', async (c) => {
    const { mutations, store } = getServices(c);
    await store.ensureInitialized();
    const { data: body, errorResponse } = await parseJsonBody<{ published: boolean }>(c.req);
    if (errorResponse) return errorResponse;

    try {
      const ifMatch = getIfMatchHeader(c.req);
      const result = await mutations.publishResume(body!.published, ifMatch);
      c.header('ETag', result.etag);
      return c.json({ success: true, data: result.resume }, 200);
    } catch (err) {
      return handleApiError(c, err);
    }
  });

  // Delete Resume
  app.delete('/api/admin/resume', async (c) => {
    const { adapter, mutations, store } = getServices(c);
    await store.ensureInitialized();
    try {
      const ifMatch = getIfMatchHeader(c.req);
      const activeKey = getActiveResumeKey();

      // Delete active file from R2
      await adapter.delete(activeKey);

      // Clear resume metadata in JSON store
      const result = await mutations.deleteResume(ifMatch);
      c.header('ETag', result.etag);
      return c.json({ success: true, data: result.resume }, 200);
    } catch (err) {
      return handleApiError(c, err);
    }
  });

  // Preview Active Resume (Authorized view regardless of publication status)
  app.get('/api/admin/resume/preview', async (c) => {
    const { store, adapter } = getServices(c);
    await store.ensureInitialized();
    const resumeObj = await store.getResume();
    const activeResume = resumeObj?.data?.activeResume;

    if (!activeResume) {
      return c.json(
        { success: false, error: 'No active resume is available to preview.', code: 'NOT_FOUND' },
        404
      );
    }

    const binary = await adapter.getBinary(activeResume.key);
    if (!binary) {
      return c.json(
        { success: false, error: 'Resume binary not found in storage.', code: 'NOT_FOUND' },
        404
      );
    }

    return new Response(binary.data as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="Ravi_Dasari_Resume.pdf"',
        'Cache-Control': 'no-store',
      },
    });
  });

  // ==========================================
  // OTHER PROTECTED ADMIN ENDPOINTS
  // ==========================================

  // --- Admin Projects ---
  app.get('/api/admin/projects', async (c) => {
    const { store } = getServices(c);
    await store.ensureInitialized();
    const projectsObj = await store.getProjects();
    c.header('ETag', projectsObj?.etag || 'W/"initial"');
    return c.json({ success: true, data: projectsObj?.data || [] }, 200);
  });

  app.get('/api/admin/projects/:id', async (c) => {
    const { store } = getServices(c);
    await store.ensureInitialized();
    const id = c.req.param('id');
    const projectsObj = await store.getProjects();
    const project = projectsObj?.data?.find((p) => p.id === id);
    if (!project) {
      return c.json({ success: false, error: `Project with id "${id}" not found.`, code: 'NOT_FOUND' }, 404);
    }
    c.header('ETag', projectsObj?.etag || 'W/"initial"');
    return c.json({ success: true, data: project }, 200);
  });

  app.post('/api/admin/projects', async (c) => {
    const { mutations } = getServices(c);
    const { data: body, errorResponse } = await parseJsonBody<any>(c.req);
    if (errorResponse) return errorResponse;

    try {
      const ifMatch = getIfMatchHeader(c.req);
      const result = await mutations.createProject(body, ifMatch);
      c.header('ETag', result.etag);
      return c.json({ success: true, data: result.project }, 201);
    } catch (err) {
      return handleApiError(c, err);
    }
  });

  app.put('/api/admin/projects/:id', async (c) => {
    const { mutations } = getServices(c);
    const id = c.req.param('id');
    const { data: body, errorResponse } = await parseJsonBody<any>(c.req);
    if (errorResponse) return errorResponse;

    try {
      const ifMatch = getIfMatchHeader(c.req);
      const result = await mutations.updateProject(id, body, ifMatch);
      c.header('ETag', result.etag);
      return c.json({ success: true, data: result.project }, 200);
    } catch (err) {
      return handleApiError(c, err);
    }
  });

  app.delete('/api/admin/projects/:id', async (c) => {
    const { adapter, mutations } = getServices(c);
    const id = c.req.param('id');
    try {
      const ifMatch = getIfMatchHeader(c.req);
      const result = await mutations.deleteProject(id, ifMatch);

      // Clean up associated R2 media for this project
      if (result.deletedProject) {
        const { coverImage, architectureDiagram, screenshots } = result.deletedProject;
        if (coverImage?.key) {
          await adapter.delete(coverImage.key);
        }
        if (architectureDiagram?.key) {
          await adapter.delete(architectureDiagram.key);
        }
        if (screenshots && screenshots.length > 0) {
          for (const shot of screenshots) {
            if (shot.key) {
              await adapter.delete(shot.key);
            }
          }
        }
      }

      c.header('ETag', result.etag);
      return c.json({ success: true }, 200);
    } catch (err) {
      return handleApiError(c, err);
    }
  });

  app.post('/api/admin/projects/:id/publish', async (c) => {
    const { mutations } = getServices(c);
    const id = c.req.param('id');
    const { data: body, errorResponse } = await parseJsonBody<{ published: boolean }>(c.req);
    if (errorResponse) return errorResponse;

    try {
      const ifMatch = getIfMatchHeader(c.req);
      const result = await mutations.publishProject(id, body!.published, ifMatch);
      c.header('ETag', result.etag);
      return c.json({ success: true, data: result.project }, 200);
    } catch (err) {
      return handleApiError(c, err);
    }
  });

  app.post('/api/admin/projects/reorder', async (c) => {
    const { mutations } = getServices(c);
    const { data: body, errorResponse } = await parseJsonBody<{ orderedIds: string[] }>(c.req);
    if (errorResponse) return errorResponse;

    try {
      const ifMatch = getIfMatchHeader(c.req);
      const result = await mutations.reorderProjects(body!.orderedIds, ifMatch);
      c.header('ETag', result.etag);
      return c.json({ success: true, data: result.projects }, 200);
    } catch (err) {
      return handleApiError(c, err);
    }
  });

  // --- Project Architecture Diagrams CRUD ---

  app.post('/api/admin/projects/:id/architecture', async (c) => {
    const { mutations } = getServices(c);
    const projectId = c.req.param('id');
    const { data: body, errorResponse } = await parseJsonBody<any>(c.req);
    if (errorResponse) return errorResponse;

    try {
      const ifMatch = getIfMatchHeader(c.req);
      const result = await mutations.addProjectArchitectureDiagram(projectId, body, ifMatch);
      c.header('ETag', result.etag);
      return c.json({ success: true, data: result.diagram, project: result.project }, 201);
    } catch (err) {
      return handleApiError(c, err);
    }
  });

  app.put('/api/admin/projects/:id/architecture/:diagramId', async (c) => {
    const { mutations } = getServices(c);
    const projectId = c.req.param('id');
    const diagramId = c.req.param('diagramId');
    const { data: body, errorResponse } = await parseJsonBody<any>(c.req);
    if (errorResponse) return errorResponse;

    try {
      const ifMatch = getIfMatchHeader(c.req);
      const result = await mutations.updateProjectArchitectureDiagram(projectId, diagramId, body, ifMatch);
      c.header('ETag', result.etag);
      return c.json({ success: true, data: result.diagram, project: result.project }, 200);
    } catch (err) {
      return handleApiError(c, err);
    }
  });

  app.delete('/api/admin/projects/:id/architecture/:diagramId', async (c) => {
    const { adapter, mutations } = getServices(c);
    const projectId = c.req.param('id');
    const diagramId = c.req.param('diagramId');

    try {
      const ifMatch = getIfMatchHeader(c.req);
      const result = await mutations.deleteProjectArchitectureDiagram(projectId, diagramId, ifMatch);

      if (result.deletedDiagram?.image?.key) {
        await adapter.delete(result.deletedDiagram.image.key);
      }

      c.header('ETag', result.etag);
      return c.json({ success: true, deletedDiagram: result.deletedDiagram, project: result.project }, 200);
    } catch (err) {
      return handleApiError(c, err);
    }
  });

  app.post('/api/admin/projects/:id/architecture/reorder', async (c) => {
    const { mutations } = getServices(c);
    const projectId = c.req.param('id');
    const { data: body, errorResponse } = await parseJsonBody<{ orderedDiagramIds: string[] }>(c.req);
    if (errorResponse) return errorResponse;

    try {
      const ifMatch = getIfMatchHeader(c.req);
      const result = await mutations.reorderProjectArchitectureDiagrams(projectId, body!.orderedDiagramIds, ifMatch);
      c.header('ETag', result.etag);
      return c.json({ success: true, data: result.diagrams, project: result.project }, 200);
    } catch (err) {
      return handleApiError(c, err);
    }
  });

  app.post('/api/admin/projects/:id/architecture/:diagramId/publish', async (c) => {
    const { mutations } = getServices(c);
    const projectId = c.req.param('id');
    const diagramId = c.req.param('diagramId');
    const { data: body, errorResponse } = await parseJsonBody<{ published: boolean }>(c.req);
    if (errorResponse) return errorResponse;

    try {
      const ifMatch = getIfMatchHeader(c.req);
      const result = await mutations.toggleProjectArchitectureDiagramPublished(
        projectId,
        diagramId,
        body!.published,
        ifMatch
      );
      c.header('ETag', result.etag);
      return c.json({ success: true, data: result.diagram, project: result.project }, 200);
    } catch (err) {
      return handleApiError(c, err);
    }
  });

  // Generic Admin Media Upload (Projects Cover, Screenshots, Diagrams)
  const handleMediaUpload = async (c: any) => {
    const { adapter } = getServices(c);
    try {
      const { buffer, mimeType, filename } = await parseBinaryUpload(c.req);
      const validation = validateProfilePhoto(buffer, mimeType, filename);
      if (!validation.valid) {
        return c.json(
          { success: false, error: validation.error, code: 'VALIDATION_ERROR' },
          400
        );
      }

      const ext = filename?.split('.').pop() || mimeType.split('/')[1] || 'webp';
      const assetKey = `media/projects/upload-${crypto.randomUUID()}.${ext}`;
      const putResult = await adapter.putBinary(assetKey, buffer, mimeType);
      if (!putResult) {
        return c.json(
          { success: false, error: 'Failed to write media asset to storage.', code: 'STORAGE_ERROR' },
          500
        );
      }

      const asset: MediaAsset = {
        id: crypto.randomUUID(),
        key: assetKey,
        url: `/api/public/${assetKey}`,
        filename: filename || `asset.${ext}`,
        mimeType: mimeType as any,
        sizeBytes: buffer.byteLength,
        uploadedAt: new Date().toISOString(),
        altText: filename || 'Project Media Asset',
      };

      return c.json({ success: true, data: asset }, 201);
    } catch (err) {
      return handleApiError(c, err);
    }
  };

  app.post('/api/admin/media/upload', handleMediaUpload);
  app.post('/api/admin/media', handleMediaUpload);

  // Media List & Delete Endpoints
  app.get('/api/admin/media', async (c) => {
    const { adapter } = getServices(c);
    try {
      const keys = await adapter.list('media/');
      const assets: MediaAsset[] = keys.map((key) => {
        const ext = key.split('.').pop() || 'png';
        const isPdf = ext.toLowerCase() === 'pdf';
        return {
          id: key,
          key,
          url: `/api/public/${key}`,
          filename: key.split('/').pop() || key,
          mimeType: isPdf ? 'application/pdf' : (`image/${ext === 'jpg' ? 'jpeg' : ext}` as any),
          uploadedAt: new Date().toISOString(),
          altText: key.split('/').pop() || 'Media Asset',
        };
      });
      return c.json({ success: true, data: assets }, 200);
    } catch (err) {
      return handleApiError(c, err);
    }
  });

  app.delete('/api/admin/media', async (c) => {
    const { adapter } = getServices(c);
    const key = c.req.query('key');
    if (!key || !key.startsWith('media/') || key.includes('..') || key.includes('\0') || key.includes('\\')) {
      return c.json(
        { success: false, error: 'Invalid or prohibited media key parameter', code: 'INVALID_PATH' },
        400
      );
    }
    try {
      await adapter.delete(key);
      return c.json({ success: true, message: `Media asset "${key}" deleted.` }, 200);
    } catch (err) {
      return handleApiError(c, err);
    }
  });

  // --- Admin Skills ---
  app.get('/api/admin/skills', async (c) => {
    const { store } = getServices(c);
    await store.ensureInitialized();
    const skillsObj = await store.getSkills();
    c.header('ETag', skillsObj?.etag || 'W/"initial"');
    const sorted = [...(skillsObj?.data || [])].sort((a, b) => a.order - b.order);
    return c.json({ success: true, data: sorted }, 200);
  });

  app.get('/api/admin/skills/:id', async (c) => {
    const { store } = getServices(c);
    await store.ensureInitialized();
    const id = c.req.param('id');
    const skillsObj = await store.getSkills();
    const skill = skillsObj?.data?.find((s) => s.id === id);
    if (!skill) {
      return c.json({ success: false, error: `Skill with id "${id}" not found.`, code: 'NOT_FOUND' }, 404);
    }
    c.header('ETag', skillsObj?.etag || 'W/"initial"');
    return c.json({ success: true, data: skill }, 200);
  });

  app.post('/api/admin/skills', async (c) => {
    const { mutations } = getServices(c);
    const { data: body, errorResponse } = await parseJsonBody<any>(c.req);
    if (errorResponse) return errorResponse;

    try {
      const ifMatch = getIfMatchHeader(c.req);
      const result = await mutations.createSkill(body, ifMatch);
      c.header('ETag', result.etag);
      return c.json({ success: true, data: result.skill }, 201);
    } catch (err) {
      return handleApiError(c, err);
    }
  });

  app.put('/api/admin/skills/:id', async (c) => {
    const { mutations } = getServices(c);
    const id = c.req.param('id');
    const { data: body, errorResponse } = await parseJsonBody<any>(c.req);
    if (errorResponse) return errorResponse;

    try {
      const ifMatch = getIfMatchHeader(c.req);
      const result = await mutations.updateSkill(id, body, ifMatch);
      c.header('ETag', result.etag);
      return c.json({ success: true, data: result.skill }, 200);
    } catch (err) {
      return handleApiError(c, err);
    }
  });

  app.delete('/api/admin/skills/:id', async (c) => {
    const { mutations } = getServices(c);
    const id = c.req.param('id');
    try {
      const ifMatch = getIfMatchHeader(c.req);
      const result = await mutations.deleteSkill(id, ifMatch);
      c.header('ETag', result.etag);
      return c.json({ success: true }, 200);
    } catch (err) {
      return handleApiError(c, err);
    }
  });

  app.post('/api/admin/skills/reorder', async (c) => {
    const { mutations } = getServices(c);
    const { data: body, errorResponse } = await parseJsonBody<{ orderedIds: string[] }>(c.req);
    if (errorResponse) return errorResponse;

    try {
      const ifMatch = getIfMatchHeader(c.req);
      const result = await mutations.reorderSkills(body!.orderedIds, ifMatch);
      c.header('ETag', result.etag);
      return c.json({ success: true, data: result.skills }, 200);
    } catch (err) {
      return handleApiError(c, err);
    }
  });

  // --- Admin Skill Categories ---
  app.get('/api/admin/skill-categories', async (c) => {
    const { store } = getServices(c);
    await store.ensureInitialized();
    const categoriesObj = await store.getSkillCategories();
    c.header('ETag', categoriesObj?.etag || 'W/"initial"');
    const sorted = [...(categoriesObj?.data || [])].sort((a, b) => a.order - b.order);
    return c.json({ success: true, data: sorted }, 200);
  });

  app.get('/api/admin/skill-categories/:id', async (c) => {
    const { store } = getServices(c);
    await store.ensureInitialized();
    const id = c.req.param('id');
    const categoriesObj = await store.getSkillCategories();
    const category = categoriesObj?.data?.find((cat) => cat.id === id);
    if (!category) {
      return c.json({ success: false, error: `Skill category with id "${id}" not found.`, code: 'NOT_FOUND' }, 404);
    }
    c.header('ETag', categoriesObj?.etag || 'W/"initial"');
    return c.json({ success: true, data: category }, 200);
  });

  app.post('/api/admin/skill-categories', async (c) => {
    const { mutations } = getServices(c);
    const { data: body, errorResponse } = await parseJsonBody<any>(c.req);
    if (errorResponse) return errorResponse;

    try {
      const ifMatch = getIfMatchHeader(c.req);
      const result = await mutations.createSkillCategory(body, ifMatch);
      c.header('ETag', result.etag);
      return c.json({ success: true, data: result.category }, 201);
    } catch (err) {
      return handleApiError(c, err);
    }
  });

  app.put('/api/admin/skill-categories/:id', async (c) => {
    const { mutations } = getServices(c);
    const id = c.req.param('id');
    const { data: body, errorResponse } = await parseJsonBody<any>(c.req);
    if (errorResponse) return errorResponse;

    try {
      const ifMatch = getIfMatchHeader(c.req);
      const result = await mutations.updateSkillCategory(id, body, ifMatch);
      c.header('ETag', result.etag);
      return c.json({ success: true, data: result.category }, 200);
    } catch (err) {
      return handleApiError(c, err);
    }
  });

  app.delete('/api/admin/skill-categories/:id', async (c) => {
    const { mutations } = getServices(c);
    const id = c.req.param('id');
    try {
      const ifMatch = getIfMatchHeader(c.req);
      const result = await mutations.deleteSkillCategory(id, ifMatch);
      c.header('ETag', result.etag);
      return c.json({ success: true }, 200);
    } catch (err) {
      return handleApiError(c, err);
    }
  });

  app.post('/api/admin/skill-categories/reorder', async (c) => {
    const { mutations } = getServices(c);
    const { data: body, errorResponse } = await parseJsonBody<{ orderedIds: string[] }>(c.req);
    if (errorResponse) return errorResponse;

    try {
      const ifMatch = getIfMatchHeader(c.req);
      const result = await mutations.reorderSkillCategories(body!.orderedIds, ifMatch);
      c.header('ETag', result.etag);
      return c.json({ success: true, data: result.categories }, 200);
    } catch (err) {
      return handleApiError(c, err);
    }
  });

  // --- Admin Work Experience ---
  app.get('/api/admin/experience', async (c) => {
    const { store } = getServices(c);
    await store.ensureInitialized();
    const expObj = await store.getExperience();
    c.header('ETag', expObj?.etag || 'W/"initial"');
    const sorted = [...(expObj?.data || [])].sort((a, b) => a.order - b.order);
    return c.json({ success: true, data: sorted }, 200);
  });

  app.get('/api/admin/experience/:id', async (c) => {
    const { store } = getServices(c);
    await store.ensureInitialized();
    const id = c.req.param('id');
    const expObj = await store.getExperience();
    const exp = expObj?.data?.find((e) => e.id === id);
    if (!exp) {
      return c.json({ success: false, error: `Experience with id "${id}" not found.`, code: 'NOT_FOUND' }, 404);
    }
    c.header('ETag', expObj?.etag || 'W/"initial"');
    return c.json({ success: true, data: exp }, 200);
  });

  app.post('/api/admin/experience', async (c) => {
    const { mutations } = getServices(c);
    const { data: body, errorResponse } = await parseJsonBody<any>(c.req);
    if (errorResponse) return errorResponse;

    try {
      const ifMatch = getIfMatchHeader(c.req);
      const result = await mutations.createExperience(body, ifMatch);
      c.header('ETag', result.etag);
      return c.json({ success: true, data: result.experience }, 201);
    } catch (err) {
      return handleApiError(c, err);
    }
  });

  app.put('/api/admin/experience/:id', async (c) => {
    const { mutations } = getServices(c);
    const id = c.req.param('id');
    const { data: body, errorResponse } = await parseJsonBody<any>(c.req);
    if (errorResponse) return errorResponse;

    try {
      const ifMatch = getIfMatchHeader(c.req);
      const result = await mutations.updateExperience(id, body, ifMatch);
      c.header('ETag', result.etag);
      return c.json({ success: true, data: result.experience }, 200);
    } catch (err) {
      return handleApiError(c, err);
    }
  });

  app.delete('/api/admin/experience/:id', async (c) => {
    const { mutations } = getServices(c);
    const id = c.req.param('id');
    try {
      const ifMatch = getIfMatchHeader(c.req);
      const result = await mutations.deleteExperience(id, ifMatch);
      c.header('ETag', result.etag);
      return c.json({ success: true }, 200);
    } catch (err) {
      return handleApiError(c, err);
    }
  });

  app.post('/api/admin/experience/reorder', async (c) => {
    const { mutations } = getServices(c);
    const { data: body, errorResponse } = await parseJsonBody<{ orderedIds: string[] }>(c.req);
    if (errorResponse) return errorResponse;

    try {
      const ifMatch = getIfMatchHeader(c.req);
      const result = await mutations.reorderExperience(body!.orderedIds, ifMatch);
      c.header('ETag', result.etag);
      return c.json({ success: true, data: result.experiences }, 200);
    } catch (err) {
      return handleApiError(c, err);
    }
  });

  // --- Admin Certifications ---
  app.get('/api/admin/certifications', async (c) => {
    const { store } = getServices(c);
    await store.ensureInitialized();
    const certsObj = await store.getCertifications();
    c.header('ETag', certsObj?.etag || 'W/"initial"');
    const sorted = [...(certsObj?.data || [])].sort((a, b) => a.order - b.order);
    return c.json({ success: true, data: sorted }, 200);
  });

  app.get('/api/admin/certifications/:id', async (c) => {
    const { store } = getServices(c);
    await store.ensureInitialized();
    const id = c.req.param('id');
    const certsObj = await store.getCertifications();
    const cert = certsObj?.data?.find((item) => item.id === id);
    if (!cert) {
      return c.json({ success: false, error: `Certification with id "${id}" not found.`, code: 'NOT_FOUND' }, 404);
    }
    c.header('ETag', certsObj?.etag || 'W/"initial"');
    return c.json({ success: true, data: cert }, 200);
  });

  app.post('/api/admin/certifications', async (c) => {
    const { mutations } = getServices(c);
    const { data: body, errorResponse } = await parseJsonBody<any>(c.req);
    if (errorResponse) return errorResponse;

    try {
      const ifMatch = getIfMatchHeader(c.req);
      const result = await mutations.createCertification(body, ifMatch);
      c.header('ETag', result.etag);
      return c.json({ success: true, data: result.certification }, 201);
    } catch (err) {
      return handleApiError(c, err);
    }
  });

  app.put('/api/admin/certifications/:id', async (c) => {
    const { mutations } = getServices(c);
    const id = c.req.param('id');
    const { data: body, errorResponse } = await parseJsonBody<any>(c.req);
    if (errorResponse) return errorResponse;

    try {
      const ifMatch = getIfMatchHeader(c.req);
      const result = await mutations.updateCertification(id, body, ifMatch);
      c.header('ETag', result.etag);
      return c.json({ success: true, data: result.certification }, 200);
    } catch (err) {
      return handleApiError(c, err);
    }
  });

  app.delete('/api/admin/certifications/:id', async (c) => {
    const { mutations } = getServices(c);
    const id = c.req.param('id');
    try {
      const ifMatch = getIfMatchHeader(c.req);
      const result = await mutations.deleteCertification(id, ifMatch);
      c.header('ETag', result.etag);
      return c.json({ success: true }, 200);
    } catch (err) {
      return handleApiError(c, err);
    }
  });

  app.post('/api/admin/certifications/reorder', async (c) => {
    const { mutations } = getServices(c);
    const { data: body, errorResponse } = await parseJsonBody<{ orderedIds: string[] }>(c.req);
    if (errorResponse) return errorResponse;

    try {
      const ifMatch = getIfMatchHeader(c.req);
      const result = await mutations.reorderCertifications(body!.orderedIds, ifMatch);
      c.header('ETag', result.etag);
      return c.json({ success: true, data: result.certifications }, 200);
    } catch (err) {
      return handleApiError(c, err);
    }
  });

  // --- Admin Education ---
  app.get('/api/admin/education', async (c) => {
    const { store } = getServices(c);
    await store.ensureInitialized();
    const eduObj = await store.getEducation();
    c.header('ETag', eduObj?.etag || 'W/"initial"');
    const sorted = [...(eduObj?.data || [])].sort((a, b) => a.order - b.order);
    return c.json({ success: true, data: sorted }, 200);
  });

  app.get('/api/admin/education/:id', async (c) => {
    const { store } = getServices(c);
    await store.ensureInitialized();
    const id = c.req.param('id');
    const eduObj = await store.getEducation();
    const edu = eduObj?.data?.find((item) => item.id === id);
    if (!edu) {
      return c.json({ success: false, error: `Education with id "${id}" not found.`, code: 'NOT_FOUND' }, 404);
    }
    c.header('ETag', eduObj?.etag || 'W/"initial"');
    return c.json({ success: true, data: edu }, 200);
  });

  app.post('/api/admin/education', async (c) => {
    const { mutations } = getServices(c);
    const { data: body, errorResponse } = await parseJsonBody<any>(c.req);
    if (errorResponse) return errorResponse;

    try {
      const ifMatch = getIfMatchHeader(c.req);
      const result = await mutations.createEducation(body, ifMatch);
      c.header('ETag', result.etag);
      return c.json({ success: true, data: result.education }, 201);
    } catch (err) {
      return handleApiError(c, err);
    }
  });

  app.put('/api/admin/education/:id', async (c) => {
    const { mutations } = getServices(c);
    const id = c.req.param('id');
    const { data: body, errorResponse } = await parseJsonBody<any>(c.req);
    if (errorResponse) return errorResponse;

    try {
      const ifMatch = getIfMatchHeader(c.req);
      const result = await mutations.updateEducation(id, body, ifMatch);
      c.header('ETag', result.etag);
      return c.json({ success: true, data: result.education }, 200);
    } catch (err) {
      return handleApiError(c, err);
    }
  });

  app.delete('/api/admin/education/:id', async (c) => {
    const { mutations } = getServices(c);
    const id = c.req.param('id');
    try {
      const ifMatch = getIfMatchHeader(c.req);
      const result = await mutations.deleteEducation(id, ifMatch);
      c.header('ETag', result.etag);
      return c.json({ success: true }, 200);
    } catch (err) {
      return handleApiError(c, err);
    }
  });

  app.post('/api/admin/education/reorder', async (c) => {
    const { mutations } = getServices(c);
    const { data: body, errorResponse } = await parseJsonBody<{ orderedIds: string[] }>(c.req);
    if (errorResponse) return errorResponse;

    try {
      const ifMatch = getIfMatchHeader(c.req);
      const result = await mutations.reorderEducation(body!.orderedIds, ifMatch);
      c.header('ETag', result.etag);
      return c.json({ success: true, data: result.educations }, 200);
    } catch (err) {
      return handleApiError(c, err);
    }
  });

  // --- Admin AI Services ---
  app.get('/api/admin/ai-services', async (c) => {
    const { store } = getServices(c);
    await store.ensureInitialized();
    const obj = await store.getAIServices();
    if (obj) c.header('ETag', obj.etag);
    return c.json({
      success: true,
      data: (obj?.data || []).sort((a, b) => a.order - b.order),
    });
  });

  app.get('/api/admin/ai-services/:id', async (c) => {
    const { store } = getServices(c);
    const id = c.req.param('id');
    await store.ensureInitialized();
    const obj = await store.getAIServices();
    const item = (obj?.data || []).find((s) => s.id === id);
    if (!item) return c.json({ success: false, error: 'AI service not found' }, 404);
    if (obj) c.header('ETag', obj.etag);
    return c.json({ success: true, data: item });
  });

  app.post('/api/admin/ai-services', async (c) => {
    const { mutations } = getServices(c);
    const { data: body, errorResponse } = await parseJsonBody<any>(c.req);
    if (errorResponse) return errorResponse;

    try {
      const ifMatch = getIfMatchHeader(c.req);
      const result = await mutations.createAIService(body, ifMatch);
      c.header('ETag', result.etag);
      return c.json({ success: true, data: result.service }, 201);
    } catch (err) {
      return handleApiError(c, err);
    }
  });

  app.put('/api/admin/ai-services/:id', async (c) => {
    const { mutations } = getServices(c);
    const id = c.req.param('id');
    const { data: body, errorResponse } = await parseJsonBody<any>(c.req);
    if (errorResponse) return errorResponse;

    try {
      const ifMatch = getIfMatchHeader(c.req);
      const result = await mutations.updateAIService(id, body, ifMatch);
      c.header('ETag', result.etag);
      return c.json({ success: true, data: result.service }, 200);
    } catch (err) {
      return handleApiError(c, err);
    }
  });

  app.delete('/api/admin/ai-services/:id', async (c) => {
    const { mutations } = getServices(c);
    const id = c.req.param('id');
    try {
      const ifMatch = getIfMatchHeader(c.req);
      await mutations.deleteAIService(id, ifMatch);
      return c.json({ success: true }, 200);
    } catch (err) {
      return handleApiError(c, err);
    }
  });

  app.post('/api/admin/ai-services/reorder', async (c) => {
    const { mutations } = getServices(c);
    const { data: body, errorResponse } = await parseJsonBody<{ orderedIds: string[] }>(c.req);
    if (errorResponse) return errorResponse;

    try {
      const ifMatch = getIfMatchHeader(c.req);
      const result = await mutations.reorderAIServices(body!.orderedIds, ifMatch);
      c.header('ETag', result.etag);
      return c.json({ success: true, data: result.services }, 200);
    } catch (err) {
      return handleApiError(c, err);
    }
  });

  app.post('/api/admin/ai-services/:id/publish', async (c) => {
    const { mutations, store } = getServices(c);
    const id = c.req.param('id');
    const { data: body } = await parseJsonBody<{ published?: boolean }>(c.req);

    try {
      const ifMatch = getIfMatchHeader(c.req);
      let targetPublished = body?.published;
      if (targetPublished === undefined) {
        const existingObj = await store.getAIServices();
        const item = existingObj?.data.find((s) => s.id === id);
        targetPublished = !(item?.published ?? false);
      }
      const result = await mutations.publishAIService(id, targetPublished, ifMatch);
      c.header('ETag', result.etag);
      return c.json({ success: true, data: result.service }, 200);
    } catch (err) {
      return handleApiError(c, err);
    }
  });

  app.post('/api/admin/ai-services/:id/featured', async (c) => {
    const { mutations } = getServices(c);
    const id = c.req.param('id');

    try {
      const ifMatch = getIfMatchHeader(c.req);
      const result = await mutations.toggleFeaturedAIService(id, ifMatch);
      c.header('ETag', result.etag);
      return c.json({ success: true, data: result.service }, 200);
    } catch (err) {
      return handleApiError(c, err);
    }
  });

  // --- Admin AI Service Categories ---
  app.get('/api/admin/ai-service-categories', async (c) => {
    const { store } = getServices(c);
    await store.ensureInitialized();
    const obj = await store.getAIServiceCategories();
    if (obj) c.header('ETag', obj.etag);
    return c.json({
      success: true,
      data: (obj?.data || []).sort((a, b) => a.order - b.order),
    });
  });

  app.get('/api/admin/ai-service-categories/:id', async (c) => {
    const { store } = getServices(c);
    const id = c.req.param('id');
    await store.ensureInitialized();
    const obj = await store.getAIServiceCategories();
    const item = (obj?.data || []).find((cat) => cat.id === id);
    if (!item) return c.json({ success: false, error: 'Category not found' }, 404);
    if (obj) c.header('ETag', obj.etag);
    return c.json({ success: true, data: item });
  });

  app.post('/api/admin/ai-service-categories', async (c) => {
    const { mutations } = getServices(c);
    const { data: body, errorResponse } = await parseJsonBody<any>(c.req);
    if (errorResponse) return errorResponse;

    try {
      const ifMatch = getIfMatchHeader(c.req);
      const result = await mutations.createAIServiceCategory(body, ifMatch);
      c.header('ETag', result.etag);
      return c.json({ success: true, data: result.category }, 201);
    } catch (err) {
      return handleApiError(c, err);
    }
  });

  app.put('/api/admin/ai-service-categories/:id', async (c) => {
    const { mutations } = getServices(c);
    const id = c.req.param('id');
    const { data: body, errorResponse } = await parseJsonBody<any>(c.req);
    if (errorResponse) return errorResponse;

    try {
      const ifMatch = getIfMatchHeader(c.req);
      const result = await mutations.updateAIServiceCategory(id, body, ifMatch);
      c.header('ETag', result.etag);
      return c.json({ success: true, data: result.category }, 200);
    } catch (err) {
      return handleApiError(c, err);
    }
  });

  app.delete('/api/admin/ai-service-categories/:id', async (c) => {
    const { mutations } = getServices(c);
    const id = c.req.param('id');
    try {
      const ifMatch = getIfMatchHeader(c.req);
      await mutations.deleteAIServiceCategory(id, ifMatch);
      return c.json({ success: true }, 200);
    } catch (err) {
      return handleApiError(c, err);
    }
  });

  app.post('/api/admin/ai-service-categories/reorder', async (c) => {
    const { mutations } = getServices(c);
    const { data: body, errorResponse } = await parseJsonBody<{ orderedIds: string[] }>(c.req);
    if (errorResponse) return errorResponse;

    try {
      const ifMatch = getIfMatchHeader(c.req);
      const result = await mutations.reorderAIServiceCategories(body!.orderedIds, ifMatch);
      c.header('ETag', result.etag);
      return c.json({ success: true, data: result.categories }, 200);
    } catch (err) {
      return handleApiError(c, err);
    }
  });

  // --- Admin Profile, Settings, Resume Generic Put ---
  app.get('/api/admin/profile', async (c) => {
    const { store } = getServices(c);
    await store.ensureInitialized();
    const profile = await store.getProfile();
    if (profile?.etag) {
      c.header('ETag', profile.etag);
    }
    return c.json({
      success: true,
      data: profile?.data,
    });
  });

  app.put('/api/admin/profile', async (c) => {
    const { mutations } = getServices(c);
    const { data: body, errorResponse } = await parseJsonBody<any>(c.req);
    if (errorResponse) return errorResponse;

    try {
      const ifMatch = getIfMatchHeader(c.req);
      const result = await mutations.updateProfile(body, ifMatch);
      c.header('ETag', result.etag);
      return c.json({ success: true, data: result.profile }, 200);
    } catch (err) {
      return handleApiError(c, err);
    }
  });

  app.get('/api/admin/site-settings', async (c) => {
    const { store } = getServices(c);
    await store.ensureInitialized();
    const settingsObj = await store.getSettings();
    if (settingsObj?.etag) {
      c.header('ETag', settingsObj.etag);
    }
    return c.json({
      success: true,
      data: settingsObj?.data,
    });
  });

  app.put('/api/admin/site-settings', async (c) => {
    const { mutations } = getServices(c);
    const { data: body, errorResponse } = await parseJsonBody<any>(c.req);
    if (errorResponse) return errorResponse;

    try {
      const ifMatch = getIfMatchHeader(c.req);
      const result = await mutations.updateSettings(body, ifMatch);
      c.header('ETag', result.etag);
      return c.json({ success: true, data: result.settings }, 200);
    } catch (err) {
      return handleApiError(c, err);
    }
  });

  app.get('/api/admin/resume', async (c) => {
    const { store } = getServices(c);
    await store.ensureInitialized();
    const resumeObj = await store.getResume();
    if (resumeObj?.etag) {
      c.header('ETag', resumeObj.etag);
    }
    return c.json({
      success: true,
      data: resumeObj?.data,
    });
  });

  app.put('/api/admin/resume', async (c) => {
    const { mutations } = getServices(c);
    const { data: body, errorResponse } = await parseJsonBody<any>(c.req);
    if (errorResponse) return errorResponse;

    try {
      const ifMatch = getIfMatchHeader(c.req);
      const result = await mutations.updateResume(body, ifMatch);
      c.header('ETag', result.etag);
      return c.json({ success: true, data: result.resume }, 200);
    } catch (err) {
      return handleApiError(c, err);
    }
  });

  // Helper for structured error responses
  function handleApiError(c: any, err: unknown) {
    if (err instanceof ValidationError) {
      return c.json({ success: false, error: err.message, code: 'VALIDATION_ERROR' }, 400);
    }
    if (err instanceof NotFoundError) {
      return c.json({ success: false, error: err.message, code: 'NOT_FOUND' }, 404);
    }
    if (err instanceof ConcurrencyError) {
      return c.json({ success: false, error: err.message, code: 'CONCURRENCY_CONFLICT' }, 409);
    }
    if (err instanceof ConfigurationError) {
      return c.json({ success: false, error: err.message, code: 'CONFIGURATION_ERROR' }, 500);
    }
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return c.json({ success: false, error: message, code: 'INTERNAL_ERROR' }, 500);
  }

  return app;
}

// Global declaration for in-memory adapter fallback
declare global {
  var __portfolio_memory_adapter: MemoryStorageAdapter | undefined;
}
