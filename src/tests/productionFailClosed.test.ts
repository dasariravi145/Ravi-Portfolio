import { describe, it, expect } from 'vitest';
import {
  createPortfolioApp,
  ConfigurationError,
  validateProductionSessionSecret,
  validateProductionEnrollmentToken,
} from '../worker/api';
import { MockD1Database } from '../storage/d1StorageAdapter';

describe('Production Security Fail-Closed Invariants & Validation', () => {
  const HIGH_ENTROPY_PROD_SECRET = 'super-secure-production-session-secret-key-64-bytes-entropy!';
  const HIGH_ENTROPY_ENROLLMENT = 'prod-enrollment-key-with-high-entropy-998877';
  const DEV_API_SECRET = 'dev-api-secret-12345';

  // ==========================================================================
  // 1. Pure Unit Validation: validateProductionSessionSecret
  // ==========================================================================
  describe('1. validateProductionSessionSecret', () => {
    it('1.1 rejects undefined, empty, or whitespace-only secret', () => {
      expect(() => validateProductionSessionSecret(undefined)).toThrowError(ConfigurationError);
      expect(() => validateProductionSessionSecret('')).toThrowError(ConfigurationError);
      expect(() => validateProductionSessionSecret('   ')).toThrowError(ConfigurationError);
    });

    it('1.2 rejects secrets shorter than 32 characters', () => {
      const shortSecret = 'short-secret-under-32-chars';
      expect(shortSecret.length).toBeLessThan(32);
      expect(() => validateProductionSessionSecret(shortSecret)).toThrowError(
        /below the required 32-character minimum/
      );
    });

    it('1.3 rejects known development and placeholder patterns', () => {
      const badPatterns = [
        'dev-session-secret-for-testing-only-12345',
        'development-mode-session-secret-long-enough!',
        'fallback-session-secret-that-is-long-enough!',
        'placeholder-secret-for-production-use-12345!',
        'example-secret-that-exceeds-thirty-two-chars!',
        'changeme-please-update-this-secret-now-12345!',
        'change-me-production-secret-key-abcdef-12345',
        'change_me_production_secret_key_abcdef_12345',
        'password123-admin-session-secret-long-enough',
        'default-secret-key-for-admin-sessions-12345!',
      ];

      for (const secret of badPatterns) {
        expect(() => validateProductionSessionSecret(secret)).toThrowError(
          /prohibited placeholder pattern/
        );
      }
    });

    it('1.4 rejects production session secret matching ADMIN_API_SECRET', () => {
      const sharedSecret = 'this-is-a-shared-secret-that-is-long-enough-for-both!';
      expect(() =>
        validateProductionSessionSecret(sharedSecret, sharedSecret)
      ).toThrowError(/session secret must not match ADMIN_API_SECRET/);
    });

    it('1.5 rejects low-entropy repeated characters', () => {
      const lowEntropy = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'; // 32 'a's
      expect(() => validateProductionSessionSecret(lowEntropy)).toThrowError(
        /lacks sufficient character entropy/
      );

      const simpleRepeat = '12341234123412341234123412341234'; // 4 unique chars
      expect(() => validateProductionSessionSecret(simpleRepeat)).toThrowError(
        /lacks sufficient character entropy/
      );
    });

    it('1.6 accepts valid high-entropy production session secret without modifying it', () => {
      const valid = validateProductionSessionSecret(HIGH_ENTROPY_PROD_SECRET, DEV_API_SECRET);
      expect(valid).toBe(HIGH_ENTROPY_PROD_SECRET);
    });

    it('1.7 never logs or reveals the raw secret in error messages', () => {
      const privateSecret = 'short-private-password-leak-test';
      try {
        validateProductionSessionSecret(privateSecret);
        expect.unreachable('Should have thrown ConfigurationError');
      } catch (err: any) {
        expect(err.message).not.toContain(privateSecret);
      }
    });
  });

  // ==========================================================================
  // 2. Pure Unit Validation: validateProductionEnrollmentToken
  // ==========================================================================
  describe('2. validateProductionEnrollmentToken', () => {
    it('2.1 rejects undefined, empty, or whitespace-only enrollment token', () => {
      expect(() => validateProductionEnrollmentToken(undefined)).toThrowError(ConfigurationError);
      expect(() => validateProductionEnrollmentToken('')).toThrowError(ConfigurationError);
      expect(() => validateProductionEnrollmentToken('   ')).toThrowError(ConfigurationError);
    });

    it('2.2 rejects enrollment tokens shorter than 16 characters', () => {
      const shortToken = 'short-token-123';
      expect(shortToken.length).toBeLessThan(16);
      expect(() => validateProductionEnrollmentToken(shortToken)).toThrowError(
        /below the required 16-character minimum/
      );
    });

    it('2.3 rejects placeholder and dev patterns in enrollment token', () => {
      const badTokens = [
        'dev-enrollment-token-12345',
        'development-token-long-enough',
        'placeholder-token-12345',
        'example-token-for-admin-setup',
        'changeme-token-12345',
        'default-token-xyz',
      ];

      for (const token of badTokens) {
        expect(() => validateProductionEnrollmentToken(token)).toThrowError(
          /prohibited placeholder pattern/
        );
      }
    });

    it('2.4 rejects enrollment token matching ADMIN_API_SECRET', () => {
      const shared = 'shared-secret-and-token-at-least-16-chars';
      expect(() => validateProductionEnrollmentToken(shared, shared)).toThrowError(
        /enrollment token must not match ADMIN_API_SECRET/
      );
    });

    it('2.5 accepts valid high-entropy enrollment token', () => {
      const valid = validateProductionEnrollmentToken(HIGH_ENTROPY_ENROLLMENT, DEV_API_SECRET);
      expect(valid).toBe(HIGH_ENTROPY_ENROLLMENT);
    });
  });

  // ==========================================================================
  // 3. Storage Layer Fail-Closed Invariants in Production
  // ==========================================================================
  describe('3. Production Storage Layer Fail-Closed Invariants', () => {
    it('3.1 rejects missing D1 database binding when ENVIRONMENT=production', async () => {
      const app = createPortfolioApp(); // No custom adapter
      const res = await app.request(
        '/api/public/profile',
        { method: 'GET' },
        {
          ENVIRONMENT: 'production',
          ADMIN_SESSION_SECRET: HIGH_ENTROPY_PROD_SECRET,
          // DB is intentionally omitted
        } as any
      );

      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.code).toBe('CONFIGURATION_ERROR');
      expect(json.error).toContain("Missing required Cloudflare D1 database binding 'DB'");
      expect(json.error).toContain('Falling back to R2 or in-memory storage is strictly prohibited');
    });

    it('3.2 never uses R2 PORTFOLIO_BUCKET as production fallback when DB is missing', async () => {
      const app = createPortfolioApp();
      const dummyBucket = { get: () => null, put: () => null };

      const res = await app.request(
        '/api/public/profile',
        { method: 'GET' },
        {
          ENVIRONMENT: 'production',
          PORTFOLIO_BUCKET: dummyBucket,
          ADMIN_SESSION_SECRET: HIGH_ENTROPY_PROD_SECRET,
          // DB is omitted
        } as any
      );

      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.code).toBe('CONFIGURATION_ERROR');
      expect(json.error).toContain("Missing required Cloudflare D1 database binding 'DB'");
    });

    it('3.3 operates normally in production when Cloudflare D1 binding DB is provided', async () => {
      const app = createPortfolioApp();
      const mockDb = new MockD1Database();

      const res = await app.request(
        '/api/public/profile',
        { method: 'GET' },
        {
          ENVIRONMENT: 'production',
          DB: mockDb,
          ADMIN_SESSION_SECRET: HIGH_ENTROPY_PROD_SECRET,
        } as any
      );

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.fullName).toBe('Ravi Dasari');
    });
  });

  // ==========================================================================
  // 4. Session Secret Fail-Closed Invariants in Production
  // ==========================================================================
  describe('4. Production Session Secret Fail-Closed Invariants', () => {
    it('4.1 rejects missing ADMIN_SESSION_SECRET in production without falling back to ADMIN_API_SECRET', async () => {
      const app = createPortfolioApp();
      const mockDb = new MockD1Database();

      const res = await app.request(
        '/api/admin/overview',
        { method: 'GET' },
        {
          ENVIRONMENT: 'production',
          DB: mockDb,
          ADMIN_API_SECRET: DEV_API_SECRET, // Should NOT be used as session secret
          // ADMIN_SESSION_SECRET is omitted
        } as any
      );

      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.code).toBe('CONFIGURATION_ERROR');
      expect(json.error).toContain("Missing required 'ADMIN_SESSION_SECRET' in production environment");
    });

    it('4.2 rejects short ADMIN_SESSION_SECRET in production', async () => {
      const app = createPortfolioApp();
      const mockDb = new MockD1Database();

      const res = await app.request(
        '/api/admin/overview',
        { method: 'GET' },
        {
          ENVIRONMENT: 'production',
          DB: mockDb,
          ADMIN_SESSION_SECRET: 'short-secret-under-32-chars',
        } as any
      );

      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.code).toBe('CONFIGURATION_ERROR');
      expect(json.error).toContain('below the required 32-character minimum');
    });

    it('4.3 rejects placeholder dev secret in production ADMIN_SESSION_SECRET', async () => {
      const app = createPortfolioApp();
      const mockDb = new MockD1Database();

      const res = await app.request(
        '/api/admin/overview',
        { method: 'GET' },
        {
          ENVIRONMENT: 'production',
          DB: mockDb,
          ADMIN_SESSION_SECRET: 'dev-fallback-session-secret-min-32-chars-long!',
        } as any
      );

      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.code).toBe('CONFIGURATION_ERROR');
      expect(json.error).toContain("prohibited placeholder pattern 'dev-'");
    });

    it('4.4 rejects ADMIN_SESSION_SECRET matching ADMIN_API_SECRET in production', async () => {
      const app = createPortfolioApp();
      const mockDb = new MockD1Database();
      const shared = 'this-is-a-shared-secret-that-is-long-enough-for-both!';

      const res = await app.request(
        '/api/admin/overview',
        { method: 'GET' },
        {
          ENVIRONMENT: 'production',
          DB: mockDb,
          ADMIN_API_SECRET: shared,
          ADMIN_SESSION_SECRET: shared,
        } as any
      );

      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.code).toBe('CONFIGURATION_ERROR');
      expect(json.error).toContain('session secret must not match ADMIN_API_SECRET');
    });
  });

  // ==========================================================================
  // 5. Initial Owner Enrollment Fail-Closed Invariants in Production
  // ==========================================================================
  describe('5. Production Initial Owner Enrollment Fail-Closed Invariants', () => {
    it('5.1 setup-options rejects missing ADMIN_ENROLLMENT_TOKEN in production', async () => {
      const app = createPortfolioApp();
      const mockDb = new MockD1Database();

      const res = await app.request(
        '/api/admin/auth/setup-options',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ enrollmentToken: 'some-provided-token' }),
        },
        {
          ENVIRONMENT: 'production',
          DB: mockDb,
          ADMIN_SESSION_SECRET: HIGH_ENTROPY_PROD_SECRET,
          ADMIN_API_SECRET: DEV_API_SECRET,
          // ADMIN_ENROLLMENT_TOKEN is omitted
        } as any
      );

      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.code).toBe('CONFIGURATION_ERROR');
      expect(json.error).toContain("Missing required 'ADMIN_ENROLLMENT_TOKEN' in production environment");
    });

    it('5.2 setup-options rejects placeholder or dev ADMIN_ENROLLMENT_TOKEN in production', async () => {
      const app = createPortfolioApp();
      const mockDb = new MockD1Database();

      const res = await app.request(
        '/api/admin/auth/setup-options',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ enrollmentToken: 'dev-enrollment-token-12345' }),
        },
        {
          ENVIRONMENT: 'production',
          DB: mockDb,
          ADMIN_SESSION_SECRET: HIGH_ENTROPY_PROD_SECRET,
          ADMIN_ENROLLMENT_TOKEN: 'dev-enrollment-token-12345',
        } as any
      );

      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.code).toBe('CONFIGURATION_ERROR');
      expect(json.error).toContain("prohibited placeholder pattern 'dev-'");
    });

    it('5.3 setup-options rejects wrong enrollment token with HTTP 401 UNAUTHORIZED_SETUP_TOKEN', async () => {
      const app = createPortfolioApp();
      const mockDb = new MockD1Database();

      const res = await app.request(
        '/api/admin/auth/setup-options',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ enrollmentToken: 'wrong-guess-token-12345' }),
        },
        {
          ENVIRONMENT: 'production',
          DB: mockDb,
          ADMIN_SESSION_SECRET: HIGH_ENTROPY_PROD_SECRET,
          ADMIN_ENROLLMENT_TOKEN: HIGH_ENTROPY_ENROLLMENT,
        } as any
      );

      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.code).toBe('UNAUTHORIZED_SETUP_TOKEN');
    });

    it('5.4 setup-options succeeds in production when valid enrollment token is provided', async () => {
      const app = createPortfolioApp();
      const mockDb = new MockD1Database();

      const res = await app.request(
        '/api/admin/auth/setup-options',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ enrollmentToken: HIGH_ENTROPY_ENROLLMENT }),
        },
        {
          ENVIRONMENT: 'production',
          DB: mockDb,
          ADMIN_SESSION_SECRET: HIGH_ENTROPY_PROD_SECRET,
          ADMIN_ENROLLMENT_TOKEN: HIGH_ENTROPY_ENROLLMENT,
        } as any
      );

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.options).toBeDefined();
      expect(json.challengeId).toBeDefined();
    });

    it('5.5 setup-verify rejects missing ADMIN_ENROLLMENT_TOKEN in production with HTTP 500 CONFIGURATION_ERROR', async () => {
      const app = createPortfolioApp();
      const mockDb = new MockD1Database();

      const res = await app.request(
        '/api/admin/auth/setup-verify',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            enrollmentToken: 'some-token',
            challengeId: 'test-challenge',
            response: { id: 'test-id' },
          }),
        },
        {
          ENVIRONMENT: 'production',
          DB: mockDb,
          ADMIN_SESSION_SECRET: HIGH_ENTROPY_PROD_SECRET,
          // ADMIN_ENROLLMENT_TOKEN is missing
        } as any
      );

      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.code).toBe('CONFIGURATION_ERROR');
      expect(json.error).toContain("Missing required 'ADMIN_ENROLLMENT_TOKEN' in production environment");
    });
  });

  // ==========================================================================
  // 6. Non-Production & Local Development Preservation
  // ==========================================================================
  describe('6. Non-Production & Local Development Preservation', () => {
    it('6.1 allows in-memory storage fallback when ENVIRONMENT is development', async () => {
      const app = createPortfolioApp(); // No custom adapter, no DB
      const res = await app.request(
        '/api/public/profile',
        { method: 'GET' },
        {
          ENVIRONMENT: 'development',
        } as any
      );

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
    });

    it('6.2 allows development session secret fallback in development mode', async () => {
      const app = createPortfolioApp();
      const res = await app.request(
        '/api/admin/overview',
        { method: 'GET' },
        {
          ENVIRONMENT: 'development',
          ADMIN_API_SECRET: DEV_API_SECRET,
          // ADMIN_SESSION_SECRET is omitted; falls back safely in dev
        } as any
      );

      // In development without credentials or token, returns 401 UNAUTHORIZED (not 500 CONFIGURATION_ERROR)
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.code).toBe('UNAUTHORIZED');
    });

    it('6.3 strictly prohibits test-reset endpoint in production with HTTP 404', async () => {
      const app = createPortfolioApp();
      const mockDb = new MockD1Database();

      const res = await app.request(
        '/api/admin/auth/test-reset',
        { method: 'POST' },
        {
          ENVIRONMENT: 'production',
          DB: mockDb,
          ADMIN_SESSION_SECRET: HIGH_ENTROPY_PROD_SECRET,
        } as any
      );

      expect(res.status).toBe(404);
    });
  });
});

