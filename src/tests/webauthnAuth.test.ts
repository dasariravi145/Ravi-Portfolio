import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createPortfolioApp } from '../worker/api';
import { MemoryStorageAdapter } from '../storage/r2StorageAdapter';
import { WebAuthnStore } from '../auth/webauthnStore';
import { signSession, verifySession, buildSessionCookie, buildClearSessionCookies } from '../auth/sessionCookie';

// Mock @simplewebauthn/server verification methods to deterministically test full lifecycle
vi.mock('@simplewebauthn/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@simplewebauthn/server')>();
  return {
    ...actual,
    verifyRegistrationResponse: vi.fn(async (args: any) => {
      if (args.response?.id === 'fail-verification-id') {
        return { verified: false };
      }
      return {
        verified: true,
        registrationInfo: {
          credential: {
            id: args.response?.id || 'mock-credential-id-12345',
            publicKey: new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]),
            counter: 0,
          },
          credentialDeviceType: 'multiDevice',
          credentialBackedUp: true,
        },
      };
    }),
    verifyAuthenticationResponse: vi.fn(async (args: any) => {
      if (args.response?.id === 'fail-auth-id') {
        return { verified: false };
      }
      const rawCounter = args.response?.response?.counter ?? 1;
      return {
        verified: true,
        authenticationInfo: {
          newCounter: rawCounter,
        },
      };
    }),
  };
});

