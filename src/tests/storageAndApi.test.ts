import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryStorageAdapter } from '../storage/r2StorageAdapter';
import { ContentStore } from '../storage/contentStore';
import { ContentMutationService } from '../services/contentMutationService';
import { createPortfolioApp } from '../worker/api';

describe('Persistent Content Storage & Dynamic Edge APIs (Prompt 06)', () => {
  let adapter: MemoryStorageAdapter;
  let store: ContentStore;
  let mutations: ContentMutationService;
  let app: ReturnType<typeof createPortfolioApp>;
  const TEST_SUITE_DEV_SECRET = 'unit-test-dev-secret-isolated';
  const AUTH_HEADER = {
    Authorization: `Bearer ${TEST_SUITE_DEV_SECRET}`,
    'Content-Type': 'application/json',
  };

  beforeEach(() => {
    process.env.ADMIN_API_SECRET = TEST_SUITE_DEV_SECRET;
    adapter = new MemoryStorageAdapter();
    store = new ContentStore(adapter);
    mutations = new ContentMutationService(store);
    app = createPortfolioApp(adapter);
  });

  // 1. Read empty content (initializes from seed)
  it('1. should initialize empty content store from verified seed data', async () => {
    expect(adapter.size()).toBe(0);

    const publicData = await store.getUnifiedPublicData();
    expect(publicData).toBeDefined();
    expect(publicData.profile.fullName).toBe('Ravi Dasari');
    expect(publicData.projects.length).toBeGreaterThanOrEqual(4);
    expect(adapter.size()).toBeGreaterThan(0);
  });

  // 2. Create project through authorized service
  it('2. should create project through authorized service with validation', async () => {
    await store.ensureInitialized();
    const result = await mutations.createProject({
      title: 'DevSecOps Guard Pipeline',
      category: 'Security Engineering',
      summary: 'Automated vulnerability scanning and compliance gate for Kubernetes pipelines.',
      techStack: ['Trivy', 'SonarQube', 'GitHub Actions', 'Docker'],
      deploymentStatus: 'Production Ready',
      featured: true,
      published: true,
    });

    expect(result.project.id).toBeDefined();
    expect(result.project.slug).toBe('devsecops-guard-pipeline');
    expect(result.etag).toBeDefined();

    // Verify stored
    const projectsObj = await store.getProjects();
    const found = projectsObj?.data.find((p) => p.slug === 'devsecops-guard-pipeline');
    expect(found).toBeDefined();
    expect(found?.title).toBe('DevSecOps Guard Pipeline');
  });

  // 3. Read project
  it('3. should read published project via public API endpoint', async () => {
    const res = await app.request('/api/public/projects/roboshop-devsecops');
    expect(res.status).toBe(200);

    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    expect(body.data.slug).toBe('roboshop-devsecops');
    expect(body.data.title).toBe('RoboShop E-Commerce DevSecOps Pipeline & Infrastructure');
  });

  // 4. Update project
  it('4. should update project via authorized admin API endpoint', async () => {
    await store.ensureInitialized();
    const projectsObj = await store.getProjects();
    const targetProject = projectsObj!.data[0];

    const res = await app.request(`/api/admin/projects/${targetProject.id}`, {
      method: 'PUT',
      headers: { ...AUTH_HEADER, 'If-Match': projectsObj!.etag },
      body: JSON.stringify({
        summary: 'Updated cutting-edge summary for RoboShop architecture.',
      }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    expect(body.data.summary).toBe('Updated cutting-edge summary for RoboShop architecture.');
    expect(res.headers.get('ETag')).toBeDefined();
  });

  // 5. Delete project
  it('5. should delete project via authorized admin API endpoint', async () => {
    await store.ensureInitialized();
    const projectsObj = await store.getProjects();
    const targetId = projectsObj!.data[0].id;

    const res = await app.request(`/api/admin/projects/${targetId}`, {
      method: 'DELETE',
      headers: { ...AUTH_HEADER, 'If-Match': projectsObj!.etag },
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);

    const updatedProjects = await store.getProjects();
    expect(updatedProjects?.data.some((p) => p.id === targetId)).toBe(false);
  });

  // 6. Publish project
  it('6. should publish a project and update its published status', async () => {
    await store.ensureInitialized();
    const created = await mutations.createProject({
      title: 'Stealth AI Agent',
      category: 'AI Systems',
      summary: 'Stealth project for enterprise automated code evaluation.',
      techStack: ['Python', 'FastAPI'],
      deploymentStatus: 'Prototype',
      published: false,
    });

    expect(created.project.published).toBe(false);

    const res = await app.request(`/api/admin/projects/${created.project.id}/publish`, {
      method: 'POST',
      headers: AUTH_HEADER,
      body: JSON.stringify({ published: true }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.data.published).toBe(true);
  });

  // 7. Unpublish project
  it('7. should unpublish a project making it a draft', async () => {
    await store.ensureInitialized();
    const projectsObj = await store.getProjects();
    const targetId = projectsObj!.data[0].id;

    const res = await app.request(`/api/admin/projects/${targetId}/publish`, {
      method: 'POST',
      headers: AUTH_HEADER,
      body: JSON.stringify({ published: false }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.data.published).toBe(false);
  });

  // 8. Reject draft public access (404)
  it('8. should strictly reject draft project access on public endpoints with 404', async () => {
    await store.ensureInitialized();
    const draft = await mutations.createProject({
      title: 'Confidential Internal Tool',
      category: 'DevSecOps',
      summary: 'Private tool internal security verification.',
      techStack: ['Bash', 'Docker'],
      deploymentStatus: 'Internal',
      published: false,
    });

    // Public single project lookup by slug must return 404
    const res = await app.request(`/api/public/projects/${draft.project.slug}`);
    expect(res.status).toBe(404);
    const body = (await res.json()) as any;
    expect(body.code).toBe('NOT_FOUND');

    // Public project listing must not include draft
    const listRes = await app.request('/api/public/projects');
    const listBody = (await listRes.json()) as any;
    expect(listBody.data.some((p: any) => p.slug === draft.project.slug)).toBe(false);
  });

  // 9. Reject duplicate slug (400)
  it('9. should reject duplicate project slug with HTTP 400', async () => {
    await store.ensureInitialized();
    const res = await app.request('/api/admin/projects', {
      method: 'POST',
      headers: AUTH_HEADER,
      body: JSON.stringify({
        title: 'RoboShop Duplicate Attempt',
        slug: 'roboshop-devsecops', // Already exists in seed
        category: 'DevOps',
        summary: 'Attempting to inject duplicate slug into storage.',
        techStack: ['AWS'],
        deploymentStatus: 'Live',
      }),
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as any;
    expect(body.code).toBe('VALIDATION_ERROR');
    expect(body.error).toContain('Duplicate project slug detected');
  });

  // 10. Reject invalid input (400)
  it('10. should reject invalid input schema with HTTP 400', async () => {
    await store.ensureInitialized();
    const res = await app.request('/api/admin/projects', {
      method: 'POST',
      headers: AUTH_HEADER,
      body: JSON.stringify({
        title: 'No', // Too short (min 3 chars required)
        summary: 'Short', // Too short (min 10 chars required)
        techStack: [], // Empty array (min 1 required)
      }),
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as any;
    expect(body.code).toBe('VALIDATION_ERROR');
  });

  // 11. Reject malformed JSON (400)
  it('11. should reject malformed JSON payloads with HTTP 400', async () => {
    const res = await app.request('/api/admin/projects', {
      method: 'POST',
      headers: AUTH_HEADER,
      body: '{"title": "broken json payload...',
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as any;
    expect(body.code).toBe('BAD_REQUEST');
    expect(body.error).toBe('Malformed JSON payload');
  });

  // 12. Reject unauthenticated mutation (401)
  it('12. should reject unauthenticated mutation requests with HTTP 401', async () => {
    const res = await app.request('/api/admin/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }, // No auth header
      body: JSON.stringify({
        title: 'Unauthorized Project Attempt',
        category: 'Test',
        summary: 'This should fail with HTTP 401 unauthorized.',
        techStack: ['React'],
        deploymentStatus: 'Testing',
      }),
    });

    expect(res.status).toBe(401);
    const body = (await res.json()) as any;
    expect(body.code).toBe('UNAUTHORIZED');
  });

  // 13. Detect stale revision conflict (409)
  it('13. should detect stale revision ETag conflict and return HTTP 409', async () => {
    await store.ensureInitialized();
    const projectsObj = await store.getProjects();
    const targetProject = projectsObj!.data[0];

    const res = await app.request(`/api/admin/projects/${targetProject.id}`, {
      method: 'PUT',
      headers: { ...AUTH_HEADER, 'If-Match': 'w/"outdated-stale-etag"' },
      body: JSON.stringify({
        title: 'Conflicting Project Edit',
      }),
    });

    expect(res.status).toBe(409);
    const body = (await res.json()) as any;
    expect(body.code).toBe('CONCURRENCY_CONFLICT');
  });

  // 14. Preserve data after failed update
  it('14. should preserve storage data untouched after a failed mutation', async () => {
    await store.ensureInitialized();
    const initialProjects = await store.getProjects();
    const originalTitle = initialProjects!.data[0].title;

    // Trigger failed update due to concurrency conflict
    await app.request(`/api/admin/projects/${initialProjects!.data[0].id}`, {
      method: 'PUT',
      headers: { ...AUTH_HEADER, 'If-Match': 'w/"mismatched-etag"' },
      body: JSON.stringify({ title: 'Mutated After Failure' }),
    });

    const refreshedProjects = await store.getProjects();
    expect(refreshedProjects!.data[0].title).toBe(originalTitle);
  });

  // 15. Create and read skill
  it('15. should create and read skill with category linkage', async () => {
    await store.ensureInitialized();
    const res = await app.request('/api/admin/skills', {
      method: 'POST',
      headers: AUTH_HEADER,
      body: JSON.stringify({
        name: 'OpenShift Container Platform',
        categoryId: 'containers-k8s',
        proficiencyLevel: 'Advanced',
        iconIdentifier: 'openshift',
        featured: true,
      }),
    });

    expect(res.status).toBe(201);
    const body = (await res.json()) as any;
    expect(body.data.name).toBe('OpenShift Container Platform');

    // Read back via public skills API
    const getRes = await app.request('/api/public/skills');
    expect(getRes.status).toBe(200);
    const getBody = (await getRes.json()) as any;
    expect(getBody.data.some((s: any) => s.name === 'OpenShift Container Platform')).toBe(true);
  });

  // 16. Reorder skills
  it('16. should reorder skills and persist sequence order', async () => {
    await store.ensureInitialized();
    const skillsObj = await store.getSkills();
    const ids = skillsObj!.data.map((s) => s.id);
    const reversedIds = [...ids].reverse();

    const res = await app.request('/api/admin/skills/reorder', {
      method: 'POST',
      headers: AUTH_HEADER,
      body: JSON.stringify({ orderedIds: reversedIds }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.data[0].id).toBe(reversedIds[0]);
    expect(body.data[0].order).toBe(1);
  });

  // 17. Create and read AI service
  it('17. should create and read AI service with strict lifecycle classification', async () => {
    await store.ensureInitialized();
    const res = await app.request('/api/admin/ai-services', {
      method: 'POST',
      headers: AUTH_HEADER,
      body: JSON.stringify({
        title: 'Kubernetes Incident Root-Cause Agent',
        category: 'AIOps & Observability',
        description: 'Autonomous diagnostic agent parsing live cluster pod logs and generating remediation manifests.',
        status: 'Working Prototype',
        tooling: ['LangChain', 'FastAPI', 'Claude 3.5 Sonnet', 'kubectl'],
      }),
    });

    expect(res.status).toBe(201);
    const body = (await res.json()) as any;
    expect(body.data.title).toBe('Kubernetes Incident Root-Cause Agent');
    expect(body.data.status).toBe('Working Prototype');

    // Read back via public endpoint
    const getRes = await app.request('/api/public/ai-services');
    const getBody = (await getRes.json()) as any;
    expect(getBody.data.some((s: any) => s.title === 'Kubernetes Incident Root-Cause Agent')).toBe(true);
  });

  // 18. Return appropriate 404 responses
  it('18. should return structured 404 responses for non-existent entities', async () => {
    const res = await app.request('/api/public/projects/non-existent-project-slug');
    expect(res.status).toBe(404);
    const body = (await res.json()) as any;
    expect(body.success).toBe(false);
    expect(body.code).toBe('NOT_FOUND');

    const updateRes = await app.request('/api/admin/projects/non-existent-uuid', {
      method: 'PUT',
      headers: AUTH_HEADER,
      body: JSON.stringify({ title: 'New Title' }),
    });
    expect(updateRes.status).toBe(404);
    const updateBody = (await updateRes.json()) as any;
    expect(updateBody.code).toBe('NOT_FOUND');
  });

  // 19. Return appropriate 409 conflict responses
  it('19. should return structured 409 conflict responses on profile concurrent collision', async () => {
    await store.ensureInitialized();
    const profileObj = await store.getProfile();

    const res = await app.request('/api/admin/profile', {
      method: 'PUT',
      headers: { ...AUTH_HEADER, 'If-Match': 'w/"expired-profile-etag"' },
      body: JSON.stringify(profileObj!.data),
    });

    expect(res.status).toBe(409);
    const body = (await res.json()) as any;
    expect(body.success).toBe(false);
    expect(body.code).toBe('CONCURRENCY_CONFLICT');
  });

  // 20. Verify content persistence after restart (via exportState/importState)
  it('20. should verify full content persistence after simulated server restart', async () => {
    await store.ensureInitialized();

    // Mutate state before "restart"
    const created = await mutations.createProject({
      title: 'Restart Survival Test Project',
      category: 'Cloud Engineering',
      summary: 'Testing persistence across adapter restart snapshots.',
      techStack: ['Cloudflare Workers', 'R2 Storage'],
      deploymentStatus: 'Live',
      published: true,
    });

    // Capture serialized state (simulating cold storage in R2)
    const exportedState = adapter.exportState();
    expect(Object.keys(exportedState).length).toBeGreaterThan(0);

    // Simulate complete process restart with fresh instances
    const newAdapter = new MemoryStorageAdapter();
    newAdapter.importState(exportedState);

    const newStore = new ContentStore(newAdapter);
    const restoredProjects = await newStore.getProjects();

    expect(restoredProjects).toBeDefined();
    const foundProject = restoredProjects?.data.find((p) => p.slug === created.project.slug);
    expect(foundProject).toBeDefined();
    expect(foundProject?.title).toBe('Restart Survival Test Project');
    expect(foundProject?.deploymentStatus).toBe('Live');
  });
});
