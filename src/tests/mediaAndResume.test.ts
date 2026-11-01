import { describe, it, expect, beforeEach } from 'vitest';
import { createPortfolioApp } from '../worker/api';
import { MemoryStorageAdapter } from '../storage/r2StorageAdapter';
import { createTestJwt } from '../auth/accessJwtValidator';
import { ContentStore } from '../storage/contentStore';

const TEST_SECRET = 'test-verification-secret-32-chars-min';
const TEST_AUD = 'test-access-aud-12345';
const TEST_TEAM_DOMAIN = 'https://dsecops88.cloudflareaccess.com';
const APPROVED_OWNER_EMAIL = 'dasariravid145@gmail.com';

// Binary Test Payload Builders
function createJpegBuffer(): Uint8Array {
  // Valid JPEG magic header: FF D8 FF E0
  const header = [0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01];
  const body = new Array(100).fill(0xaa);
  return new Uint8Array([...header, ...body]);
}

function createPngBuffer(): Uint8Array {
  // Valid PNG magic header: 89 50 4E 47 0D 0A 1A 0A
  const header = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d];
  const body = new Array(100).fill(0xbb);
  return new Uint8Array([...header, ...body]);
}

function createWebpBuffer(): Uint8Array {
  // Valid WebP header: RIFF....WEBP
  const header = [
    0x52, 0x49, 0x46, 0x46, // RIFF
    0x24, 0x00, 0x00, 0x00, // Size
    0x57, 0x45, 0x42, 0x50, // WEBP
    0x56, 0x50, 0x38, 0x20, // VP8
  ];
  const body = new Array(100).fill(0xcc);
  return new Uint8Array([...header, ...body]);
}

function createPdfBuffer(): Uint8Array {
  // Valid PDF header: %PDF-1.4
  const encoder = new TextEncoder();
  return encoder.encode('%PDF-1.4\n1 0 obj\n<< /Title (Ravi Dasari Resume) >>\nendobj\n%%EOF');
}

