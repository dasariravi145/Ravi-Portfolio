import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createPortfolioApp } from '../worker/api';
import { MemoryStorageAdapter } from '../storage/r2StorageAdapter';
import { ContentStore } from '../storage/contentStore';
import { createTestJwt } from '../auth/accessJwtValidator';
import { contentService } from '../services/contentService';
import { INITIAL_PORTFOLIO_FIXTURE } from '../fixtures/initialContent';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HomePage } from '../pages/HomePage';

const TEST_SECRET = 'test-verification-secret-32-chars-min';
const TEST_AUD = 'test-access-aud-12345';
const TEST_TEAM_DOMAIN = 'https://dsecops88.cloudflareaccess.com';
const APPROVED_OWNER_EMAIL = 'dasariravid145@gmail.com';

describe('Skills & Categories CMS (Prompt 10)', () => {
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
    if (body && typeof body === 'object') {
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

  // 1. Create category
  it('1. should create a new category via POST /api/admin/skill-categories', async () => {
    const res = await makeAuthRequest('/api/admin/skill-categories', {
      method: 'POST',
      body: {
        name: 'Observability & Telemetry',
        slug: 'observability-telemetry',
        icon: 'Activity',
        description: 'Monitoring and APM infrastructure',
        published: true,
      },
    });

    expect(res.status).toBe(201);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    expect(body.data.name).toBe('Observability & Telemetry');
    expect(body.data.slug).toBe('observability-telemetry');
    expect(body.data.revision).toBe(1);
    expect(res.headers.get('ETag')).toBeDefined();
  });

  // 2. Read category
  it('2. should read category by ID and list all categories via admin API', async () => {
    const listRes = await makeAuthRequest('/api/admin/skill-categories');
    expect(listRes.status).toBe(200);
    const listBody = (await listRes.json()) as any;
    expect(listBody.data.length).toBeGreaterThan(0);

    const firstCat = listBody.data[0];
    const getRes = await makeAuthRequest(`/api/admin/skill-categories/${firstCat.id}`);
    expect(getRes.status).toBe(200);
    const getBody = (await getRes.json()) as any;
    expect(getBody.data.id).toBe(firstCat.id);
    expect(getBody.data.name).toBe(firstCat.name);
  });

  // 3. Edit category
  it('3. should update category name and description via PUT /api/admin/skill-categories/:id', async () => {
    const listRes = await makeAuthRequest('/api/admin/skill-categories');
    const listBody = (await listRes.json()) as any;
    const catToEdit = listBody.data[0];

    const res = await makeAuthRequest(`/api/admin/skill-categories/${catToEdit.id}`, {
      method: 'PUT',
      body: {
        name: 'Shift-Left DevSecOps & CI/CD',
        description: 'Updated enterprise automated delivery pipelines',
      },
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.data.name).toBe('Shift-Left DevSecOps & CI/CD');
    expect(body.data.revision).toBe((catToEdit.revision || 1) + 1);
  });

  // 4. Delete empty category
  it('4. should delete an empty category with zero associated skills', async () => {
    // Create new empty category
    const createRes = await makeAuthRequest('/api/admin/skill-categories', {
      method: 'POST',
      body: {
        name: 'Temporary Category',
        slug: 'temporary-category',
      },
    });
    const createdCat = ((await createRes.json()) as any).data;

    // Delete empty category
    const deleteRes = await makeAuthRequest(`/api/admin/skill-categories/${createdCat.id}`, {
      method: 'DELETE',
    });
    expect(deleteRes.status).toBe(200);

    // Verify 404 on read back
    const getRes = await makeAuthRequest(`/api/admin/skill-categories/${createdCat.id}`);
    expect(getRes.status).toBe(404);
  });

  // 5. Block unsafe category deletion
  it('5. should block category deletion when it contains active skills', async () => {
    // Category 'containers-k8s' contains Kubernetes and Docker
    const deleteRes = await makeAuthRequest('/api/admin/skill-categories/containers-k8s', {
      method: 'DELETE',
    });

    expect(deleteRes.status).toBe(400);
    const body = (await deleteRes.json()) as any;
    expect(body.success).toBe(false);
    expect(body.error).toContain('active skills');

    // Confirm category still exists
    const getRes = await makeAuthRequest('/api/admin/skill-categories/containers-k8s');
    expect(getRes.status).toBe(200);
  });

  // 6. Reorder categories
  it('6. should reorder categories and persist new sequential order', async () => {
    const listRes = await makeAuthRequest('/api/admin/skill-categories');
    const categories = ((await listRes.json()) as any).data;
    const reversedIds = categories.map((c: any) => c.id).reverse();

    const reorderRes = await makeAuthRequest('/api/admin/skill-categories/reorder', {
      method: 'POST',
      body: { orderedIds: reversedIds },
    });

    expect(reorderRes.status).toBe(200);
    const reordered = ((await reorderRes.json()) as any).data;
    expect(reordered[0].id).toBe(reversedIds[0]);
    expect(reordered[0].order).toBe(1);
    expect(reordered[1].order).toBe(2);
  });

  // 7. Hide category
  it('7. should hide category by setting published to false', async () => {
    const res = await makeAuthRequest('/api/admin/skill-categories/containers-k8s', {
      method: 'PUT',
      body: { published: false },
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.data.published).toBe(false);
  });

  // 8. Create skill
  it('8. should create a new skill linked to an existing category', async () => {
    const res = await makeAuthRequest('/api/admin/skills', {
      method: 'POST',
      body: {
        name: 'ArgoCD',
        categoryId: 'containers-k8s',
        proficiencyLevel: 'Advanced',
        iconIdentifier: 'workflow',
        officialUrl: 'https://argo-cd.readthedocs.io',
        featured: true,
        published: true,
      },
    });

    expect(res.status).toBe(201);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    expect(body.data.name).toBe('ArgoCD');
    expect(body.data.categoryId).toBe('containers-k8s');
    expect(body.data.proficiencyLevel).toBe('Advanced');
    expect(body.data.revision).toBe(1);
    expect(res.headers.get('ETag')).toBeDefined();
  });

  // 9. Read skill
  it('9. should read skill by ID and list all skills via admin API', async () => {
    const listRes = await makeAuthRequest('/api/admin/skills');
    expect(listRes.status).toBe(200);
    const listBody = (await listRes.json()) as any;
    expect(listBody.data.length).toBeGreaterThan(0);

    const firstSkill = listBody.data[0];
    const getRes = await makeAuthRequest(`/api/admin/skills/${firstSkill.id}`);
    expect(getRes.status).toBe(200);
    const getBody = (await getRes.json()) as any;
    expect(getBody.data.id).toBe(firstSkill.id);
    expect(getBody.data.name).toBe(firstSkill.name);
  });

  // 10. Edit skill
  it('10. should update skill details and increment revision', async () => {
    const listRes = await makeAuthRequest('/api/admin/skills');
    const skillToEdit = ((await listRes.json()) as any).data[0];

    const res = await makeAuthRequest(`/api/admin/skills/${skillToEdit.id}`, {
      method: 'PUT',
      body: {
        name: `${skillToEdit.name} Enterprise`,
        proficiencyLevel: 'Core Competency',
      },
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.data.name).toBe(`${skillToEdit.name} Enterprise`);
    expect(body.data.proficiencyLevel).toBe('Core Competency');
    expect(body.data.revision).toBe((skillToEdit.revision || 1) + 1);
  });

  // 11. Delete skill
  it('11. should permanently delete a skill via DELETE /api/admin/skills/:id', async () => {
    // Create skill to delete
    const createRes = await makeAuthRequest('/api/admin/skills', {
      method: 'POST',
      body: {
        name: 'Temporary Tool',
        categoryId: 'containers-k8s',
        proficiencyLevel: 'Proficient',
        iconIdentifier: 'terminal',
      },
    });
    const skill = ((await createRes.json()) as any).data;

    const deleteRes = await makeAuthRequest(`/api/admin/skills/${skill.id}`, {
      method: 'DELETE',
    });
    expect(deleteRes.status).toBe(200);

    // Verify 404
    const getRes = await makeAuthRequest(`/api/admin/skills/${skill.id}`);
    expect(getRes.status).toBe(404);
  });

  // 12. Reorder skills
  it('12. should reorder skills and persist new sequence order', async () => {
    const listRes = await makeAuthRequest('/api/admin/skills');
    const skills = ((await listRes.json()) as any).data;
    const reversedIds = skills.map((s: any) => s.id).reverse();

    const reorderRes = await makeAuthRequest('/api/admin/skills/reorder', {
      method: 'POST',
      body: { orderedIds: reversedIds },
    });

    expect(reorderRes.status).toBe(200);
    const reordered = ((await reorderRes.json()) as any).data;
    expect(reordered[0].id).toBe(reversedIds[0]);
    expect(reordered[0].order).toBe(1);
    expect(reordered[1].order).toBe(2);
  });

  // 13. Move skill to another category
  it('13. should move a skill to a different category', async () => {
    const listRes = await makeAuthRequest('/api/admin/skills');
    const skill = ((await listRes.json()) as any).data.find((s: any) => s.id === 's1'); // Kubernetes

    const updateRes = await makeAuthRequest(`/api/admin/skills/${skill.id}`, {
      method: 'PUT',
      body: { categoryId: 'cloud-iac' },
    });

    expect(updateRes.status).toBe(200);
    const updated = ((await updateRes.json()) as any).data;
    expect(updated.categoryId).toBe('cloud-iac');
  });

  // 14. Reject invalid category ID
  it('14. should reject skill creation with non-existent category ID with HTTP 400', async () => {
    const res = await makeAuthRequest('/api/admin/skills', {
      method: 'POST',
      body: {
        name: 'Invalid Skill',
        categoryId: 'non-existent-category-999',
        proficiencyLevel: 'Core Competency',
        iconIdentifier: 'box',
      },
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as any;
    expect(body.success).toBe(false);
    expect(body.error).toContain('does not exist');
  });

  // 15. Reject duplicate skill
  it('15. should reject duplicate skill name in same category with HTTP 400', async () => {
    const res = await makeAuthRequest('/api/admin/skills', {
      method: 'POST',
      body: {
        name: 'Docker', // Already exists in containers-k8s
        categoryId: 'containers-k8s',
        proficiencyLevel: 'Core Competency',
        iconIdentifier: 'container',
      },
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as any;
    expect(body.success).toBe(false);
    expect(body.error).toContain('already exists');
  });

  // 16. Reject duplicate category slug
  it('16. should reject duplicate category slug with HTTP 400', async () => {
    const res = await makeAuthRequest('/api/admin/skill-categories', {
      method: 'POST',
      body: {
        name: 'Containers Clone',
        slug: 'containers-k8s', // already exists
        icon: 'Box',
      },
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as any;
    expect(body.success).toBe(false);
    expect(body.error).toContain('already exists');
  });

  // 17. Reject invalid icon identifier
  it('17. should reject invalid icon identifier format with HTTP 400', async () => {
    const res = await makeAuthRequest('/api/admin/skills', {
      method: 'POST',
      body: {
        name: 'XSS Attempt',
        categoryId: 'containers-k8s',
        proficiencyLevel: 'Advanced',
        iconIdentifier: '<script>alert(1)</script>',
      },
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as any;
    expect(body.success).toBe(false);
  });

  // 18. Reject unauthorized mutation
  it('18. should reject unauthorized mutations with HTTP 401', async () => {
    const res = await makeAuthRequest('/api/admin/skills', {
      method: 'POST',
      token: null, // No token
      body: {
        name: 'Hacker Skill',
        categoryId: 'containers-k8s',
        proficiencyLevel: 'Advanced',
        iconIdentifier: 'box',
      },
    });

    expect(res.status).toBe(401);
  });

  // 19. Detect stale revision conflict
  it('19. should detect stale ETag conflict and return HTTP 409', async () => {
    const listRes = await makeAuthRequest('/api/admin/skills');
    const skill = ((await listRes.json()) as any).data[0];

    const res = await makeAuthRequest(`/api/admin/skills/${skill.id}`, {
      method: 'PUT',
      headers: { 'If-Match': '"w/stale-etag-99999"' },
      body: { name: 'Collision Name' },
    });

    expect(res.status).toBe(409);
    const body = (await res.json()) as any;
    expect(body.code).toBe('CONCURRENCY_CONFLICT');
  });

  // 20. Exclude hidden skills publicly
  it('20. should exclude hidden skills from GET /api/public/skills', async () => {
    // Create a hidden skill
    const createRes = await makeAuthRequest('/api/admin/skills', {
      method: 'POST',
      body: {
        name: 'Private Internal Tool',
        categoryId: 'containers-k8s',
        proficiencyLevel: 'Core Competency',
        iconIdentifier: 'key',
        published: false,
      },
    });
    expect(createRes.status).toBe(201);

    // Call public endpoint
    const pubRes = await app.request('/api/public/skills');
    expect(pubRes.status).toBe(200);
    const pubBody = (await pubRes.json()) as any;
    expect(pubBody.data.some((s: any) => s.name === 'Private Internal Tool')).toBe(false);
  });

  // 21. Exclude hidden categories publicly
  it('21. should exclude hidden categories and their skills from GET /api/public/skills', async () => {
    // Hide 'cloud-iac' category
    await makeAuthRequest('/api/admin/skill-categories/cloud-iac', {
      method: 'PUT',
      body: { published: false },
    });

    const pubRes = await app.request('/api/public/skills');
    expect(pubRes.status).toBe(200);
    const pubBody = (await pubRes.json()) as any;

    // Category should be excluded
    expect(pubBody.categories.some((c: any) => c.id === 'cloud-iac')).toBe(false);

    // Skills under cloud-iac (e.g. Terraform, AWS Cloud) should also be excluded
    expect(pubBody.data.some((s: any) => s.name === 'Terraform')).toBe(false);
    expect(pubBody.data.some((s: any) => s.name === 'AWS Cloud')).toBe(false);
  });

  // 22. Preserve category and skill order
  it('22. should preserve category and skill ordering in public responses', async () => {
    const pubRes = await app.request('/api/public/skills');
    expect(pubRes.status).toBe(200);
    const pubBody = (await pubRes.json()) as any;

    // Verify categories order is ascending
    for (let i = 0; i < pubBody.categories.length - 1; i++) {
      expect(pubBody.categories[i].order).toBeLessThanOrEqual(pubBody.categories[i + 1].order);
    }

    // Verify skills order is ascending
    for (let i = 0; i < pubBody.data.length - 1; i++) {
      expect(pubBody.data[i].order).toBeLessThanOrEqual(pubBody.data[i + 1].order);
    }
  });

  // 23. Public UI renders real skills
  it('23. should render real skills on the public homepage', async () => {
    const spy = vi.spyOn(contentService, 'getPortfolioData').mockResolvedValue(INITIAL_PORTFOLIO_FIXTURE);

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText('Kubernetes').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Docker').length).toBeGreaterThan(0);
    });

    spy.mockRestore();
  });

  // 24. Public UI handles empty state
  it('24. should render empty state on public UI when no skills match', async () => {
    const emptyFixture = {
      ...INITIAL_PORTFOLIO_FIXTURE,
      skills: [],
    };
    const spy = vi.spyOn(contentService, 'getPortfolioData').mockResolvedValue(emptyFixture);

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/No skills available/i)).toBeDefined();
      expect(screen.getByText(/No verified skills match the selected category filter/i)).toBeDefined();
    });

    spy.mockRestore();
  });

  // 25. Persist data after restart
  it('25. should verify full persistence of skills after simulated restart', async () => {
    // Create new skill
    await makeAuthRequest('/api/admin/skills', {
      method: 'POST',
      body: {
        name: 'Persistent Vault Tool',
        categoryId: 'containers-k8s',
        proficiencyLevel: 'Core Competency',
        iconIdentifier: 'shield-check',
      },
    });

    // Simulate restart with a new ContentStore pointing to the same adapter
    const newStore = new ContentStore(adapter);
    await newStore.ensureInitialized();
    const skillsObj = await newStore.getSkills();

    expect(skillsObj?.data.some((s) => s.name === 'Persistent Vault Tool')).toBe(true);
  });

  // 26. Update public UI without redeployment
  it('26. should update public API immediately after admin mutation with zero redeployment', async () => {
    // Admin creates skill
    const createRes = await makeAuthRequest('/api/admin/skills', {
      method: 'POST',
      body: {
        name: 'Zero-Redeploy Skill',
        categoryId: 'containers-k8s',
        proficiencyLevel: 'Advanced',
        iconIdentifier: 'zap',
        published: true,
      },
    });
    expect(createRes.status).toBe(201);

    // Immediate public read reflects the change
    const pubRes = await app.request('/api/public/skills');
    expect(pubRes.status).toBe(200);
    const pubBody = (await pubRes.json()) as any;
    expect(pubBody.data.some((s: any) => s.name === 'Zero-Redeploy Skill')).toBe(true);
  });
});
