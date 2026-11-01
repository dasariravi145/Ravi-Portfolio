import http from 'node:http';

const TEST_SECRET = 'test-verification-secret-32-chars-min';
const TEST_AUD = 'test-access-aud-12345';
const TEST_TEAM_DOMAIN = 'https://dsecops88.cloudflareaccess.com';
const APPROVED_OWNER_EMAIL = 'dasariravid145@gmail.com';

function base64UrlEncode(str) {
  return Buffer.from(str).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function createSignedToken() {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: TEST_TEAM_DOMAIN,
    aud: TEST_AUD,
    sub: 'user-ravi-dasari-uuid',
    email: APPROVED_OWNER_EMAIL,
    iat: now,
    exp: now + 3600,
    type: 'app',
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const dataToSign = `${encodedHeader}.${encodedPayload}`;

  const crypto = await import('node:crypto');
  const signature = crypto.createHmac('sha256', TEST_SECRET).update(dataToSign).digest('base64url');
  return `${dataToSign}.${signature}`;
}

async function request(url, options = {}) {
  const parsed = new URL(url);
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname + parsed.search,
      method: options.method || 'GET',
      headers: options.headers || {},
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(data); } catch {}
        resolve({ status: res.statusCode, headers: res.headers, body: data, json });
      });
    });
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

async function runPhase1() {
  console.log('--- Phase 1: Real Local Wrangler R2 Mutation & OCC Test ---');
  const token = await createSignedToken();

  // 1. Initial health check
  const health = await request('http://127.0.0.1:8787/api/public/content');
  if (health.status !== 200) {
    throw new Error(`Worker health check failed with status ${health.status}`);
  }
  console.log('✓ Worker is running and serving /api/public/content (HTTP 200)');

  // 2. Create isolated test project
  const testSlug = 'r2-real-persist-' + Date.now();
  const testProject = {
    title: 'Real Wrangler R2 Persistence Test Project',
    slug: testSlug,
    category: 'Cloud Infrastructure & SRE',
    summary: 'Testing real disk-backed R2 persistence across worker process restarts.',
    deploymentStatus: 'In Development',
    evidenceStatus: 'Verified',
    techStack: ['Cloudflare R2', 'Miniflare', 'Wrangler'],
    published: true,
    featured: false,
    displayOrder: 999,
  };

  const createRes = await request('http://127.0.0.1:8787/api/admin/projects', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'cf-access-jwt-assertion': token,
    },
    body: JSON.stringify(testProject),
  });

  if (createRes.status !== 201) {
    throw new Error(`Failed to create project in R2: HTTP ${createRes.status} ${createRes.body}`);
  }
  const created = createRes.json.data;
  const etag = createRes.headers['etag'];
  console.log(`✓ Project created in real local R2: ID=${created.id}, Slug=${testSlug}, ETag=${etag}`);

  // 3. Verify public endpoint immediately reflects it
  const readRes = await request(`http://127.0.0.1:8787/api/public/projects/${testSlug}`);
  if (readRes.status !== 200 || readRes.json?.data?.slug !== testSlug) {
    throw new Error(`Project not found in R2 immediately after creation: HTTP ${readRes.status}`);
  }
  console.log('✓ Project read back from real local R2 via public API (HTTP 200)');

  // 4. Test Optimistic Concurrency Control (OCC) rejection with stale ETag
  const staleRes = await request(`http://127.0.0.1:8787/api/admin/projects/${created.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'cf-access-jwt-assertion': token,
      'if-match': 'W/"stale-etag-conflict-test"',
    },
    body: JSON.stringify({ ...testProject, summary: 'Should be rejected' }),
  });

  if (staleRes.status !== 409) {
    throw new Error(`OCC conflict check failed: Expected HTTP 409, got ${staleRes.status}`);
  }
  console.log('✓ Stale ETag conditional write correctly rejected with HTTP 409 Concurrency Conflict');

  // Save the testSlug to a temporary file for Phase 2 verification
  const fs = await import('node:fs');
  fs.writeFileSync('.wrangler/test-slug.txt', testSlug, 'utf-8');
  console.log(`✓ Saved test slug "${testSlug}" to .wrangler/test-slug.txt for restart verification.`);
}

async function runPhase2() {
  console.log('--- Phase 2: Post-Restart Real Local Wrangler R2 Verification ---');
  const fs = await import('node:fs');
  const testSlug = fs.readFileSync('.wrangler/test-slug.txt', 'utf-8').trim();

  // Query public project detail route
  const res = await request(`http://127.0.0.1:8787/api/public/projects/${testSlug}`);
  if (res.status !== 200 || res.json?.data?.slug !== testSlug) {
    throw new Error(`Persistence verification failed after restart: HTTP ${res.status} ${res.body}`);
  }
  console.log(`✓ SUCCESS: Project "${testSlug}" persisted on disk across Worker stop & restart!`);
  console.log(`✓ Retrieved Project Data: Title="${res.json.data.title}", TechStack=${JSON.stringify(res.json.data.techStack)}`);
}

const mode = process.argv[2] || 'phase1';
if (mode === 'phase1') {
  runPhase1().catch(err => { console.error('Phase 1 Error:', err); process.exit(1); });
} else {
  runPhase2().catch(err => { console.error('Phase 2 Error:', err); process.exit(1); });
}

