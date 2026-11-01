import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { createPortfolioApp } from '../worker/api';
import { MemoryStorageAdapter } from '../storage/r2StorageAdapter';
import { createTestJwt } from '../auth/accessJwtValidator';
import { adminService } from '../services/adminService';
import { AdminLayout } from '../components/admin/AdminLayout';
import { AdminGuard } from '../components/admin/AdminGuard';
import { DashboardOverviewPage } from '../pages/admin/DashboardOverviewPage';

const TEST_SECRET = 'test-verification-secret-32-chars-min';
const TEST_AUD = 'test-access-aud-12345';
const TEST_TEAM_DOMAIN = 'https://dsecops88.cloudflareaccess.com';
const APPROVED_OWNER_EMAIL = 'dasariravid145@gmail.com';

describe('Admin Authentication & Working Dashboard (Prompt 07)', () => {
  let adapter: MemoryStorageAdapter;
  let app: ReturnType<typeof createPortfolioApp>;

  beforeEach(() => {
    adapter = new MemoryStorageAdapter();
    app = createPortfolioApp(adapter);
  });

  // Helper to generate a valid test JWT
  const getValidToken = async (overrides: Record<string, any> = {}) => {
    return createTestJwt(
      {
        iss: TEST_TEAM_DOMAIN,
        aud: TEST_AUD,
        email: APPROVED_OWNER_EMAIL,
        ...overrides,
      },
      TEST_SECRET
    );
  };

  // Helper to make an admin request with bindings
  const makeAdminRequest = async (
    path: string,
    options: {
      method?: string;
      token?: string | null;
      useAssertionHeader?: boolean;
      body?: any;
      bindings?: Record<string, any>;
    } = {}
  ) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (options.token) {
      if (options.useAssertionHeader) {
        headers['cf-access-jwt-assertion'] = options.token;
      } else {
        headers['Authorization'] = `Bearer ${options.token}`;
      }
    }

    const env = {
      CF_ACCESS_TEAM_DOMAIN: TEST_TEAM_DOMAIN,
      CF_ACCESS_AUD: TEST_AUD,
      CF_ACCESS_OWNER_EMAIL: APPROVED_OWNER_EMAIL,
      CF_ACCESS_SECRET: TEST_SECRET,
      ENVIRONMENT: 'development',
      ...options.bindings,
    };

    return app.request(path, {
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    }, env as any);
  };

  // 1. Missing auth token rejected
  it('1. should reject requests with missing auth token with HTTP 401', async () => {
    const res = await makeAdminRequest('/api/admin/auth/me');
    expect(res.status).toBe(401);

    const body = (await res.json()) as any;
    expect(body.success).toBe(false);
    expect(body.code).toBe('UNAUTHORIZED');
  });

  // 2. Invalid JWT rejected
  it('2. should reject invalid or tampered JWTs with HTTP 401', async () => {
    // Tampered payload segment
    const valid = await getValidToken();
    const tampered = valid.substring(0, valid.length - 10) + 'invalidbytes';

    const res = await makeAdminRequest('/api/admin/auth/me', { token: tampered });
    expect(res.status).toBe(401);

    const body = (await res.json()) as any;
    expect(body.code).toBe('INVALID_TOKEN');
  });

  // 3. Expired JWT rejected
  it('3. should reject expired JWTs with HTTP 401', async () => {
    const expiredToken = await getValidToken({
      exp: Math.floor(Date.now() / 1000) - 3600, // Expired 1 hour ago
    });

    const res = await makeAdminRequest('/api/admin/auth/me', { token: expiredToken });
    expect(res.status).toBe(401);

    const body = (await res.json()) as any;
    expect(body.code).toBe('EXPIRED_TOKEN');
  });

  // 4. Wrong audience rejected
  it('4. should reject JWTs with wrong audience with HTTP 401', async () => {
    const wrongAudToken = await getValidToken({
      aud: 'unauthorized-other-application-aud',
    });

    const res = await makeAdminRequest('/api/admin/auth/me', { token: wrongAudToken });
    expect(res.status).toBe(401);

    const body = (await res.json()) as any;
    expect(body.code).toBe('INVALID_AUDIENCE');
  });

  // 5. Wrong issuer rejected
  it('5. should reject JWTs from wrong team domain / issuer with HTTP 401', async () => {
    const wrongIssToken = await getValidToken({
      iss: 'https://attacker-team.cloudflareaccess.com',
    });

    const res = await makeAdminRequest('/api/admin/auth/me', { token: wrongIssToken });
    expect(res.status).toBe(401);

    const body = (await res.json()) as any;
    expect(body.code).toBe('INVALID_ISSUER');
  });

  // 6. Wrong owner identity rejected
  it('6. should reject unauthorized identity with HTTP 403 Forbidden', async () => {
    const wrongIdentityToken = await getValidToken({
      email: 'imposter@external.com',
    });

    const res = await makeAdminRequest('/api/admin/auth/me', { token: wrongIdentityToken });
    expect(res.status).toBe(403);

    const body = (await res.json()) as any;
    expect(body.code).toBe('FORBIDDEN_IDENTITY');
    expect(body.error).toContain('Forbidden: Identity "imposter@external.com" is not authorized as the portfolio owner');
  });

  // 7. Valid approved identity accepted
  it('7. should accept valid approved identity and return 200 with owner profile', async () => {
    const validToken = await getValidToken();

    // Test both Authorization Bearer and cf-access-jwt-assertion
    const res = await makeAdminRequest('/api/admin/auth/me', {
      token: validToken,
      useAssertionHeader: true,
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    expect(body.user.email).toBe(APPROVED_OWNER_EMAIL);
    expect(body.user.role).toBe('owner');
  });

  // 8. Unauthorized mutation rejected
  it('8. should reject mutation requests from unauthenticated clients with HTTP 401', async () => {
    const res = await makeAdminRequest('/api/admin/projects', {
      method: 'POST',
      body: {
        title: 'Unauthorized Intrusion Project',
        category: 'Test',
        summary: 'This payload should be rejected without auth.',
        techStack: ['Node.js'],
        deploymentStatus: 'Testing',
      },
    });

    expect(res.status).toBe(401);
    const body = (await res.json()) as any;
    expect(body.code).toBe('UNAUTHORIZED');
  });

  // 9. Authenticated mutation allowed when valid
  it('9. should allow authenticated mutation with valid JWT and return 201 Created', async () => {
    const validToken = await getValidToken();

    const res = await makeAdminRequest('/api/admin/projects', {
      method: 'POST',
      token: validToken,
      useAssertionHeader: true,
      body: {
        title: 'Autonomous Kubernetes Sentinel',
        category: 'DevSecOps & AI',
        summary: 'Edge-native continuous verification and compliance daemon for production pods.',
        techStack: ['Go', 'Kubernetes', 'Cloudflare Workers', 'Trivy'],
        deploymentStatus: 'Working Prototype',
        featured: true,
        published: true,
      },
    });

    expect(res.status).toBe(201);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    expect(body.data.slug).toBe('autonomous-kubernetes-sentinel');
    expect(res.headers.get('ETag')).toBeDefined();
  });

  // 10. Admin route unauthorized access blocked
  it('10. should block unauthorized access to all admin management routes', async () => {
    const endpoints = [
      '/api/admin/overview',
      '/api/admin/projects',
      '/api/admin/skills',
      '/api/admin/profile',
    ];

    for (const ep of endpoints) {
      const res = await makeAdminRequest(ep);
      expect(res.status).toBe(401);
    }

    // Verify AdminGuard component blocks unauthorized view
    vi.spyOn(adminService, 'checkAuth').mockResolvedValueOnce({
      authenticated: false,
      error: 'Authentication required',
    });

    render(
      <MemoryRouter>
        <AdminGuard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('admin-auth-gate')).toBeInTheDocument();
      expect(screen.getByText('Cloudflare Access Gate')).toBeInTheDocument();
    });
  });

  // 11. Admin response not publicly cached
  it('11. should enforce no-store and no-cache security headers on admin responses', async () => {
    const validToken = await getValidToken();
    const res = await makeAdminRequest('/api/admin/overview', { token: validToken });

    expect(res.headers.get('Cache-Control')).toContain('no-store');
    expect(res.headers.get('Cache-Control')).toContain('no-cache');
    expect(res.headers.get('Pragma')).toBe('no-cache');
    expect(res.headers.get('Expires')).toBe('0');
  });

  // 12. Dashboard renders authorized state
  it('12. should render DashboardOverviewPage with real metrics in authorized state', async () => {
    vi.spyOn(adminService, 'getOverview').mockResolvedValueOnce({
      success: true,
      data: {
        metrics: {
          totalProjects: 4,
          publishedProjects: 4,
          draftProjects: 0,
          totalSkills: 16,
          totalSkillCategories: 4,
          totalExperience: 3,
          totalCertifications: 2,
          totalAIServices: 4,
        },
        lastUpdated: new Date().toISOString(),
        ownerEmail: APPROVED_OWNER_EMAIL,
        activeResume: true,
        resumeVersion: 'v2026.1',
        siteTitle: 'Ravi Dasari Portfolio',
        analyticsEnabled: false,
      },
    });

    render(
      <MemoryRouter>
        <DashboardOverviewPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('dashboard-overview')).toBeInTheDocument();
    });

    expect(screen.getByText('System Dashboard Overview')).toBeInTheDocument();
    expect(screen.getByText('Portfolio Projects')).toBeInTheDocument();
    expect(screen.getByText('Skills Catalog')).toBeInTheDocument();
    expect(screen.getByText('AI Services & Workflows')).toBeInTheDocument();
    expect(screen.getByText('OCC (R2 ETag onlyIf)')).toBeInTheDocument();
  });

  // 13. Dashboard handles empty content
  it('13. should handle empty metrics gracefully without errors', async () => {
    vi.spyOn(adminService, 'getOverview').mockResolvedValueOnce({
      success: true,
      data: {
        metrics: {
          totalProjects: 0,
          publishedProjects: 0,
          draftProjects: 0,
          totalSkills: 0,
          totalSkillCategories: 0,
          totalExperience: 0,
          totalCertifications: 0,
          totalAIServices: 0,
        },
        lastUpdated: new Date().toISOString(),
        ownerEmail: APPROVED_OWNER_EMAIL,
        activeResume: false,
        resumeVersion: 'None',
        siteTitle: 'Ravi Dasari Portfolio',
        analyticsEnabled: false,
      },
    });

    render(
      <MemoryRouter>
        <DashboardOverviewPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('dashboard-overview')).toBeInTheDocument();
    });

    expect(screen.getByText('0 Published • 0 Drafts')).toBeInTheDocument();
    expect(screen.getByText('Action Required')).toBeInTheDocument();
  });

  // 14. Dashboard handles API failure
  it('14. should render ErrorState with retry button when overview API fails', async () => {
    vi.spyOn(adminService, 'getOverview').mockResolvedValueOnce({
      success: false,
      error: 'Simulated Network Disruption',
    });

    render(
      <MemoryRouter>
        <DashboardOverviewPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('dashboard-error')).toBeInTheDocument();
    });

    expect(screen.getByText('Failed to Load Dashboard Overview')).toBeInTheDocument();
    expect(screen.getByText(/Simulated Network Disruption/i)).toBeInTheDocument();
  });

  // 15. Admin navigation works
  it('15. should render complete AdminLayout navigation items and links', () => {
    render(
      <MemoryRouter initialEntries={['/admin']}>
        <AdminLayout />
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: /Dashboard Overview/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Profile & Bio/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Resume Management/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Projects CMS/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Skills & Categories/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Work Experience/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Certifications/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /AI Services/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Media Library/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Site Settings/i })).toBeInTheDocument();
  });

  // 16. Mobile sidebar interactions work
  it('16. should toggle mobile drawer open and closed via user interaction', async () => {
    render(
      <MemoryRouter initialEntries={['/admin']}>
        <AdminLayout />
      </MemoryRouter>
    );

    const sidebar = screen.getByTestId('admin-sidebar');
    expect(sidebar).toHaveClass('-translate-x-full');

    // Open mobile sidebar
    const openBtn = screen.getByTestId('open-mobile-menu');
    fireEvent.click(openBtn);
    expect(sidebar).toHaveClass('translate-x-0');

    // Close via close button
    const closeBtn = screen.getByTestId('close-mobile-menu');
    fireEvent.click(closeBtn);
    expect(sidebar).toHaveClass('-translate-x-full');

    // Reopen and close via backdrop
    fireEvent.click(openBtn);
    expect(sidebar).toHaveClass('translate-x-0');
    const backdrop = screen.getByTestId('mobile-backdrop');
    fireEvent.click(backdrop);
    expect(sidebar).toHaveClass('-translate-x-full');
  });

  // 17. Production auth fails closed without config
  it('17. should fail closed in production environment if required config is missing', async () => {
    const validToken = await getValidToken();

    // In production without CF_ACCESS_AUD, server must fail closed!
    const res = await makeAdminRequest('/api/admin/auth/me', {
      token: validToken,
      bindings: {
        ENVIRONMENT: 'production',
        ADMIN_SESSION_SECRET: 'production-super-secure-session-secret-key-64-bytes-entropy!',
        CF_ACCESS_AUD: undefined, // Missing!
      },
    });

    expect(res.status).toBe(401);
    const body = (await res.json()) as any;
    expect(body.code).toBe('AUTH_CONFIG_MISSING');
    expect(body.error).toContain('strictly fails closed in production');
  });

  // 18. Public routes remain accessible
  it('18. should ensure public routes remain accessible without authentication', async () => {
    const contentRes = await app.request('/api/public/content');
    expect(contentRes.status).toBe(200);
    const contentBody = (await contentRes.json()) as any;
    expect(contentBody.success).toBe(true);

    const projectsRes = await app.request('/api/public/projects');
    expect(projectsRes.status).toBe(200);

    const profileRes = await app.request('/api/public/profile');
    expect(profileRes.status).toBe(200);
  });
});