describe('Profile Photo & Resume Management (Prompt 08)', () => {
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
    path: string,
    options: {
      method?: string;
      token?: string | null;
      headers?: Record<string, string>;
      body?: any;
    } = {}
  ) => {
    const headers: Record<string, string> = {
      ...options.headers,
    };
    if (options.token !== null) {
      headers['Authorization'] = `Bearer ${options.token || validToken}`;
    }

    let body = options.body;
    const isBinary =
      ArrayBuffer.isView(body) ||
      body instanceof ArrayBuffer ||
      body?.constructor?.name === 'Uint8Array';

    if (body && typeof body === 'object' && !isBinary) {
      if (!headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
      }
      body = JSON.stringify(body);
    }

    const env = {
      CF_ACCESS_TEAM_DOMAIN: TEST_TEAM_DOMAIN,
      CF_ACCESS_AUD: TEST_AUD,
      CF_ACCESS_OWNER_EMAIL: APPROVED_OWNER_EMAIL,
      CF_ACCESS_SECRET: TEST_SECRET,
      ENVIRONMENT: 'development',
    };

    return app.request(path, {
      method: options.method || 'GET',
      headers,
      body,
    }, env as any);
  };

  // 1. Valid JPEG upload
  it('1. should upload valid JPEG profile photo and update profile.avatar', async () => {
    const jpeg = createJpegBuffer();
    const res = await makeAuthRequest('/api/admin/profile/photo', {
      method: 'POST',
      headers: {
        'Content-Type': 'image/jpeg',
        'X-Filename': 'portrait.jpg',
      },
      body: jpeg,
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    expect(body.data.avatar).toBeDefined();
    expect(body.data.avatar.mimeType).toBe('image/jpeg');
    expect(body.data.avatar.key).toContain('media/avatars/avatar-');

    // Verify stored binary
    const stored = await adapter.getBinary(body.data.avatar.key);
    expect(stored).toBeDefined();
    expect(stored?.mimeType).toBe('image/jpeg');
  });

  // 2. Valid PNG upload
  it('2. should upload valid PNG profile photo and update profile.avatar', async () => {
    const png = createPngBuffer();
    const res = await makeAuthRequest('/api/admin/profile/photo', {
      method: 'POST',
      headers: {
        'Content-Type': 'image/png',
        'X-Filename': 'portrait.png',
      },
      body: png,
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.data.avatar.mimeType).toBe('image/png');
  });

  // 3. Valid WebP upload
  it('3. should upload valid WebP profile photo and update profile.avatar', async () => {
    const webp = createWebpBuffer();
    const res = await makeAuthRequest('/api/admin/profile/photo', {
      method: 'POST',
      headers: {
        'Content-Type': 'image/webp',
        'X-Filename': 'portrait.webp',
      },
      body: webp,
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.data.avatar.mimeType).toBe('image/webp');
  });

  // 4. Reject invalid image format
  it('4. should reject invalid image format with HTTP 400', async () => {
    const textBuffer = new TextEncoder().encode('PlainTextNotAnImage');
    const res = await makeAuthRequest('/api/admin/profile/photo', {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
        'X-Filename': 'malicious.txt',
      },
      body: textBuffer,
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as any;
    expect(body.code).toBe('VALIDATION_ERROR');
    expect(body.error).toContain('Invalid photo format');
  });

  // 5. Reject oversized image
  it('5. should reject oversized image exceeding 5 MB with HTTP 400', async () => {
    const oversized = new Uint8Array(5 * 1024 * 1024 + 1024);
    oversized.set([0xff, 0xd8, 0xff, 0xe0]); // Fake JPEG header
    const res = await makeAuthRequest('/api/admin/profile/photo', {
      method: 'POST',
      headers: {
        'Content-Type': 'image/jpeg',
        'X-Filename': 'huge.jpg',
      },
      body: oversized,
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as any;
    expect(body.code).toBe('VALIDATION_ERROR');
    expect(body.error).toContain('exceeds maximum limit of 5 MB');
  });

  // 6. Reject MIME/signature mismatch
  it('6. should reject MIME and signature mismatch with HTTP 400', async () => {
    const pdf = createPdfBuffer(); // PDF signature
    const res = await makeAuthRequest('/api/admin/profile/photo', {
      method: 'POST',
      headers: {
        'Content-Type': 'image/jpeg', // Declaring JPEG
        'X-Filename': 'disguised.jpg',
      },
      body: pdf,
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as any;
    expect(body.code).toBe('VALIDATION_ERROR');
    expect(body.error).toContain('does not match valid JPEG structure');
  });

  // 7. Replace profile photo
  it('7. should replace profile photo and clean up previous object from R2', async () => {
    // Initial upload
    const jpeg = createJpegBuffer();
    const res1 = await makeAuthRequest('/api/admin/profile/photo', {
      method: 'POST',
      headers: { 'Content-Type': 'image/jpeg' },
      body: jpeg,
    });
    const oldKey = ((await res1.json()) as any).data.avatar.key;
    expect(await adapter.getBinary(oldKey)).toBeDefined();

    // Replacement upload
    const webp = createWebpBuffer();
    const res2 = await makeAuthRequest('/api/admin/profile/photo', {
      method: 'POST',
      headers: { 'Content-Type': 'image/webp' },
      body: webp,
    });
    const newKey = ((await res2.json()) as any).data.avatar.key;

    expect(newKey).not.toBe(oldKey);
    expect(await adapter.getBinary(newKey)).toBeDefined();
    // Verify old key was cleaned up from storage
    expect(await adapter.getBinary(oldKey)).toBeNull();
  });

  // 8. Preserve old photo on failed replacement
  it('8. should preserve old photo if replacement fails concurrency check', async () => {
    // Initial upload
    const jpeg = createJpegBuffer();
    const res1 = await makeAuthRequest('/api/admin/profile/photo', {
      method: 'POST',
      headers: { 'Content-Type': 'image/jpeg' },
      body: jpeg,
    });
    const initialKey = ((await res1.json()) as any).data.avatar.key;

    // Replacement with stale If-Match ETag
    const webp = createWebpBuffer();
    const res2 = await makeAuthRequest('/api/admin/profile/photo', {
      method: 'POST',
      headers: {
        'Content-Type': 'image/webp',
        'If-Match': 'w/"stale-etag-conflict"',
      },
      body: webp,
    });

    expect(res2.status).toBe(409);
    // Old key must be preserved!
    expect(await adapter.getBinary(initialKey)).toBeDefined();
  });

  // 9. Delete profile photo
  it('9. should delete profile photo and purge object from R2', async () => {
    const jpeg = createJpegBuffer();
    const uploadRes = await makeAuthRequest('/api/admin/profile/photo', {
      method: 'POST',
      headers: { 'Content-Type': 'image/jpeg' },
      body: jpeg,
    });
    const avatarKey = ((await uploadRes.json()) as any).data.avatar.key;

    // Delete
    const deleteRes = await makeAuthRequest('/api/admin/profile/photo', {
      method: 'DELETE',
    });
    expect(deleteRes.status).toBe(200);
    const body = (await deleteRes.json()) as any;
    expect(body.data.avatar).toBeNull();

    // Object purged from storage
    expect(await adapter.getBinary(avatarKey)).toBeNull();
  });

  // 10. Fallback avatar after deletion
  it('10. should return avatar: null in public profile API after deletion', async () => {
    await makeAuthRequest('/api/admin/profile/photo', { method: 'DELETE' });

    const pubRes = await app.request('/api/public/profile');
    expect(pubRes.status).toBe(200);
    const body = (await pubRes.json()) as any;
    expect(body.data.avatar).toBeNull();
  });

  // 11. Reject unauthorized photo upload
  it('11. should reject unauthenticated photo upload with HTTP 401', async () => {
    const res = await makeAuthRequest('/api/admin/profile/photo', {
      method: 'POST',
      token: null, // No token
      headers: { 'Content-Type': 'image/jpeg' },
      body: createJpegBuffer(),
    });

    expect(res.status).toBe(401);
  });

  // 12. Valid PDF upload
  it('12. should upload valid PDF resume and set activeResume', async () => {
    const pdf = createPdfBuffer();
    const res = await makeAuthRequest('/api/admin/resume/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/pdf',
        'X-Filename': 'Ravi_Dasari_Resume.pdf',
      },
      body: pdf,
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    expect(body.data.activeResume).toBeDefined();
    expect(body.data.activeResume.mimeType).toBe('application/pdf');
    expect(body.data.published).toBe(true);
  });

  // 13. Reject non-PDF resume
  it('13. should reject non-PDF resume upload with HTTP 400', async () => {
    const textBuffer = new TextEncoder().encode('Not a pdf content');
    const res = await makeAuthRequest('/api/admin/resume/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: textBuffer,
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as any;
    expect(body.error).toContain('Resumes must strictly be in PDF format');
  });

  // 14. Reject oversized resume
  it('14. should reject oversized resume exceeding 10 MB with HTTP 400', async () => {
    const oversized = new Uint8Array(10 * 1024 * 1024 + 1024);
    oversized.set([0x25, 0x50, 0x44, 0x46]); // Fake %PDF header
    const res = await makeAuthRequest('/api/admin/resume/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/pdf' },
      body: oversized,
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as any;
    expect(body.error).toContain('exceeds maximum limit of 10 MB');
  });

  // 15. Preview current resume
  it('15. should stream active resume inline via admin preview endpoint', async () => {
    await makeAuthRequest('/api/admin/resume/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/pdf' },
      body: createPdfBuffer(),
    });

    const res = await makeAuthRequest('/api/admin/resume/preview');
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/pdf');
    expect(res.headers.get('Content-Disposition')).toContain('inline');
  });

  // 16. Replace resume
  it('16. should replace resume and archive previous version in audit history', async () => {
    // Revision 1
    const pdf1 = createPdfBuffer();
    await makeAuthRequest('/api/admin/resume/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/pdf', 'X-Filename': 'Resume_v1.pdf' },
      body: pdf1,
    });

    // Revision 2
    const pdf2 = new TextEncoder().encode('%PDF-1.4\nRevision 2 Content\n%%EOF');
    const res2 = await makeAuthRequest('/api/admin/resume/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/pdf', 'X-Filename': 'Resume_v2.pdf' },
      body: pdf2,
    });

    expect(res2.status).toBe(200);
    const body = (await res2.json()) as any;
    expect(body.data.auditHistory.length).toBeGreaterThan(0);
    expect(body.data.auditHistory[0].filename).toBe('Resume_v1.pdf');
  });

  // 17. Preserve old resume on failed replacement
  it('17. should preserve existing resume if new replacement payload is invalid', async () => {
    await makeAuthRequest('/api/admin/resume/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/pdf', 'X-Filename': 'Resume_Initial.pdf' },
      body: createPdfBuffer(),
    });

    // Invalid upload attempt
    const res = await makeAuthRequest('/api/admin/resume/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/pdf' },
      body: new Uint8Array([0x00, 0x01, 0x02]), // Corrupt signature
    });

    expect(res.status).toBe(400);

    // Verify existing active resume still intact
    const previewRes = await makeAuthRequest('/api/admin/resume/preview');
    expect(previewRes.status).toBe(200);
  });

  // 18. Publish resume
  it('18. should publish resume and allow public access', async () => {
    await makeAuthRequest('/api/admin/resume/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/pdf' },
      body: createPdfBuffer(),
    });

    const res = await makeAuthRequest('/api/admin/resume/publish', {
      method: 'POST',
      body: { published: true },
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.data.published).toBe(true);
  });

  // 19. Unpublish resume
  it('19. should unpublish resume and set published: false', async () => {
    const res = await makeAuthRequest('/api/admin/resume/publish', {
      method: 'POST',
      body: { published: false },
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.data.published).toBe(false);
  });

  // 20. Public download of published resume
  it('20. should serve published resume via public download endpoint with attachment header', async () => {
    await makeAuthRequest('/api/admin/resume/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/pdf' },
      body: createPdfBuffer(),
    });
    await makeAuthRequest('/api/admin/resume/publish', {
      method: 'POST',
      body: { published: true },
    });

    const res = await app.request('/api/public/resume/download');
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/pdf');
    expect(res.headers.get('Content-Disposition')).toContain('attachment; filename="Ravi_Dasari_Resume.pdf"');
  });

  // 21. Reject public access to unpublished resume
  it('21. should reject public download of unpublished resume with HTTP 404', async () => {
    await makeAuthRequest('/api/admin/resume/publish', {
      method: 'POST',
      body: { published: false },
    });

    const res = await app.request('/api/public/resume/download');
    expect(res.status).toBe(404);
    const body = (await res.json()) as any;
    expect(body.code).toBe('NOT_FOUND');
  });

  // 22. Delete resume
  it('22. should delete active resume and revoke public download with HTTP 404', async () => {
    const res = await makeAuthRequest('/api/admin/resume', { method: 'DELETE' });
    expect(res.status).toBe(200);

    const body = (await res.json()) as any;
    expect(body.data.activeResume).toBeNull();
    expect(body.data.published).toBe(false);

    // Public download must return 404
    const pubRes = await app.request('/api/public/resume/download');
    expect(pubRes.status).toBe(404);
  });

  // 23. Reject unauthorized resume mutation
  it('23. should reject unauthenticated resume upload or delete with HTTP 401', async () => {
    const uploadRes = await makeAuthRequest('/api/admin/resume/upload', {
      method: 'POST',
      token: null,
      headers: { 'Content-Type': 'application/pdf' },
      body: createPdfBuffer(),
    });
    expect(uploadRes.status).toBe(401);

    const deleteRes = await makeAuthRequest('/api/admin/resume', {
      method: 'DELETE',
      token: null,
    });
    expect(deleteRes.status).toBe(401);
  });

  // 24. Handle missing R2 object
  it('24. should return HTTP 404 for missing R2 media object', async () => {
    const res = await app.request('/api/public/media/avatars/non-existent-avatar.png');
    expect(res.status).toBe(404);
    const body = (await res.json()) as any;
    expect(body.code).toBe('NOT_FOUND');
  });

  // 25. Verify content persistence after restart
  it('25. should verify binary media and content persistence after simulated server restart', async () => {
    // 1. Upload avatar and resume
    const jpeg = createJpegBuffer();
    const photoRes = await makeAuthRequest('/api/admin/profile/photo', {
      method: 'POST',
      headers: { 'Content-Type': 'image/jpeg' },
      body: jpeg,
    });
    const avatarKey = ((await photoRes.json()) as any).data.avatar.key;

    const pdf = createPdfBuffer();
    await makeAuthRequest('/api/admin/resume/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/pdf' },
      body: pdf,
    });

    // 2. Export state (simulating cold storage in R2)
    const exportedState = adapter.exportState();
    expect(Object.keys(exportedState).some((k) => k.startsWith('__bin__:'))).toBe(true);

    // 3. Re-instantiate fresh adapter and import state
    const newAdapter = new MemoryStorageAdapter();
    newAdapter.importState(exportedState);

    // 4. Verify binary is intact in new adapter
    const restoredBinary = await newAdapter.getBinary(avatarKey);
    expect(restoredBinary).toBeDefined();
    expect(restoredBinary?.data.length).toBe(jpeg.length);

    // 5. Verify JSON reference is intact
    const newStore = new ContentStore(newAdapter);
    const restoredProfile = await newStore.getProfile();
    expect(restoredProfile?.data.avatar?.key).toBe(avatarKey);
  });
});
