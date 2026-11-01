import { describe, it, expect, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { createPortfolioApp } from '../worker/api';
import { MemoryStorageAdapter } from '../storage/r2StorageAdapter';
import { createTestJwt } from '../auth/accessJwtValidator';

describe('Pre-Deployment Configuration & Authentication Security Hardening', () => {
  let adapter: MemoryStorageAdapter;
  let app: ReturnType<typeof createPortfolioApp>;

  const ROTATED_DEV_SECRET = '64-char-hex-rotated-dev-secret-abcdef1234567890abcdef1234567890';
  const PRODUCTION_JWT_SECRET = 'production-cloudflare-access-verification-secret-32-chars-min';
  const PRODUCTION_SESSION_SECRET = 'super-secure-production-session-secret-key-32-chars-minimum!';
  const TEAM_DOMAIN = 'https://dsecops88.cloudflareaccess.com';
  const OWNER_EMAIL = 'dasariravid145@gmail.com';
  const AUDIENCE = 'cloudflare-access-application-aud-tag-99999';

  beforeEach(() => {
    adapter = new MemoryStorageAdapter();
    app = createPortfolioApp(adapter);
  });

  // 1. Verify wrangler.toml does not contain tracked ADMIN_API_SECRET
  it('1. verifies wrangler.toml does not contain hardcoded ADMIN_API_SECRET or dev-admin-secret-key', () => {
    const wranglerContent = fs.readFileSync(path.resolve(process.cwd(), 'wrangler.toml'), 'utf-8');
    expect(wranglerContent).not.toContain('dev-admin-secret-key');
    expect(wranglerContent).not.toContain('ADMIN_API_SECRET');
  });

  // 2. Verify gitignore excludes .dev.vars
  it('2. verifies .gitignore excludes .dev.vars and .dev.vars.local', () => {
    const gitignoreContent = fs.readFileSync(path.resolve(process.cwd(), '.gitignore'), 'utf-8');
    expect(gitignoreContent).toContain('.dev.vars');
    expect(gitignoreContent).toContain('.dev.vars.local');
  });

  // 3. Verify previous exposed development secret is rejected
  it('3. rejects the previously exposed secret "dev-admin-secret-key" in development', async () => {
    const devEnv = {
      ENVIRONMENT: 'development',
      ADMIN_API_SECRET: ROTATED_DEV_SECRET,
      CF_ACCESS_TEAM_DOMAIN: TEAM_DOMAIN,
      CF_ACCESS_OWNER_EMAIL: OWNER_EMAIL,
    };

    const res = await app.request(
      '/api/admin/auth/me',
      {
        method: 'GET',
        headers: {
          Authorization: 'Bearer dev-admin-secret-key',
        },
      },
      devEnv as any
    );

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  // 4. Verify development authentication works with rotated secret
  it('4. accepts the rotated secret in development via Bearer header and session cookie', async () => {
    const devEnv = {
      ENVIRONMENT: 'development',
      ADMIN_API_SECRET: ROTATED_DEV_SECRET,
      CF_ACCESS_TEAM_DOMAIN: TEAM_DOMAIN,
      CF_ACCESS_OWNER_EMAIL: OWNER_EMAIL,
    };

    // Bearer header
    const bearerRes = await app.request(
      '/api/admin/auth/me',
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${ROTATED_DEV_SECRET}`,
        },
      },
      devEnv as any
    );

    expect(bearerRes.status).toBe(200);
    const bearerBody = await bearerRes.json();
    expect(bearerBody.success).toBe(true);
    expect(bearerBody.user.email).toBe(OWNER_EMAIL);

    // Session cookie
    const cookieRes = await app.request(
      '/api/admin/auth/me',
      {
        method: 'GET',
        headers: {
          Cookie: `portfolio_admin_session=${ROTATED_DEV_SECRET}`,
        },
      },
      devEnv as any
    );

    expect(cookieRes.status).toBe(200);
    const cookieBody = await cookieRes.json();
    expect(cookieBody.success).toBe(true);
  });

  // 5. Verify development authentication cannot be used in production
  it('5. strictly prohibits development secret bypass when ENVIRONMENT is production', async () => {
    const prodEnv = {
      ENVIRONMENT: 'production',
      ADMIN_API_SECRET: ROTATED_DEV_SECRET,
      ADMIN_SESSION_SECRET: PRODUCTION_SESSION_SECRET,
      CF_ACCESS_SECRET: PRODUCTION_JWT_SECRET,
      CF_ACCESS_TEAM_DOMAIN: TEAM_DOMAIN,
      CF_ACCESS_AUD: AUDIENCE,
      CF_ACCESS_OWNER_EMAIL: OWNER_EMAIL,
    };

    // Attempt Bearer bypass in production
    const bearerRes = await app.request(
      '/api/admin/auth/me',
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${ROTATED_DEV_SECRET}`,
        },
      },
      prodEnv as any
    );

    expect(bearerRes.status).toBe(401);
    const bearerBody = await bearerRes.json();
    expect(bearerBody.code).toBe('INVALID_TOKEN');

    // Attempt cookie bypass in production
    const cookieRes = await app.request(
      '/api/admin/auth/me',
      {
        method: 'GET',
        headers: {
          Cookie: `portfolio_admin_session=${ROTATED_DEV_SECRET}`,
        },
      },
      prodEnv as any
    );

    expect(cookieRes.status).toBe(401);
  });

  // 6. Verify production Cloudflare Access authentication fails closed on missing token
  it('6. production fails closed with HTTP 401 when no token is supplied', async () => {
    const prodEnv = {
      ENVIRONMENT: 'production',
      ADMIN_SESSION_SECRET: PRODUCTION_SESSION_SECRET,
      CF_ACCESS_SECRET: PRODUCTION_JWT_SECRET,
      CF_ACCESS_TEAM_DOMAIN: TEAM_DOMAIN,
      CF_ACCESS_AUD: AUDIENCE,
      CF_ACCESS_OWNER_EMAIL: OWNER_EMAIL,
    };

    const res = await app.request(
      '/api/admin/overview',
      { method: 'GET' },
      prodEnv as any
    );

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.code).toBe('UNAUTHORIZED');
  });

  // 7. Verify production fails closed on missing essential Cloudflare Access configuration
  it('7. production fails closed when CF_ACCESS_AUD or required config is missing', async () => {
    const validJwt = await createTestJwt(
      {
        iss: TEAM_DOMAIN,
        aud: AUDIENCE,
        email: OWNER_EMAIL,
      },
      PRODUCTION_JWT_SECRET
    );

    // Missing CF_ACCESS_AUD
    const resNoAud = await app.request(
      '/api/admin/auth/me',
      {
        method: 'GET',
        headers: { 'cf-access-jwt-assertion': validJwt },
      },
      {
        ENVIRONMENT: 'production',
        ADMIN_SESSION_SECRET: PRODUCTION_SESSION_SECRET,
        CF_ACCESS_SECRET: PRODUCTION_JWT_SECRET,
        CF_ACCESS_TEAM_DOMAIN: TEAM_DOMAIN,
        CF_ACCESS_OWNER_EMAIL: OWNER_EMAIL,
        // CF_ACCESS_AUD missing
      } as any
    );

    expect(resNoAud.status).toBe(401);
    const bodyNoAud = await resNoAud.json();
    expect(bodyNoAud.code).toBe('AUTH_CONFIG_MISSING');

    // Missing CF_ACCESS_TEAM_DOMAIN
    const resNoDomain = await app.request(
      '/api/admin/auth/me',
      {
        method: 'GET',
        headers: { 'cf-access-jwt-assertion': validJwt },
      },
      {
        ENVIRONMENT: 'production',
        ADMIN_SESSION_SECRET: PRODUCTION_SESSION_SECRET,
        CF_ACCESS_SECRET: PRODUCTION_JWT_SECRET,
        CF_ACCESS_AUD: AUDIENCE,
        CF_ACCESS_OWNER_EMAIL: OWNER_EMAIL,
        // CF_ACCESS_TEAM_DOMAIN missing
      } as any
    );

    expect(resNoDomain.status).toBe(401);
    const bodyNoDomain = await resNoDomain.json();
    expect(bodyNoDomain.code).toBe('AUTH_CONFIG_MISSING');
  });

  // 8. Verify production rejects invalid signature and fails closed without secret
  it('8. production fails closed with HTTP 401 when signature verification secret is absent', async () => {
    const validJwt = await createTestJwt(
      {
        iss: TEAM_DOMAIN,
        aud: AUDIENCE,
        email: OWNER_EMAIL,
      },
      PRODUCTION_JWT_SECRET
    );

    // Missing CF_ACCESS_SECRET
    const res = await app.request(
      '/api/admin/auth/me',
      {
        method: 'GET',
        headers: { 'cf-access-jwt-assertion': validJwt },
      },
      {
        ENVIRONMENT: 'production',
        ADMIN_SESSION_SECRET: PRODUCTION_SESSION_SECRET,
        CF_ACCESS_TEAM_DOMAIN: TEAM_DOMAIN,
        CF_ACCESS_AUD: AUDIENCE,
        CF_ACCESS_OWNER_EMAIL: OWNER_EMAIL,
        // CF_ACCESS_SECRET is intentionally absent
      } as any
    );

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.code).toBe('INVALID_TOKEN');
  });

  // 9. Verify production rejects unauthorized identity email
  it('9. production rejects non-owner email with HTTP 403 FORBIDDEN_IDENTITY', async () => {
    const imposterJwt = await createTestJwt(
      {
        iss: TEAM_DOMAIN,
        aud: AUDIENCE,
        email: 'attacker@unauthorized-domain.com',
      },
      PRODUCTION_JWT_SECRET
    );

    const res = await app.request(
      '/api/admin/auth/me',
      {
        method: 'GET',
        headers: { 'cf-access-jwt-assertion': imposterJwt },
      },
      {
        ENVIRONMENT: 'production',
        ADMIN_SESSION_SECRET: PRODUCTION_SESSION_SECRET,
        CF_ACCESS_SECRET: PRODUCTION_JWT_SECRET,
        CF_ACCESS_TEAM_DOMAIN: TEAM_DOMAIN,
        CF_ACCESS_AUD: AUDIENCE,
        CF_ACCESS_OWNER_EMAIL: OWNER_EMAIL,
      } as any
    );

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.code).toBe('FORBIDDEN_IDENTITY');
  });

  // 10. Verify production accepts valid Cloudflare Access JWT
  it('10. production accepts valid Cloudflare Access JWT matching all security requirements', async () => {
    const legitimateJwt = await createTestJwt(
      {
        iss: TEAM_DOMAIN,
        aud: AUDIENCE,
        email: OWNER_EMAIL,
      },
      PRODUCTION_JWT_SECRET
    );

    const res = await app.request(
      '/api/admin/auth/me',
      {
        method: 'GET',
        headers: { 'cf-access-jwt-assertion': legitimateJwt },
      },
      {
        ENVIRONMENT: 'production',
        ADMIN_SESSION_SECRET: PRODUCTION_SESSION_SECRET,
        CF_ACCESS_SECRET: PRODUCTION_JWT_SECRET,
        CF_ACCESS_TEAM_DOMAIN: TEAM_DOMAIN,
        CF_ACCESS_AUD: AUDIENCE,
        CF_ACCESS_OWNER_EMAIL: OWNER_EMAIL,
      } as any
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.user.email).toBe(OWNER_EMAIL);
    expect(body.user.role).toBe('owner');
  });
});

