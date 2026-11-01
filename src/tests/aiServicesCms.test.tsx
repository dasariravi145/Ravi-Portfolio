import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createPortfolioApp } from '../worker/api';
import { MemoryStorageAdapter } from '../storage/r2StorageAdapter';
import { ContentStore } from '../storage/contentStore';
import { createTestJwt } from '../auth/accessJwtValidator';
import { contentService } from '../services/contentService';
import { INITIAL_PORTFOLIO_FIXTURE } from '../fixtures/initialContent';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { HomePage } from '../pages/HomePage';
import { AIServiceDetailPage } from '../pages/AIServiceDetailPage';

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

describe('AI Services & Automation CMS (Prompt 12)', () => {
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

  // =========================================================================
  // Core AI Service Mutations (1 - 11)
  // =========================================================================

  // 1. Create AI Service
  it('1. should create an AI service via POST /api/admin/ai-services with delivery and evidence statuses', async () => {
    const res = await makeAuthRequest('/api/admin/ai-services', {
      method: 'POST',
      body: {
        title: 'Enterprise Code Review Agent',
        slug: 'enterprise-code-review-agent',
        categoryId: 'ai-agents',
        category: 'Autonomous Agents',
        shortDescription: 'Autonomous multi-stage PR security scanning and code linting agent.',
        description: 'Comprehensive code review assistant using local embeddings and Claude 3.5 Sonnet.',
        customerProblem: 'Engineers spent 10+ hours per week waiting for human PR reviews.',
        proposedSolution: 'Automated agent generates verified semantic code analysis directly on GitHub PRs.',
        capabilities: ['AST Parsing', 'Security Vulnerability Detection', 'Style Enforcement'],
        useCases: ['Pre-merge CI gating', 'Security triage for open-source dependencies'],
        integrations: ['GitHub Actions', 'GitLab CI', 'Slack Webhooks'],
        tooling: ['Python', 'FastAPI', 'LangChain', 'Tree-Sitter'],
        targetIndustries: ['Software & SaaS', 'Financial Services'],
        demoUrl: 'https://demo.dsecops88.online/code-agent',
        deliveryStatus: 'Working Prototype',
        evidenceStatus: 'Verified',
        published: true,
        featured: true,
      },
    });

    expect(res.status).toBe(201);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    expect(body.data.id).toBeDefined();
    expect(body.data.slug).toBe('enterprise-code-review-agent');
    expect(body.data.deliveryStatus).toBe('Working Prototype');
    expect(body.data.evidenceStatus).toBe('Verified');
    expect(body.data.featured).toBe(true);
    expect(body.data.published).toBe(true);
  });

  // 2. Read AI Services
  it('2. should retrieve AI services list and individual service by ID', async () => {
    const listRes = await makeAuthRequest('/api/admin/ai-services');
    expect(listRes.status).toBe(200);
    const listBody = (await listRes.json()) as any;
    expect(listBody.data.length).toBeGreaterThanOrEqual(1);

    const firstId = listBody.data[0].id;
    const detailRes = await makeAuthRequest(`/api/admin/ai-services/${firstId}`);
    expect(detailRes.status).toBe(200);
    const detailBody = (await detailRes.json()) as any;
    expect(detailBody.data.id).toBe(firstId);
    expect(detailBody.data.title).toBeDefined();
  });

  // 3. Edit AI Service
  it('3. should edit an AI service via PUT /api/admin/ai-services/:id', async () => {
    const listRes = await makeAuthRequest('/api/admin/ai-services');
    const firstService = ((await listRes.json()) as any).data[0];

    const updateRes = await makeAuthRequest(`/api/admin/ai-services/${firstService.id}`, {
      method: 'PUT',
      body: {
        title: 'Updated AI Service Title',
        deliveryStatus: 'In Development',
        evidenceStatus: 'Owner-Reported',
      },
    });

    expect(updateRes.status).toBe(200);
    const updatedBody = (await updateRes.json()) as any;
    expect(updatedBody.data.title).toBe('Updated AI Service Title');
    expect(updatedBody.data.deliveryStatus).toBe('In Development');
    expect(updatedBody.data.evidenceStatus).toBe('Owner-Reported');
    expect(updatedBody.data.revision).toBe(firstService.revision + 1);
  });

  // 4. Delete AI Service
  it('4. should delete an AI service via DELETE /api/admin/ai-services/:id', async () => {
    const createRes = await makeAuthRequest('/api/admin/ai-services', {
      method: 'POST',
      body: {
        title: 'Service To Delete',
        slug: 'service-to-delete',
        shortDescription: 'Temporary test service to be removed.',
      },
    });
    const createdId = ((await createRes.json()) as any).data.id;

    const deleteRes = await makeAuthRequest(`/api/admin/ai-services/${createdId}`, {
      method: 'DELETE',
    });
    expect(deleteRes.status).toBe(200);

    const checkRes = await makeAuthRequest(`/api/admin/ai-services/${createdId}`);
    expect(checkRes.status).toBe(404);
  });

  // 5. Reject Invalid Fields
  it('5. should reject invalid AI service fields (missing title or shortDescription)', async () => {
    const missingTitle = await makeAuthRequest('/api/admin/ai-services', {
      method: 'POST',
      body: {
        shortDescription: 'Short description without a title.',
      },
    });
    expect(missingTitle.status).toBe(400);

    const missingDesc = await makeAuthRequest('/api/admin/ai-services', {
      method: 'POST',
      body: {
        title: 'Valid Title',
        shortDescription: '',
      },
    });
    expect(missingDesc.status).toBe(400);
  });

  // 6. Reject Duplicate Slug
  it('6. should reject duplicate AI service slug', async () => {
    await makeAuthRequest('/api/admin/ai-services', {
      method: 'POST',
      body: {
        title: 'First Slug Service',
        slug: 'duplicate-test-slug',
        shortDescription: 'First service using this unique slug.',
      },
    });

    const duplicateRes = await makeAuthRequest('/api/admin/ai-services', {
      method: 'POST',
      body: {
        title: 'Second Slug Service',
        slug: 'duplicate-test-slug',
        shortDescription: 'Second service attempting duplicate slug.',
      },
    });

    expect(duplicateRes.status).toBe(400);
    const body = (await duplicateRes.json()) as any;
    expect(body.error).toContain('Duplicate AI service slug');
  });

  // 7. Save Draft
  it('7. should save AI service as draft (published: false)', async () => {
    const res = await makeAuthRequest('/api/admin/ai-services', {
      method: 'POST',
      body: {
        title: 'Draft Autonomous Pipeline',
        slug: 'draft-autonomous-pipeline',
        shortDescription: 'Confidential prototype pending approval.',
        published: false,
      },
    });

    expect(res.status).toBe(201);
    const body = (await res.json()) as any;
    expect(body.data.published).toBe(false);
  });

  // 8. Publish AI Service
  it('8. should publish AI service via POST /api/admin/ai-services/:id/publish', async () => {
    const createRes = await makeAuthRequest('/api/admin/ai-services', {
      method: 'POST',
      body: {
        title: 'Service To Publish',
        slug: 'service-to-publish',
        shortDescription: 'Initially created as draft.',
        published: false,
      },
    });
    const id = ((await createRes.json()) as any).data.id;

    const pubRes = await makeAuthRequest(`/api/admin/ai-services/${id}/publish`, {
      method: 'POST',
    });
    expect(pubRes.status).toBe(200);
    const pubBody = (await pubRes.json()) as any;
    expect(pubBody.data.published).toBe(true);
  });

  // 9. Unpublish AI Service
  it('9. should unpublish published AI service back to draft', async () => {
    const createRes = await makeAuthRequest('/api/admin/ai-services', {
      method: 'POST',
      body: {
        title: 'Service To Unpublish',
        slug: 'service-to-unpublish',
        shortDescription: 'Currently live, switching to draft.',
        published: true,
      },
    });
    const id = ((await createRes.json()) as any).data.id;

    const unpubRes = await makeAuthRequest(`/api/admin/ai-services/${id}/publish`, {
      method: 'POST',
    });
    expect(unpubRes.status).toBe(200);
    const unpubBody = (await unpubRes.json()) as any;
    expect(unpubBody.data.published).toBe(false);
  });

  // 10. Toggle Featured
  it('10. should toggle featured status via POST /api/admin/ai-services/:id/featured', async () => {
    const createRes = await makeAuthRequest('/api/admin/ai-services', {
      method: 'POST',
      body: {
        title: 'Feature Toggle Service',
        slug: 'feature-toggle-service',
        shortDescription: 'Testing featured flag toggling.',
        featured: false,
      },
    });
    const id = ((await createRes.json()) as any).data.id;

    // Toggle on
    const toggleOnRes = await makeAuthRequest(`/api/admin/ai-services/${id}/featured`, {
      method: 'POST',
    });
    expect(toggleOnRes.status).toBe(200);
    expect(((await toggleOnRes.json()) as any).data.featured).toBe(true);

    // Toggle off
    const toggleOffRes = await makeAuthRequest(`/api/admin/ai-services/${id}/featured`, {
      method: 'POST',
    });
    expect(toggleOffRes.status).toBe(200);
    expect(((await toggleOffRes.json()) as any).data.featured).toBe(false);
  });

  // 11. Reorder Services
  it('11. should reorder AI services sequentially via POST /api/admin/ai-services/reorder', async () => {
    const listRes = await makeAuthRequest('/api/admin/ai-services');
    const services = ((await listRes.json()) as any).data;
    expect(services.length).toBeGreaterThanOrEqual(2);

    const reversedIds = [services[1].id, services[0].id, ...services.slice(2).map((s: any) => s.id)];

    const reorderRes = await makeAuthRequest('/api/admin/ai-services/reorder', {
      method: 'POST',
      body: { orderedIds: reversedIds },
    });
    expect(reorderRes.status).toBe(200);
    const reordered = ((await reorderRes.json()) as any).data;
    expect(reordered[0].id).toBe(services[1].id);
    expect(reordered[0].order).toBeLessThan(reordered[1].order);
  });

  // =========================================================================
  // AI Service Categories Mutations & Safe Deletion (12 - 17)
  // =========================================================================

  // 12. Create Category
  it('12. should create an AI service category via POST /api/admin/ai-service-categories', async () => {
    const res = await makeAuthRequest('/api/admin/ai-service-categories', {
      method: 'POST',
      body: {
        name: 'LLM Fine-Tuning & Evaluation',
        slug: 'llm-fine-tuning',
        description: 'Quantized fine-tuning, LoRA adapters, and benchmark evaluations.',
        icon: 'Cpu',
        published: true,
      },
    });

    expect(res.status).toBe(201);
    const body = (await res.json()) as any;
    expect(body.data.name).toBe('LLM Fine-Tuning & Evaluation');
    expect(body.data.slug).toBe('llm-fine-tuning');
    expect(body.data.published).toBe(true);
  });

  // 13. Edit Category
  it('13. should edit an AI service category via PUT /api/admin/ai-service-categories/:id', async () => {
    const listRes = await makeAuthRequest('/api/admin/ai-service-categories');
    const firstCat = ((await listRes.json()) as any).data[0];

    const updateRes = await makeAuthRequest(`/api/admin/ai-service-categories/${firstCat.id}`, {
      method: 'PUT',
      body: {
        name: 'Updated Category Name',
        description: 'Updated category description.',
      },
    });

    expect(updateRes.status).toBe(200);
    const body = (await updateRes.json()) as any;
    expect(body.data.name).toBe('Updated Category Name');
    expect(body.data.description).toBe('Updated category description.');
  });

  // 14. Delete Empty Category
  it('14. should delete an empty AI service category via DELETE /api/admin/ai-service-categories/:id', async () => {
    const createRes = await makeAuthRequest('/api/admin/ai-service-categories', {
      method: 'POST',
      body: {
        name: 'Temporary Category To Delete',
        slug: 'temp-empty-cat',
        description: 'Empty category with no services.',
      },
    });
    const catId = ((await createRes.json()) as any).data.id;

    const deleteRes = await makeAuthRequest(`/api/admin/ai-service-categories/${catId}`, {
      method: 'DELETE',
    });
    expect(deleteRes.status).toBe(200);

    const checkRes = await makeAuthRequest(`/api/admin/ai-service-categories/${catId}`);
    expect(checkRes.status).toBe(404);
  });

  // 15. Block Safe Category Deletion
  it('15. should block deletion of category when active AI services are assigned to it', async () => {
    // Try to delete 'ai-chat-assistants' which has initial services assigned
    const deleteRes = await makeAuthRequest('/api/admin/ai-service-categories/ai-chat-assistants', {
      method: 'DELETE',
    });

    expect(deleteRes.status).toBe(400);
    const body = (await deleteRes.json()) as any;
    expect(body.error).toContain('Cannot delete category: active AI services are assigned to it');
  });

  // 16. Reorder Categories
  it('16. should reorder AI service categories sequentially via POST /api/admin/ai-service-categories/reorder', async () => {
    const listRes = await makeAuthRequest('/api/admin/ai-service-categories');
    const categories = ((await listRes.json()) as any).data;
    expect(categories.length).toBeGreaterThanOrEqual(2);

    const reorderedIds = [categories[1].id, categories[0].id, ...categories.slice(2).map((c: any) => c.id)];

    const res = await makeAuthRequest('/api/admin/ai-service-categories/reorder', {
      method: 'POST',
      body: { orderedIds: reorderedIds },
    });

    expect(res.status).toBe(200);
    const data = ((await res.json()) as any).data;
    expect(data[0].id).toBe(categories[1].id);
    expect(data[0].order).toBeLessThan(data[1].order);
  });

  // 17. Hide Category Cascades
  it('17. should hide category and exclude its services from public responses when published: false', async () => {
    // Update category 'ai-chat-assistants' to published: false
    const updateRes = await makeAuthRequest('/api/admin/ai-service-categories/ai-chat-assistants', {
      method: 'PUT',
      body: { published: false },
    });
    expect(updateRes.status).toBe(200);

    // Fetch public services
    const pubRes = await app.request('/api/public/ai-services');
    expect(pubRes.status).toBe(200);
    const pubBody = (await pubRes.json()) as any;
    const servicesList = Array.isArray(pubBody.data) ? pubBody.data : pubBody.data?.services || [];

    // Services under 'ai-chat-assistants' should not appear in public response
    const hasHiddenCategoryServices = servicesList.some(
      (s: any) => s.categoryId === 'ai-chat-assistants'
    );
    expect(hasHiddenCategoryServices).toBe(false);

    // Restore category
    await makeAuthRequest('/api/admin/ai-service-categories/ai-chat-assistants', {
      method: 'PUT',
      body: { published: true },
    });
  });

  // =========================================================================
  // Validations & Relational Integrity (18 - 25)
  // =========================================================================

  // 18. Reject Invalid Demo URL
  it('18. should reject invalid demo URL format (non-http/https protocol)', async () => {
    const res = await makeAuthRequest('/api/admin/ai-services', {
      method: 'POST',
      body: {
        title: 'Service With Malicious Demo URL',
        shortDescription: 'Testing URL protocol validation.',
        demoUrl: 'javascript:alert(1)',
      },
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as any;
    expect(body.error).toContain('Demo URL must be a valid HTTP or HTTPS URL');
  });

  // 19. Validate Related Project IDs
  it('19. should validate that related project IDs exist in projects store', async () => {
    const res = await makeAuthRequest('/api/admin/ai-services', {
      method: 'POST',
      body: {
        title: 'Service With Fake Projects',
        shortDescription: 'Testing foreign key validation.',
        relatedProjectIds: ['fake-project-uuid-999'],
      },
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as any;
    expect(body.error).toContain('Invalid related project ID');
  });

  // 20. Hide Unpublished Related Projects
  it('20. should hide unpublished related projects on public service detail', async () => {
    // 1. Create a draft project (published: false)
    const draftProjectRes = await makeAuthRequest('/api/admin/projects', {
      method: 'POST',
      body: {
        title: 'Internal Secret DevOps Project',
        slug: 'internal-secret-devops',
        summary: 'Non-public project details.',
        description: 'Not for public eyes.',
        category: 'DevSecOps & Platform Architecture',
        deploymentStatus: 'Architecture Prototype',
        techStack: ['Docker', 'Kubernetes', 'Go'],
        published: false,
      },
    });
    expect(draftProjectRes.status).toBe(201);
    const draftProjectId = ((await draftProjectRes.json()) as any).data.id;

    // 2. Create AI service referencing both draft project and published 'p1' (RoboShop)
    const serviceRes = await makeAuthRequest('/api/admin/ai-services', {
      method: 'POST',
      body: {
        title: 'Project Relational Service',
        slug: 'project-relational-service',
        shortDescription: 'Relational project verification test.',
        relatedProjectIds: [draftProjectId, 'p1'],
        published: true,
      },
    });
    expect(serviceRes.status).toBe(201);

    // 3. Query public detail
    const pubDetailRes = await app.request('/api/public/ai-services/project-relational-service');
    expect(pubDetailRes.status).toBe(200);
    const pubDetail = ((await pubDetailRes.json()) as any).data;

    // Only published project 'p1' should be present, draft project must be excluded
    expect(pubDetail.relatedProjects.some((p: any) => p.id === 'p1')).toBe(true);
    expect(pubDetail.relatedProjects.some((p: any) => p.id === draftProjectId)).toBe(false);
  });

  // 21. Upload Service Cover Image
  it('21. should upload and attach AI service cover image via admin media upload', async () => {
    const jpeg = createJpegBuffer();
    const uploadRes = await makeAuthRequest('/api/admin/media/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'image/jpeg', 'X-Filename': 'service-cover.jpg' },
      body: jpeg,
    });

    expect(uploadRes.status).toBe(201);
    const asset = ((await uploadRes.json()) as any).data;
    expect(asset.url).toContain('/api/public/media/projects/');
    expect(asset.mimeType).toBe('image/jpeg');

    // Attach to existing AI service
    const listRes = await makeAuthRequest('/api/admin/ai-services');
    const firstId = ((await listRes.json()) as any).data[0].id;

    const updateRes = await makeAuthRequest(`/api/admin/ai-services/${firstId}`, {
      method: 'PUT',
      body: { coverImage: asset },
    });

    expect(updateRes.status).toBe(200);
    const updated = ((await updateRes.json()) as any).data;
    expect(updated.coverImage.key).toBe(asset.key);
  });

  // 22. Replace Service Cover Image
  it('22. should replace AI service cover image with new media asset', async () => {
    const png = createPngBuffer();
    const uploadRes = await makeAuthRequest('/api/admin/media/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'image/png', 'X-Filename': 'new-service-cover.png' },
      body: png,
    });
    const newCover = ((await uploadRes.json()) as any).data;

    const listRes = await makeAuthRequest('/api/admin/ai-services');
    const firstId = ((await listRes.json()) as any).data[0].id;

    const updateRes = await makeAuthRequest(`/api/admin/ai-services/${firstId}`, {
      method: 'PUT',
      body: { coverImage: newCover },
    });

    expect(updateRes.status).toBe(200);
    const updated = ((await updateRes.json()) as any).data;
    expect(updated.coverImage.key).toBe(newCover.key);
  });

  // 23. Reject Invalid Media Upload
  it('23. should reject invalid service media upload (unsupported MIME type or malformed header)', async () => {
    const textBuffer = new TextEncoder().encode('Invalid text payload that is not an image');
    const res = await makeAuthRequest('/api/admin/media/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain', 'X-Filename': 'test.txt' },
      body: textBuffer,
    });

    expect(res.status).toBe(400);
  });

  // 24. Reject Unauthorized Mutation
  it('24. should reject unauthorized AI mutation without valid Bearer token', async () => {
    const res = await makeAuthRequest('/api/admin/ai-services', {
      method: 'POST',
      token: null, // No token
      body: {
        title: 'Unauthorized Creation',
        shortDescription: 'Should fail 401',
      },
    });

    expect(res.status).toBe(401);
  });

  // 25. Concurrency Conflict (ETag mismatch)
  it('25. should detect stale revision conflict with mismatched ETag', async () => {
    const listRes = await makeAuthRequest('/api/admin/ai-services');
    const firstId = ((await listRes.json()) as any).data[0].id;

    const staleRes = await makeAuthRequest(`/api/admin/ai-services/${firstId}`, {
      method: 'PUT',
      headers: { 'If-Match': '"stale-etag-value-123"' },
      body: { title: 'Conflicting Title' },
    });

    expect(staleRes.status).toBe(409);
    const body = (await staleRes.json()) as any;
    expect(body.code).toBe('CONCURRENCY_CONFLICT');
  });

  // =========================================================================
  // Public Endpoint Filtering & Integrity (26 - 32)
  // =========================================================================

  // 26. Exclude Draft Services Publicly
  it('26. should exclude draft AI services from public API list', async () => {
    await makeAuthRequest('/api/admin/ai-services', {
      method: 'POST',
      body: {
        title: 'Unpublished Stealth Agent',
        slug: 'stealth-agent',
        shortDescription: 'Draft agent that must not leak publicly.',
        published: false,
      },
    });

    const pubRes = await app.request('/api/public/ai-services');
    expect(pubRes.status).toBe(200);
    const pubBody = (await pubRes.json()) as any;
    const servicesList = Array.isArray(pubBody.data) ? pubBody.data : pubBody.data?.services || [];

    const foundDraft = servicesList.some((s: any) => s.slug === 'stealth-agent');
    expect(foundDraft).toBe(false);
  });

  // 27. Return 404 for Draft Detail
  it('27. should return 404 for public detail of draft or nonexistent service', async () => {
    await makeAuthRequest('/api/admin/ai-services', {
      method: 'POST',
      body: {
        title: 'Draft Service 404 Check',
        slug: 'draft-service-404-check',
        shortDescription: 'Testing 404 response on public detail.',
        published: false,
      },
    });

    // Draft slug
    const draftRes = await app.request('/api/public/ai-services/draft-service-404-check');
    expect(draftRes.status).toBe(404);

    // Nonexistent slug
    const missingRes = await app.request('/api/public/ai-services/completely-nonexistent-slug');
    expect(missingRes.status).toBe(404);
  });

  // 28. Render Public AI Showcase on HomePage
  it('28. should render public AI showcase section on HomePage with categories, badges and compliance note', async () => {
    const spy = vi.spyOn(contentService, 'getPortfolioData').mockResolvedValue({
      ...INITIAL_PORTFOLIO_FIXTURE,
    });

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      // Heading
      expect(screen.getByText(/Intelligent Agents, Voice & Automated Pipelines/i)).toBeInTheDocument();
      // TCPA Compliance note
      expect(screen.getByText(/Compliance Note:/i)).toBeInTheDocument();
      expect(screen.getAllByText(/TCPA consent verification/i).length).toBeGreaterThan(0);
      // Category filter buttons
      expect(screen.getByText(/All Solutions/i)).toBeInTheDocument();
      // Service cards render
      expect(screen.getByRole('heading', { name: /Autonomous AI Agents/i })).toBeInTheDocument();
    });

    spy.mockRestore();
  });

  // 29. Render Dynamic Detail Page
  it('29. should render dynamic detail page on /ai-solutions/:slug with honest delivery and evidence badges', async () => {
    const mockService = {
      ...INITIAL_PORTFOLIO_FIXTURE.aiServices[0],
      relatedProjects: [INITIAL_PORTFOLIO_FIXTURE.projects[0]],
    };

    const spy = vi.spyOn(contentService, 'getAIServiceBySlug').mockResolvedValue(mockService as any);

    render(
      <MemoryRouter initialEntries={[`/ai-solutions/${mockService.slug}`]}>
        <Routes>
          <Route path="/ai-solutions/:slug" element={<AIServiceDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText(mockService.title)[0]).toBeInTheDocument();
      expect(screen.getAllByText(mockService.deliveryStatus)[0]).toBeInTheDocument();
      expect(screen.getByText(new RegExp(mockService.evidenceStatus, 'i'))).toBeInTheDocument();
      expect(screen.getByText(/Problem Statement/i)).toBeInTheDocument();
      expect(screen.getByText(/Proposed Architecture/i)).toBeInTheDocument();
      expect(screen.getByText(/Key Capabilities & Features/i)).toBeInTheDocument();
      expect(screen.getByText(/Back to AI Solutions & Automation/i)).toBeInTheDocument();
    });

    spy.mockRestore();
  });

  // 30. Preserve Accurate Delivery Status
  it('30. should preserve accurate delivery status without auto-promoting to Live when published', async () => {
    const createRes = await makeAuthRequest('/api/admin/ai-services', {
      method: 'POST',
      body: {
        title: 'Truthful Prototype System',
        slug: 'truthful-prototype-system',
        shortDescription: 'Must stay Working Prototype even when published.',
        deliveryStatus: 'Working Prototype',
        evidenceStatus: 'Not Verified',
        published: false,
      },
    });
    const id = ((await createRes.json()) as any).data.id;

    // Publish service
    const pubRes = await makeAuthRequest(`/api/admin/ai-services/${id}/publish`, {
      method: 'POST',
    });
    expect(pubRes.status).toBe(200);

    // Verify status has NOT changed to 'Live / Deployed'
    const checkRes = await makeAuthRequest(`/api/admin/ai-services/${id}`);
    const service = ((await checkRes.json()) as any).data;
    expect(service.deliveryStatus).toBe('Working Prototype');
    expect(service.evidenceStatus).toBe('Not Verified');
    expect(service.published).toBe(true);
  });

  // 31. Verify Persistence After Simulated Restart
  it('31. should verify data persistence after simulated restart across both AI services and categories stores', async () => {
    // 1. Create unique category
    await makeAuthRequest('/api/admin/ai-service-categories', {
      method: 'POST',
      body: {
        name: 'Persistent Category',
        slug: 'persistent-category',
        description: 'Testing restart durability.',
      },
    });

    // 2. Create unique service
    await makeAuthRequest('/api/admin/ai-services', {
      method: 'POST',
      body: {
        title: 'Persistent AI Service',
        slug: 'persistent-ai-service',
        shortDescription: 'Testing restart durability of AI service records.',
      },
    });

    // Simulate restart with a brand new ContentStore instance using same adapter
    const newStore = new ContentStore(adapter);
    await newStore.ensureInitialized();

    const [categoriesObj, servicesObj] = await Promise.all([
      newStore.getAIServiceCategories(),
      newStore.getAIServices(),
    ]);

    expect(categoriesObj?.data.some((c) => c.slug === 'persistent-category')).toBe(true);
    expect(servicesObj?.data.some((s) => s.slug === 'persistent-ai-service')).toBe(true);
  });

  // 32. Verify Public Updates Without Redeployment
  it('32. should update public API immediately after admin mutation with zero redeployment', async () => {
    // 1. Create a published AI service
    const createRes = await makeAuthRequest('/api/admin/ai-services', {
      method: 'POST',
      body: {
        title: 'Immediate Zero-Redeploy AI Solution',
        slug: 'immediate-zero-redeploy-solution',
        shortDescription: 'Demonstrating dynamic R2 persistence without rebuilds.',
        deliveryStatus: 'Working Prototype',
        evidenceStatus: 'Verified',
        published: true,
      },
    });
    expect(createRes.status).toBe(201);

    // 2. Public API reflects the new service immediately
    const pubRes = await app.request('/api/public/ai-services');
    expect(pubRes.status).toBe(200);
    const pubBody = (await pubRes.json()) as any;
    const servicesList = Array.isArray(pubBody.data) ? pubBody.data : pubBody.data?.services || [];
    const found = servicesList.some(
      (s: any) => s.slug === 'immediate-zero-redeploy-solution'
    );
    expect(found).toBe(true);

    // 3. Update title
    const id = ((await createRes.json()) as any).data.id;
    await makeAuthRequest(`/api/admin/ai-services/${id}`, {
      method: 'PUT',
      body: {
        title: 'Updated Immediate Solution Title',
      },
    });

    // 4. Query public detail immediately
    const detailRes = await app.request('/api/public/ai-services/immediate-zero-redeploy-solution');
    expect(detailRes.status).toBe(200);
    const detailBody = (await detailRes.json()) as any;
    expect(detailBody.data.title).toBe('Updated Immediate Solution Title');
  });
});
