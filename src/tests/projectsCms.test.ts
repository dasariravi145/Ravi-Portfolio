import { describe, it, expect, beforeEach } from 'vitest';
import { createPortfolioApp } from '../worker/api';
import { MemoryStorageAdapter } from '../storage/r2StorageAdapter';
import { createTestJwt } from '../auth/accessJwtValidator';
import { MediaAsset } from '../types/portfolio';

const TEST_SECRET = 'test-verification-secret-32-chars-min';
const TEST_AUD = 'test-access-aud-12345';
const TEST_TEAM_DOMAIN = 'https://dsecops88.cloudflareaccess.com';
const APPROVED_OWNER_EMAIL = 'dasariravid145@gmail.com';

function createJpegBuffer(): Uint8Array {
  const header = [0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01];
  const body = new Array(100).fill(0xaa);
  return new Uint8Array([...header, ...body]);
}

function createPngBuffer(): Uint8Array {
  const header = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d];
  const body = new Array(100).fill(0xbb);
  return new Uint8Array([...header, ...body]);
}

describe('Projects CMS & Media Galleries (Prompt 09)', () => {
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

    return app.request(
      path,
      {
        method: options.method || 'GET',
        headers,
        body,
      },
      env as any
    );
  };

  // 1. Create project
  it('1. should create a new project in drafts via POST /api/admin/projects', async () => {
    const newProjectPayload = {
      title: 'Terraform AWS Multi-Region Infrastructure',
      slug: 'terraform-aws-multi-region',
      category: 'Cloud Infrastructure & SRE',
      summary: 'Automated multi-region infrastructure provisioning using modular Terraform and Terragrunt.',
      deploymentStatus: 'Production Pipeline Automated',
      techStack: ['Terraform', 'AWS', 'Terragrunt', 'GitHub Actions'],
      published: false,
      featured: false,
      displayOrder: 5,
    };

    const res = await makeAuthRequest('/api/admin/projects', {
      method: 'POST',
      body: newProjectPayload,
    });

    expect(res.status).toBe(201);
    const json = (await res.json()) as any;
    expect(json.success).toBe(true);
    expect(json.data.id).toBeDefined();
    expect(json.data.slug).toBe('terraform-aws-multi-region');
    expect(json.data.published).toBe(false);
    expect(json.data.features).toEqual([]);
    expect(json.data.revision).toBe(1);
    expect(res.headers.get('ETag')).toBeDefined();
  });

  // 2. Read saved project
  it('2. should read saved project via GET /api/admin/projects/:id', async () => {
    const createRes = await makeAuthRequest('/api/admin/projects', {
      method: 'POST',
      body: {
        title: 'Kubernetes GitOps ArgoCD',
        slug: 'k8s-gitops-argocd',
        category: 'DevSecOps & Cloud',
        summary: 'Declarative continuous delivery pipeline for microservices on Kubernetes using ArgoCD.',
        deploymentStatus: 'Production Pipeline Automated',
        techStack: ['Kubernetes', 'ArgoCD', 'Helm'],
        published: true,
      },
    });
    const created = ((await createRes.json()) as any).data;

    const res = await makeAuthRequest(`/api/admin/projects/${created.id}`);
    expect(res.status).toBe(200);
    const json = (await res.json()) as any;
    expect(json.success).toBe(true);
    expect(json.data.title).toBe('Kubernetes GitOps ArgoCD');
    expect(res.headers.get('ETag')).toBeDefined();
  });

  // 3. Edit project
  it('3. should edit project fields via PUT /api/admin/projects/:id', async () => {
    const createRes = await makeAuthRequest('/api/admin/projects', {
      method: 'POST',
      body: {
        title: 'Original Project Title',
        slug: 'original-project-slug',
        category: 'DevSecOps & Cloud',
        summary: 'Original summary description before modification test.',
        deploymentStatus: 'Active Engineering Project',
        techStack: ['Docker'],
      },
    });
    const created = ((await createRes.json()) as any).data;
    const initialEtag = createRes.headers.get('ETag');

    const updateRes = await makeAuthRequest(`/api/admin/projects/${created.id}`, {
      method: 'PUT',
      headers: initialEtag ? { 'If-Match': initialEtag } : {},
      body: {
        title: 'Updated Engineering Project Title',
        summary: 'Updated summary description with extended information.',
        features: ['Automated rollouts', 'Canary deployments'],
      },
    });

    expect(updateRes.status).toBe(200);
    const updated = ((await updateRes.json()) as any).data;
    expect(updated.title).toBe('Updated Engineering Project Title');
    expect(updated.features).toContain('Automated rollouts');
    expect(updated.revision).toBe(2);
  });

  // 4. Reject invalid fields
  it('4. should reject invalid fields (short summary, empty title) with HTTP 400', async () => {
    const res = await makeAuthRequest('/api/admin/projects', {
      method: 'POST',
      body: {
        title: 'A', // too short (< 3)
        category: 'DevSecOps',
        summary: 'Short', // too short (< 10)
        techStack: [], // empty tech stack
        deploymentStatus: 'Active',
      },
    });

    expect(res.status).toBe(400);
    const json = (await res.json()) as any;
    expect(json.success).toBe(false);
    expect(json.code).toBe('VALIDATION_ERROR');
  });

  // 5. Reject duplicate slug
  it('5. should reject duplicate project slug with HTTP 400', async () => {
    // Attempt to create another project using an existing initial fixture slug
    const res = await makeAuthRequest('/api/admin/projects', {
      method: 'POST',
      body: {
        title: 'Another RoboShop Duplicate',
        slug: 'roboshop-devsecops', // duplicate slug
        category: 'DevSecOps & Cloud',
        summary: 'Attempting to create another project with same slug.',
        techStack: ['Jenkins'],
        deploymentStatus: 'Active',
      },
    });

    expect(res.status).toBe(400);
    const json = (await res.json()) as any;
    expect(json.error).toContain('Duplicate project slug detected');
  });

  // 6. Delete project
  it('6. should delete project and purge associated media via DELETE /api/admin/projects/:id', async () => {
    // 1. Create a project
    const createRes = await makeAuthRequest('/api/admin/projects', {
      method: 'POST',
      body: {
        title: 'Project To Delete',
        slug: 'project-to-delete',
        category: 'Android Engineering',
        summary: 'Temporary project created strictly for deletion verification.',
        techStack: ['Kotlin'],
        deploymentStatus: 'Prototype',
      },
    });
    const created = ((await createRes.json()) as any).data;

    // 2. Upload media and associate as cover
    const jpeg = createJpegBuffer();
    const mediaRes = await makeAuthRequest('/api/admin/media/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'image/jpeg', 'X-Filename': 'cover.jpg' },
      body: jpeg,
    });
    const mediaAsset = ((await mediaRes.json()) as any).data;

    await makeAuthRequest(`/api/admin/projects/${created.id}`, {
      method: 'PUT',
      body: { coverImage: mediaAsset },
    });

    // Verify media exists in R2
    expect(await adapter.getBinary(mediaAsset.key)).toBeDefined();

    // 3. Delete project
    const delRes = await makeAuthRequest(`/api/admin/projects/${created.id}`, {
      method: 'DELETE',
    });
    expect(delRes.status).toBe(200);

    // Verify project deleted from store
    const getRes = await makeAuthRequest(`/api/admin/projects/${created.id}`);
    expect(getRes.status).toBe(404);

    // Verify cover media object purged from R2
    expect(await adapter.getBinary(mediaAsset.key)).toBeNull();
  });

  // 7. Publish project
  it('7. should publish a project via POST /api/admin/projects/:id/publish', async () => {
    const createRes = await makeAuthRequest('/api/admin/projects', {
      method: 'POST',
      body: {
        title: 'Draft Case Study',
        slug: 'draft-case-study',
        category: 'Cloud',
        summary: 'Draft case study created in unpublished status.',
        techStack: ['AWS'],
        deploymentStatus: 'Prototype',
        published: false,
      },
    });
    const created = ((await createRes.json()) as any).data;

    const pubRes = await makeAuthRequest(`/api/admin/projects/${created.id}/publish`, {
      method: 'POST',
      body: { published: true },
    });

    expect(pubRes.status).toBe(200);
    const json = (await pubRes.json()) as any;
    expect(json.data.published).toBe(true);
  });

  // 8. Unpublish project
  it('8. should unpublish a project and auto-unfeature if featured', async () => {
    const createRes = await makeAuthRequest('/api/admin/projects', {
      method: 'POST',
      body: {
        title: 'Featured Live Project',
        slug: 'featured-live-project',
        category: 'DevSecOps & Cloud',
        summary: 'Live featured project that will be unpublished.',
        techStack: ['Docker'],
        deploymentStatus: 'Production Pipeline Automated',
        published: true,
        featured: true,
      },
    });
    const created = ((await createRes.json()) as any).data;
    expect(created.featured).toBe(true);

    const unpubRes = await makeAuthRequest(`/api/admin/projects/${created.id}/publish`, {
      method: 'POST',
      body: { published: false },
    });

    expect(unpubRes.status).toBe(200);
    const json = (await unpubRes.json()) as any;
    expect(json.data.published).toBe(false);
    expect(json.data.featured).toBe(false); // auto-unfeatured
  });

  // 9. Draft excluded from public API
  it('9. should exclude draft projects from public GET /api/public/projects', async () => {
    // Create a draft project
    await makeAuthRequest('/api/admin/projects', {
      method: 'POST',
      body: {
        title: 'Secret Draft Project',
        slug: 'secret-draft-project',
        category: 'AI & Automation',
        summary: 'Secret internal project that should never leak publicly.',
        techStack: ['Python'],
        deploymentStatus: 'Prototype',
        published: false,
      },
    });

    const publicRes = await app.request('/api/public/projects');
    expect(publicRes.status).toBe(200);
    const json = (await publicRes.json()) as any;
    const slugs = json.data.map((p: any) => p.slug);
    expect(slugs).not.toContain('secret-draft-project');
  });

  // 10. Draft detail returns 404
  it('10. should return HTTP 404 for draft project on GET /api/public/projects/:slug', async () => {
    await makeAuthRequest('/api/admin/projects', {
      method: 'POST',
      body: {
        title: 'Unpublished Detail Test',
        slug: 'unpublished-detail-slug',
        category: 'Cloud',
        summary: 'Case study in draft mode.',
        techStack: ['AWS'],
        deploymentStatus: 'Prototype',
        published: false,
      },
    });

    const publicDetailRes = await app.request('/api/public/projects/unpublished-detail-slug');
    expect(publicDetailRes.status).toBe(404);
  });

  // 11. Toggle featured state
  it('11. should toggle featured state and reject featuring unpublished draft', async () => {
    // Attempt to create featured draft
    const res = await makeAuthRequest('/api/admin/projects', {
      method: 'POST',
      body: {
        title: 'Invalid Featured Draft',
        slug: 'invalid-featured-draft',
        category: 'Cloud',
        summary: 'Draft with featured set to true.',
        techStack: ['AWS'],
        deploymentStatus: 'Prototype',
        published: false,
        featured: true,
      },
    });

    expect(res.status).toBe(400);
    const json = (await res.json()) as any;
    expect(json.error).toContain('Featured projects must be published');
  });

  // 12. Reorder projects
  it('12. should reorder projects persistently via POST /api/admin/projects/reorder', async () => {
    const listRes = await makeAuthRequest('/api/admin/projects');
    const projects = ((await listRes.json()) as any).data;
    const originalOrder = projects.map((p: any) => p.id);

    // Reverse order
    const reversedOrder = [...originalOrder].reverse();

    const reorderRes = await makeAuthRequest('/api/admin/projects/reorder', {
      method: 'POST',
      body: { orderedIds: reversedOrder },
    });

    expect(reorderRes.status).toBe(200);
    const reorderedJson = (await reorderRes.json()) as any;
    expect(reorderedJson.data[0].id).toBe(reversedOrder[0]);
    expect(reorderedJson.data[0].displayOrder).toBe(1);
  });

  // 13. Reject stale revision (OCC conflict)
  it('13. should reject stale revision with HTTP 409 Concurrency Conflict', async () => {
    const createRes = await makeAuthRequest('/api/admin/projects', {
      method: 'POST',
      body: {
        title: 'Concurrency Test Project',
        slug: 'concurrency-test-project',
        category: 'DevSecOps & Cloud',
        summary: 'Testing optimistic concurrency control under stale ETags.',
        techStack: ['Docker'],
        deploymentStatus: 'Active',
      },
    });
    const created = ((await createRes.json()) as any).data;

    // Mutate once to advance ETag
    await makeAuthRequest(`/api/admin/projects/${created.id}`, {
      method: 'PUT',
      body: { summary: 'First mutation advancing ETag in R2.' },
    });

    // Try to mutate with stale ETag "W/\"stale-etag-value\""
    const staleRes = await makeAuthRequest(`/api/admin/projects/${created.id}`, {
      method: 'PUT',
      headers: { 'If-Match': 'W/"stale-etag-value"' },
      body: { summary: 'Conflicting mutation that must be rejected.' },
    });

    expect(staleRes.status).toBe(409);
    const json = (await staleRes.json()) as any;
    expect(json.code).toBe('CONCURRENCY_CONFLICT');
  });

  // 14. Upload project cover
  it('14. should upload project cover image via POST /api/admin/media/upload and associate with project', async () => {
    const jpeg = createJpegBuffer();
    const uploadRes = await makeAuthRequest('/api/admin/media/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'image/jpeg', 'X-Filename': 'roboshop-cover.jpg' },
      body: jpeg,
    });

    expect(uploadRes.status).toBe(201);
    const asset = ((await uploadRes.json()) as any).data;
    expect(asset.url).toContain('/api/public/media/projects/');
    expect(asset.mimeType).toBe('image/jpeg');

    // Attach to existing project
    const updateRes = await makeAuthRequest('/api/admin/projects/p1', {
      method: 'PUT',
      body: { coverImage: asset },
    });

    expect(updateRes.status).toBe(200);
    const updated = ((await updateRes.json()) as any).data;
    expect(updated.coverImage.key).toBe(asset.key);
  });

  // 15. Replace project cover
  it('15. should replace project cover image and update project record', async () => {
    const png = createPngBuffer();
    const uploadRes = await makeAuthRequest('/api/admin/media/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'image/png', 'X-Filename': 'new-cover.png' },
      body: png,
    });
    const newCover = ((await uploadRes.json()) as any).data;

    const updateRes = await makeAuthRequest('/api/admin/projects/p1', {
      method: 'PUT',
      body: { coverImage: newCover },
    });

    expect(updateRes.status).toBe(200);
    const updated = ((await updateRes.json()) as any).data;
    expect(updated.coverImage.key).toBe(newCover.key);
  });

  // 16. Upload screenshot
  it('16. should upload screenshot and append to project screenshot gallery', async () => {
    const jpeg = createJpegBuffer();
    const uploadRes = await makeAuthRequest('/api/admin/media/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'image/jpeg', 'X-Filename': 'screenshot1.jpg' },
      body: jpeg,
    });
    const screenshotAsset = ((await uploadRes.json()) as any).data;
    screenshotAsset.caption = 'Pipeline Execution Graph';

    const getRes = await makeAuthRequest('/api/admin/projects/p1');
    const project = ((await getRes.json()) as any).data;

    const updateRes = await makeAuthRequest('/api/admin/projects/p1', {
      method: 'PUT',
      body: { screenshots: [...project.screenshots, screenshotAsset] },
    });

    expect(updateRes.status).toBe(200);
    const updated = ((await updateRes.json()) as any).data;
    expect(updated.screenshots.length).toBeGreaterThan(0);
    expect(updated.screenshots[0].caption).toBe('Pipeline Execution Graph');
  });

  // 17. Reorder screenshots
  it('17. should reorder screenshots within project gallery', async () => {
    const shotA: MediaAsset = {
      id: crypto.randomUUID(),
      key: 'media/projects/shot-a.jpg',
      url: '/api/public/media/projects/shot-a.jpg',
      caption: 'Screenshot A',
    };
    const shotB: MediaAsset = {
      id: crypto.randomUUID(),
      key: 'media/projects/shot-b.jpg',
      url: '/api/public/media/projects/shot-b.jpg',
      caption: 'Screenshot B',
    };

    // Save with [A, B]
    await makeAuthRequest('/api/admin/projects/p1', {
      method: 'PUT',
      body: { screenshots: [shotA, shotB] },
    });

    // Reorder to [B, A]
    const reorderedRes = await makeAuthRequest('/api/admin/projects/p1', {
      method: 'PUT',
      body: { screenshots: [shotB, shotA] },
    });

    expect(reorderedRes.status).toBe(200);
    const updated = ((await reorderedRes.json()) as any).data;
    expect(updated.screenshots[0].caption).toBe('Screenshot B');
    expect(updated.screenshots[1].caption).toBe('Screenshot A');
  });

  // 18. Delete screenshot
  it('18. should delete screenshot from gallery', async () => {
    const shotA: MediaAsset = {
      id: crypto.randomUUID(),
      key: 'media/projects/shot-a.jpg',
      url: '/api/public/media/projects/shot-a.jpg',
    };

    await makeAuthRequest('/api/admin/projects/p1', {
      method: 'PUT',
      body: { screenshots: [shotA] },
    });

    // Delete by setting empty array
    const clearRes = await makeAuthRequest('/api/admin/projects/p1', {
      method: 'PUT',
      body: { screenshots: [] },
    });

    expect(clearRes.status).toBe(200);
    const updated = ((await clearRes.json()) as any).data;
    expect(updated.screenshots).toEqual([]);
  });

  // 19. Reject invalid upload
  it('19. should reject invalid upload with non-image magic bytes or executable', async () => {
    // Executable ELF header: 0x7F 'E' 'L' 'F'
    const elfPayload = new Uint8Array([0x7f, 0x45, 0x4c, 0x46, 0x01, 0x01, 0x01, 0x00]);

    const res = await makeAuthRequest('/api/admin/media/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'image/jpeg', 'X-Filename': 'malware.exe' },
      body: elfPayload,
    });

    expect(res.status).toBe(400);
    const json = (await res.json()) as any;
    expect(json.success).toBe(false);
  });

  // 20. Reject unauthorized mutation
  it('20. should reject unauthorized project mutations without token with HTTP 401', async () => {
    const unauthRes = await app.request('/api/admin/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Unauthenticated Project' }),
    });

    expect(unauthRes.status).toBe(401);
  });

  // 21. Public project card rendering
  it('21. should verify public project card contains correct links, tags, and status badge', async () => {
    const res = await app.request('/api/public/projects');
    expect(res.status).toBe(200);
    const json = (await res.json()) as any;

    const roboshop = json.data.find((p: any) => p.slug === 'roboshop-devsecops');
    expect(roboshop).toBeDefined();
    expect(roboshop.deploymentStatus).toBe('Production Pipeline Automated');
    expect(roboshop.techStack).toContain('Kubernetes');
    expect(roboshop.githubUrl).toBe('https://github.com/dsecops88/roboshop-devsecops');
  });

  // 22. Dynamic case-study rendering
  it('22. should verify dynamic case-study rendering for published project', async () => {
    const res = await app.request('/api/public/projects/roboshop-devsecops');
    expect(res.status).toBe(200);
    const json = (await res.json()) as any;
    expect(json.data.title).toContain('RoboShop');
    expect(json.data.problemStatement).toBeDefined();
    expect(json.data.solutionArchitecture).toBeDefined();
    expect(json.data.published).toBe(true);
  });

  // 23. Optional sections hidden when empty
  it('23. should verify optional sections are hidden when empty without broken placeholders', async () => {
    const createRes = await makeAuthRequest('/api/admin/projects', {
      method: 'POST',
      body: {
        title: 'Minimal Project Clean Layout',
        slug: 'minimal-project-clean',
        category: 'DevSecOps & Cloud',
        summary: 'Minimal project without optional diagrams, challenges, or screenshots.',
        techStack: ['Docker'],
        deploymentStatus: 'Prototype',
        published: true,
        // Optional sections omitted
      },
    });
    expect(createRes.status).toBe(201);

    const getRes = await app.request('/api/public/projects/minimal-project-clean');
    expect(getRes.status).toBe(200);
    const json = (await getRes.json()) as any;
    expect(json.data.coverImage).toBeFalsy();
    expect(json.data.architectureDiagram).toBeFalsy();
    expect(json.data.screenshots).toEqual([]);
    expect(json.data.technicalChallenges).toBeUndefined();
    expect(json.data.testingDetails).toBeUndefined();
  });

  // 24. Dynamic SEO metadata
  it('24. should verify dynamic SEO metadata in project record', async () => {
    const createRes = await makeAuthRequest('/api/admin/projects', {
      method: 'POST',
      body: {
        title: 'SEO Optimized Project',
        slug: 'seo-optimized-project',
        category: 'DevSecOps & Cloud',
        summary: 'Project showcasing customized SEO titles, descriptions, and keywords.',
        techStack: ['Docker'],
        deploymentStatus: 'Production Pipeline Automated',
        published: true,
        seo: {
          metaTitle: 'Custom SEO Title | Ravi Dasari Portfolio',
          metaDescription: 'Targeted description optimized for web search ranking.',
          keywords: ['DevOps', 'SRE', 'Cloud', 'Ravi Dasari'],
        },
      },
    });

    const project = ((await createRes.json()) as any).data;
    expect(project.seo.metaTitle).toBe('Custom SEO Title | Ravi Dasari Portfolio');
    expect(project.seo.keywords).toContain('DevOps');
  });

  // 25. Data persists after restart
  it('25. should verify project data and media associations persist after simulated server restart', async () => {
    // 1. Create a project and attach media in current instance
    const jpeg = createJpegBuffer();
    const uploadRes = await makeAuthRequest('/api/admin/media/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'image/jpeg', 'X-Filename': 'persisted-cover.jpg' },
      body: jpeg,
    });
    const coverAsset = ((await uploadRes.json()) as any).data;

    const createRes = await makeAuthRequest('/api/admin/projects', {
      method: 'POST',
      body: {
        title: 'Restart Persistence Project',
        slug: 'restart-persistence-project',
        category: 'DevSecOps & Cloud',
        summary: 'Verifying state survival across memory adapter export and import simulation.',
        techStack: ['Docker', 'Kubernetes'],
        deploymentStatus: 'Production Pipeline Automated',
        published: true,
        coverImage: coverAsset,
      },
    });
    expect(createRes.status).toBe(201);
    const createdId = ((await createRes.json()) as any).data.id;

    // 2. Simulate server restart: Export storage state
    const exportedState = adapter.exportState();

    // 3. Create fresh storage adapter and import state
    const newAdapter = new MemoryStorageAdapter();
    newAdapter.importState(exportedState);
    const newApp = createPortfolioApp(newAdapter);

    // 4. Verify project is intact in new application instance
    const verifyRes = await newApp.request('/api/public/projects/restart-persistence-project');
    expect(verifyRes.status).toBe(200);
    const json = (await verifyRes.json()) as any;
    expect(json.data.id).toBe(createdId);
    expect(json.data.coverImage.key).toBe(coverAsset.key);

    // 5. Verify binary media blob is also intact
    const binaryMedia = await newAdapter.getBinary(coverAsset.key);
    expect(binaryMedia).toBeDefined();
    expect(binaryMedia?.data.byteLength).toBe(jpeg.byteLength);
  });

  // 26. Public updates without redeployment
  it('26. should verify public updates reflect immediately without site rebuild or redeployment', async () => {
    // 1. Initial public read
    const initialRes = await app.request('/api/public/projects/roboshop-devsecops');
    expect(initialRes.status).toBe(200);
    const initialTitle = ((await initialRes.json()) as any).data.title;

    // 2. Admin performs dynamic update
    const updatedTitle = 'RoboShop E-Commerce DevSecOps Pipeline (Zero-Rebuild Update)';
    const putRes = await makeAuthRequest('/api/admin/projects/p1', {
      method: 'PUT',
      body: { title: updatedTitle },
    });
    expect(putRes.status).toBe(200);

    // 3. Immediately query public API without any rebuild or restart
    const immediatePublicRes = await app.request('/api/public/projects/roboshop-devsecops');
    expect(immediatePublicRes.status).toBe(200);
    const newTitle = ((await immediatePublicRes.json()) as any).data.title;
    expect(newTitle).toBe(updatedTitle);
    expect(newTitle).not.toBe(initialTitle);
  });
});
