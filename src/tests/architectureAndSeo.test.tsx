import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { createPortfolioApp } from '../worker/api';
import { MemoryStorageAdapter } from '../storage/r2StorageAdapter';
import { ContentStore } from '../storage/contentStore';
import { createTestJwt } from '../auth/accessJwtValidator';
import { ArchitectureDiagram, MediaAsset, Project } from '../types/portfolio';
import { ImageLightbox } from '../components/common/ImageLightbox';
import { ArchitectureGallery } from '../components/project/ArchitectureGallery';
import {
  generateRouteSeo,
  generateJsonLd,
  serializeJsonLd,
  escapeHtmlAttr,
} from '../services/seoService';

const TEST_SECRET = 'test-verification-secret-32-chars-min';
const TEST_AUD = 'test-access-aud-12345';
const TEST_TEAM_DOMAIN = 'https://dsecops88.cloudflareaccess.com';
const APPROVED_OWNER_EMAIL = 'dasariravid145@gmail.com';
const TARGET_ORIGIN = 'https://ravi-portfolio.dsecops88.online';

function createPngBuffer(): Uint8Array {
  const header = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d];
  const body = new Array(100).fill(0xbb);
  return new Uint8Array([...header, ...body]);
}

describe('Project Architecture Showcase, Interactive Media Galleries & SEO (Prompt 14)', () => {
  let adapter: MemoryStorageAdapter;
  let app: ReturnType<typeof createPortfolioApp>;
  let validToken: string;
  let store: ContentStore;

  beforeEach(async () => {
    adapter = new MemoryStorageAdapter();
    app = createPortfolioApp(adapter);
    store = new ContentStore(adapter);
    await store.ensureInitialized();

    validToken = await createTestJwt(
      {
        iss: TEST_TEAM_DOMAIN,
        aud: TEST_AUD,
        email: APPROVED_OWNER_EMAIL,
      },
      TEST_SECRET
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
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
      PUBLIC_DOMAIN: TARGET_ORIGIN,
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

  const sampleImage: MediaAsset = {
    id: 'asset-arch-1',
    url: 'https://media.dsecops88.online/architecture/roboshop-cloud-topo.png',
    key: 'project-media/roboshop-cloud-topo.png',
    filename: 'roboshop-cloud-topo.png',
    mimeType: 'image/png',
    sizeBytes: 154200,
    uploadedAt: new Date().toISOString(),
  };

  // 1. Create architecture record
  it('1. should create architecture record via POST /api/admin/projects/:id/architecture', async () => {
    const payload = {
      title: 'AWS Multi-Tier Microservices Deployment Topology',
      category: 'Cloud Infrastructure',
      description: 'Production EKS cluster topology with VPC Peering and AWS ALB Ingress Controller.',
      image: sampleImage,
      components: ['AWS ALB', 'Amazon EKS', 'DocumentDB', 'Amazon ElastiCache'],
      technologies: ['Terraform', 'Kubernetes', 'AWS', 'Helm'],
      published: true,
    };

    const res = await makeAuthRequest('/api/admin/projects/p1/architecture', {
      method: 'POST',
      body: payload,
    });

    expect(res.status).toBe(201);
    const json = (await res.json()) as any;
    expect(json.success).toBe(true);
    expect(json.data.title).toBe(payload.title);
    expect(json.data.category).toBe('Cloud Infrastructure');
    expect(json.data.components).toContain('Amazon EKS');
    expect(json.data.published).toBe(true);
  });

  // 2. Upload architecture image
  it('2. should upload architecture image via POST /api/admin/media', async () => {
    const pngBytes = createPngBuffer();
    const res = await makeAuthRequest('/api/admin/media?filename=eks-topology.png', {
      method: 'POST',
      headers: {
        'Content-Type': 'image/png',
      },
      body: pngBytes,
    });

    expect(res.status).toBe(201);
    const json = (await res.json()) as any;
    expect(json.success).toBe(true);
    expect(json.data.key).toContain('media/projects/');
    expect(json.data.mimeType).toBe('image/png');
    expect(json.data.sizeBytes).toBeGreaterThan(0);
  });

  // 3. Edit architecture metadata
  it('3. should edit architecture metadata via PUT /api/admin/projects/:id/architecture/:diagramId', async () => {
    // Add diagram first
    const addRes = await makeAuthRequest('/api/admin/projects/p1/architecture', {
      method: 'POST',
      body: {
        title: 'Initial Topology',
        category: 'System Architecture',
        description: 'Initial description of microservices.',
        image: sampleImage,
      },
    });
    const addJson = (await addRes.json()) as any;
    const diagramId = addJson.data.id;

    // Update diagram
    const updateRes = await makeAuthRequest(`/api/admin/projects/p1/architecture/${diagramId}`, {
      method: 'PUT',
      body: {
        title: 'Updated AWS & Kubernetes Architecture',
        category: 'Cloud Infrastructure',
        description: 'Expanded topology with Istio Service Mesh.',
        components: ['Istio Ingress', 'Kiali Mesh Dashboard', 'Prometheus'],
      },
    });

    expect(updateRes.status).toBe(200);
    const updateJson = (await updateRes.json()) as any;
    expect(updateJson.success).toBe(true);
    expect(updateJson.data.title).toBe('Updated AWS & Kubernetes Architecture');
    expect(updateJson.data.category).toBe('Cloud Infrastructure');
    expect(updateJson.data.components).toContain('Istio Ingress');
  });

  // 4. Reorder architecture records
  it('4. should reorder architecture records via POST /api/admin/projects/:id/architecture/reorder', async () => {
    const d1Res = await makeAuthRequest('/api/admin/projects/p1/architecture', {
      method: 'POST',
      body: { title: 'Diagram Alpha', category: 'System Architecture', image: sampleImage },
    });
    const d2Res = await makeAuthRequest('/api/admin/projects/p1/architecture', {
      method: 'POST',
      body: { title: 'Diagram Beta', category: 'CI/CD Pipeline', image: sampleImage },
    });
    const d1 = ((await d1Res.json()) as any).data;
    const d2 = ((await d2Res.json()) as any).data;

    // Reorder Beta before Alpha
    const reorderRes = await makeAuthRequest('/api/admin/projects/p1/architecture/reorder', {
      method: 'POST',
      body: {
        orderedDiagramIds: [d2.id, d1.id],
      },
    });

    expect(reorderRes.status).toBe(200);
    const reorderJson = (await reorderRes.json()) as any;
    expect(reorderJson.data[0].id).toBe(d2.id);
    expect(reorderJson.data[0].displayOrder).toBe(1);
    expect(reorderJson.data[1].id).toBe(d1.id);
    expect(reorderJson.data[1].displayOrder).toBe(2);
  });

  // 5. Hide architecture record
  it('5. should hide architecture record via POST /api/admin/projects/:id/architecture/:diagramId/publish', async () => {
    const addRes = await makeAuthRequest('/api/admin/projects/p1/architecture', {
      method: 'POST',
      body: { title: 'Confidential Internal Diagram', category: 'Security Architecture', image: sampleImage, published: true },
    });
    const diagram = ((await addRes.json()) as any).data;

    // Hide it
    const hideRes = await makeAuthRequest(`/api/admin/projects/p1/architecture/${diagram.id}/publish`, {
      method: 'POST',
      body: { published: false },
    });
    expect(hideRes.status).toBe(200);

    // Verify Public API omits it
    const publicRes = await app.request('/api/public/projects/roboshop-devsecops');
    expect(publicRes.status).toBe(200);
    const publicJson = (await publicRes.json()) as any;
    const existsInPublic = (publicJson.data.architectureDiagrams || []).some(
      (d: ArchitectureDiagram) => d.id === diagram.id
    );
    expect(existsInPublic).toBe(false);

    // Verify Admin API retains it
    const adminRes = await makeAuthRequest('/api/admin/projects/p1');
    const adminJson = (await adminRes.json()) as any;
    const existsInAdmin = (adminJson.data.architectureDiagrams || []).some(
      (d: ArchitectureDiagram) => d.id === diagram.id
    );
    expect(existsInAdmin).toBe(true);
  });

  // 6. Delete architecture record
  it('6. should delete architecture record via DELETE /api/admin/projects/:id/architecture/:diagramId', async () => {
    const addRes = await makeAuthRequest('/api/admin/projects/p1/architecture', {
      method: 'POST',
      body: { title: 'Temporary Diagram', category: 'Data Flow', image: sampleImage },
    });
    const diagram = ((await addRes.json()) as any).data;

    const delRes = await makeAuthRequest(`/api/admin/projects/p1/architecture/${diagram.id}`, {
      method: 'DELETE',
    });
    expect(delRes.status).toBe(200);
    const delJson = (await delRes.json()) as any;
    expect(delJson.success).toBe(true);

    // Verify absent
    const checkRes = await makeAuthRequest('/api/admin/projects/p1');
    const checkJson = (await checkRes.json()) as any;
    expect(
      (checkJson.data.architectureDiagrams || []).some((d: ArchitectureDiagram) => d.id === diagram.id)
    ).toBe(false);
  });

  // 7. Reject unauthorized mutation
  it('7. should reject unauthorized mutation with 401 Unauthorized', async () => {
    const res = await makeAuthRequest('/api/admin/projects/p1/architecture', {
      method: 'POST',
      token: null, // No token
      body: { title: 'Hacked Diagram', image: sampleImage },
    });
    expect(res.status).toBe(401);
  });

  // 8. Reject invalid media
  it('8. should reject invalid media uploads (executables and shell scripts)', async () => {
    const exeBuffer = new Uint8Array([0x4d, 0x5a, 0x90, 0x00]); // MZ executable signature
    const res = await makeAuthRequest('/api/admin/media?filename=exploit.exe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-msdownload',
      },
      body: exeBuffer,
    });
    expect(res.status).toBe(400);
    const json = (await res.json()) as any;
    expect(json.success).toBe(false);
  });

  // 9. Render project architecture gallery
  it('9. should render ArchitectureGallery with category badges and components', () => {
    const testDiagrams: ArchitectureDiagram[] = [
      {
        id: 'diag-1',
        projectId: 'p1',
        title: 'Kubernetes Cluster Architecture',
        category: 'Cloud Infrastructure',
        description: 'EKS multi-AZ topology with managed node groups.',
        image: sampleImage,
        components: ['ALB', 'EKS Worker Nodes', 'RDS Postgres'],
        technologies: ['AWS', 'Kubernetes', 'Terraform'],
        componentDescriptions: ['ALB', 'EKS Worker Nodes', 'RDS Postgres'],
        technologyReferences: ['AWS', 'Kubernetes', 'Terraform'],
        displayOrder: 1,
        published: true,
        revision: 1,
      },
    ];

    render(
      <ArchitectureGallery
        diagrams={testDiagrams}
        projectTitle="RoboShop DevSecOps"
      />
    );

    expect(screen.getByText('Kubernetes Cluster Architecture')).toBeInTheDocument();
    expect(screen.getByText('Cloud Infrastructure')).toBeInTheDocument();
    expect(screen.getByText(/EKS multi-AZ topology/i)).toBeInTheDocument();
    expect(screen.getByText('ALB')).toBeInTheDocument();
    expect(screen.getByText('EKS Worker Nodes')).toBeInTheDocument();
    expect(screen.getByText('Terraform')).toBeInTheDocument();
  });

  // 10. Open lightbox
  it('10. should open full-screen lightbox when clicking diagram thumbnail', () => {
    const testDiagrams: ArchitectureDiagram[] = [
      {
        id: 'diag-1',
        projectId: 'p1',
        title: 'Kubernetes Cluster Architecture',
        category: 'Cloud Infrastructure',
        description: 'EKS multi-AZ topology.',
        image: sampleImage,
        components: ['ALB'],
        technologies: ['AWS'],
        componentDescriptions: ['ALB'],
        technologyReferences: ['AWS'],
        displayOrder: 1,
        published: true,
        revision: 1,
      },
    ];

    render(
      <ArchitectureGallery
        diagrams={testDiagrams}
        projectTitle="RoboShop DevSecOps"
      />
    );

    const zoomButton = screen.getByRole('button', { name: /Zoom Kubernetes Cluster Architecture/i });
    fireEvent.click(zoomButton);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getAllByText('Kubernetes Cluster Architecture').length).toBeGreaterThanOrEqual(2);
  });

  // 11. Close lightbox with Escape
  it('11. should close lightbox on Escape key press', () => {
    const onCloseMock = vi.fn();
    render(
      <ImageLightbox
        isOpen={true}
        onClose={onCloseMock}
        images={[
          {
            url: sampleImage.url,
            title: 'Test Architecture Diagram',
          },
        ]}
        initialIndex={0}
      />
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });

  // 12. Navigate images with keyboard
  it('12. should navigate images in lightbox with keyboard ArrowRight and ArrowLeft', () => {
    const images = [
      { url: 'https://media.dsecops88.online/arch-1.png', title: 'Diagram 1' },
      { url: 'https://media.dsecops88.online/arch-2.png', title: 'Diagram 2' },
    ];

    render(
      <ImageLightbox
        isOpen={true}
        onClose={() => {}}
        images={images}
        initialIndex={0}
      />
    );

    expect(screen.getByText('Diagram 1')).toBeInTheDocument();

    // ArrowRight to Diagram 2
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(screen.getByText('Diagram 2')).toBeInTheDocument();

    // ArrowLeft back to Diagram 1
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(screen.getByText('Diagram 1')).toBeInTheDocument();
  });

  // 13. Restore focus after closing
  it('13. should restore focus to trigger element after closing lightbox', async () => {
    const trigger = document.createElement('button');
    trigger.setAttribute('id', 'my-trigger-button');
    document.body.appendChild(trigger);
    trigger.focus();
    expect(document.activeElement).toBe(trigger);

    const { rerender } = render(
      <ImageLightbox
        isOpen={true}
        onClose={() => {}}
        images={[{ url: sampleImage.url, title: 'Focus Test' }]}
        triggerElement={trigger}
      />
    );

    // Close lightbox
    rerender(
      <ImageLightbox
        isOpen={false}
        onClose={() => {}}
        images={[{ url: sampleImage.url, title: 'Focus Test' }]}
        triggerElement={trigger}
      />
    );

    await waitFor(() => {
      expect(document.activeElement).toBe(trigger);
    });
    document.body.removeChild(trigger);
  });

  // 14. Render dynamic SEO title
  it('14. should generate dynamic SEO title for homepage, projects and AI services', async () => {
    const homeSeo = await generateRouteSeo('/', store, TARGET_ORIGIN);
    expect(homeSeo.title).toBe('Ravi Dasari — DevOps Engineer');
    expect(homeSeo.ogTitle).toBe('Ravi Dasari — DevOps Engineer');
    expect(homeSeo.title).not.toContain('Senior DevOps');

    const projectSeo = await generateRouteSeo('/projects/roboshop-devsecops', store, TARGET_ORIGIN);
    expect(projectSeo.title).toContain('RoboShop');
    expect(projectSeo.title).toContain('Ravi Dasari');

    const aiSeo = await generateRouteSeo('/ai-solutions/autonomous-ai-agents', store, TARGET_ORIGIN);
    expect(aiSeo.title).toContain('Autonomous AI Agents');
  });

  // 15. Render dynamic meta description
  it('15. should render dynamic meta description matching project/route content', async () => {
    const projectSeo = await generateRouteSeo('/projects/roboshop-devsecops', store, TARGET_ORIGIN);
    expect(projectSeo.description.length).toBeGreaterThan(20);
    expect(projectSeo.description).toContain('DevSecOps');
  });

  // 16. Render canonical URL
  it('16. should render correct canonical URL pointing to target domain', async () => {
    const seo = await generateRouteSeo('/projects/roboshop-devsecops', store, TARGET_ORIGIN);
    expect(seo.canonicalUrl).toBe('https://ravi-portfolio.dsecops88.online/projects/roboshop-devsecops');
  });

  // 17. Render Open Graph metadata
  it('17. should render complete Open Graph and Twitter metadata', async () => {
    const seo = await generateRouteSeo('/projects/roboshop-devsecops', store, TARGET_ORIGIN);
    expect(seo.ogTitle).toContain('RoboShop');
    expect(seo.ogDescription).toBeDefined();
    expect(seo.ogUrl).toBe('https://ravi-portfolio.dsecops88.online/projects/roboshop-devsecops');
    expect(seo.twitterCard).toBe('summary_large_image');
  });

  // 18. Generate valid sitemap XML
  it('18. should generate valid sitemap XML with urlset and sitemaps.org namespace', async () => {
    const res = await app.request('/sitemap.xml');
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('application/xml');

    const xml = await res.text();
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(xml).toContain('</urlset>');
  });

  // 19. Include published projects in sitemap
  it('19. should include published projects in sitemap.xml', async () => {
    const res = await app.request('/sitemap.xml');
    const xml = await res.text();
    expect(xml).toContain('<loc>https://ravi-portfolio.dsecops88.online/projects/roboshop-devsecops</loc>');
    expect(xml).toContain('<changefreq>monthly</changefreq>');
  });

  // 20. Exclude draft projects from sitemap
  it('20. should exclude draft / unpublished projects from sitemap.xml', async () => {
    // Add unpublished draft project
    const draftPayload = {
      title: 'Secret Internal Cluster Migration',
      slug: 'secret-cluster-migration',
      category: 'Cloud Infrastructure & SRE',
      summary: 'Confidential internal infrastructure overhaul in progress.',
      techStack: ['Kubernetes', 'AWS'],
      deploymentStatus: 'Working Prototype',
      published: false,
    };
    await makeAuthRequest('/api/admin/projects', {
      method: 'POST',
      body: draftPayload,
    });

    const res = await app.request('/sitemap.xml');
    const xml = await res.text();
    expect(xml).not.toContain('secret-cluster-migration');
  });

  // 21. Exclude unpublished AI services
  it('21. should exclude unpublished AI services from sitemap.xml', async () => {
    const draftAi = {
      name: 'Unreleased AI Voice Caller',
      slug: 'unreleased-ai-voice-caller',
      categorySlug: 'autonomous-agents',
      summary: 'Confidential calling model.',
      published: false,
    };
    await makeAuthRequest('/api/admin/ai-services', {
      method: 'POST',
      body: draftAi,
    });

    const res = await app.request('/sitemap.xml');
    const xml = await res.text();
    expect(xml).not.toContain('unreleased-ai-voice-caller');
  });

  // 22. Exclude admin routes from sitemap
  it('22. should exclude admin routes and auth paths from sitemap.xml', async () => {
    const res = await app.request('/sitemap.xml');
    const xml = await res.text();
    expect(xml).not.toContain('/admin');
    expect(xml).not.toContain('/api/admin');
    expect(xml).not.toContain('/login');
  });

  // 23. Generate correct robots.txt
  it('23. should generate correct robots.txt with Disallow directives and Sitemap URL', async () => {
    const res = await app.request('/robots.txt');
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('text/plain');

    const txt = await res.text();
    expect(txt).toContain('User-agent: *');
    expect(txt).toContain('Disallow: /admin/');
    expect(txt).toContain('Disallow: /api/admin/');
    expect(txt).toContain('Sitemap: https://ravi-portfolio.dsecops88.online/sitemap.xml');
  });

  // 24. Serialize valid JSON-LD
  it('24. should serialize valid Schema.org JSON-LD for Person, WebSite and SoftwareApplication', async () => {
    const homeJsonLd = await generateJsonLd('/', store, TARGET_ORIGIN);
    expect(homeJsonLd).not.toBeNull();
    const graph = (homeJsonLd as any)['@graph'];
    expect(graph.some((item: any) => item['@type'] === 'Person')).toBe(true);
    expect(graph.some((item: any) => item['@type'] === 'WebSite')).toBe(true);

    const projectJsonLd = await generateJsonLd('/projects/roboshop-devsecops', store, TARGET_ORIGIN);
    expect(projectJsonLd).not.toBeNull();
    expect((projectJsonLd as any)['@type']).toBe('SoftwareApplication');
  });

  // 25. Prevent metadata injection
  it('25. should safely escape malicious strings in SEO metadata and JSON-LD', () => {
    const rawMalicious = '"><script>alert("xss")</script><img src=x onerror=alert(1)>';
    const escapedAttr = escapeHtmlAttr(rawMalicious);
    expect(escapedAttr).not.toContain('<script>');
    expect(escapedAttr).toContain('&quot;');
    expect(escapedAttr).toContain('&lt;script&gt;');

    const maliciousObject = {
      malicious: '</script><script>alert("injected")</script>',
    };
    const serializedJson = serializeJsonLd(maliciousObject);
    expect(serializedJson).not.toContain('</script>');
    expect(serializedJson).toContain('\\u003c/script\\u003e');
  });

  // 26. Verify crawler-visible HTML metadata
  it('26. should return crawler-visible HTML metadata for indexable routes when Accept: text/html', async () => {
    const res = await app.request('/projects/roboshop-devsecops', {
      headers: {
        Accept: 'text/html',
      },
    });

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('text/html');

    const html = await res.text();
    expect(html).toContain('<title>');
    expect(html).toContain('RoboShop');
    expect(html).toContain('<meta name="description"');
    expect(html).toContain('<link rel="canonical" href="https://ravi-portfolio.dsecops88.online/projects/roboshop-devsecops"');
    expect(html).toContain('<meta property="og:title"');
    expect(html).toContain('<script type="application/ld+json">');
    expect(html).toContain('SoftwareApplication');

    // Homepage crawler request
    const homeRes = await app.request('/', {
      headers: {
        Accept: 'text/html',
      },
    });
    expect(homeRes.status).toBe(200);
    const homeHtml = await homeRes.text();
    expect(homeHtml).toContain('<title>Ravi Dasari — DevOps Engineer</title>');
    expect(homeHtml).toContain('<meta property="og:title" content="Ravi Dasari — DevOps Engineer" />');
    expect(homeHtml).not.toContain('Senior DevOps & Cloud Infrastructure Engineer');
  });

  // 27. Update sitemap after CMS changes
  it('27. should dynamically update sitemap after CMS status mutations without build/deploy', async () => {
    // Create draft
    const createRes = await makeAuthRequest('/api/admin/projects', {
      method: 'POST',
      body: {
        title: 'New Dynamic Showcase',
        slug: 'new-dynamic-showcase',
        category: 'DevSecOps & Cloud',
        summary: 'Dynamically updated without rebuilding.',
        techStack: ['Docker', 'Kubernetes'],
        deploymentStatus: 'Production Pipeline Automated',
        published: false,
      },
    });
    const project = ((await createRes.json()) as any).data;

    // Verify absent in sitemap
    let sitemapRes = await app.request('/sitemap.xml');
    let xml = await sitemapRes.text();
    expect(xml).not.toContain('new-dynamic-showcase');

    // Publish project via admin
    await makeAuthRequest(`/api/admin/projects/${project.id}`, {
      method: 'PUT',
      body: { published: true },
    });

    // Immediately re-fetch sitemap
    sitemapRes = await app.request('/sitemap.xml');
    xml = await sitemapRes.text();
    expect(xml).toContain('<loc>https://ravi-portfolio.dsecops88.online/projects/new-dynamic-showcase</loc>');
  });

  // 28. Verify gallery persistence after restart
  it('28. should verify architecture diagrams persist across store restarts', async () => {
    // Add diagram to project in first store instance
    await makeAuthRequest('/api/admin/projects/p1/architecture', {
      method: 'POST',
      body: {
        title: 'Persistent Distributed Topology',
        category: 'Cloud Infrastructure',
        description: 'Topology persisting across server reboots.',
        image: sampleImage,
      },
    });

    // Re-initialize new store pointing to same adapter
    const newStore = new ContentStore(adapter);
    const projectsObj = await newStore.getProjects();
    const p1 = (projectsObj?.data || []).find((p: Project) => p.id === 'p1');

    expect(p1).toBeDefined();
    expect(
      (p1?.architectureDiagrams || []).some((d: ArchitectureDiagram) => d.title === 'Persistent Distributed Topology')
    ).toBe(true);
  });

  // 29. Verify mobile gallery behavior
  it('29. should render mobile-friendly controls and touch-friendly buttons on lightbox', () => {
    render(
      <ImageLightbox
        isOpen={true}
        onClose={() => {}}
        images={[
          { url: 'https://media.dsecops88.online/img1.png', title: 'Image 1' },
          { url: 'https://media.dsecops88.online/img2.png', title: 'Image 2' },
        ]}
        initialIndex={0}
      />
    );

    const prevButton = screen.getByRole('button', { name: /Previous image/i });
    const nextButton = screen.getByRole('button', { name: /Next image/i });
    const closeButton = screen.getByRole('button', { name: /Close image preview/i });

    expect(prevButton).toBeInTheDocument();
    expect(nextButton).toBeInTheDocument();
    expect(closeButton).toBeInTheDocument();

    // Verify touch sizing
    expect(prevButton).toHaveClass('w-10');
    expect(nextButton).toHaveClass('w-10');
    expect(closeButton).toHaveClass('w-10');
  });

  // 30. Verify no redeployment is required
  it('30. should verify no redeployment or static build step is required for SEO/gallery updates', async () => {
    // Update SEO title of RoboShop directly via admin CMS
    await makeAuthRequest('/api/admin/projects/p1', {
      method: 'PUT',
      body: {
        seo: {
          metaTitle: 'RoboShop DevSecOps Zero-Downtime EKS Pipeline | Ravi Dasari',
          metaDescription: 'Real-time updated meta description without redeploying code.',
        },
      },
    });

    // Immediately fetch HTML via crawler endpoint
    const res = await app.request('/projects/roboshop-devsecops', {
      headers: {
        Accept: 'text/html',
      },
    });

    const html = await res.text();
    expect(html).toContain('RoboShop DevSecOps Zero-Downtime EKS Pipeline | Ravi Dasari');
    expect(html).toContain('Real-time updated meta description without redeploying code.');
  });
});
