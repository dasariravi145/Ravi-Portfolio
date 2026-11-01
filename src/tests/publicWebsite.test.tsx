import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HomePage } from '../pages/HomePage';
import { ProjectsPage } from '../pages/ProjectsPage';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';
import { Hero } from '../components/hero/Hero';
import { contentService } from '../services/contentService';
import { INITIAL_PORTFOLIO_FIXTURE } from '../fixtures/initialContent';
import { PortfolioData } from '../types/portfolio';

describe('Complete Premium Public Website & Dynamic Content Integration (Prompt 13)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // 1. Homepage renders
  it('1. should render Homepage successfully with all core landmarks and sections', async () => {
    vi.spyOn(contentService, 'getPortfolioData').mockResolvedValue({
      ...INITIAL_PORTFOLIO_FIXTURE,
    });

    const { container } = render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
      expect(screen.getByText(/About Me/i)).toBeInTheDocument();
      expect(screen.getByText(/Technical Skills/i)).toBeInTheDocument();
      expect(screen.getByText(/Professional Career Journey/i)).toBeInTheDocument();
      expect(screen.getByText(/Academic Foundation/i)).toBeInTheDocument();
      expect(screen.getByText(/Engineering Solutions & Software Applications/i)).toBeInTheDocument();
      expect(screen.getByText(/Intelligent Agents, Voice & Automated Pipelines/i)).toBeInTheDocument();
      expect(screen.getByText(/Professional Resume/i)).toBeInTheDocument();
      expect(screen.getByText(/Let’s Discuss Engineering Opportunities/i)).toBeInTheDocument();
    });

    expect(container.querySelector('#hero')).toBeInTheDocument();
    expect(container.querySelector('#about')).toBeInTheDocument();
    expect(container.querySelector('#skills')).toBeInTheDocument();
    expect(container.querySelector('#experience')).toBeInTheDocument();
    expect(container.querySelector('#education')).toBeInTheDocument();
    // Certifications section is hidden when no published certifications exist
    expect(container.querySelector('#certifications')).not.toBeInTheDocument();
    expect(container.querySelector('#projects')).toBeInTheDocument();
    expect(container.querySelector('#ai-solutions')).toBeInTheDocument();
    expect(container.querySelector('#resume')).toBeInTheDocument();
    expect(container.querySelector('#contact')).toBeInTheDocument();
  });

  // 2. Header navigation works
  it('2. should render desktop navigation links with correct anchor targets and branding', () => {
    render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>
    );

    expect(screen.getByLabelText(/Ravi Dasari/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/#hero');
    expect(screen.getByRole('link', { name: 'About' })).toHaveAttribute('href', '/#about');
    expect(screen.getByRole('link', { name: 'Skills' })).toHaveAttribute('href', '/#skills');
    expect(screen.getByRole('link', { name: 'Experience' })).toHaveAttribute('href', '/#experience');
    expect(screen.getByRole('link', { name: 'Projects' })).toHaveAttribute('href', '/#projects');
    expect(screen.getByRole('link', { name: 'AI Solutions' })).toHaveAttribute('href', '/#ai-solutions');
    expect(screen.getByRole('link', { name: 'Contact' })).toHaveAttribute('href', '/#contact');
  });

  // 3. Mobile navigation works
  it('3. should toggle mobile drawer menu and close on link selection', () => {
    render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>
    );

    const toggleBtn = screen.getByRole('button', { name: /Open menu/i });
    expect(toggleBtn).toBeInTheDocument();
    expect(toggleBtn).toHaveAttribute('aria-expanded', 'false');

    // Open drawer
    fireEvent.click(toggleBtn);
    expect(toggleBtn).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('region', { name: /Mobile Navigation Drawer/i })).toBeInTheDocument();

    // Click a mobile navigation link
    const mobileLinks = screen.getAllByRole('link', { name: 'Projects' });
    fireEvent.click(mobileLinks[mobileLinks.length - 1]);

    // Drawer closes
    expect(screen.queryByRole('region', { name: /Mobile Navigation Drawer/i })).not.toBeInTheDocument();
  });

  // 4. Hero loads dynamic profile
  it('4. should render hero section with dynamic name, verified experience summary, and availability', () => {
    render(
      <MemoryRouter>
        <Hero
          profile={{
            ...INITIAL_PORTFOLIO_FIXTURE.profile,
            fullName: 'Ravi Dasari Dynamic',
            availabilityStatus: 'Open to Worldwide Opportunities',
          }}
          resume={INITIAL_PORTFOLIO_FIXTURE.resume}
        />
      </MemoryRouter>
    );

    expect(screen.getByText('Open to Worldwide Opportunities')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(screen.getByText(/Building Reliable/i)).toBeInTheDocument();
    expect(screen.getByText(/6.6 years of IT experience/i)).toBeInTheDocument();
  });

  // 5. Profile photo fallback works
  it('5. should render executive SVG monogram fallback when profile avatar is null or fails', () => {
    render(
      <MemoryRouter>
        <Hero
          profile={{
            ...INITIAL_PORTFOLIO_FIXTURE.profile,
            avatar: null,
          }}
          resume={INITIAL_PORTFOLIO_FIXTURE.resume}
        />
      </MemoryRouter>
    );

    // Monogram initials RD
    expect(screen.getAllByText('RD').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Verified Credentials/i)).toBeInTheDocument();
  });

  // 6. Resume CTA uses published PDF
  it('6. should wire Resume CTA to published PDF download endpoint when active', () => {
    render(
      <MemoryRouter>
        <Hero
          profile={INITIAL_PORTFOLIO_FIXTURE.profile}
          resume={{
            ...INITIAL_PORTFOLIO_FIXTURE.resume,
            activeResume: {
              key: 'resumes/ravi-resume.pdf',
              url: '/api/public/resume/download',
              filename: 'Ravi_Dasari_Resume.pdf',
              sizeBytes: 102400,
              mimeType: 'application/pdf',
              uploadedAt: '2026-10-31T00:00:00Z',
            },
            published: true,
          }}
        />
      </MemoryRouter>
    );

    const downloadBtn = screen.getByRole('link', { name: /Download Resume/i });
    expect(downloadBtn).toHaveAttribute('href', '/api/public/resume/download');
    expect(downloadBtn).toHaveAttribute('download', 'Ravi_Dasari_Resume.pdf');
  });

  // 7. Skills load from public API
  it('7. should render skills and skill categories from public API dynamically', async () => {
    vi.spyOn(contentService, 'getPortfolioData').mockResolvedValue({
      ...INITIAL_PORTFOLIO_FIXTURE,
      skills: [
        {
          id: 's-k8s',
          name: 'Dynamic Kubernetes Cloud',
          categoryId: 'containers-k8s',
          proficiencyLevel: 'Core Competency',
          iconIdentifier: 'box',
          featured: true,
          order: 1,
          published: true,
          revision: 1,
        },
      ],
    });

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Dynamic Kubernetes Cloud')).toBeInTheDocument();
      expect(screen.getByText(/Core Competency/i)).toBeInTheDocument();
    });
  });

  // 8. Hidden skills are excluded
  it('8. should exclude hidden skills (published: false) from rendering publicly', async () => {
    vi.spyOn(contentService, 'getPortfolioData').mockResolvedValue({
      ...INITIAL_PORTFOLIO_FIXTURE,
      skills: [
        {
          id: 's-hidden',
          name: 'Confidential Internal Skill',
          categoryId: 'cloud-iac',
          proficiencyLevel: 'Core Competency',
          iconIdentifier: 'key',
          featured: false,
          order: 1,
          published: false, // Hidden
          revision: 1,
        },
        {
          id: 's-visible',
          name: 'Terraform IaC Live',
          categoryId: 'cloud-iac',
          proficiencyLevel: 'Core Competency',
          iconIdentifier: 'binary',
          featured: false,
          order: 2,
          published: true,
          revision: 1,
        },
      ],
    });

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Terraform IaC Live')).toBeInTheDocument();
      expect(screen.queryByText('Confidential Internal Skill')).not.toBeInTheDocument();
    });
  });

  // 9. Experience timeline renders
  it('9. should render vertical career timeline with roles, company links, and achievements', async () => {
    vi.spyOn(contentService, 'getPortfolioData').mockResolvedValue({
      ...INITIAL_PORTFOLIO_FIXTURE,
    });

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Capgemini/i)).toBeInTheDocument();
      expect(screen.getByText(/Virtusa/i)).toBeInTheDocument();
      expect(screen.getByText(/Independent Freelance Consulting/i)).toBeInTheDocument();
      expect(screen.queryByText(/Current Role/i)).not.toBeInTheDocument();
    });
  });

  // 10. Projects load from public API
  it('10. should load and display published engineering projects dynamically', async () => {
    vi.spyOn(contentService, 'getPortfolioData').mockResolvedValue({
      ...INITIAL_PORTFOLIO_FIXTURE,
    });

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/RoboShop E-Commerce DevSecOps Pipeline & Infrastructure/i)).toBeInTheDocument();
      expect(screen.getByText(/Zynpath — Android Spatial Logic Game/i)).toBeInTheDocument();
      expect(screen.getByText(/Mandi Ledger — Agricultural Accounting & Billing/i)).toBeInTheDocument();
      expect(screen.getByText(/NEXORA — Luxury Interactive E-Commerce Experience/i)).toBeInTheDocument();
    });
  });

  // 11. Featured projects filter correctly
  it('11. should filter projects by category dynamically on the homepage', async () => {
    vi.spyOn(contentService, 'getPortfolioData').mockResolvedValue({
      ...INITIAL_PORTFOLIO_FIXTURE,
    });

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/RoboShop E-Commerce DevSecOps Pipeline & Infrastructure/i)).toBeInTheDocument();
    });

    // Click Android Engineering category filter
    const androidPill = screen.getByRole('button', { name: /^Android Engineering/i });
    fireEvent.click(androidPill);

    // Mandi Ledger should be visible, RoboShop should be hidden
    expect(screen.getByText(/Mandi Ledger — Agricultural Accounting & Billing/i)).toBeInTheDocument();
    expect(screen.queryByText(/RoboShop E-Commerce DevSecOps Pipeline & Infrastructure/i)).not.toBeInTheDocument();
  });

  // 12. Project detail navigation works
  it('12. should render link to dynamic project case-study page with correct slug', async () => {
    vi.spyOn(contentService, 'getPortfolioData').mockResolvedValue({
      ...INITIAL_PORTFOLIO_FIXTURE,
    });

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      const caseStudyLinks = screen.getAllByRole('link', { name: /View Case Study/i });
      expect(caseStudyLinks[0]).toHaveAttribute('href', '/projects/roboshop-devsecops');
    });
  });

  // 13. AI services load dynamically
  it('13. should load and render published AI services and category filters', async () => {
    vi.spyOn(contentService, 'getPortfolioData').mockResolvedValue({
      ...INITIAL_PORTFOLIO_FIXTURE,
    });

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Autonomous AI Agents/i })).toBeInTheDocument();
      expect(screen.getByText(/All Solutions/i)).toBeInTheDocument();
      expect(screen.getByText(/Compliance Note:/i)).toBeInTheDocument();
    });
  });

  // 14. Unpublished services are excluded
  it('14. should exclude draft or unpublished AI services from public showcase', async () => {
    vi.spyOn(contentService, 'getPortfolioData').mockResolvedValue({
      ...INITIAL_PORTFOLIO_FIXTURE,
      aiServices: [
        {
          ...INITIAL_PORTFOLIO_FIXTURE.aiServices[0],
          title: 'Draft Secret AI Agent',
          published: false,
        },
        {
          ...INITIAL_PORTFOLIO_FIXTURE.aiServices[1],
          title: 'Public Active AI Assistant',
          published: true,
        },
      ],
    });

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Public Active AI Assistant')).toBeInTheDocument();
      expect(screen.queryByText('Draft Secret AI Agent')).not.toBeInTheDocument();
    });
  });

  // 15. Education records render
  it('15. should render academic degrees and institutions with graduation details', async () => {
    vi.spyOn(contentService, 'getPortfolioData').mockResolvedValue({
      ...INITIAL_PORTFOLIO_FIXTURE,
    });

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText(/Master of Computer Applications/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/Emeralds Advanced Institute of Management Studies/i)).toBeInTheDocument();
    });
  });

  // 16. Certifications section hidden when no published certifications exist
  it('16. should hide certifications section when none published, and render when published', async () => {
    vi.spyOn(contentService, 'getPortfolioData').mockResolvedValue({
      ...INITIAL_PORTFOLIO_FIXTURE,
    });

    const { container, unmount } = render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(container.querySelector('#certifications')).not.toBeInTheDocument();
      expect(screen.queryByText(/Enterprise Certifications/i)).not.toBeInTheDocument();
    });

    unmount();

    // When published certifications exist, verify section renders
    vi.spyOn(contentService, 'getPortfolioData').mockResolvedValue({
      ...INITIAL_PORTFOLIO_FIXTURE,
      certifications: [
        {
          id: 'cert-pub',
          title: 'Verified Cloud Architect Credential',
          issuer: 'Cloud Standards Body',
          issueDate: '2025-01',
          verificationStatus: 'VERIFIED',
          credentialUrl: 'https://example.com/verify',
          order: 1,
          published: true,
          revision: 1,
        },
      ],
    });

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Verified Cloud Architect Credential/i)).toBeInTheDocument();
      expect(screen.getByText(/Cloud Standards Body/i)).toBeInTheDocument();
    });
  });

  // 17. Contact links work
  it('17. should wire contact section with verified email, GitHub, and LinkedIn links', async () => {
    vi.spyOn(contentService, 'getPortfolioData').mockResolvedValue({
      ...INITIAL_PORTFOLIO_FIXTURE,
    });

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      const emailLinks = screen.getAllByRole('link', { name: /dasariravid145@gmail.com/i });
      expect(emailLinks[0]).toHaveAttribute('href', 'mailto:dasariravid145@gmail.com');

      const linkedInLink = screen.getByRole('link', { name: /View Ravi Dasari LinkedIn Profile/i });
      expect(linkedInLink).toHaveAttribute('href', 'https://linkedin.com/in/ravid145');

      const githubLink = screen.getByRole('link', { name: /View Ravi Dasari GitHub Profile/i });
      expect(githubLink).toHaveAttribute('href', 'https://github.com/dasariravi145');
    });
  });

  // 18. Footer links work
  it('18. should render footer with personal tagline, copyright year, and quick navigation', () => {
    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>
    );

    const currentYear = new Date().getFullYear().toString();
    expect(screen.getByText(new RegExp(currentYear))).toBeInTheDocument();
    expect(screen.getByText(/Ravi Dasari\. Personal Portfolio/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Ravi Dasari GitHub Profile/i })).toHaveAttribute(
      'href',
      'https://github.com/dasariravi145'
    );
  });

  // 19. Empty states render correctly
  it('19. should render accessible empty states when category filters yield no results', async () => {
    vi.spyOn(contentService, 'getPortfolioData').mockResolvedValue({
      ...INITIAL_PORTFOLIO_FIXTURE,
      skills: [],
    });

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/No skills available/i)).toBeInTheDocument();
    });
  });

  // 20. API errors do not crash pages
  it('20. should render ErrorState component with retry action when API call fails', async () => {
    const spy = vi.spyOn(contentService, 'getPortfolioData').mockRejectedValueOnce(
      new Error('Cloudflare edge worker unavailable')
    );

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Portfolio Data Unavailable/i)).toBeInTheDocument();
      expect(screen.getByText(/Cloudflare edge worker unavailable/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Retry/i })).toBeInTheDocument();
    });

    spy.mockResolvedValueOnce({ ...INITIAL_PORTFOLIO_FIXTURE });
    fireEvent.click(screen.getByRole('button', { name: /Retry/i }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    });
  });

  // 21. Mobile layout has no overflow
  it('21. should contain layout constraints preventing mobile horizontal overflow', async () => {
    vi.spyOn(contentService, 'getPortfolioData').mockResolvedValue({
      ...INITIAL_PORTFOLIO_FIXTURE,
    });

    const { container } = render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      const heroSection = container.querySelector('#hero');
      expect(heroSection).toHaveClass('overflow-hidden');
    });
  });

  // 22. Keyboard navigation works
  it('22. should close mobile navigation drawer on Escape key press', () => {
    render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>
    );

    const openBtn = screen.getByRole('button', { name: /Open menu/i });
    fireEvent.click(openBtn);
    expect(screen.getByRole('region', { name: /Mobile Navigation Drawer/i })).toBeInTheDocument();

    // Fire Escape keydown
    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });
    expect(screen.queryByRole('region', { name: /Mobile Navigation Drawer/i })).not.toBeInTheDocument();
  });

  // 23. Dynamic content updates without rebuild
  it('23. should dynamically reflect updated CMS content without application rebuild', async () => {
    const mockData1: PortfolioData = {
      ...INITIAL_PORTFOLIO_FIXTURE,
      profile: {
        ...INITIAL_PORTFOLIO_FIXTURE.profile,
        headline: 'Original Cloud Architect',
      },
    };

    const spy = vi.spyOn(contentService, 'getPortfolioData').mockResolvedValue(mockData1);

    const { unmount } = render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Original Cloud Architect')).toBeInTheDocument();
    });
    unmount();

    // Now simulate updated CMS data returned dynamically from API
    const mockData2: PortfolioData = {
      ...INITIAL_PORTFOLIO_FIXTURE,
      profile: {
        ...INITIAL_PORTFOLIO_FIXTURE.profile,
        bioShort: 'Dynamically updated bio reflecting instant R2 persistence without code rebuild.',
      },
    };
    spy.mockResolvedValue(mockData2);

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(
        screen.getByText('Dynamically updated bio reflecting instant R2 persistence without code rebuild.')
      ).toBeInTheDocument();
    });
  });

  // 24. Real direct server-side contact form submission (No mailto or alert)
  it('24. should submit contact form directly to server API with loading and success states', async () => {
    vi.spyOn(contentService, 'getPortfolioData').mockResolvedValue({
      ...INITIAL_PORTFOLIO_FIXTURE,
    });

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        message: 'Your message has been sent successfully.',
        id: 're_mock_test_123',
      }),
    } as any);

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Send an Inbound Inquiry/i })).toBeInTheDocument();
    });

    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    // Fill form fields
    fireEvent.change(screen.getByLabelText(/Your Name/i), { target: { value: 'Tech Recruiter' } });
    fireEvent.change(screen.getByLabelText(/Your Email/i), { target: { value: 'recruiter@enterprise.com' } });
    fireEvent.change(screen.getByLabelText(/Subject \/ Opportunity Type/i), { target: { value: 'DevOps Lead Role' } });
    fireEvent.change(screen.getByLabelText(/Message Details/i), { target: { value: 'We would love to discuss a role.' } });

    // Submit form with Send Message button
    const submitBtn = screen.getByRole('button', { name: /Send Message/i });
    fireEvent.click(submitBtn);

    // Verify API was called with JSON payload
    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        '/api/public/contact',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    // Verify success banner renders
    await waitFor(() => {
      expect(screen.getByText(/Message Delivered Successfully!/i)).toBeInTheDocument();
    });

    // Verify no window.alert was triggered
    expect(alertSpy).not.toHaveBeenCalled();

    fetchSpy.mockRestore();
    alertSpy.mockRestore();
  });

  // 25. No hardcoded production data fallback
  it('25. should render custom API data faithfully without hardcoded overrides', async () => {
    vi.spyOn(contentService, 'getProjects').mockResolvedValue([
      {
        id: 'custom-proj-1',
        slug: 'custom-infrastructure-mesh',
        title: 'Custom Istio Service Mesh Deployment',
        category: 'DevSecOps & Platform Architecture',
        summary: 'Dynamically injected project verifying zero hardcoded fallbacks.',
        detailedOverview: 'Deep dive overview.',
        problemStatement: 'Service communication latency.',
        solutionArchitecture: 'Configured mTLS Istio mesh across Kubernetes clusters.',
        technicalChallenges: 'Certificate rotation automation.',
        techStack: ['Istio', 'Kubernetes', 'mTLS', 'Envoy'],
        deploymentStatus: 'Production Pipeline Automated',
        featured: true,
        published: true,
        displayOrder: 1,
        revision: 1,
        features: ['Automated mTLS configuration', 'Distributed tracing'],
        screenshots: [],
        coverImage: null,
        architectureDiagram: null,
        architectureDiagrams: [],
        githubUrl: null,
        liveDemoUrl: null,
      },
    ]);

    render(
      <MemoryRouter>
        <ProjectsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Custom Istio Service Mesh Deployment')).toBeInTheDocument();
      expect(screen.getByText('Dynamically injected project verifying zero hardcoded fallbacks.')).toBeInTheDocument();
    });
  });
});
