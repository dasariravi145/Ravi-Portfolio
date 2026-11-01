import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createPortfolioApp } from '../worker/api';
import { MemoryStorageAdapter } from '../storage/r2StorageAdapter';
import { createTestJwt } from '../auth/accessJwtValidator';
import { SafeHttpUrlSchema } from '../types/portfolio';
import { PublicLayout } from '../components/layout/PublicLayout';
import { MemoryRouter } from 'react-router-dom';

const TEST_SECRET = 'test-verification-secret-32-chars-min';
const TEST_AUD = 'test-access-aud-12345';
const TEST_TEAM_DOMAIN = 'https://dsecops88.cloudflareaccess.com';
const APPROVED_OWNER_EMAIL = 'dasariravid145@gmail.com';

describe('Security Hardening, Reliability & Performance Verification (Prompt 15)', () => {
  let adapter: MemoryStorageAdapter;
  let app: ReturnType<typeof createPortfolioApp>;

  beforeEach(() => {
    adapter = new MemoryStorageAdapter();
    app = createPortfolioApp(adapter);
  });

  // Helper to generate a valid test JWT
  const getValidToken = async (overrides: Record<string, any> = {}) => {
    return createTestJwt(
      {
        iss: TEST_TEAM_DOMAIN,
        aud: TEST_AUD,
        email: APPROVED_OWNER_EMAIL,
        ...overrides,
      },
      TEST_SECRET
    );
  };

  // Helper to make an admin request with Cloudflare Access bindings
  const makeAdminRequest = async (
    path: string,
    options: {
      method?: string;
      token?: string | null;
      useAssertionHeader?: boolean;
      headers?: Record<string, string>;
      body?: any;
      bindings?: Record<string, any>;
    } = {}
  ) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };

    if (options.token) {
      if (options.useAssertionHeader !== false) {
        headers['cf-access-jwt-assertion'] = options.token;
      } else {
        headers['Authorization'] = `Bearer ${options.token}`;
      }
    }

    const env = {
      CF_ACCESS_TEAM_DOMAIN: TEST_TEAM_DOMAIN,
      CF_ACCESS_AUD: TEST_AUD,
      CF_ACCESS_OWNER_EMAIL: APPROVED_OWNER_EMAIL,
      CF_ACCESS_SECRET: TEST_SECRET,
      ENVIRONMENT: 'development',
      ...options.bindings,
    };

    return app.request(
      path,
      {
        method: options.method || 'GET',
        headers,
        body: options.body !== undefined
          ? (typeof options.body === 'string' ? options.body : JSON.stringify(options.body))
          : undefined,
      },
      env as any
    );
  };

  // ==========================================
  // SECTION 19 COMPREHENSIVE SECURITY TESTS
  // ==========================================

  // 1. Missing auth rejected
  it('1. should reject requests with missing auth token with HTTP 401', async () => {
    const res = await makeAdminRequest('/api/admin/skills');
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.code).toBe('UNAUTHORIZED');
  });

  // 2. Invalid JWT rejected
  it('2. should reject requests with malformed or tampered JWT with HTTP 401', async () => {
    const res = await makeAdminRequest('/api/admin/skills', {
      token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.tampered.signature',
    });
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.code).toBe('INVALID_TOKEN');
  });

  // 3. Expired JWT rejected
  it('3. should reject expired JWTs with HTTP 401', async () => {
    const expiredToken = await getValidToken({
      exp: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
    });
    const res = await makeAdminRequest('/api/admin/skills', { token: expiredToken });
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.code).toBe('EXPIRED_TOKEN');
  });

  // 4. Wrong audience rejected
  it('4. should reject JWT with wrong audience with HTTP 401', async () => {
    const wrongAudToken = await getValidToken({
      aud: 'unauthorized-audience-id-999',
    });
    const res = await makeAdminRequest('/api/admin/skills', { token: wrongAudToken });
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.code).toBe('INVALID_AUDIENCE');
  });

  // 5. Unapproved identity rejected
  it('5. should reject valid JWT from unapproved email identity with HTTP 403', async () => {
    const attackerToken = await getValidToken({
      email: 'intruder@external-domain.com',
    });
    const res = await makeAdminRequest('/api/admin/skills', { token: attackerToken });
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.code).toBe('FORBIDDEN_IDENTITY');
  });

  // 6. Unauthorized writes rejected
  it('6. should reject unauthorized writes and mutations with HTTP 401', async () => {
    const postRes = await makeAdminRequest('/api/admin/skills', {
      method: 'POST',
      body: { name: 'Malicious Skill', categoryId: 'cat-1', proficiencyLevel: 90 },
    });
    expect(postRes.status).toBe(401);

    const deleteRes = await makeAdminRequest('/api/admin/skills/skill-1', {
      method: 'DELETE',
    });
    expect(deleteRes.status).toBe(401);
  });

  // 7. Draft records not publicly accessible
  it('7. should strictly hide draft/unpublished projects from public APIs and URLs', async () => {
    const token = await getValidToken();

    // Create a draft project (published: false)
    const draftPayload = {
      title: 'Confidential Internal Platform',
      slug: 'confidential-internal-platform',
      summary: 'Secret pipeline under NDA',
      category: 'Cloud Infrastructure & SRE',
      deploymentStatus: 'In Development',
      evidenceStatus: 'Verified',
      techStack: ['Kubernetes'],
      published: false,
      featured: false,
      displayOrder: 1,
    };

    const createRes = await makeAdminRequest('/api/admin/projects', {
      method: 'POST',
      token,
      body: draftPayload,
    });
    expect(createRes.status).toBe(201);

    // Verify public content API excludes draft
    const unifiedRes = await app.request('/api/public/content');
    const unifiedJson = await unifiedRes.json();
    const publicDraftInUnified = unifiedJson.data.projects.find(
      (p: any) => p.slug === 'confidential-internal-platform'
    );
    expect(publicDraftInUnified).toBeUndefined();

    // Verify public projects list excludes draft
    const projectsRes = await app.request('/api/public/projects');
    const projectsJson = await projectsRes.json();
    const publicDraftInList = projectsJson.data.find(
      (p: any) => p.slug === 'confidential-internal-platform'
    );
    expect(publicDraftInList).toBeUndefined();

    // Verify public direct slug URL returns 404
    const directSlugRes = await app.request('/api/public/projects/confidential-internal-platform');
    expect(directSlugRes.status).toBe(404);
  });

  // 8. Unpublished resume download blocked
  it('8. should block public resume download and redact private metadata when unpublished', async () => {
    const token = await getValidToken();

    // Unpublish resume via admin endpoint POST /api/admin/resume/publish
    const patchRes = await makeAdminRequest('/api/admin/resume/publish', {
      method: 'POST',
      token,
      body: { published: false },
    });
    expect(patchRes.status).toBe(200);

    // Verify download returns 404
    const downloadRes = await app.request('/api/public/resume/download');
    expect(downloadRes.status).toBe(404);
    const downloadJson = await downloadRes.json();
    expect(downloadJson.code).toBe('NOT_FOUND');

    // Verify public resume summary is redacted
    const summaryRes = await app.request('/api/public/resume');
    expect(summaryRes.status).toBe(200);
    const summaryJson = await summaryRes.json();
    expect(summaryJson.data.published).toBe(false);
    expect(summaryJson.data.activeResume).toBeNull();
    expect(summaryJson.data.fileSizeBytes).toBe(0);

    // Verify direct media stream to resume path is forbidden
    const streamRes = await app.request('/api/public/media/resume/active/Ravi_Dasari_Resume.pdf');
    expect(streamRes.status).toBe(403);
    const streamJson = await streamRes.json();
    expect(streamJson.code).toBe('FORBIDDEN');
  });

  // 9. Invalid image rejected
  it('9. should reject executable binaries and corrupt files uploaded as images with HTTP 400', async () => {
    const token = await getValidToken();

    // Construct fake Windows PE executable header disguised with .png filename
    const mzBytes = new Uint8Array([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00]);
    const res = await app.request(
      '/api/admin/profile/photo',
      {
        method: 'POST',
        headers: {
          'cf-access-jwt-assertion': token,
          'Content-Type': 'image/png',
          'x-filename': 'malware.png',
        },
        body: mzBytes.buffer,
      },
      {
        CF_ACCESS_TEAM_DOMAIN: TEST_TEAM_DOMAIN,
        CF_ACCESS_AUD: TEST_AUD,
        CF_ACCESS_OWNER_EMAIL: APPROVED_OWNER_EMAIL,
        CF_ACCESS_SECRET: TEST_SECRET,
      } as any
    );

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.code).toBe('VALIDATION_ERROR');
    expect(json.error).toMatch(/prohibited|signature/i);
  });

  // 10. Oversized upload rejected
  it('10. should reject oversized binary uploads with HTTP 400 or 413', async () => {
    const token = await getValidToken();

    // Test Content-Length exceeding 12 MB limit directly
    const res = await app.request(
      '/api/admin/profile/photo',
      {
        method: 'POST',
        headers: {
          'cf-access-jwt-assertion': token,
          'Content-Type': 'image/png',
          'Content-Length': (15 * 1024 * 1024).toString(), // 15 MB
        },
        body: new ArrayBuffer(10),
      },
      {
        CF_ACCESS_TEAM_DOMAIN: TEST_TEAM_DOMAIN,
        CF_ACCESS_AUD: TEST_AUD,
        CF_ACCESS_OWNER_EMAIL: APPROVED_OWNER_EMAIL,
        CF_ACCESS_SECRET: TEST_SECRET,
      } as any
    );

    expect(res.status).toBe(413);
    const json = await res.json();
    expect(json.code).toBe('PAYLOAD_TOO_LARGE');
  });

  // 11. MIME spoofing rejected
  it('11. should detect and reject MIME type spoofing with HTTP 400', async () => {
    const token = await getValidToken();

    // Plain text content claiming to be image/jpeg
    const fakeJpegBytes = new TextEncoder().encode('This is plain text pretending to be a JPEG image.');
    const res = await app.request(
      '/api/admin/profile/photo',
      {
        method: 'POST',
        headers: {
          'cf-access-jwt-assertion': token,
          'Content-Type': 'image/jpeg',
          'x-filename': 'avatar.jpg',
        },
        body: fakeJpegBytes.buffer,
      },
      {
        CF_ACCESS_TEAM_DOMAIN: TEST_TEAM_DOMAIN,
        CF_ACCESS_AUD: TEST_AUD,
        CF_ACCESS_OWNER_EMAIL: APPROVED_OWNER_EMAIL,
        CF_ACCESS_SECRET: TEST_SECRET,
      } as any
    );

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.code).toBe('VALIDATION_ERROR');
    expect(json.error).toMatch(/JPEG structure|signature/i);
  });

  // 12. Unsafe URL rejected (protocol injection blocked)
  it('12. should reject protocol injection (javascript: / data:) in URL fields with HTTP 400', async () => {
    const token = await getValidToken();

    // Attempt to inject javascript: protocol in project demoUrl
    const maliciousPayload = {
      title: 'XSS Attack Vector',
      slug: 'xss-attack-vector',
      summary: 'Testing javascript protocol rejection',
      category: 'DevSecOps & Cloud',
      deploymentStatus: 'In Development',
      evidenceStatus: 'Verified',
      skills: ['Security'],
      demoUrl: 'javascript:alert(document.cookie)',
      order: 1,
    };

    const res = await makeAdminRequest('/api/admin/projects', {
      method: 'POST',
      token,
      body: maliciousPayload,
    });

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.code).toBe('VALIDATION_ERROR');
  });

  // 13. Stored XSS blocked
  it('13. should ensure SafeHttpUrlSchema rejects data: protocols and script schemes', () => {
    expect(() => SafeHttpUrlSchema.parse('javascript:alert(1)')).toThrow();
    expect(() => SafeHttpUrlSchema.parse('data:text/html,<script>alert(1)</script>')).toThrow();
    expect(() => SafeHttpUrlSchema.parse('vbscript:msgbox(1)')).toThrow();
    expect(SafeHttpUrlSchema.parse('https://ravi-portfolio.dsecops88.online')).toBe('https://ravi-portfolio.dsecops88.online');
    expect(SafeHttpUrlSchema.parse('http://localhost:3000')).toBe('http://localhost:3000');
  });

  // 14. Open redirect / malicious schema blocked
  it('14. should block open redirect style and protocol-relative URLs', () => {
    expect(() => SafeHttpUrlSchema.parse('//malicious-site.com')).toThrow();
    expect(() => SafeHttpUrlSchema.parse('/relative-path')).toThrow();
    expect(() => SafeHttpUrlSchema.parse('ftp://malicious.com/payload')).toThrow();
  });

  // 15. Revision conflict handled (409)
  it('15. should reject concurrent modification with stale ETag with HTTP 409', async () => {
    const token = await getValidToken();

    // Fetch existing skills to target a valid entity
    const listRes = await makeAdminRequest('/api/admin/skills', { token });
    const skills = (await listRes.json()).data;
    const targetSkill = skills[0];

    const res = await makeAdminRequest(`/api/admin/skills/${targetSkill.id}`, {
      method: 'PUT',
      token,
      headers: { 'If-Match': 'W/"stale-revision-tag-999"' },
      body: {
        ...targetSkill,
        name: 'Updated Skill Name',
      },
    });

    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.code).toBe('CONCURRENCY_CONFLICT');
  });

  // 16. Corrupt JSON handled gracefully
  it('16. should gracefully handle malformed JSON syntax with HTTP 400', async () => {
    const token = await getValidToken();

    const res = await makeAdminRequest('/api/admin/skills', {
      method: 'POST',
      token,
      body: '{ "invalidJson": true, syntaxError: ',
    });

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.code).toBe('BAD_REQUEST');
  });

  // 17. Missing R2 object handled (404)
  it('17. should return HTTP 404 for missing media asset in R2 storage', async () => {
    const res = await app.request('/api/public/media/media/projects/non-existent-image.webp');
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.code).toBe('NOT_FOUND');
  });

  // 18. Private admin responses not cached publicly
  it('18. should ensure private admin endpoints enforce no-store Cache-Control header', async () => {
    const token = await getValidToken();
    const res = await makeAdminRequest('/api/admin/skills', { token });

    expect(res.status).toBe(200);
    const cacheControl = res.headers.get('Cache-Control');
    expect(cacheControl).toContain('no-store');
    expect(cacheControl).toContain('no-cache');
    expect(res.headers.get('Pragma')).toBe('no-cache');
  });

  // 19. Public content visibility changes respected
  it('19. should immediately reflect public content visibility changes without rebuild', async () => {
    const token = await getValidToken();

    // 1. Create a draft project
    const draftPayload = {
      title: 'Visibility Toggle Test Platform',
      slug: 'visibility-toggle-test',
      summary: 'Dynamic visibility verification',
      category: 'Cloud Infrastructure & SRE',
      deploymentStatus: 'In Development',
      evidenceStatus: 'Verified',
      techStack: ['Docker'],
      published: false,
      featured: false,
      displayOrder: 1,
    };

    const createRes = await makeAdminRequest('/api/admin/projects', {
      method: 'POST',
      token,
      body: draftPayload,
    });
    expect(createRes.status).toBe(201);
    const createdProject = (await createRes.json()).data;
    const projectEtag = createRes.headers.get('ETag') || 'W/"initial"';

    // Verify not visible publicly
    let publicRes = await app.request('/api/public/projects/visibility-toggle-test');
    expect(publicRes.status).toBe(404);

    // 2. Publish the project
    const updateRes = await makeAdminRequest(`/api/admin/projects/${createdProject.id}`, {
      method: 'PUT',
      token,
      headers: { 'If-Match': projectEtag },
      body: {
        ...draftPayload,
        published: true,
      },
    });
    expect(updateRes.status).toBe(200);

    // 3. Verify immediately visible on public API without rebuild
    publicRes = await app.request('/api/public/projects/visibility-toggle-test');
    expect(publicRes.status).toBe(200);
    const publicData = (await publicRes.json()).data;
    expect(publicData.title).toBe('Visibility Toggle Test Platform');
    expect(publicData.published).toBe(true);
  });

  // 20. No production development-auth bypass
  it('20. should strictly require Access JWT in production and prohibit static secret bypass', async () => {
    // Attempt to access with static admin secret header in production mode
    const res = await app.request(
      '/api/admin/skills',
      {
        method: 'GET',
        headers: {
          'x-admin-secret': 'dev-admin-secret-bypass',
        },
      },
      {
        ENVIRONMENT: 'production',
        ADMIN_API_SECRET: 'dev-admin-secret-bypass',
        ADMIN_SESSION_SECRET: 'production-super-secure-session-secret-key-64-bytes-entropy!',
        CF_ACCESS_TEAM_DOMAIN: TEST_TEAM_DOMAIN,
        CF_ACCESS_AUD: TEST_AUD,
        CF_ACCESS_OWNER_EMAIL: APPROVED_OWNER_EMAIL,
      } as any
    );

    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.code).toBe('UNAUTHORIZED');
  });

  // ==========================================
  // ADDITIONAL SECURITY & RELIABILITY DEFENSES
  // ==========================================

  // 21. Path traversal defense
  it('21. should reject path traversal attempts on media stream with HTTP 400', async () => {
    const dotDotRes = await app.request('/api/public/media/subfolder..traversal.png');
    expect(dotDotRes.status).toBe(400);
    expect((await dotDotRes.json()).code).toBe('INVALID_PATH');

    const nullByteRes = await app.request('/api/public/media/media/image%00.png');
    expect(nullByteRes.status).toBe(400);
    expect((await nullByteRes.json()).code).toBe('INVALID_PATH');

    const backslashRes = await app.request('/api/public/media/media%5Csecret.png');
    expect(backslashRes.status).toBe(400);
    expect((await backslashRes.json()).code).toBe('INVALID_PATH');
  });

  // 22. Global security headers verification
  it('22. should set comprehensive defense-in-depth security headers on all responses', async () => {
    const res = await app.request('/api/health');
    expect(res.status).toBe(200);
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(res.headers.get('X-Frame-Options')).toBe('DENY');
    expect(res.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
    expect(res.headers.get('Permissions-Policy')).toContain('camera=()');
    expect(res.headers.get('Content-Security-Policy')).toContain("default-src 'self'");
  });

  // 23. Sliding-window rate limiter
  it('23. should rate limit requests and return HTTP 429 when threshold exceeded', async () => {
    // We send requests with x-test-rate-limit: 3 to test the sliding window cleanly
    const headers = { 'x-test-rate-limit': '3' };

    const res1 = await app.request('/api/health', { headers });
    expect(res1.status).toBe(200);

    const res2 = await app.request('/api/health', { headers });
    expect(res2.status).toBe(200);

    const res3 = await app.request('/api/health', { headers });
    expect(res3.status).toBe(200);

    // 4th request exceeds limit
    const res4 = await app.request('/api/health', { headers });
    expect(res4.status).toBe(429);
    expect(res4.headers.get('Retry-After')).toBe('60');
    const json = await res4.json();
    expect(json.code).toBe('RATE_LIMIT_EXCEEDED');
  });

  // 24. WCAG 2.2 AA Skip Link verification in PublicLayout
  it('24. should render accessible skip-to-content bypass link in PublicLayout', () => {
    render(
      <MemoryRouter>
        <PublicLayout />
      </MemoryRouter>
    );

    const skipLink = screen.getByRole('link', { name: /skip to main content/i });
    expect(skipLink).toBeDefined();
    expect(skipLink.getAttribute('href')).toBe('#main-content');

    const mainElement = document.getElementById('main-content');
    expect(mainElement).not.toBeNull();
    expect(mainElement?.getAttribute('tabIndex')).toBe('-1');
  });
});
