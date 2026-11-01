import { describe, it, expect, beforeEach } from 'vitest';
import { normalizeEtag, etagsMatch } from '../storage/r2StorageAdapter';
import { CloudflareD1StorageAdapter, MockD1Database } from '../storage/d1StorageAdapter';
import { ContentStore, ConcurrencyError, CONTENT_KEYS } from '../storage/contentStore';
import { ContentMutationService } from '../services/contentMutationService';
import { createPortfolioApp } from '../worker/api';
import { Profile } from '../types/portfolio';
import { INITIAL_PORTFOLIO_FIXTURE } from '../fixtures/initialContent';

describe('CMS Optimistic Concurrency Control (OCC) & ETag Parity', () => {
  describe('1. normalizeEtag & etagsMatch Unit Verification', () => {
    it('normalizes strong and weak ETags identically', () => {
      const strong = '"c8d8a9e4f3f9ac05-1793513267653"';
      const weakUpper = 'W/"c8d8a9e4f3f9ac05-1793513267653"';
      const weakLower = 'w/"c8d8a9e4f3f9ac05-1793513267653"';
      const unquoted = 'c8d8a9e4f3f9ac05-1793513267653';
      const spaced = '  W/"c8d8a9e4f3f9ac05-1793513267653"  ';

      expect(normalizeEtag(strong)).toBe(strong);
      expect(normalizeEtag(weakUpper)).toBe(strong);
      expect(normalizeEtag(weakLower)).toBe(strong);
      expect(normalizeEtag(unquoted)).toBe(strong);
      expect(normalizeEtag(spaced)).toBe(strong);
    });

    it('etagsMatch returns true across strong and weak variations', () => {
      const stored = '"9876543210abcdef-12345"';
      const fromCloudflareEdge = 'W/"9876543210abcdef-12345"';
      const fromMemoryAdapter = 'w/"9876543210abcdef-12345"';
      const bare = '9876543210abcdef-12345';

      expect(etagsMatch(stored, fromCloudflareEdge)).toBe(true);
      expect(etagsMatch(fromCloudflareEdge, stored)).toBe(true);
      expect(etagsMatch(fromMemoryAdapter, stored)).toBe(true);
      expect(etagsMatch(bare, stored)).toBe(true);
    });

    it('etagsMatch returns false for different content tags or nulls', () => {
      expect(etagsMatch('"tag-1"', '"tag-2"')).toBe(false);
      expect(etagsMatch('W/"tag-1"', 'W/"tag-2"')).toBe(false);
      expect(etagsMatch('"tag-1"', null)).toBe(false);
      expect(etagsMatch(undefined, '"tag-1"')).toBe(false);
    });
  });

  describe('2. D1 Storage Adapter Weak ETag Conditional Write', () => {
    let mockDb: MockD1Database;
    let adapter: CloudflareD1StorageAdapter;

    beforeEach(() => {
      mockDb = new MockD1Database();
      adapter = new CloudflareD1StorageAdapter(mockDb);
    });

    it('successfully saves with Cloudflare-prefixed weak ETag (W/)', async () => {
      const v1 = await adapter.put(CONTENT_KEYS.PROFILE, INITIAL_PORTFOLIO_FIXTURE.profile);
      expect(v1).not.toBeNull();
      const rawStoredEtag = v1!.etag;

      // Simulate what the browser sends back after Cloudflare edge brotli compression: W/"..."
      const weakClientEtag = `W/${rawStoredEtag}`;

      const v2 = await adapter.put(
        CONTENT_KEYS.PROFILE,
        { ...INITIAL_PORTFOLIO_FIXTURE.profile, headline: 'Updated Lead DevOps Engineer' },
        { onlyIf: { etagMatches: weakClientEtag } }
      );

      expect(v2).not.toBeNull();
      expect(v2?.version).toBe(2);
      expect(v2?.data.headline).toBe('Updated Lead DevOps Engineer');
    });

    it('rejects update when an actual stale ETag is provided', async () => {
      const v1 = await adapter.put(CONTENT_KEYS.PROFILE, INITIAL_PORTFOLIO_FIXTURE.profile);
      const staleEtag = v1!.etag;

      // Update to v2
      await adapter.put(
        CONTENT_KEYS.PROFILE,
        { ...INITIAL_PORTFOLIO_FIXTURE.profile, headline: 'v2 Headline' },
        { onlyIf: { etagMatches: staleEtag } }
      );

      // Attempt to update with stale v1 ETag (even in weak format)
      const staleAttempt = await adapter.put(
        CONTENT_KEYS.PROFILE,
        { ...INITIAL_PORTFOLIO_FIXTURE.profile, headline: 'Conflicting Headline' },
        { onlyIf: { etagMatches: `W/${staleEtag}` } }
      );

      expect(staleAttempt).toBeNull();
      const current = await adapter.get<Profile>(CONTENT_KEYS.PROFILE);
      expect(current?.data.headline).toBe('v2 Headline');
      expect(current?.version).toBe(2);
    });
  });

  describe('3. ContentMutationService End-to-End OCC Workflow', () => {
    let mockDb: MockD1Database;
    let adapter: CloudflareD1StorageAdapter;
    let store: ContentStore;
    let mutations: ContentMutationService;

    beforeEach(async () => {
      mockDb = new MockD1Database();
      adapter = new CloudflareD1StorageAdapter(mockDb);
      store = new ContentStore(adapter);
      mutations = new ContentMutationService(store);
      await store.ensureInitialized();
    });

    it('Fresh load -> Edit -> Save with Weak ETag succeeds and returns fresh ETag', async () => {
      const loaded = await store.getProfile();
      expect(loaded).not.toBeNull();
      const clientWeakEtag = `W/${loaded!.etag}`;

      const updateResult = await mutations.updateProfile(
        { ...loaded!.data, headline: 'Senior DevOps Architect' },
        clientWeakEtag
      );

      expect(updateResult.profile.headline).toBe('Senior DevOps Architect');
      expect(updateResult.etag).toBeDefined();
      expect(updateResult.etag).not.toBe(loaded!.etag);
    });

    it('Repeated edits in one session succeed when refreshing ETag from previous save response', async () => {
      const loaded = await store.getProfile();
      let currentEtag = `W/${loaded!.etag}`;

      // Edit 1
      const res1 = await mutations.updateProfile(
        { ...loaded!.data, headline: 'Edit 1 Headline' },
        currentEtag
      );
      expect(res1.profile.headline).toBe('Edit 1 Headline');
      currentEtag = res1.etag;

      // Edit 2 in same session
      const res2 = await mutations.updateProfile(
        { ...res1.profile, headline: 'Edit 2 Headline' },
        currentEtag
      );
      expect(res2.profile.headline).toBe('Edit 2 Headline');
      currentEtag = res2.etag;

      // Edit 3 in same session
      const res3 = await mutations.updateProfile(
        { ...res2.profile, headline: 'Edit 3 Headline' },
        currentEtag
      );
      expect(res3.profile.headline).toBe('Edit 3 Headline');
    });

    it('Two concurrent sessions editing same content trigger ConcurrencyError on second save', async () => {
      // Both sessions load the same initial content & ETag
      const session1Load = await store.getProfile();
      const session2Load = await store.getProfile();

      const session1Etag = `W/${session1Load!.etag}`;
      const session2Etag = `W/${session2Load!.etag}`;

      // Session 1 saves first -> Success
      const session1Save = await mutations.updateProfile(
        { ...session1Load!.data, headline: 'Session 1 Headline' },
        session1Etag
      );
      expect(session1Save.profile.headline).toBe('Session 1 Headline');

      // Session 2 attempts to save with its now-stale initial ETag -> Conflict!
      await expect(
        mutations.updateProfile(
          { ...session2Load!.data, headline: 'Session 2 Headline' },
          session2Etag
        )
      ).rejects.toThrow(ConcurrencyError);

      // Verify content remains from Session 1
      const current = await store.getProfile();
      expect(current?.data.headline).toBe('Session 1 Headline');
    });

    it('Reload after conflict allows successful edit and save', async () => {
      // Session A & B start at same version
      const initial = await store.getProfile();
      const sessionAEtag = initial!.etag;
      const sessionBEtag = initial!.etag;

      // Session A updates content
      await mutations.updateProfile(
        { ...initial!.data, headline: 'Session A Saved First' },
        sessionAEtag
      );

      // Session B fails due to conflict
      await expect(
        mutations.updateProfile(
          { ...initial!.data, headline: 'Session B Attempt' },
          sessionBEtag
        )
      ).rejects.toThrow(ConcurrencyError);

      // Session B reloads fresh content
      const sessionBReload = await store.getProfile();
      expect(sessionBReload?.data.headline).toBe('Session A Saved First');

      // Session B applies its edit on top of fresh version and saves successfully
      const sessionBSuccess = await mutations.updateProfile(
        { ...sessionBReload!.data, headline: 'Session B After Reload' },
        sessionBReload!.etag
      );
      expect(sessionBSuccess.profile.headline).toBe('Session B After Reload');
    });
  });

  describe('4. Worker API HTTP OCC & No-Store Verification', () => {
    let mockDb: MockD1Database;
    let adapter: CloudflareD1StorageAdapter;
    let app: ReturnType<typeof createPortfolioApp>;
    const TEST_SECRET = 'unit-test-dev-secret-isolated';
    const AUTH_HEADERS = {
      Authorization: `Bearer ${TEST_SECRET}`,
      'x-test-auth': 'admin',
    };

    beforeEach(async () => {
      process.env.ADMIN_API_SECRET = TEST_SECRET;
      mockDb = new MockD1Database();
      adapter = new CloudflareD1StorageAdapter(mockDb);
      const store = new ContentStore(adapter);
      await store.ensureInitialized();
      app = createPortfolioApp(adapter);
    });

    it('GET /api/admin/profile returns ETag and no-store Cache-Control header', async () => {
      const res = await app.request('/api/admin/profile', {
        headers: AUTH_HEADERS,
      });

      expect(res.status).toBe(200);
      expect(res.headers.get('ETag')).toBeDefined();
      expect(res.headers.get('Cache-Control')).toContain('no-store');
      expect(res.headers.get('Access-Control-Expose-Headers')).toContain('ETag');
    });

    it('GET /api/admin/resume returns ETag and no-store Cache-Control header', async () => {
      const res = await app.request('/api/admin/resume', {
        headers: AUTH_HEADERS,
      });

      expect(res.status).toBe(200);
      expect(res.headers.get('ETag')).toBeDefined();
      expect(res.headers.get('Cache-Control')).toContain('no-store');
    });

    it('PUT /api/admin/profile with If-Match: W/"..." succeeds and returns 200 with new ETag', async () => {
      const getRes = await app.request('/api/admin/profile', {
        headers: AUTH_HEADERS,
      });
      const originalEtag = getRes.headers.get('ETag')!;
      const profileData = (await getRes.json()).data;

      // Simulate browser sending weak ETag received from Cloudflare Brotli edge
      const weakIfMatch = `W/${originalEtag}`;

      const putRes = await app.request('/api/admin/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'If-Match': weakIfMatch,
          ...AUTH_HEADERS,
        },
        body: JSON.stringify({
          ...profileData,
          headline: 'Cloud & Infrastructure Lead',
        }),
      });

      expect(putRes.status).toBe(200);
      const putBody = await putRes.json();
      expect(putBody.success).toBe(true);
      expect(putBody.data.headline).toBe('Cloud & Infrastructure Lead');
      expect(putRes.headers.get('ETag')).toBeDefined();
      expect(putRes.headers.get('ETag')).not.toBe(originalEtag);
    });

    it('PUT /api/admin/profile with conflicting/stale If-Match returns 409 CONCURRENCY_CONFLICT', async () => {
      const getRes = await app.request('/api/admin/profile', {
        headers: AUTH_HEADERS,
      });
      const originalEtag = getRes.headers.get('ETag')!;
      const profileData = (await getRes.json()).data;

      // Update 1: succeeds
      await app.request('/api/admin/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'If-Match': originalEtag,
          ...AUTH_HEADERS,
        },
        body: JSON.stringify({
          ...profileData,
          headline: 'Update 1',
        }),
      });

      // Update 2 with the stale original ETag: returns 409 Conflict
      const conflictRes = await app.request('/api/admin/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'If-Match': originalEtag,
          ...AUTH_HEADERS,
        },
        body: JSON.stringify({
          ...profileData,
          headline: 'Update 2 Stale',
        }),
      });

      expect(conflictRes.status).toBe(409);
      const conflictBody = await conflictRes.json();
      expect(conflictBody.success).toBe(false);
      expect(conflictBody.code).toBe('CONCURRENCY_CONFLICT');
      expect(conflictBody.error).toBe('Resource has been modified by another session. Please reload.');
    });
  });
});
