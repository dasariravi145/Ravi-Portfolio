import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { createPortfolioApp } from '../worker/api';
import { MemoryStorageAdapter } from '../storage/r2StorageAdapter';
import { createTestJwt } from '../auth/accessJwtValidator';
import { PublicLayout } from '../components/layout/PublicLayout';
import { MemoryRouter } from 'react-router-dom';

const TEST_SECRET = 'test-verification-secret-32-chars-min';
const TEST_AUD = 'test-access-aud-12345';
const TEST_TEAM_DOMAIN = 'https://dsecops88.cloudflareaccess.com';
const APPROVED_OWNER_EMAIL = 'dasariravid145@gmail.com';

// Binary Helpers
function createPngBuffer(): Uint8Array {
  const header = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d];
  const body = new Array(64).fill(0xbb);
  return new Uint8Array([...header, ...body]);
}

function createJpegBuffer(): Uint8Array {
  const header = [0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01];
  const body = new Array(64).fill(0xaa);
  return new Uint8Array([...header, ...body]);
}

function createPdfBuffer(): Uint8Array {
  return new TextEncoder().encode('%PDF-1.4\n1 0 obj\n<< /Title (Ravi Dasari Verified Resume) >>\nendobj\n%%EOF');
}

describe('Complete End-to-End Workflows & Quality Assurance (Prompt 16)', () => {
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
      bindings?: Record<string, any>;
    } = {}
  ) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };

    if (options.token !== null) {
      headers['cf-access-jwt-assertion'] = options.token || validToken;
    }

    const env = {
      CF_ACCESS_TEAM_DOMAIN: TEST_TEAM_DOMAIN,
      CF_ACCESS_AUD: TEST_AUD,
      CF_ACCESS_OWNER_EMAIL: APPROVED_OWNER_EMAIL,
      CF_ACCESS_SECRET: TEST_SECRET,
      ENVIRONMENT: 'development',
      ...options.bindings,
    };

    let bodyData = options.body;
    const isBinary =
      ArrayBuffer.isView(bodyData) ||
      bodyData instanceof ArrayBuffer ||
      bodyData?.constructor?.name === 'Uint8Array';

    if (bodyData && typeof bodyData === 'object' && !isBinary) {
      bodyData = JSON.stringify(bodyData);
    }

    return app.request(path, {
      method: options.method || 'GET',
      headers,
      body: bodyData,
    }, env as any);
  };

  // ==========================================
  // 1. ADMIN AUTHENTICATION TESTING (SECTION 4)
  // ==========================================
  describe('1. Admin Authentication Workflows', () => {
    it('should authenticate authorized owner and reject unauthorized access', async () => {
      // 1. Authorized access
      const authRes = await makeAuthRequest('/api/admin/auth/me');
      expect(authRes.status).toBe(200);
      const authJson = await authRes.json();
      expect(authJson.user.authenticated).toBe(true);
      expect(authJson.user.email).toBe(APPROVED_OWNER_EMAIL);

      // 2. Anonymous access rejected
      const anonRes = await makeAuthRequest('/api/admin/auth/me', { token: null });
      expect(anonRes.status).toBe(401);

      // 3. Expired token rejected
      const expiredToken = await createTestJwt(
        { iss: TEST_TEAM_DOMAIN, aud: TEST_AUD, email: APPROVED_OWNER_EMAIL, exp: Math.floor(Date.now() / 1000) - 3600 },
        TEST_SECRET
      );
      const expiredRes = await makeAuthRequest('/api/admin/auth/me', { token: expiredToken });
      expect(expiredRes.status).toBe(401);

      // 4. Imposter email rejected
      const imposterToken = await createTestJwt(
        { iss: TEST_TEAM_DOMAIN, aud: TEST_AUD, email: 'imposter@attack.com' },
        TEST_SECRET
      );
      const imposterRes = await makeAuthRequest('/api/admin/auth/me', { token: imposterToken });
      expect(imposterRes.status).toBe(403);
    });
  });

  // ==========================================
  // 2. PROFILE MANAGEMENT WORKFLOW (SECTION 5)
  // ==========================================
  describe('2. Profile Management Workflows', () => {
    it('should load, update headline, bio, and social links, persisting to storage', async () => {
      // 1. Load initial profile
      const getRes = await app.request('/api/public/profile');
      expect(getRes.status).toBe(200);
      const getJson = await getRes.json();
      const initialProfile = getJson.data;
      const initialEtag = getRes.headers.get('ETag') || 'W/"initial"';

      expect(initialProfile.fullName).toBe('Ravi Dasari');

      // 2. Update professional headline and about description
      const updatedProfile = {
        ...initialProfile,
        headline: 'Principal Cloud Architect & Autonomous AI Systems Lead',
        bioShort: 'Veteran Cloud & DevSecOps Engineer with 10+ years engineering automated enterprise architectures and secure AI workflows.',
        bioLong: 'Principal Engineer specializing in high-throughput Kubernetes deployments, zero-trust infrastructure, and resilient edge services.',
        location: 'Bengaluru, Karnataka, India / Remote Global',
      };

      const putRes = await makeAuthRequest('/api/admin/profile', {
        method: 'PUT',
        headers: { 'If-Match': initialEtag },
        body: updatedProfile,
      });

      expect(putRes.status).toBe(200);
      const putJson = await putRes.json();
      expect(putJson.success).toBe(true);
      expect(putJson.data.headline).toBe('Principal Cloud Architect & Autonomous AI Systems Lead');

      // 3. Verify public API immediately serves updated profile without rebuild
      const publicRes = await app.request('/api/public/profile');
      const publicJson = await publicRes.json();
      expect(publicJson.data.headline).toBe('Principal Cloud Architect & Autonomous AI Systems Lead');
      expect(publicJson.data.location).toBe('Bengaluru, Karnataka, India / Remote Global');

      // 4. Stale ETag returns 409 Concurrency Conflict
      const staleRes = await makeAuthRequest('/api/admin/profile', {
        method: 'PUT',
        headers: { 'If-Match': 'W/"stale-revision-tag"' },
        body: updatedProfile,
      });
      expect(staleRes.status).toBe(409);
    });
  });

  // ==========================================
  // 3. PROFILE PHOTO WORKFLOW (SECTION 6)
  // ==========================================
  describe('3. Profile Photo Workflows', () => {
    it('should upload, preview, replace, and delete profile photo with safe fallbacks', async () => {
      // 1. Upload valid PNG photo
      const uploadRes = await makeAuthRequest('/api/admin/profile/photo', {
        method: 'POST',
        headers: {
          'Content-Type': 'image/png',
          'X-Filename': 'executive-portrait.png',
        },
        body: createPngBuffer(),
      });

      expect(uploadRes.status).toBe(200);
      const uploadJson = await uploadRes.json();
      expect(uploadJson.success).toBe(true);
      expect(uploadJson.data.avatar).toBeDefined();
      expect(uploadJson.data.avatar.key).toMatch(/^media\/avatars\/avatar-/);

      const avatarKey = uploadJson.data.avatar.key;

      // 2. Verify avatar streams publicly
      const streamRes = await app.request(`/api/public/${avatarKey}`);
      expect(streamRes.status).toBe(200);
      expect(streamRes.headers.get('Content-Type')).toBe('image/png');
      expect(streamRes.headers.get('X-Content-Type-Options')).toBe('nosniff');

      // 3. Replace photo with JPEG
      const replaceRes = await makeAuthRequest('/api/admin/profile/photo', {
        method: 'POST',
        headers: {
          'Content-Type': 'image/jpeg',
          'X-Filename': 'new-portrait.jpg',
        },
        body: createJpegBuffer(),
      });

      expect(replaceRes.status).toBe(200);
      const replaceJson = await replaceRes.json();
      const newAvatarKey = replaceJson.data.avatar.key;
      expect(newAvatarKey).not.toBe(avatarKey);

      // 4. Delete photo -> reverts to fallback geometric monogram
      const deleteRes = await makeAuthRequest('/api/admin/profile/photo', {
        method: 'DELETE',
      });
      expect(deleteRes.status).toBe(200);
      const deleteJson = await deleteRes.json();
      expect(deleteJson.data.avatar).toBeNull();

      // 5. Public profile reflects null avatar
      const publicProfileRes = await app.request('/api/public/profile');
      expect((await publicProfileRes.json()).data.avatar).toBeNull();
    });
  });

  // ==========================================
  // 4. RESUME MANAGEMENT WORKFLOW (SECTION 7)
  // ==========================================
  describe('4. Resume Management Workflows', () => {
    it('should upload PDF, preview, publish, download, and unpublish with strict access control', async () => {
      // 1. Upload valid PDF
      const uploadRes = await makeAuthRequest('/api/admin/resume/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/pdf',
          'X-Filename': 'Ravi_Dasari_Resume.pdf',
        },
        body: createPdfBuffer(),
      });

      expect(uploadRes.status).toBe(200);
      const uploadJson = await uploadRes.json();
      expect(uploadJson.success).toBe(true);
      expect(uploadJson.data.activeResume).toBeDefined();

      // 2. Preview active resume authorized
      const previewRes = await makeAuthRequest('/api/admin/resume/preview');
      expect(previewRes.status).toBe(200);
      expect(previewRes.headers.get('Content-Type')).toBe('application/pdf');

      // 3. Publish resume
      const publishRes = await makeAuthRequest('/api/admin/resume/publish', {
        method: 'POST',
        body: { published: true },
      });
      expect(publishRes.status).toBe(200);

      // 4. Public download succeeds when published
      const downloadRes = await app.request('/api/public/resume/download');
      expect(downloadRes.status).toBe(200);
      expect(downloadRes.headers.get('Content-Type')).toBe('application/pdf');

      // 5. Unpublish resume
      const unpublishRes = await makeAuthRequest('/api/admin/resume/publish', {
        method: 'POST',
        body: { published: false },
      });
      expect(unpublishRes.status).toBe(200);

      // 6. Public download blocked with 404 when unpublished
      const blockedRes = await app.request('/api/public/resume/download');
      expect(blockedRes.status).toBe(404);

      // 7. Direct media stream to resume path is strictly forbidden (403)
      const streamRes = await app.request('/api/public/media/resume/active/Ravi_Dasari_Resume.pdf');
      expect(streamRes.status).toBe(403);
    });
  });

  // ==========================================
  // 5. THE 15-STEP ADMIN-TO-PUBLIC LIVE CONTENT TEST (SECTION 16)
  // ==========================================
  describe('5. Admin-to-Public Live Content Workflow (Section 16 Invariant)', () => {
    it('executes the full 15-step live content workflow without rebuild or redeployment', async () => {
      const uniqueSlug = `live-e2e-project-${Date.now()}`;

      // Step 1: Start local application (app initialized)
      expect(app).toBeDefined();

      // Step 2: Authenticate using approved method
      expect(validToken).toBeDefined();

      // Step 3 & 4: Create a test project and save as draft (published: false)
      const draftPayload = {
        title: 'Zero-Downtime Multi-Region Kubernetes Pipeline',
        slug: uniqueSlug,
        category: 'Cloud Infrastructure & SRE',
        summary: 'Automated multi-region failover architecture with ArgoCD and Istio service mesh.',
        deploymentStatus: 'In Development',
        evidenceStatus: 'Verified',
        techStack: ['Kubernetes', 'Istio', 'ArgoCD', 'Terraform'],
        published: false,
        featured: false,
        displayOrder: 10,
      };

      const createRes = await makeAuthRequest('/api/admin/projects', {
        method: 'POST',
        body: draftPayload,
      });
      expect(createRes.status).toBe(201);
      const createdProject = (await createRes.json()).data;
      const initialEtag = createRes.headers.get('ETag') || 'W/"initial"';

      // Step 5: Confirm it is not public
      let publicContentRes = await app.request('/api/public/content');
      let publicProjects = (await publicContentRes.json()).data.projects;
      expect(publicProjects.some((p: any) => p.slug === uniqueSlug)).toBe(false);

      let detailRes = await app.request(`/api/public/projects/${uniqueSlug}`);
      expect(detailRes.status).toBe(404);

      // Step 6: Publish project
      const publishRes = await makeAuthRequest(`/api/admin/projects/${createdProject.id}`, {
        method: 'PUT',
        headers: { 'If-Match': initialEtag },
        body: {
          ...draftPayload,
          published: true,
        },
      });
      expect(publishRes.status).toBe(200);
      const publishEtag = publishRes.headers.get('ETag') || 'W/"pub"';

      // Step 7: Confirm public API includes it
      publicContentRes = await app.request('/api/public/content');
      publicProjects = (await publicContentRes.json()).data.projects;
      const publishedItem = publicProjects.find((p: any) => p.slug === uniqueSlug);
      expect(publishedItem).toBeDefined();
      expect(publishedItem.title).toBe('Zero-Downtime Multi-Region Kubernetes Pipeline');

      // Step 8: Confirm public slug page displays it
      detailRes = await app.request(`/api/public/projects/${uniqueSlug}`);
      expect(detailRes.status).toBe(200);
      const detailJson = await detailRes.json();
      expect(detailJson.data.title).toBe('Zero-Downtime Multi-Region Kubernetes Pipeline');

      // Step 9 & 10: Edit project description and confirm public update
      const updatedSummary = 'Refactored multi-region mesh architecture with automated canary rollouts.';
      const editRes = await makeAuthRequest(`/api/admin/projects/${createdProject.id}`, {
        method: 'PUT',
        headers: { 'If-Match': publishEtag },
        body: {
          ...draftPayload,
          summary: updatedSummary,
          published: true,
        },
      });
      expect(editRes.status).toBe(200);
      const editEtag = editRes.headers.get('ETag') || 'W/"edit"';

      detailRes = await app.request(`/api/public/projects/${uniqueSlug}`);
      expect((await detailRes.json()).data.summary).toBe(updatedSummary);

      // Step 11 & 12: Reorder project and confirm public order
      const reorderRes = await makeAuthRequest(`/api/admin/projects/${createdProject.id}`, {
        method: 'PUT',
        headers: { 'If-Match': editEtag },
        body: {
          ...draftPayload,
          summary: updatedSummary,
          displayOrder: 0, // Move to top (0 ensures it precedes RoboShop's displayOrder 1)
          published: true,
        },
      });
      expect(reorderRes.status).toBe(200);
      const reorderEtag = reorderRes.headers.get('ETag') || 'W/"order"';

      publicContentRes = await app.request('/api/public/content');
      const firstProject = (await publicContentRes.json()).data.projects[0];
      expect(firstProject.slug).toBe(uniqueSlug);

      // Step 13 & 14: Unpublish project and confirm public removal
      const unpublishRes = await makeAuthRequest(`/api/admin/projects/${createdProject.id}`, {
        method: 'PUT',
        headers: { 'If-Match': reorderEtag },
        body: {
          ...draftPayload,
          summary: updatedSummary,
          displayOrder: 0,
          published: false,
        },
      });
      expect(unpublishRes.status).toBe(200);

      publicContentRes = await app.request('/api/public/content');
      publicProjects = (await publicContentRes.json()).data.projects;
      expect(publicProjects.some((p: any) => p.slug === uniqueSlug)).toBe(false);

      // Step 15: Confirm detail route returns 404
      detailRes = await app.request(`/api/public/projects/${uniqueSlug}`);
      expect(detailRes.status).toBe(404);
      expect((await detailRes.json()).code).toBe('NOT_FOUND');
    });
  });

  // ==========================================
  // 6. SKILLS CMS WORKFLOW (SECTION 10)
  // ==========================================
  describe('6. Skills & Categories CMS Workflows', () => {
    it('manages categories and skills, enforcing category dependency protection', async () => {
      // 1. Create a new category
      const catRes = await makeAuthRequest('/api/admin/skill-categories', {
        method: 'POST',
        body: {
          name: 'Platform Engineering',
          slug: `platform-eng-${Date.now()}`,
          description: 'Internal developer platform tooling',
          order: 9,
          published: true,
        },
      });
      expect(catRes.status).toBe(201);
      const catData = (await catRes.json()).data;

      // 2. Create a skill inside that category
      const skillRes = await makeAuthRequest('/api/admin/skills', {
        method: 'POST',
        body: {
          name: 'Backstage IDP',
          categoryId: catData.id,
          proficiencyLevel: 'Advanced',
          iconIdentifier: 'code',
          order: 1,
          published: true,
        },
      });
      expect(skillRes.status).toBe(201);
      const skillData = (await skillRes.json()).data;

      // 3. Attempt to delete category with active skills -> blocked with 400
      const blockedDelete = await makeAuthRequest(`/api/admin/skill-categories/${catData.id}`, {
        method: 'DELETE',
      });
      expect(blockedDelete.status).toBe(400);
      const blockedJson = await blockedDelete.json();
      expect(blockedJson.code).toBe('VALIDATION_ERROR');
      expect(blockedJson.error).toContain('contains 1 active skills');

      // 4. Move skill to different category
      const moveRes = await makeAuthRequest(`/api/admin/skills/${skillData.id}`, {
        method: 'PUT',
        body: {
          ...skillData,
          categoryId: 'devsecops-ci-cd',
        },
      });
      expect(moveRes.status).toBe(200);

      // 5. Delete now-empty category -> succeeds with 200
      const deleteCatRes = await makeAuthRequest(`/api/admin/skill-categories/${catData.id}`, {
        method: 'DELETE',
      });
      expect(deleteCatRes.status).toBe(200);
    });
  });

  // ==========================================
  // 7. EXPERIENCE & EDUCATION CMS (SECTIONS 11 & 12)
  // ==========================================
  describe('7. Experience & Education Workflows', () => {
    it('validates dates, manages current roles, and exposes public timeline', async () => {
      // 1. Create role with invalid date range (endDate before startDate) -> 400
      const invalidDateRes = await makeAuthRequest('/api/admin/experience', {
        method: 'POST',
        body: {
          role: 'Senior DevOps Architect',
          company: 'Acme Cloud Services',
          employmentType: 'Full-time',
          location: 'Remote',
          startDate: '2024-01-01',
          endDate: '2023-01-01', // Invalid
          isCurrent: false,
          summary: 'Cloud architecture design',
          achievements: ['Decreased latency by 40%'],
          techStack: ['AWS'],
          published: true,
          order: 1,
        },
      });
      expect(invalidDateRes.status).toBe(400);

      // 2. Create valid current role
      const validRoleRes = await makeAuthRequest('/api/admin/experience', {
        method: 'POST',
        body: {
          role: 'Lead Cloud & DevSecOps Engineer',
          company: 'Enterprise Cloud Technologies',
          employmentType: 'Full-time',
          location: 'Hyderabad, India',
          startDate: '2022-06-01',
          isCurrent: true,
          summary: 'Architecting secure multi-tier CI/CD pipelines and Kubernetes clusters.',
          achievements: ['Automated zero-downtime deployment pipelines for 50+ services.'],
          techStack: ['Kubernetes', 'Terraform', 'Vault'],
          published: true,
          order: 1,
        },
      });
      expect(validRoleRes.status).toBe(201);
      const roleData = (await validRoleRes.json()).data;
      expect(roleData.isCurrent).toBe(true);

      // 3. Verify public experience timeline reflects it
      const publicExp = await app.request('/api/public/experience');
      const expList = (await publicExp.json()).data;
      expect(expList.some((e: any) => e.company === 'Enterprise Cloud Technologies')).toBe(true);
    });
  });

  // ==========================================
  // 8. CERTIFICATIONS CMS (SECTION 13)
  // ==========================================
  describe('8. Certifications Workflows', () => {
    it('validates safe verification URL and accurately reflects verification status', async () => {
      // 1. Rejects unsafe verification URL (e.g. javascript:)
      const unsafeCertRes = await makeAuthRequest('/api/admin/certifications', {
        method: 'POST',
        body: {
          title: 'AWS Certified Security - Specialty',
          issuer: 'Amazon Web Services',
          issueDate: '2023-05-15',
          credentialId: 'AWS-SEC-999',
          credentialUrl: 'javascript:alert(1)',
          verificationStatus: 'VERIFIED',
          description: 'Specialty certification in AWS cloud security and KMS encryption.',
          order: 1,
          published: true,
        },
      });
      expect(unsafeCertRes.status).toBe(400);

      // 2. Creates valid certification
      const validCertRes = await makeAuthRequest('/api/admin/certifications', {
        method: 'POST',
        body: {
          title: 'AWS Certified Security - Specialty',
          issuer: 'Amazon Web Services',
          issueDate: '2023-05-15',
          credentialId: 'AWS-SEC-999',
          credentialUrl: 'https://cp.certmetrics.com/amazon/en/public/verify/credential/AWS-SEC-999',
          verificationStatus: 'VERIFIED',
          description: 'Specialty certification in AWS cloud security and KMS encryption.',
          order: 1,
          published: true,
        },
      });
      expect(validCertRes.status).toBe(201);
      const certData = (await validCertRes.json()).data;
      expect(certData.verificationStatus).toBe('VERIFIED');

      // 3. Verify public display
      const publicCerts = await app.request('/api/public/certifications');
      const certsList = (await publicCerts.json()).data;
      expect(certsList.some((c: any) => c.credentialId === 'AWS-SEC-999')).toBe(true);
    });
  });

  // ==========================================
  // 9. AI SERVICES CMS (SECTION 14)
  // ==========================================
  describe('9. AI Services & Automation Workflows', () => {
    it('enforces status classifications and hides draft AI services from public routes', async () => {
      const draftSlug = `ai-agent-${Date.now()}`;

      // 1. Create AI Service as draft
      const draftAiRes = await makeAuthRequest('/api/admin/ai-services', {
        method: 'POST',
        body: {
          title: 'Enterprise Incident Triaging AI Agent',
          slug: draftSlug,
          categoryId: 'cat-ai-agents',
          shortDescription: 'Autonomous anomaly detection and ticket triaging engine.',
          description: 'Leverages fine-tuned LLMs to correlate CloudWatch metrics and triage incidents.',
          capabilities: ['Automated RCA', 'Log correlation'],
          deliveryStatus: 'Working Prototype',
          evidenceStatus: 'Verified',
          published: false,
          order: 1,
        },
      });
      expect(draftAiRes.status).toBe(201);

      // 2. Confirm public route returns 404
      const publicAiSlug = await app.request(`/api/public/ai-services/${draftSlug}`);
      expect(publicAiSlug.status).toBe(404);

      // 3. Confirm public list excludes it
      const publicAiList = await app.request('/api/public/ai-services');
      const listData = (await publicAiList.json()).data;
      expect(listData.some((s: any) => s.slug === draftSlug)).toBe(false);
    });
  });

  // ==========================================
  // 10. PERSISTENCE & STORAGE RECOVERY (SECTION 17)
  // ==========================================
  describe('10. Persistence & Storage Restart Recovery', () => {
    it('preserves all state across storage export and re-import restart emulation', async () => {
      // 1. Update site settings
      const putSettingsRes = await makeAuthRequest('/api/admin/site-settings', {
        method: 'PUT',
        body: {
          siteTitle: 'Ravi Dasari — Cloud Architecture & DevSecOps Portfolio',
          metaDescription: 'Verified DevSecOps and SRE portfolio.',
          contactEmail: 'contact@dsecops88.online',
          footerText: '© 2026 Ravi Dasari. All rights reserved.',
          analyticsEnabled: true,
        },
      });
      expect(putSettingsRes.status).toBe(200);

      // 2. Export snapshot
      const snapshot = adapter.exportState();
      expect(snapshot).toBeDefined();

      // 3. Instantiate brand new adapter and app (restart emulation)
      const restartAdapter = new MemoryStorageAdapter();
      restartAdapter.importState(snapshot);
      const restartApp = createPortfolioApp(restartAdapter);

      // 4. Verify settings retained
      const settingsRes = await restartApp.request('/api/public/site-settings');
      expect(settingsRes.status).toBe(200);
      const settingsJson = await settingsRes.json();
      expect(settingsJson.data.siteTitle).toBe('Ravi Dasari — Cloud Architecture & DevSecOps Portfolio');
    });
  });

  // ==========================================
  // 11. RESPONSIVENESS & ACCESSIBILITY (SECTIONS 20 & 21)
  // ==========================================
  describe('11. Responsiveness, Navigation & Accessibility', () => {
    it('verifies mobile drawer toggle, WCAG skip link, and minimum touch target constraints', () => {
      render(
        <MemoryRouter>
          <PublicLayout />
        </MemoryRouter>
      );

      // Skip link
      const skipLink = screen.getByRole('link', { name: /skip to main content/i });
      expect(skipLink).toBeDefined();
      expect(skipLink.getAttribute('href')).toBe('#main-content');

      // Mobile Menu Trigger Button touch target (min 44px)
      const menuButton = screen.getByRole('button', { name: /open menu/i });
      expect(menuButton).toBeDefined();
      expect(menuButton.className).toContain('min-w-[44px]');
      expect(menuButton.className).toContain('min-h-[44px]');

      // Drawer opens upon click
      fireEvent.click(menuButton);
      expect(screen.getByRole('region', { name: /mobile navigation drawer/i })).toBeDefined();
    });
  });

  // ==========================================
  // 12. SEO & STRUCTURED METADATA (SECTION 22)
  // ==========================================
  describe('12. Technical SEO & Dynamic Crawler Endpoints', () => {
    it('generates valid robots.txt and sitemap.xml strictly excluding drafts and admin routes', async () => {
      // Robots.txt
      const robotsRes = await app.request('/robots.txt');
      expect(robotsRes.status).toBe(200);
      const robotsText = await robotsRes.text();
      expect(robotsText).toContain('User-agent: *');
      expect(robotsText).toContain('Disallow: /admin/');
      expect(robotsText).toContain('Disallow: /api/admin/');
      expect(robotsText).toContain('Sitemap: https://ravi-portfolio.dsecops88.online/sitemap.xml');

      // Sitemap.xml
      const sitemapRes = await app.request('/sitemap.xml');
      expect(sitemapRes.status).toBe(200);
      expect(sitemapRes.headers.get('Content-Type')).toContain('xml');
      const sitemapXml = await sitemapRes.text();
      expect(sitemapXml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(sitemapXml).toContain('<urlset');
      expect(sitemapXml).toContain('https://ravi-portfolio.dsecops88.online/');
      expect(sitemapXml).not.toContain('/admin');
    });
  });
});

