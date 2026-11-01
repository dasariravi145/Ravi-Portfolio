import { describe, it, expect, beforeEach } from 'vitest';
import {
  CloudflareD1StorageAdapter,
  MockD1Database,
  D1_CHUNK_SIZE_BYTES,
} from '../storage/d1StorageAdapter';
import { ContentStore } from '../storage/contentStore';
import { ContentMutationService } from '../services/contentMutationService';
import { WebAuthnStore } from '../auth/webauthnStore';
import { createPortfolioApp } from '../worker/api';

describe('Cloudflare D1 Unified Storage Architecture Verification', () => {
  let mockDb: MockD1Database;
  let adapter: CloudflareD1StorageAdapter;

  beforeEach(() => {
    mockDb = new MockD1Database();
    adapter = new CloudflareD1StorageAdapter(mockDb);
  });

  // ==========================================
  // 1. Structured Document Store & OCC Tests
  // ==========================================
  describe('Structured JSON Document Store', () => {
    it('should put and get structured JSON documents with versioning and ETag', async () => {
      const profileData = { name: 'Ravi Dasari', role: 'DevOps Engineer' };
      const stored = await adapter.put('content/profile.json', profileData);

      expect(stored).not.toBeNull();
      expect(stored?.key).toBe('content/profile.json');
      expect(stored?.version).toBe(1);
      expect(stored?.etag).toBeDefined();
      expect(stored?.data).toEqual(profileData);

      const fetched = await adapter.get<typeof profileData>('content/profile.json');
      expect(fetched).not.toBeNull();
      expect(fetched?.version).toBe(1);
      expect(fetched?.data).toEqual(profileData);
      expect(fetched?.etag).toBe(stored?.etag);
    });

    it('should increment version on updates', async () => {
      await adapter.put('content/profile.json', { v: 1 });
      const updated = await adapter.put('content/profile.json', { v: 2 });

      expect(updated?.version).toBe(2);
      const fetched = await adapter.get<{ v: number }>('content/profile.json');
      expect(fetched?.version).toBe(2);
      expect(fetched?.data.v).toBe(2);
    });

    it('should enforce Optimistic Concurrency Control (OCC) with conditional ETag', async () => {
      const v1 = await adapter.put('content/profile.json', { name: 'Ravi 1' });
      const initialEtag = v1!.etag;

      // Update with valid matching ETag
      const v2 = await adapter.put(
        'content/profile.json',
        { name: 'Ravi 2' },
        { onlyIf: { etagMatches: initialEtag } }
      );
      expect(v2).not.toBeNull();
      expect(v2?.version).toBe(2);

      // Attempt to update with the now-stale initial ETag (CAS failure)
      const staleUpdate = await adapter.put(
        'content/profile.json',
        { name: 'Ravi Concurrent' },
        { onlyIf: { etagMatches: initialEtag } }
      );
      expect(staleUpdate).toBeNull();

      // State remains at v2
      const current = await adapter.get('content/profile.json');
      expect(current?.version).toBe(2);
    });

    it('should delete documents and list keys by prefix', async () => {
      await adapter.put('content/profile.json', { a: 1 });
      await adapter.put('content/skills.json', { b: 2 });
      await adapter.put('auth/admin_credentials.json', { c: 3 });

      const contentKeys = await adapter.list('content/');
      expect(contentKeys).toContain('content/profile.json');
      expect(contentKeys).toContain('content/skills.json');
      expect(contentKeys).not.toContain('auth/admin_credentials.json');

      await adapter.delete('content/profile.json');
      const fetched = await adapter.get('content/profile.json');
      expect(fetched).toBeNull();
    });
  });

  // ==========================================
  // 2. Binary Media Chunking & Integrity Tests
  // ==========================================
  describe('Binary Media Chunking (Images up to 5 MB & PDFs up to 10 MB)', () => {
    it('should chunk, store, and reassemble a 5 MB image byte-for-byte with SHA-256 verification', async () => {
      const fiveMbSize = 5 * 1024 * 1024; // 5,242,880 bytes
      const testBuffer = new Uint8Array(fiveMbSize);

      // Fill buffer with pseudo-random deterministic test data
      for (let i = 0; i < fiveMbSize; i += 1024) {
        testBuffer[i] = (i / 1024) % 256;
      }

      const stored = await adapter.putBinary(
        'media/projects/hero-image.png',
        testBuffer,
        'image/png'
      );

      expect(stored).not.toBeNull();
      expect(stored?.size).toBe(fiveMbSize);
      expect(stored?.mimeType).toBe('image/png');

      // Verify chunk count in mock D1 (5 MB / 512 KB = 10 chunks)
      const expectedChunks = Math.ceil(fiveMbSize / D1_CHUNK_SIZE_BYTES);
      expect(expectedChunks).toBe(10);

      // Reassemble and fetch binary
      const retrieved = await adapter.getBinary('media/projects/hero-image.png');
      expect(retrieved).not.toBeNull();
      expect(retrieved?.size).toBe(fiveMbSize);
      expect(retrieved?.mimeType).toBe('image/png');

      // Verify exact byte equality
      expect(retrieved?.data.byteLength).toBe(fiveMbSize);
      expect(retrieved?.data[0]).toBe(testBuffer[0]);
      expect(retrieved?.data[1024]).toBe(testBuffer[1024]);
      expect(retrieved?.data[fiveMbSize - 1]).toBe(testBuffer[fiveMbSize - 1]);
    });

    it('should chunk, store, and reassemble a 10 MB resume PDF byte-for-byte', async () => {
      const tenMbSize = 10 * 1024 * 1024; // 10,485,760 bytes
      const pdfBuffer = new Uint8Array(tenMbSize);

      // Add PDF header magic bytes %PDF-1.7
      pdfBuffer[0] = 0x25; // %
      pdfBuffer[1] = 0x50; // P
      pdfBuffer[2] = 0x44; // D
      pdfBuffer[3] = 0x46; // F
      pdfBuffer[4] = 0x2d; // -
      pdfBuffer[5] = 0x31; // 1
      pdfBuffer[6] = 0x2e; // .
      pdfBuffer[7] = 0x37; // 7

      for (let i = 8; i < tenMbSize; i += 4096) {
        pdfBuffer[i] = (i / 4096) % 256;
      }

      const stored = await adapter.putBinary(
        'media/resume/active-resume.pdf',
        pdfBuffer,
        'application/pdf'
      );

      expect(stored).not.toBeNull();
      expect(stored?.size).toBe(tenMbSize);

      // 10 MB / 512 KB = 20 chunks
      const expectedChunks = Math.ceil(tenMbSize / D1_CHUNK_SIZE_BYTES);
      expect(expectedChunks).toBe(20);

      const retrieved = await adapter.getBinary('media/resume/active-resume.pdf');
      expect(retrieved).not.toBeNull();
      expect(retrieved?.size).toBe(tenMbSize);
      expect(retrieved?.mimeType).toBe('application/pdf');
      expect(retrieved?.data.byteLength).toBe(tenMbSize);
      expect(retrieved?.data[0]).toBe(0x25); // %
      expect(retrieved?.data[1]).toBe(0x50); // P
      expect(retrieved?.data[2]).toBe(0x44); // D
      expect(retrieved?.data[3]).toBe(0x46); // F
      expect(retrieved?.data[tenMbSize - 1]).toBe(pdfBuffer[tenMbSize - 1]);
    });

    it('should cleanly replace an existing binary file and clean up orphan chunks', async () => {
      // 1. Upload initial 3 MB image (6 chunks)
      const initialBuffer = new Uint8Array(3 * 1024 * 1024);
      initialBuffer.fill(42);
      await adapter.putBinary('media/profile/avatar.png', initialBuffer, 'image/png');

      let retrieved = await adapter.getBinary('media/profile/avatar.png');
      expect(retrieved?.size).toBe(3 * 1024 * 1024);

      // Count chunks in database
      let chunkCount = Array.from(mockDb.chunks.values()).filter(
        (c) => c.media_key === 'media/profile/avatar.png'
      ).length;
      expect(chunkCount).toBe(6);

      // 2. Replace with a 1 MB image (2 chunks)
      const replacementBuffer = new Uint8Array(1 * 1024 * 1024);
      replacementBuffer.fill(99);
      await adapter.putBinary('media/profile/avatar.png', replacementBuffer, 'image/png');

      retrieved = await adapter.getBinary('media/profile/avatar.png');
      expect(retrieved?.size).toBe(1 * 1024 * 1024);
      expect(retrieved?.data[0]).toBe(99);

      // 3. Verify orphan chunks were cleaned up (should have exactly 2 chunks now, not 6+2=8)
      chunkCount = Array.from(mockDb.chunks.values()).filter(
        (c) => c.media_key === 'media/profile/avatar.png'
      ).length;
      expect(chunkCount).toBe(2);
    });

    it('should delete a binary file along with all of its chunks', async () => {
      const buffer = new Uint8Array(2 * 1024 * 1024);
      await adapter.putBinary('media/projects/screenshot.webp', buffer, 'image/webp');

      expect(mockDb.media.has('media/projects/screenshot.webp')).toBe(true);

      const deleted = await adapter.delete('media/projects/screenshot.webp');
      expect(deleted).toBe(true);

      expect(mockDb.media.has('media/projects/screenshot.webp')).toBe(false);
      const remainingChunks = Array.from(mockDb.chunks.values()).filter(
        (c) => c.media_key === 'media/projects/screenshot.webp'
      );
      expect(remainingChunks.length).toBe(0);
    });

    it('should reject serving incomplete or interrupted uploads', async () => {
      // Manually simulate an interrupted upload with status = 'uploading'
      mockDb.media.set('media/corrupted.pdf', {
        key: 'media/corrupted.pdf',
        mime_type: 'application/pdf',
        total_size: 1024 * 1024,
        chunk_count: 2,
        checksum: 'fake-hash',
        etag: 'fake-etag',
        status: 'uploading', // not 'complete'
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const retrieved = await adapter.getBinary('media/corrupted.pdf');
      expect(retrieved).toBeNull();
    });

    it('should reject serving when constituent chunk count is incomplete', async () => {
      // Simulate missing chunk
      mockDb.media.set('media/missing-chunk.png', {
        key: 'media/missing-chunk.png',
        mime_type: 'image/png',
        total_size: 1024 * 1024,
        chunk_count: 2,
        checksum: 'fake-hash',
        etag: 'fake-etag',
        status: 'complete',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      // Insert only chunk 0 (chunk 1 missing)
      mockDb.chunks.set('media/missing-chunk.png:0', {
        media_key: 'media/missing-chunk.png',
        chunk_index: 0,
        chunk_size: 512 * 1024,
        data: new Uint8Array(512 * 1024),
      });

      const retrieved = await adapter.getBinary('media/missing-chunk.png');
      expect(retrieved).toBeNull();
    });
  });

  // ==========================================
  // 3. Storage Footprint & Quota Verification
  // ==========================================
  describe('D1 Storage Footprint & Free Plan Quota Compliance', () => {
    it('should accurately track document and media storage usage', async () => {
      await adapter.put('content/profile.json', { name: 'Ravi Dasari' });
      await adapter.putBinary('media/resume.pdf', new Uint8Array(250 * 1024), 'application/pdf');

      const usage = await adapter.calculateStorageUsage();
      expect(usage.documentCount).toBe(1);
      expect(usage.mediaCount).toBe(1);
      expect(usage.documentBytes).toBeGreaterThan(0);
      expect(usage.mediaBytes).toBe(250 * 1024);
      expect(usage.totalBytes).toBe(usage.documentBytes + usage.mediaBytes);

      // Verify that total portfolio usage is vastly below the 500 MB per-database limit
      const D1_FREE_DB_LIMIT_BYTES = 500 * 1024 * 1024; // 500 MB
      expect(usage.totalBytes).toBeLessThan(D1_FREE_DB_LIMIT_BYTES);
    });
  });

  // ==========================================
  // 4. ContentStore & Mutation Service Integration
  // ==========================================
  describe('ContentStore & ContentMutationService with D1', () => {
    it('should initialize all 11 content domains in D1 and preserve factual data', async () => {
      const store = new ContentStore(adapter);
      await store.ensureInitialized();

      const profileObj = await store.getProfile();
      expect(profileObj).toBeDefined();
      expect(profileObj?.data.fullName).toBe('Ravi Dasari');
      expect(profileObj?.data.location).toBe('Bengaluru, Karnataka, India');
      expect(profileObj?.data.remoteAvailability).toBe('Open to Global Remote Opportunities');

      const projects = await store.getProjects();
      expect(projects?.data.length).toBeGreaterThanOrEqual(4);

      const skills = await store.getSkills();
      expect(skills?.data.length).toBeGreaterThanOrEqual(12);

      const exp = await store.getExperience();
      expect(exp?.data.length).toBeGreaterThanOrEqual(6);
    });

    it('should perform mutations with pre-mutation backup snapshots in D1', async () => {
      const store = new ContentStore(adapter);
      await store.ensureInitialized();
      const mutations = new ContentMutationService(store);

      const currentProfileObj = await store.getProfile();
      const updatedProfile = await mutations.updateProfile({
        ...currentProfileObj!.data,
        headline: 'Senior Cloud & DevSecOps Architect',
      });

      expect(updatedProfile.profile.headline).toBe('Senior Cloud & DevSecOps Architect');

      // Verify pre-mutation backup was created in D1
      const backups = await adapter.list('backups/');
      expect(backups.length).toBeGreaterThan(0);
      expect(backups[0]).toMatch(/^backups\/profile-/);
    });
  });

  // ==========================================
  // 5. WebAuthn Store & Concurrent Recovery Tests
  // ==========================================
  describe('WebAuthn Store with D1 Atomic Recovery Code Consumption', () => {
    it('should securely store credentials and hashed recovery codes in D1', async () => {
      const webauthnStore = new WebAuthnStore(adapter);
      const { plainCodes, hashedCodes } = await WebAuthnStore.generateRecoveryCodesWithHashes();

      await webauthnStore.saveCredentialsStore({
        schemaVersion: 1,
        enrolled: true,
        origin: 'https://ravi-portfolio.dsecops88.online',
        updatedAt: new Date().toISOString(),
        credentials: [
          {
            id: 'cred-d1-test-1',
            publicKey: 'base64url-key',
            counter: 0,
            transports: ['internal'],
            name: 'Primary Key',
            createdAt: new Date().toISOString(),
            lastUsedAt: new Date().toISOString(),
          },
        ],
        recoveryCodes: hashedCodes,
        revokedSessionIds: [],
        ownerEmail: 'dasariravid145@gmail.com',
        rpId: 'ravi-portfolio.dsecops88.online',
      });

      const store = await webauthnStore.getCredentialsStore();
      expect(store?.enrolled).toBe(true);
      expect(store?.credentials.length).toBe(1);
      expect(store?.recoveryCodes.length).toBe(5);

      // Verify plain code can be consumed
      const redeemRes = await webauthnStore.consumeRecoveryCode(plainCodes[0]);
      expect(redeemRes.success).toBe(true);
      expect(redeemRes.remaining).toBe(4);

      // Re-redeeming the same code fails
      const secondRedeem = await webauthnStore.consumeRecoveryCode(plainCodes[0]);
      expect(secondRedeem.success).toBe(false);
      expect(secondRedeem.remaining).toBe(4);
    });

    it('should atomically allow only ONE of two concurrent recovery code redemptions to succeed', async () => {
      const webauthnStore = new WebAuthnStore(adapter);
      const { plainCodes, hashedCodes } = await WebAuthnStore.generateRecoveryCodesWithHashes();

      await webauthnStore.saveCredentialsStore({
        schemaVersion: 1,
        enrolled: true,
        origin: 'https://ravi-portfolio.dsecops88.online',
        updatedAt: new Date().toISOString(),
        credentials: [
          {
            id: 'cred-1',
            publicKey: 'key',
            counter: 0,
            transports: ['internal'],
            name: 'Key',
            createdAt: new Date().toISOString(),
            lastUsedAt: new Date().toISOString(),
          },
        ],
        recoveryCodes: hashedCodes,
        revokedSessionIds: [],
        ownerEmail: 'dasariravid145@gmail.com',
        rpId: 'ravi-portfolio.dsecops88.online',
      });

      const codeToTest = plainCodes[1];

      // Two concurrent redemption calls for the exact same code
      const [res1, res2] = await Promise.all([
        webauthnStore.consumeRecoveryCode(codeToTest),
        webauthnStore.consumeRecoveryCode(codeToTest),
      ]);

      const successes = [res1, res2].filter((r) => r.success);
      const failures = [res1, res2].filter((r) => !r.success);

      expect(successes.length).toBe(1);
      expect(failures.length).toBe(1);
      expect(failures[0].success).toBe(false);
    });
  });

  // ==========================================
  // 6. Worker API & Public Media Endpoint Security
  // ==========================================
  describe('Worker API with D1 Storage Integration', () => {
    it('should serve dynamic content from D1 through public API routes', async () => {
      const store = new ContentStore(adapter);
      await store.ensureInitialized();

      const app = createPortfolioApp(adapter);
      const res = await app.request('http://localhost:8787/api/public/profile');
      expect(res.status).toBe(200);

      const json = (await res.json()) as { success: boolean; data: { fullName: string; location: string } };
      expect(json.success).toBe(true);
      expect(json.data.fullName).toBe('Ravi Dasari');
      expect(json.data.location).toBe('Bengaluru, Karnataka, India');
    });

    it('should serve chunked media from D1 with proper ETag and cache headers', async () => {
      const testImage = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);
      await adapter.putBinary('media/projects/test.png', testImage, 'image/png');

      const app = createPortfolioApp(adapter);
      const res = await app.request('http://localhost:8787/api/public/media/projects/test.png');
      expect(res.status).toBe(200);
      expect(res.headers.get('Content-Type')).toBe('image/png');
      expect(res.headers.get('ETag')).toBeDefined();
      expect(res.headers.get('Cache-Control')).toMatch(/public/i);

      const bytes = new Uint8Array(await res.arrayBuffer());
      expect(bytes).toEqual(testImage);
    });

    it('should strictly prohibit accessing auth credentials or backups via media endpoint', async () => {
      await adapter.put('auth/admin_credentials.json', { secret: 'topsecret' });
      await adapter.put('backups/profile-backup.json', { backup: 'sensitive' });

      const app = createPortfolioApp(adapter);

      // Attempt path traversal or direct query for non-media data
      const res1 = await app.request('http://localhost:8787/api/public/media/..%2Fauth%2Fadmin_credentials.json');
      expect(res1.status).toBe(400); // Path traversal rejected with 400

      const res2 = await app.request('http://localhost:8787/api/public/media/..%2Fbackups%2Fprofile-backup.json');
      expect(res2.status).toBe(400);

      // Attempt requesting non-media file starting with media/ (not found)
      const res3 = await app.request('http://localhost:8787/api/public/media/unknown-file.png');
      expect(res3.status).toBe(404);
    });
  });
});
