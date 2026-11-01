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

describe('Experience, Education & Certifications CMS (Prompt 11)', () => {
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

  // =========================================================================
  // Experience Tests (1-10)
  // =========================================================================

  // 1. Create experience
  it('1. should create a new experience record via POST /api/admin/experience', async () => {
    const res = await makeAuthRequest('/api/admin/experience', {
      method: 'POST',
      body: {
        role: 'Staff DevSecOps Architect',
        company: 'Cloud Defense Systems',
        companyUrl: 'https://clouddefense.example.com',
        employmentType: 'Full-time',
        location: 'Austin, TX (Remote)',
        startDate: '2024-01',
        endDate: null,
        isCurrent: true,
        summary: 'Architecting zero-trust Kubernetes pipelines and cloud edge microservices.',
        responsibilities: ['Automate hardened container builds', 'Lead DevSecOps compliance'],
        achievements: ['Reduced vulnerability MTTR by 82%'],
        techStack: ['Kubernetes', 'Trivy', 'Cosign', 'Terraform'],
        published: true,
      },
    });

    expect(res.status).toBe(201);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    expect(body.data.role).toBe('Staff DevSecOps Architect');
    expect(body.data.company).toBe('Cloud Defense Systems');
    expect(body.data.isCurrent).toBe(true);
    expect(body.data.revision).toBe(1);
    expect(res.headers.get('ETag')).toBeDefined();
  });

  // 2. Read experience
  it('2. should read experience records via GET /api/admin/experience and by ID', async () => {
    const listRes = await makeAuthRequest('/api/admin/experience');
    expect(listRes.status).toBe(200);
    const listBody = (await listRes.json()) as any;
    expect(listBody.success).toBe(true);
    expect(Array.isArray(listBody.data)).toBe(true);
    expect(listBody.data.length).toBeGreaterThan(0);

    const firstId = listBody.data[0].id;
    const itemRes = await makeAuthRequest(`/api/admin/experience/${firstId}`);
    expect(itemRes.status).toBe(200);
    const itemBody = (await itemRes.json()) as any;
    expect(itemBody.data.id).toBe(firstId);
  });

  // 3. Edit experience
  it('3. should update an experience record via PUT /api/admin/experience/:id', async () => {
    const listRes = await makeAuthRequest('/api/admin/experience');
    const listBody = (await listRes.json()) as any;
    const exp = listBody.data[0];

    const res = await makeAuthRequest(`/api/admin/experience/${exp.id}`, {
      method: 'PUT',
      headers: { 'If-Match': listRes.headers.get('ETag') || '' },
      body: {
        role: 'Senior Lead DevSecOps Engineer',
        summary: 'Updated role summary with expanded leadership scope.',
      },
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.data.role).toBe('Senior Lead DevSecOps Engineer');
    expect(body.data.revision).toBe(exp.revision + 1);
  });

  // 4. Delete experience
  it('4. should delete an experience record via DELETE /api/admin/experience/:id', async () => {
    // Create an experience item to delete
    const createRes = await makeAuthRequest('/api/admin/experience', {
      method: 'POST',
      body: {
        role: 'Contract DevOps Engineer',
        company: 'Temporary Client Corp',
        startDate: '2023-01',
        endDate: '2023-06',
        isCurrent: false,
      },
    });
    const createdId = ((await createRes.json()) as any).data.id;

    const delRes = await makeAuthRequest(`/api/admin/experience/${createdId}`, {
      method: 'DELETE',
    });
    expect(delRes.status).toBe(200);

    const getRes = await makeAuthRequest(`/api/admin/experience/${createdId}`);
    expect(getRes.status).toBe(404);
  });

  // 5. Reorder experience
  it('5. should reorder experience records via POST /api/admin/experience/reorder', async () => {
    const listRes = await makeAuthRequest('/api/admin/experience');
    const listBody = (await listRes.json()) as any;
    const originalIds: string[] = listBody.data.map((e: any) => e.id);
    expect(originalIds.length).toBeGreaterThanOrEqual(2);

    const reversedIds = [...originalIds].reverse();
    const reorderRes = await makeAuthRequest('/api/admin/experience/reorder', {
      method: 'POST',
      body: { orderedIds: reversedIds },
    });

    expect(reorderRes.status).toBe(200);
    const reorderedBody = (await reorderRes.json()) as any;
    expect(reorderedBody.data[0].id).toBe(reversedIds[0]);
    expect(reorderedBody.data[0].order).toBeLessThan(reorderedBody.data[1].order);
  });

  // 6. Hide experience
  it('6. should hide experience record and exclude it from public API', async () => {
    const listRes = await makeAuthRequest('/api/admin/experience');
    const exp = ((await listRes.json()) as any).data[0];

    await makeAuthRequest(`/api/admin/experience/${exp.id}`, {
      method: 'PUT',
      body: { published: false },
    });

    const pubRes = await app.request('/api/public/experience');
    expect(pubRes.status).toBe(200);
    const pubBody = (await pubRes.json()) as any;
    expect(pubBody.data.some((e: any) => e.id === exp.id)).toBe(false);
  });

  // 7. Reject invalid date range
  it('7. should reject invalid date range where endDate is earlier than startDate', async () => {
    const res = await makeAuthRequest('/api/admin/experience', {
      method: 'POST',
      body: {
        role: 'Invalid Date Role',
        company: 'Chronology Error Inc',
        startDate: '2024-05',
        endDate: '2022-01',
        isCurrent: false,
      },
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as any;
    expect(body.success).toBe(false);
    expect(body.error).toMatch(/End date cannot be earlier than start date/i);
  });

  // 8. Support current role without end date
  it('8. should support current role without end date (endDate === null)', async () => {
    const res = await makeAuthRequest('/api/admin/experience', {
      method: 'POST',
      body: {
        role: 'Current Active Role',
        company: 'Active Tech Innovations',
        startDate: '2023-01',
        endDate: '2025-12', // Should be automatically set to null by service
        isCurrent: true,
      },
    });

    expect(res.status).toBe(201);
    const body = (await res.json()) as any;
    expect(body.data.isCurrent).toBe(true);
    expect(body.data.endDate).toBeNull();
  });

  // 9. Reject unauthorized experience mutation (401)
  it('9. should reject unauthorized experience mutation with 401', async () => {
    const res = await makeAuthRequest('/api/admin/experience', {
      method: 'POST',
      token: null, // No token
      body: {
        role: 'Hacker Role',
        company: 'Unauthorized Corp',
        startDate: '2024-01',
      },
    });

    expect(res.status).toBe(401);
  });

  // 10. Detect stale revision (409)
  it('10. should detect stale revision with 412 or 409 conflict', async () => {
    const listRes = await makeAuthRequest('/api/admin/experience');
    const exp = ((await listRes.json()) as any).data[0];

    const res = await makeAuthRequest(`/api/admin/experience/${exp.id}`, {
      method: 'PUT',
      headers: { 'If-Match': '"stale-etag-99999"' },
      body: { role: 'Stale Attempt' },
    });

    expect(res.status === 412 || res.status === 409).toBe(true);
  });

  // =========================================================================
  // Education Tests (11-16)
  // =========================================================================

  // 11. Create education
  it('11. should create a new education record via POST /api/admin/education', async () => {
    const res = await makeAuthRequest('/api/admin/education', {
      method: 'POST',
      body: {
        degree: 'Master of Science (M.S.)',
        institution: 'University of Texas at Dallas',
        fieldOfStudy: 'Cloud Computing & Cyber Defense',
        startDate: '2022-08',
        endDate: '2024-05',
        grade: 'GPA 3.9/4.0',
        description: 'Focus on distributed infrastructure, container runtimes, and zero-trust security.',
        published: true,
      },
    });

    expect(res.status).toBe(201);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    expect(body.data.degree).toBe('Master of Science (M.S.)');
    expect(body.data.institution).toBe('University of Texas at Dallas');
    expect(body.data.revision).toBe(1);
    expect(res.headers.get('ETag')).toBeDefined();
  });

  // 12. Read education
  it('12. should read education records via GET /api/admin/education and by ID', async () => {
    const listRes = await makeAuthRequest('/api/admin/education');
    expect(listRes.status).toBe(200);
    const listBody = (await listRes.json()) as any;
    expect(listBody.success).toBe(true);
    expect(Array.isArray(listBody.data)).toBe(true);
    expect(listBody.data.length).toBeGreaterThan(0);

    const firstId = listBody.data[0].id;
    const itemRes = await makeAuthRequest(`/api/admin/education/${firstId}`);
    expect(itemRes.status).toBe(200);
    const itemBody = (await itemRes.json()) as any;
    expect(itemBody.data.id).toBe(firstId);
  });

  // 13. Edit education
  it('13. should update an education record via PUT /api/admin/education/:id', async () => {
    const listRes = await makeAuthRequest('/api/admin/education');
    const edu = ((await listRes.json()) as any).data[0];

    const res = await makeAuthRequest(`/api/admin/education/${edu.id}`, {
      method: 'PUT',
      headers: { 'If-Match': listRes.headers.get('ETag') || '' },
      body: {
        grade: 'First Class with Distinction (Honors)',
      },
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.data.grade).toBe('First Class with Distinction (Honors)');
    expect(body.data.revision).toBe(edu.revision + 1);
  });

  // 14. Delete education
  it('14. should delete an education record via DELETE /api/admin/education/:id', async () => {
    const createRes = await makeAuthRequest('/api/admin/education', {
      method: 'POST',
      body: {
        degree: 'Diploma in Computer Applications',
        institution: 'Polytechnic Institute',
        fieldOfStudy: 'Computer Science',
      },
    });
    const createdId = ((await createRes.json()) as any).data.id;

    const delRes = await makeAuthRequest(`/api/admin/education/${createdId}`, {
      method: 'DELETE',
    });
    expect(delRes.status).toBe(200);

    const getRes = await makeAuthRequest(`/api/admin/education/${createdId}`);
    expect(getRes.status).toBe(404);
  });

  // 15. Reorder education
  it('15. should reorder education records via POST /api/admin/education/reorder', async () => {
    // Ensure we have at least 2 items
    await makeAuthRequest('/api/admin/education', {
      method: 'POST',
      body: {
        degree: 'Second Degree',
        institution: 'Second University',
        fieldOfStudy: 'Software Systems',
      },
    });

    const listRes = await makeAuthRequest('/api/admin/education');
    const originalIds: string[] = ((await listRes.json()) as any).data.map((e: any) => e.id);

    const reversedIds = [...originalIds].reverse();
    const reorderRes = await makeAuthRequest('/api/admin/education/reorder', {
      method: 'POST',
      body: { orderedIds: reversedIds },
    });

    expect(reorderRes.status).toBe(200);
    const reordered = ((await reorderRes.json()) as any).data;
    expect(reordered[0].id).toBe(reversedIds[0]);
    expect(reordered[0].order).toBeLessThan(reordered[1].order);
  });

  // 16. Hide education
  it('16. should hide education record and exclude it from public API', async () => {
    const listRes = await makeAuthRequest('/api/admin/education');
    const edu = ((await listRes.json()) as any).data[0];

    await makeAuthRequest(`/api/admin/education/${edu.id}`, {
      method: 'PUT',
      body: { published: false },
    });

    const pubRes = await app.request('/api/public/education');
    expect(pubRes.status).toBe(200);
    const pubBody = (await pubRes.json()) as any;
    expect(pubBody.data.some((e: any) => e.id === edu.id)).toBe(false);
  });

  // =========================================================================
  // Certifications Tests (17-25)
  // =========================================================================

  // 17. Create certification
  it('17. should create a new certification record via POST /api/admin/certifications', async () => {
    const res = await makeAuthRequest('/api/admin/certifications', {
      method: 'POST',
      body: {
        title: 'Certified Kubernetes Security Specialist (CKS)',
        issuer: 'Cloud Native Computing Foundation (CNCF)',
        issueDate: '2024-03',
        expiryDate: '2027-03',
        credentialId: 'CKS-99887766',
        credentialUrl: 'https://www.credly.com/badges/cks-sample',
        description: 'Cluster hardening, system vulnerability scanning, and container runtime security.',
        verificationStatus: 'VERIFIED',
        published: true,
      },
    });

    expect(res.status).toBe(201);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    expect(body.data.title).toBe('Certified Kubernetes Security Specialist (CKS)');
    expect(body.data.issuer).toBe('Cloud Native Computing Foundation (CNCF)');
    expect(body.data.verificationStatus).toBe('VERIFIED');
    expect(body.data.revision).toBe(1);
    expect(res.headers.get('ETag')).toBeDefined();
  });

  // 18. Read certification
  it('18. should read certification records via GET /api/admin/certifications and by ID', async () => {
    const listRes = await makeAuthRequest('/api/admin/certifications');
    expect(listRes.status).toBe(200);
    const listBody = (await listRes.json()) as any;
    expect(listBody.success).toBe(true);
    expect(Array.isArray(listBody.data)).toBe(true);
    expect(listBody.data.length).toBeGreaterThan(0);

    const firstId = listBody.data[0].id;
    const itemRes = await makeAuthRequest(`/api/admin/certifications/${firstId}`);
    expect(itemRes.status).toBe(200);
    const itemBody = (await itemRes.json()) as any;
    expect(itemBody.data.id).toBe(firstId);
  });

  // 19. Edit certification
  it('19. should update a certification record via PUT /api/admin/certifications/:id', async () => {
    const listRes = await makeAuthRequest('/api/admin/certifications');
    const cert = ((await listRes.json()) as any).data[0];

    const res = await makeAuthRequest(`/api/admin/certifications/${cert.id}`, {
      method: 'PUT',
      headers: { 'If-Match': listRes.headers.get('ETag') || '' },
      body: {
        title: 'AWS Certified Solutions Architect – Professional',
        verificationStatus: 'VERIFIED',
      },
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.data.title).toBe('AWS Certified Solutions Architect – Professional');
    expect(body.data.verificationStatus).toBe('VERIFIED');
    expect(body.data.revision).toBe(cert.revision + 1);
  });

  // 20. Delete certification
  it('20. should delete a certification record via DELETE /api/admin/certifications/:id', async () => {
    const createRes = await makeAuthRequest('/api/admin/certifications', {
      method: 'POST',
      body: {
        title: 'Temporary Certificate',
        issuer: 'Temporary Academy',
      },
    });
    const createdId = ((await createRes.json()) as any).data.id;

    const delRes = await makeAuthRequest(`/api/admin/certifications/${createdId}`, {
      method: 'DELETE',
    });
    expect(delRes.status).toBe(200);

    const getRes = await makeAuthRequest(`/api/admin/certifications/${createdId}`);
    expect(getRes.status).toBe(404);
  });

  // 21. Reorder certifications
  it('21. should reorder certifications via POST /api/admin/certifications/reorder', async () => {
    const listRes = await makeAuthRequest('/api/admin/certifications');
    const originalIds: string[] = ((await listRes.json()) as any).data.map((c: any) => c.id);

    const reversedIds = [...originalIds].reverse();
    const reorderRes = await makeAuthRequest('/api/admin/certifications/reorder', {
      method: 'POST',
      body: { orderedIds: reversedIds },
    });

    expect(reorderRes.status).toBe(200);
    const reordered = ((await reorderRes.json()) as any).data;
    expect(reordered[0].id).toBe(reversedIds[0]);
    expect(reordered[0].order).toBeLessThan(reordered[1].order);
  });

  // 22. Hide certification
  it('22. should hide certification record and exclude it from public API', async () => {
    const listRes = await makeAuthRequest('/api/admin/certifications');
    const cert = ((await listRes.json()) as any).data[0];

    await makeAuthRequest(`/api/admin/certifications/${cert.id}`, {
      method: 'PUT',
      body: { published: false },
    });

    const pubRes = await app.request('/api/public/certifications');
    expect(pubRes.status).toBe(200);
    const pubBody = (await pubRes.json()) as any;
    expect(pubBody.data.some((c: any) => c.id === cert.id)).toBe(false);
  });

  // 23. Validate credential URL
  it('23. should validate credential URL and reject malformed protocols', async () => {
    const res = await makeAuthRequest('/api/admin/certifications', {
      method: 'POST',
      body: {
        title: 'Cert with Invalid URL',
        issuer: 'Bad URL Corp',
        credentialUrl: 'not-a-valid-http-url',
      },
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as any;
    expect(body.success).toBe(false);
  });

  // 24. Prevent false verification status (default is not verified)
  it('24. should prevent false verification status and default to NOT PROVIDED', async () => {
    // Provide a valid credential URL but omit verificationStatus
    const res = await makeAuthRequest('/api/admin/certifications', {
      method: 'POST',
      body: {
        title: 'Unverified Cert with URL',
        issuer: 'Some Provider',
        credentialUrl: 'https://example.com/verify-badge',
      },
    });

    expect(res.status).toBe(201);
    const body = (await res.json()) as any;
    // Supplying a URL must NEVER automatically verify the credential
    expect(body.data.verificationStatus).toBe('NOT PROVIDED');
  });

  // 25. Reject unauthorized certification mutation (401)
  it('25. should reject unauthorized certification mutation with 401', async () => {
    const res = await makeAuthRequest('/api/admin/certifications', {
      method: 'POST',
      token: null,
      body: {
        title: 'Unauthorized Cert',
        issuer: 'Unauthorized Corp',
      },
    });

    expect(res.status).toBe(401);
  });

  // =========================================================================
  // Public Integration Tests (26-31)
  // =========================================================================

  // 26. Exclude hidden records publicly
  it('26. should exclude hidden experience, education, and certifications from public endpoints', async () => {
    // Create hidden experience
    await makeAuthRequest('/api/admin/experience', {
      method: 'POST',
      body: {
        role: 'Hidden Secret Experience',
        company: 'Confidential Stealth Co',
        startDate: '2023-01',
        published: false,
      },
    });

    // Create hidden education
    await makeAuthRequest('/api/admin/education', {
      method: 'POST',
      body: {
        degree: 'Hidden Degree',
        institution: 'Hidden Academy',
        fieldOfStudy: 'Classified Studies',
        published: false,
      },
    });

    // Create hidden certification
    await makeAuthRequest('/api/admin/certifications', {
      method: 'POST',
      body: {
        title: 'Hidden Certification',
        issuer: 'Classified Issuer',
        published: false,
      },
    });

    const [expRes, eduRes, certRes] = await Promise.all([
      app.request('/api/public/experience'),
      app.request('/api/public/education'),
      app.request('/api/public/certifications'),
    ]);

    const expBody = (await expRes.json()) as any;
    const eduBody = (await eduRes.json()) as any;
    const certBody = (await certRes.json()) as any;

    expect(expBody.data.some((e: any) => e.role === 'Hidden Secret Experience')).toBe(false);
    expect(eduBody.data.some((e: any) => e.degree === 'Hidden Degree')).toBe(false);
    expect(certBody.data.some((c: any) => c.title === 'Hidden Certification')).toBe(false);
  });

  // 27. Render public experience timeline
  it('27. should render public experience timeline on the homepage', async () => {
    const spy = vi.spyOn(contentService, 'getPortfolioData').mockResolvedValue(INITIAL_PORTFOLIO_FIXTURE);

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      // Check for role titles from verified resume fixtures
      expect(screen.getAllByText(/Capgemini/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Virtusa/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Independent Freelance Consulting/i).length).toBeGreaterThan(0);
      // No current role badge or indicator
      expect(screen.queryByText(/Current Role/i)).not.toBeInTheDocument();
    });

    spy.mockRestore();
  });

  // 28. Render public education section
  it('28. should render public education section on the homepage', async () => {
    const spy = vi.spyOn(contentService, 'getPortfolioData').mockResolvedValue(INITIAL_PORTFOLIO_FIXTURE);

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      // Check for academic degree and institution from verified resume fixtures
      expect(screen.getAllByText(/Master of Computer Applications/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Emeralds Advanced Institute of Management Studies/i).length).toBeGreaterThan(0);
    });

    spy.mockRestore();
  });

  // 29. Render public certifications section
  it('29. should hide public certifications section when none published', async () => {
    const spy = vi.spyOn(contentService, 'getPortfolioData').mockResolvedValue(INITIAL_PORTFOLIO_FIXTURE);

    const { container } = render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      // Section must be completely hidden when owner has no published certifications
      expect(container.querySelector('#certifications')).not.toBeInTheDocument();
      expect(screen.queryByText(/Enterprise Certifications/i)).not.toBeInTheDocument();
    });

    spy.mockRestore();
  });

  // 30. Verify data persistence after restart
  it('30. should verify data persistence after simulated restart across all three stores', async () => {
    // 1. Create unique experience
    await makeAuthRequest('/api/admin/experience', {
      method: 'POST',
      body: {
        role: 'Persistent Lead Architect',
        company: 'Durable Systems Co',
        startDate: '2023-01',
      },
    });

    // 2. Create unique education
    await makeAuthRequest('/api/admin/education', {
      method: 'POST',
      body: {
        degree: 'Persistent Doctorate of Engineering',
        institution: 'Durable University',
        fieldOfStudy: 'Fault Tolerance',
      },
    });

    // 3. Create unique certification
    await makeAuthRequest('/api/admin/certifications', {
      method: 'POST',
      body: {
        title: 'Persistent Cloud Security Master',
        issuer: 'Durable Cloud Institute',
      },
    });

    // Simulate restart with a brand new ContentStore instance using same adapter
    const newStore = new ContentStore(adapter);
    await newStore.ensureInitialized();

    const [expObj, eduObj, certObj] = await Promise.all([
      newStore.getExperience(),
      newStore.getEducation(),
      newStore.getCertifications(),
    ]);

    expect(expObj?.data.some((e) => e.role === 'Persistent Lead Architect')).toBe(true);
    expect(eduObj?.data.some((e) => e.degree === 'Persistent Doctorate of Engineering')).toBe(true);
    expect(certObj?.data.some((c) => c.title === 'Persistent Cloud Security Master')).toBe(true);
  });

  // 31. Verify public updates without redeployment
  it('31. should update public API immediately after admin mutation with zero redeployment', async () => {
    // Admin creates certification
    const createRes = await makeAuthRequest('/api/admin/certifications', {
      method: 'POST',
      body: {
        title: 'Instant Zero-Redeploy Certificate',
        issuer: 'Instant Deploy Academy',
        verificationStatus: 'VERIFIED',
        published: true,
      },
    });
    expect(createRes.status).toBe(201);

    // Public API reflects update immediately
    const pubRes = await app.request('/api/public/certifications');
    expect(pubRes.status).toBe(200);
    const pubBody = (await pubRes.json()) as any;
    expect(pubBody.data.some((c: any) => c.title === 'Instant Zero-Redeploy Certificate')).toBe(true);
  });
});
