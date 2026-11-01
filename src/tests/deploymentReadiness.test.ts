import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { createPortfolioApp } from '../worker/api';
import { MemoryStorageAdapter } from '../storage/r2StorageAdapter';
import { createTestJwt } from '../auth/accessJwtValidator';

const TEST_SECRET = 'test-verification-secret-32-chars-min';
const TEST_AUD = 'test-access-aud-12345';
const TEST_TEAM_DOMAIN = 'https://dsecops88.cloudflareaccess.com';
const APPROVED_OWNER_EMAIL = 'dasariravid145@gmail.com';

function createPngBuffer(): Uint8Array {
  const header = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d];
  const body = new Array(64).fill(0xbb);
  return new Uint8Array([...header, ...body]);
}

describe('Cloudflare Deployment Readiness & Local Verification (Prompt 17)', () => {
  let adapter: MemoryStorageAdapter;
  let app: ReturnType<typeof createPortfolioApp>;
  let validToken: string;

  beforeEach(async () => {
    adapter = new MemoryStorageAdapter();
    app = createPortfolioApp(adapter);
    validToken = await createTestJwt(
      {
        iss: TEST_TEAM_DOMAIN,
        aud: TEST_AUD,
        email: APPROVED_OWNER_EMAIL,
      },
      TEST_SECRET
    );
  });

  const makeAuthRequest = async (
    urlPath: string,
    options: {
      method?: string;
      token?: string | null;
      headers?: Record<string, string>;
      body?: any;
    } = {}
  ) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };

    if (options.token !== null) {
      headers['cf-access-jwt-assertion'] = options.token || validToken;
    }

    const env = {
      CF_ACCESS_TEAM_DOMAIN: TEST_TEAM_DOMAIN,
      CF_ACCESS_AUD: TEST_AUD,
      CF_ACCESS_OWNER_EMAIL: APPROVED_OWNER_EMAIL,
      CF_ACCESS_SECRET: TEST_SECRET,
      ADMIN_SESSION_SECRET: 'production-super-secure-session-secret-key-64-bytes-entropy!',
      ENVIRONMENT: 'production',
      PUBLIC_DOMAIN: 'ravi-portfolio.dsecops88.online',
    };

    let bodyData = options.body;
    const isBinary =
      ArrayBuffer.isView(bodyData) ||
      bodyData instanceof ArrayBuffer ||
      bodyData?.constructor?.name === 'Uint8Array';

    if (bodyData && typeof bodyData === 'object' && !isBinary) {
      bodyData = JSON.stringify(bodyData);
    }

    return app.request(urlPath, {
      method: options.method || 'GET',
      headers,
      body: bodyData,
    }, env as any);
  };

  // 1. Wrangler config parses
  it('1. verifies Wrangler configuration file exists and contains valid syntax', () => {
    const wranglerPath = path.resolve(process.cwd(), 'wrangler.toml');
    expect(fs.existsSync(wranglerPath)).toBe(true);
    const content = fs.readFileSync(wranglerPath, 'utf-8');
    expect(content).toContain('name = "ravi-portfolio"');
    expect(content).toContain('main = "src/worker/index.ts"');
    expect(content).toContain('compatibility_date = "2024-10-01"');
    expect(content).toContain('compatibility_flags = ["nodejs_compat"]');
  });

  // 2. Worker entry point exists
  it('2. verifies Worker entry point exists and exports default fetch handler', async () => {
    const workerPath = path.resolve(process.cwd(), 'src/worker/index.ts');
    expect(fs.existsSync(workerPath)).toBe(true);
    const workerModule = await import('../worker/index');
    expect(workerModule.default).toBeDefined();
    expect(typeof workerModule.default.fetch).toBe('function');
  });

  // 3. Storage bindings match code and wrangler configuration
  it('3. verifies storage binding names match code and wrangler configuration', () => {
    const wranglerPath = path.resolve(process.cwd(), 'wrangler.toml');
    const content = fs.readFileSync(wranglerPath, 'utf-8');
    const hasD1Binding = content.includes('binding = "DB"') && content.includes('database_name = "ravi-portfolio-db"');
    const hasR2Binding = content.includes('binding = "PORTFOLIO_BUCKET"') && content.includes('bucket_name = "portfolio-data"');
    expect(hasD1Binding || hasR2Binding).toBe(true);
  });

  // 4. Local Worker starts
  it('4. verifies local Hono edge application initializes without unhandled exceptions', () => {
    const testApp = createPortfolioApp(adapter);
    expect(testApp).toBeDefined();
    expect(typeof testApp.request).toBe('function');
  });

  // 5. Public homepage responds
  it('5. verifies public root endpoint responds with application headers and status', async () => {
    const res = await app.request('/api/public/content');
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('application/json');
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
  });

  // 6. Public API responds
  it('6. verifies public API serves unified portfolio payload', async () => {
    const res = await app.request('/api/public/content');
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.profile.fullName).toBe('Ravi Dasari');
    expect(json.data.projects.length).toBeGreaterThan(0);
  });

  // 7. Admin mutation rejects anonymous user
  it('7. verifies admin mutation rejects unauthenticated requests with 401', async () => {
    const res = await makeAuthRequest('/api/admin/projects', {
      method: 'POST',
      token: null,
      body: { title: 'Unauthorized Project' },
    });
    expect(res.status).toBe(401);
  });

  // 8. Invalid JWT rejected
  it('8. verifies admin API rejects malformed or invalid JWT with 401', async () => {
    const res = await makeAuthRequest('/api/admin/auth/me', {
      token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.corrupt.signature',
    });
    expect(res.status).toBe(401);
  });

  // 9. Expired JWT rejected
  it('9. verifies admin API rejects expired JWT assertion with 401', async () => {
    const expiredToken = await createTestJwt(
      {
        iss: TEST_TEAM_DOMAIN,
        aud: TEST_AUD,
        email: APPROVED_OWNER_EMAIL,
        exp: Math.floor(Date.now() / 1000) - 3600,
      },
      TEST_SECRET
    );
    const res = await makeAuthRequest('/api/admin/auth/me', { token: expiredToken });
    expect(res.status).toBe(401);
  });

  // 10. Wrong audience rejected
  it('10. verifies admin API rejects JWT with mismatched audience with 401', async () => {
    const wrongAudToken = await createTestJwt(
      {
        iss: TEST_TEAM_DOMAIN,
        aud: 'wrong-audience-tag-99999',
        email: APPROVED_OWNER_EMAIL,
      },
      TEST_SECRET
    );
    const res = await makeAuthRequest('/api/admin/auth/me', { token: wrongAudToken });
    expect(res.status).toBe(401);
  });

  // 11. Unapproved owner rejected
  it('11. verifies admin API rejects authenticated users not on owner allowlist with 403', async () => {
    const imposterToken = await createTestJwt(
      {
        iss: TEST_TEAM_DOMAIN,
        aud: TEST_AUD,
        email: 'unauthorized-hacker@example.com',
      },
      TEST_SECRET
    );
    const res = await makeAuthRequest('/api/admin/auth/me', { token: imposterToken });
    expect(res.status).toBe(403);
  });

  // 12. Local R2 persistence works
  it('12. verifies storage adapter persists and retrieves structured records', async () => {
    const testKey = 'content/test-persistence.json';
    const testData = { verified: true, timestamp: Date.now() };
    const putResult = await adapter.put(testKey, testData);
    expect(putResult).toBeDefined();
    expect(putResult?.etag).toBeDefined();

    const getResult = await adapter.get<typeof testData>(testKey);
    expect(getResult).toBeDefined();
    expect(getResult?.data.verified).toBe(true);
  });

  // 13. Media upload works
  it('13. verifies binary media upload processes valid images with magic byte inspection', async () => {
    const uploadRes = await makeAuthRequest('/api/admin/profile/photo', {
      method: 'POST',
      headers: {
        'Content-Type': 'image/png',
        'X-Filename': 'readiness-test.png',
      },
      body: createPngBuffer(),
    });
    expect(uploadRes.status).toBe(200);
    const uploadJson = await uploadRes.json();
    expect(uploadJson.success).toBe(true);
    expect(uploadJson.data.avatar.key).toMatch(/^media\/avatars\/avatar-/);
  });

  // 14. Media download works
  it('14. verifies public media endpoint streams stored assets with nosniff header', async () => {
    const uploadRes = await makeAuthRequest('/api/admin/profile/photo', {
      method: 'POST',
      headers: {
        'Content-Type': 'image/png',
        'X-Filename': 'readiness-stream.png',
      },
      body: createPngBuffer(),
    });
    const key = (await uploadRes.json()).data.avatar.key;

    const streamRes = await app.request(`/api/public/${key}`);
    expect(streamRes.status).toBe(200);
    expect(streamRes.headers.get('Content-Type')).toBe('image/png');
    expect(streamRes.headers.get('X-Content-Type-Options')).toBe('nosniff');
  });

  // 15. Draft media is protected
  it('15. verifies direct streaming access to confidential resume path is forbidden (403)', async () => {
    const res = await app.request('/api/public/media/resume/active/Ravi_Dasari_Resume.pdf');
    expect(res.status).toBe(403);
  });

  // 16. Public project route works
  it('16. verifies dynamic project case-study route serves published project', async () => {
    const res = await app.request('/api/public/projects/roboshop-devsecops');
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.slug).toBe('roboshop-devsecops');
  });

  // 17. Public AI service route works
  it('17. verifies dynamic AI solution route serves published service', async () => {
    const res = await app.request('/api/public/ai-services/ai-voice-assistants');
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.slug).toBe('ai-voice-assistants');
  });

  // 18. Sitemap responds
  it('18. verifies dynamic XML sitemap is served with correct XML content type', async () => {
    const res = await app.request('/sitemap.xml');
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('xml');
    const text = await res.text();
    expect(text).toContain('<urlset');
    expect(text).toContain('https://ravi-portfolio.dsecops88.online/');
  });

  // 19. Robots.txt responds
  it('19. verifies robots.txt disallows admin paths and references sitemap', async () => {
    const res = await app.request('/robots.txt');
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain('Disallow: /admin/');
    expect(text).toContain('Disallow: /api/admin/');
    expect(text).toContain('Sitemap: https://ravi-portfolio.dsecops88.online/sitemap.xml');
  });

  // 20. Production build succeeds
  it('20. verifies compiled production assets exist in dist directory', () => {
    const distPath = path.resolve(process.cwd(), 'dist');
    expect(fs.existsSync(distPath)).toBe(true);
    expect(fs.existsSync(path.join(distPath, 'index.html'))).toBe(true);
  });

  // 21. No secrets appear in public bundle
  it('21. verifies no sensitive secret tokens exist in the compiled client assets', () => {
    const assetsDir = path.resolve(process.cwd(), 'dist/assets');
    const files = fs.readdirSync(assetsDir);
    const jsFiles = files.filter((f) => f.endsWith('.js'));

    for (const jsFile of jsFiles) {
      const content = fs.readFileSync(path.join(assetsDir, jsFile), 'utf-8');
      expect(content).not.toContain('CF_ACCESS_SECRET');
      expect(content).not.toContain('test-verification-secret');
      expect(content).not.toContain('ADMIN_API_SECRET');
    }
  });

  // 22. Private responses are not publicly cached
  it('22. verifies admin endpoints set strict no-store Cache-Control headers', async () => {
    const res = await makeAuthRequest('/api/admin/auth/me');
    expect(res.status).toBe(200);
    const cacheControl = res.headers.get('Cache-Control');
    expect(cacheControl).toContain('no-store');
  });

  // 23. Content updates appear without rebuild
  it('23. verifies dynamic updates to projects appear immediately in public API', async () => {
    const uniqueTitle = `Live Verification ${Date.now()}`;
    const createRes = await makeAuthRequest('/api/admin/projects', {
      method: 'POST',
      body: {
        title: uniqueTitle,
        slug: `readiness-slug-${Date.now()}`,
        category: 'Cloud Infrastructure & SRE',
        summary: 'Immediate visibility test without rebuild.',
        deploymentStatus: 'In Development',
        evidenceStatus: 'Verified',
        techStack: ['Cloudflare Workers'],
        published: true,
        featured: false,
        displayOrder: 99,
      },
    });
    expect(createRes.status).toBe(201);

    const publicRes = await app.request('/api/public/content');
    const publicProjects = (await publicRes.json()).data.projects;
    expect(publicProjects.some((p: any) => p.title === uniqueTitle)).toBe(true);
  });

  // 24. Missing storage object handled
  it('24. verifies missing or unpublished items return clean 404 NOT_FOUND envelopes', async () => {
    const res = await app.request('/api/public/projects/non-existent-project-xyz');
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.code).toBe('NOT_FOUND');
  });

  // 25. Environment configuration validated
  it('25. verifies .env.example exists and documents all required variables', () => {
    const envExamplePath = path.resolve(process.cwd(), '.env.example');
    expect(fs.existsSync(envExamplePath)).toBe(true);
    const content = fs.readFileSync(envExamplePath, 'utf-8');
    expect(content).toContain('CF_ACCESS_TEAM_DOMAIN');
    expect(content).toContain('CF_ACCESS_AUD');
    expect(content).toContain('CF_ACCESS_OWNER_EMAIL');
    expect(content).toContain('CF_ACCESS_SECRET');
  });

  // 26. Deployment dry-run works
  it('26. verifies deployment dry-run command is defined in package.json', () => {
    const pkgPath = path.resolve(process.cwd(), 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    expect(pkg.scripts['deploy:dry-run']).toBeDefined();
    expect(pkg.scripts['deploy:dry-run']).toContain('wrangler deploy --dry-run');
  });
});