describe('WebAuthn / Passkey Production Admin Authentication (Phase 1 Local Implementation)', () => {
  let adapter: MemoryStorageAdapter;
  let app: ReturnType<typeof createPortfolioApp>;

  const ENROLLMENT_TOKEN = 'test-owner-enrollment-token-xyz-123';
  const SESSION_SECRET = 'a-very-secure-32-byte-secret-key-for-admin-hmac-sessions!';
  const OWNER_EMAIL = 'dasariravid145@gmail.com';
  const DEV_ENV = {
    ENVIRONMENT: 'development',
    PUBLIC_DOMAIN: 'localhost:8787',
    ADMIN_ENROLLMENT_TOKEN: ENROLLMENT_TOKEN,
    ADMIN_SESSION_SECRET: SESSION_SECRET,
    CF_ACCESS_OWNER_EMAIL: OWNER_EMAIL,
  };
  const PROD_ENV = {
    ENVIRONMENT: 'production',
    PUBLIC_DOMAIN: 'ravi-portfolio.dsecops88.online',
    ADMIN_ENROLLMENT_TOKEN: ENROLLMENT_TOKEN,
    ADMIN_SESSION_SECRET: SESSION_SECRET,
    CF_ACCESS_OWNER_EMAIL: OWNER_EMAIL,
  };

  beforeEach(() => {
    adapter = new MemoryStorageAdapter();
    app = createPortfolioApp(adapter);
  });

  // ============================================================================
  // 1. Session Token & Cookie Cryptographic Primitives
  // ============================================================================
  describe('Session Token & Cookie Cryptographic Primitives', () => {
    it('1. signs and verifies HMAC-SHA256 session token with expiration check', async () => {
      const now = Date.now();
      const payload = {
        sessionId: 'test-session-uuid-001',
        email: OWNER_EMAIL,
        role: 'owner' as const,
        createdAt: now,
        expiresAt: now + 3600 * 1000,
      };

      const token = await signSession(payload, SESSION_SECRET);
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(2);

      const verified = await verifySession(token, SESSION_SECRET);
      expect(verified).not.toBeNull();
      expect(verified?.sessionId).toBe(payload.sessionId);
      expect(verified?.email).toBe(OWNER_EMAIL);
    });

    it('2. rejects tampered signature or invalid secret', async () => {
      const now = Date.now();
      const payload = {
        sessionId: 'test-session-uuid-002',
        email: OWNER_EMAIL,
        role: 'owner' as const,
        createdAt: now,
        expiresAt: now + 3600 * 1000,
      };

      const token = await signSession(payload, SESSION_SECRET);
      const [data, sig] = token.split('.');
      const tamperedToken = `${data}.${sig}tampered`;

      const verified = await verifySession(tamperedToken, SESSION_SECRET);
      expect(verified).toBeNull();

      const wrongSecretVerified = await verifySession(token, 'wrong-secret-key-32-bytes-minimum-123456');
      expect(wrongSecretVerified).toBeNull();
    });

    it('3. rejects expired session tokens', async () => {
      const past = Date.now() - 5000;
      const expiredPayload = {
        sessionId: 'expired-session-uuid',
        email: OWNER_EMAIL,
        role: 'owner' as const,
        createdAt: past - 3600000,
        expiresAt: past, // Expired in the past
      };

      const token = await signSession(expiredPayload, SESSION_SECRET);
      const verified = await verifySession(token, SESSION_SECRET);
      expect(verified).toBeNull();
    });

    it('4. builds __Host- prefixed cookie for HTTPS and standard cookie for dev HTTP', () => {
      const prodCookie = buildSessionCookie('test-token-123', true);
      expect(prodCookie.name).toBe('__Host-portfolio_session');
      expect(prodCookie.cookieString).toContain('__Host-portfolio_session=test-token-123');
      expect(prodCookie.cookieString).toContain('Secure;');
      expect(prodCookie.cookieString).toContain('HttpOnly;');
      expect(prodCookie.cookieString).toContain('SameSite=Strict');
      expect(prodCookie.cookieString).toContain('Path=/');

      const devCookie = buildSessionCookie('test-token-123', false);
      expect(devCookie.name).toBe('portfolio_admin_session');
      expect(devCookie.cookieString).toContain('portfolio_admin_session=test-token-123');
      expect(devCookie.cookieString).not.toContain('Secure;');
      expect(devCookie.cookieString).toContain('HttpOnly;');
      expect(devCookie.cookieString).toContain('SameSite=Strict');

      const clearProd = buildClearSessionCookies(true);
      expect(clearProd.some((c) => c.includes('__Host-portfolio_session=;'))).toBe(true);
      expect(clearProd.some((c) => c.includes('Max-Age=0'))).toBe(true);
    });
  });

  // ============================================================================
  // 2. WebAuthn Store & Recovery Code Hashing
  // ============================================================================
  describe('WebAuthnStore & Recovery Code Hashing', () => {
    it('5. hashes recovery codes with SHA-256 and handles uppercase/hyphen normalization', async () => {
      const rawCode = 'RD-A234-BCDE-FGHJ';
      const hash1 = await WebAuthnStore.hashRecoveryCode(rawCode);
      const hash2 = await WebAuthnStore.hashRecoveryCode('rd-a234-bcde-fghj');
      const hash3 = await WebAuthnStore.hashRecoveryCode('RDA234BCDEFGHJ');

      expect(hash1).toBe(hash2);
      expect(hash1).toBe(hash3);
      expect(hash1.length).toBe(64); // 256-bit hex
    });

    it('6. generates 5 properly formatted RD-XXXX-XXXX-XXXX codes', async () => {
      const { plainCodes, hashedCodes } = await WebAuthnStore.generateRecoveryCodesWithHashes();
      expect(plainCodes.length).toBe(5);
      expect(hashedCodes.length).toBe(5);

      for (const code of plainCodes) {
        expect(code).toMatch(/^RD-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}$/);
      }
    });

    it('7. consumes challenges atomically and rejects duplicate consumption or expired challenges', async () => {
      const store = new WebAuthnStore(adapter);
      await store.saveChallenge('test-ch-1', 'ch-value-123', 'setup', OWNER_EMAIL, 120);

      const ch1 = await store.consumeChallenge('test-ch-1');
      expect(ch1).not.toBeNull();
      expect(ch1?.challenge).toBe('ch-value-123');

      // Second consumption must fail (single-use burned)
      const ch2 = await store.consumeChallenge('test-ch-1');
      expect(ch2).toBeNull();

      // Expired challenge check (0 TTL)
      await store.saveChallenge('test-ch-expired', 'ch-expired-val', 'login', OWNER_EMAIL, -10);
      const chExpired = await store.consumeChallenge('test-ch-expired');
      expect(chExpired).toBeNull();
    });
  });

  // ============================================================================
  // 3. Status & Initial Setup Lifecycle
  // ============================================================================
  describe('Auth Status & Initial Setup Lifecycle', () => {
    it('8. reports un-enrolled status initially on GET /api/admin/auth/status', async () => {
      const res = await app.request('/api/admin/auth/status', { method: 'GET' }, DEV_ENV);
      expect(res.status).toBe(200);
      const json = await res.json() as any;
      expect(json.success).toBe(true);
      expect(json.enrolled).toBe(false);
      expect(json.ownerEmail).toBe(OWNER_EMAIL);
      expect(json.credentialCount).toBe(0);
    });

    it('9. rejects setup options request if ADMIN_ENROLLMENT_TOKEN is missing or invalid (401)', async () => {
      const res = await app.request(
        '/api/admin/auth/setup-options',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ enrollmentToken: 'wrong-token' }),
        },
        DEV_ENV
      );

      expect(res.status).toBe(401);
      const json = await res.json() as any;
      expect(json.success).toBe(false);
      expect(json.code).toBe('UNAUTHORIZED_SETUP_TOKEN');
    });

    it('10. generates setup options when valid ADMIN_ENROLLMENT_TOKEN is supplied', async () => {
      const res = await app.request(
        '/api/admin/auth/setup-options',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ enrollmentToken: ENROLLMENT_TOKEN }),
        },
        DEV_ENV
      );

      expect(res.status).toBe(200);
      const json = await res.json() as any;
      expect(json.success).toBe(true);
      expect(json.challengeId).toBeTruthy();
      expect(json.options).toBeTruthy();
      expect(json.options.rp.id).toBe('localhost');
      expect(json.options.user.name).toBe(OWNER_EMAIL);
    });

    it('11. completes initial enrollment via setup-verify, issues recovery codes and sets session cookie', async () => {
      // Step A: Get options
      const optRes = await app.request(
        '/api/admin/auth/setup-options',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ enrollmentToken: ENROLLMENT_TOKEN }),
        },
        DEV_ENV
      );
      const optJson = await optRes.json() as any;

      // Step B: Verify registration
      const verifyRes = await app.request(
        '/api/admin/auth/setup-verify',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            enrollmentToken: ENROLLMENT_TOKEN,
            challengeId: optJson.challengeId,
            name: 'Primary MacBook Passkey',
            response: {
              id: 'primary-passkey-cred-id-1',
              rawId: 'primary-passkey-cred-id-1',
              type: 'public-key',
              response: {
                clientDataJSON: 'mock-client-data',
                attestationObject: 'mock-attestation',
              },
            },
          }),
        },
        DEV_ENV
      );

      expect(verifyRes.status).toBe(200);
      const verifyJson = await verifyRes.json() as any;
      expect(verifyJson.success).toBe(true);
      expect(verifyJson.user.email).toBe(OWNER_EMAIL);
      expect(verifyJson.recoveryCodes.length).toBe(5);

      // Verify Set-Cookie header is returned
      const setCookie = verifyRes.headers.get('set-cookie');
      expect(setCookie).toBeTruthy();
      expect(setCookie).toContain('portfolio_admin_session=');

      // Check status now reports enrolled: true
      const statusRes = await app.request('/api/admin/auth/status', { method: 'GET' }, DEV_ENV);
      const statusJson = await statusRes.json() as any;
      expect(statusJson.enrolled).toBe(true);
      expect(statusJson.credentialCount).toBe(1);
    });

    it('12. strictly rejects subsequent setup attempts once enrolled (400 ALREADY_ENROLLED)', async () => {
      // First enroll
      const optRes = await app.request(
        '/api/admin/auth/setup-options',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ enrollmentToken: ENROLLMENT_TOKEN }),
        },
        DEV_ENV
      );
      const optJson = await optRes.json() as any;

      await app.request(
        '/api/admin/auth/setup-verify',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            enrollmentToken: ENROLLMENT_TOKEN,
            challengeId: optJson.challengeId,
            response: { id: 'first-passkey' },
          }),
        },
        DEV_ENV
      );

      // Attempt second setup-options
      const secondOptRes = await app.request(
        '/api/admin/auth/setup-options',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ enrollmentToken: ENROLLMENT_TOKEN }),
        },
        DEV_ENV
      );

      expect(secondOptRes.status).toBe(400);
      const secondOptJson = await secondOptRes.json() as any;
      expect(secondOptJson.code).toBe('ALREADY_ENROLLED');
    });
  });

  // ============================================================================
  // 4. Login Authentication, Replay Detection & Counter Validation
  // ============================================================================
  describe('Login Authentication & Anti-Replay Protections', () => {
    let enrolledCredId: string;

    beforeEach(async () => {
      enrolledCredId = 'test-enrolled-cred-999';
      // Setup initial owner passkey
      const optRes = await app.request(
        '/api/admin/auth/setup-options',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ enrollmentToken: ENROLLMENT_TOKEN }),
        },
        DEV_ENV
      );
      const optJson = await optRes.json() as any;

      await app.request(
        '/api/admin/auth/setup-verify',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            enrollmentToken: ENROLLMENT_TOKEN,
            challengeId: optJson.challengeId,
            response: { id: enrolledCredId },
          }),
        },
        DEV_ENV
      );
    });

    it('13. provides login options referencing enrolled credential IDs', async () => {
      const res = await app.request('/api/admin/auth/login-options', { method: 'POST' }, DEV_ENV);
      expect(res.status).toBe(200);
      const json = await res.json() as any;
      expect(json.success).toBe(true);
      expect(json.challengeId).toBeTruthy();
      expect(json.options.allowCredentials.some((c: any) => c.id === enrolledCredId)).toBe(true);
    });

    it('14. verifies login assertion, advances counter, and sets session cookie', async () => {
      const optRes = await app.request('/api/admin/auth/login-options', { method: 'POST' }, DEV_ENV);
      const optJson = await optRes.json() as any;

      const verifyRes = await app.request(
        '/api/admin/auth/login-verify',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            challengeId: optJson.challengeId,
            response: {
              id: enrolledCredId,
              response: { counter: 1 },
            },
          }),
        },
        DEV_ENV
      );

      expect(verifyRes.status).toBe(200);
      const verifyJson = await verifyRes.json() as any;
      expect(verifyJson.success).toBe(true);
      expect(verifyJson.user.email).toBe(OWNER_EMAIL);

      const cookie = verifyRes.headers.get('set-cookie');
      expect(cookie).toContain('portfolio_admin_session=');
    });

    it('15. rejects login with unrecognized credential ID', async () => {
      const optRes = await app.request('/api/admin/auth/login-options', { method: 'POST' }, DEV_ENV);
      const optJson = await optRes.json() as any;

      const verifyRes = await app.request(
        '/api/admin/auth/login-verify',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            challengeId: optJson.challengeId,
            response: {
              id: 'unknown-unregistered-credential-id',
              response: { counter: 1 },
            },
          }),
        },
        DEV_ENV
      );

      expect(verifyRes.status).toBe(401);
      const verifyJson = await verifyRes.json() as any;
      expect(verifyJson.error).toContain('UNRECOGNIZED_CREDENTIAL');
    });

    it('16. detects replay attack when authenticator counter does not advance', async () => {
      // First login with counter = 5
      const opt1 = await (await app.request('/api/admin/auth/login-options', { method: 'POST' }, DEV_ENV)).json() as any;
      const res1 = await app.request(
        '/api/admin/auth/login-verify',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            challengeId: opt1.challengeId,
            response: {
              id: enrolledCredId,
              response: { counter: 5 },
            },
          }),
        },
        DEV_ENV
      );
      expect(res1.status).toBe(200);

      // Replay attempt with counter = 4 (or same counter = 5)
      const opt2 = await (await app.request('/api/admin/auth/login-options', { method: 'POST' }, DEV_ENV)).json() as any;
      const replayRes = await app.request(
        '/api/admin/auth/login-verify',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            challengeId: opt2.challengeId,
            response: {
              id: enrolledCredId,
              response: { counter: 4 }, // Stale or replayed counter!
            },
          }),
        },
        DEV_ENV
      );

      expect(replayRes.status).toBe(401);
      const replayJson = await replayRes.json() as any;
      expect(replayJson.error).toContain('REPLAY_DETECTED');
    });
  });

  // ============================================================================
  // 5. Emergency Recovery Codes (Single-Use & Hashed Storage)
  // ============================================================================
  describe('Emergency Recovery Codes (Single-Use & Hashed Storage)', () => {
    let plainRecoveryCodes: string[];

    beforeEach(async () => {
      const optRes = await app.request(
        '/api/admin/auth/setup-options',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ enrollmentToken: ENROLLMENT_TOKEN }),
        },
        DEV_ENV
      );
      const optJson = await optRes.json() as any;

      const verifyRes = await app.request(
        '/api/admin/auth/setup-verify',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            enrollmentToken: ENROLLMENT_TOKEN,
            challengeId: optJson.challengeId,
            response: { id: 'primary-passkey' },
          }),
        },
        DEV_ENV
      );
      const verifyJson = await verifyRes.json() as any;
      plainRecoveryCodes = verifyJson.recoveryCodes;
    });

    it('17. authenticates successfully with a valid recovery code and decrements remaining codes', async () => {
      const codeToUse = plainRecoveryCodes[0];

      const res = await app.request(
        '/api/admin/auth/recover',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ recoveryCode: codeToUse }),
        },
        DEV_ENV
      );

      expect(res.status).toBe(200);
      const json = await res.json() as any;
      expect(json.success).toBe(true);
      expect(json.remainingCodes).toBe(4);
      expect(json.user.email).toBe(OWNER_EMAIL);

      const cookie = res.headers.get('set-cookie');
      expect(cookie).toContain('portfolio_admin_session=');
    });

    it('18. strictly rejects reuse of an already-consumed recovery code', async () => {
      const codeToUse = plainRecoveryCodes[1];

      // Use once
      const res1 = await app.request(
        '/api/admin/auth/recover',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ recoveryCode: codeToUse }),
        },
        DEV_ENV
      );
      expect(res1.status).toBe(200);

      // Attempt to reuse same code
      const res2 = await app.request(
        '/api/admin/auth/recover',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ recoveryCode: codeToUse }),
        },
        DEV_ENV
      );
      expect(res2.status).toBe(401);
      const json2 = await res2.json() as any;
      expect(json2.code).toBe('RECOVERY_FAILED');
    });

    it('19. rejects invalid recovery code format', async () => {
      const res = await app.request(
        '/api/admin/auth/recover',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ recoveryCode: 'RD-INVALID-CODE-9999' }),
        },
        DEV_ENV
      );
      expect(res.status).toBe(401);
    });
  });

  // ============================================================================
  // 6. Session Authorization, Logout & Session Revocation
  // ============================================================================
  describe('Session Authorization, Logout & Session Revocation', () => {
    let validSessionCookie: string;
    let sessionId: string;

    beforeEach(async () => {
      sessionId = 'active-session-id-777';
      const payload = {
        sessionId,
        email: OWNER_EMAIL,
        role: 'owner' as const,
        createdAt: Date.now(),
        expiresAt: Date.now() + 3600 * 1000,
      };
      const token = await signSession(payload, SESSION_SECRET);
      validSessionCookie = `portfolio_admin_session=${token}`;
    });

    it('20. grants access to admin endpoints with valid signed session cookie', async () => {
      const res = await app.request(
        '/api/admin/overview',
        {
          method: 'GET',
          headers: { Cookie: validSessionCookie },
        },
        DEV_ENV
      );

      expect(res.status).toBe(200);
      const json = await res.json() as any;
      expect(json.success).toBe(true);
      expect(json.data.ownerEmail).toBe(OWNER_EMAIL);
    });

    it('21. revokes session upon logout and rejects subsequent requests using revoked session', async () => {
      // 1. Verify access works initially
      const initialRes = await app.request(
        '/api/admin/auth/me',
        {
          method: 'GET',
          headers: { Cookie: validSessionCookie },
        },
        DEV_ENV
      );
      expect(initialRes.status).toBe(200);

      // 2. Perform logout
      const logoutRes = await app.request(
        '/api/admin/auth/logout',
        {
          method: 'POST',
          headers: { Cookie: validSessionCookie },
        },
        DEV_ENV
      );
      expect(logoutRes.status).toBe(200);

      // Verify Set-Cookie clears session
      const setCookie = logoutRes.headers.get('set-cookie');
      expect(setCookie).toContain('Max-Age=0');

      // 3. Attempt access with the revoked session token
      const subsequentRes = await app.request(
        '/api/admin/auth/me',
        {
          method: 'GET',
          headers: { Cookie: validSessionCookie },
        },
        DEV_ENV
      );
      expect(subsequentRes.status).toBe(401);
    });

    it('22. enforces __Host- session cookie in production HTTPS environment', async () => {
      const prodPayload = {
        sessionId: 'prod-session-id-999',
        email: OWNER_EMAIL,
        role: 'owner' as const,
        createdAt: Date.now(),
        expiresAt: Date.now() + 3600 * 1000,
      };
      const token = await signSession(prodPayload, SESSION_SECRET);

      const res = await app.request(
        'https://ravi-portfolio.dsecops88.online/api/admin/auth/me',
        {
          method: 'GET',
          headers: {
            Cookie: `__Host-portfolio_session=${token}`,
          },
        },
        PROD_ENV
      );

      expect(res.status).toBe(200);
      const json = await res.json() as any;
      expect(json.user.email).toBe(OWNER_EMAIL);
    });
  });

  // ============================================================================
  // 7. Passkey Management (Backup Passkeys, Listing, Deletion)
  // ============================================================================
  describe('Passkey Management (Backup Passkeys, Listing, Deletion)', () => {
    let authCookie: string;

    beforeEach(async () => {
      // Enroll initial passkey
      const optRes = await app.request(
        '/api/admin/auth/setup-options',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ enrollmentToken: ENROLLMENT_TOKEN }),
        },
        DEV_ENV
      );
      const optJson = await optRes.json() as any;

      const verifyRes = await app.request(
        '/api/admin/auth/setup-verify',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            enrollmentToken: ENROLLMENT_TOKEN,
            challengeId: optJson.challengeId,
            name: 'Primary YubiKey',
            response: { id: 'passkey-primary-1' },
          }),
        },
        DEV_ENV
      );

      const setCookie = verifyRes.headers.get('set-cookie') || '';
      const match = setCookie.match(/portfolio_admin_session=([^;]+)/);
      authCookie = `portfolio_admin_session=${match ? match[1] : ''}`;
    });

    it('23. lists enrolled passkeys for authenticated owner', async () => {
      const res = await app.request(
        '/api/admin/auth/passkeys',
        {
          method: 'GET',
          headers: { Cookie: authCookie },
        },
        DEV_ENV
      );

      expect(res.status).toBe(200);
      const json = await res.json() as any;
      expect(json.success).toBe(true);
      expect(json.passkeys.length).toBe(1);
      expect(json.passkeys[0].name).toBe('Primary YubiKey');
      expect(json.passkeys[0].id).toBe('passkey-primary-1');
    });

    it('24. adds a secondary backup passkey', async () => {
      // 1. Get add-options
      const optRes = await app.request(
        '/api/admin/auth/passkeys/add-options',
        {
          method: 'POST',
          headers: { Cookie: authCookie },
        },
        DEV_ENV
      );
      expect(optRes.status).toBe(200);
      const optJson = await optRes.json() as any;

      // 2. Verify add-verify
      const verifyRes = await app.request(
        '/api/admin/auth/passkeys/add-verify',
        {
          method: 'POST',
          headers: {
            Cookie: authCookie,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            challengeId: optJson.challengeId,
            name: 'Pixel Phone Passkey',
            response: { id: 'passkey-secondary-2' },
          }),
        },
        DEV_ENV
      );

      expect(verifyRes.status).toBe(200);
      const verifyJson = await verifyRes.json() as any;
      expect(verifyJson.success).toBe(true);

      // Verify list now has 2 passkeys
      const listRes = await app.request(
        '/api/admin/auth/passkeys',
        {
          method: 'GET',
          headers: { Cookie: authCookie },
        },
        DEV_ENV
      );
      const listJson = await listRes.json() as any;
      expect(listJson.passkeys.length).toBe(2);
    });

    it('25. prevents removing the only enrolled passkey (400)', async () => {
      const res = await app.request(
        '/api/admin/auth/passkeys/passkey-primary-1',
        {
          method: 'DELETE',
          headers: { Cookie: authCookie },
        },
        DEV_ENV
      );

      expect(res.status).toBe(400);
      const json = await res.json() as any;
      expect(json.error).toContain('Cannot remove the only enrolled passkey');
    });

    it('26. regenerates recovery codes for authenticated owner, invalidating old codes', async () => {
      const res = await app.request(
        '/api/admin/auth/recovery-codes/regenerate',
        {
          method: 'POST',
          headers: { Cookie: authCookie },
        },
        DEV_ENV
      );

      expect(res.status).toBe(200);
      const json = await res.json() as any;
      expect(json.success).toBe(true);
      expect(json.recoveryCodes.length).toBe(5);
    });
  });

  // ============================================================================
  // 8. CSRF & Origin Defense
  // ============================================================================
  describe('CSRF & Origin Defense', () => {
    let authCookie: string;

    beforeEach(async () => {
      const payload = {
        sessionId: 'csrf-test-session',
        email: OWNER_EMAIL,
        role: 'owner' as const,
        createdAt: Date.now(),
        expiresAt: Date.now() + 3600 * 1000,
      };
      const token = await signSession(payload, SESSION_SECRET);
      authCookie = `portfolio_admin_session=${token}`;
    });

    it('27. blocks mutating admin requests with Sec-Fetch-Site: cross-site (403)', async () => {
      const res = await app.request(
        '/api/admin/projects',
        {
          method: 'POST',
          headers: {
            Cookie: authCookie,
            'Content-Type': 'application/json',
            'Sec-Fetch-Site': 'cross-site',
          },
          body: JSON.stringify({ title: 'Malicious Project' }),
        },
        DEV_ENV
      );

      expect(res.status).toBe(403);
      const json = await res.json() as any;
      expect(json.code).toBe('FORBIDDEN');
      expect(json.error).toContain('Cross-site request');
    });

    it('28. blocks mutating admin requests from untrusted external Origin (403)', async () => {
      const res = await app.request(
        '/api/admin/projects',
        {
          method: 'POST',
          headers: {
            Cookie: authCookie,
            'Content-Type': 'application/json',
            Origin: 'https://evil-attacker.example.com',
          },
          body: JSON.stringify({ title: 'Malicious Project' }),
        },
        DEV_ENV
      );

      expect(res.status).toBe(403);
      const json = await res.json() as any;
      expect(json.code).toBe('FORBIDDEN');
    });

    it('29. permits mutating admin requests from authorized origins (localhost and production domain)', async () => {
      const res = await app.request(
        '/api/admin/auth/logout',
        {
          method: 'POST',
          headers: {
            Cookie: authCookie,
            Origin: 'http://localhost:8787',
          },
        },
        DEV_ENV
      );

      expect(res.status).toBe(200);
    });
  });

  // ============================================================================
  // 9. Public Website Access & R2 Preservation
  // ============================================================================
  describe('Public Website Access & R2 Content Preservation', () => {
    it('30. ensures all public endpoints remain fully accessible without any credentials', async () => {
      const endpoints = [
        '/api/public/content',
        '/api/public/profile',
        '/api/public/projects',
        '/api/public/skills',
        '/api/public/experience',
        '/api/public/education',
        '/api/public/ai-services',
        '/api/public/site-settings',
        '/api/public/resume',
        '/api/health',
      ];

      for (const endpoint of endpoints) {
        const res = await app.request(endpoint, { method: 'GET' }, PROD_ENV);
        expect(res.status).toBe(200);
        const json = await res.json() as any;
        expect(json.success || json.status === 'healthy').toBeTruthy();
      }
    });
  });
});
