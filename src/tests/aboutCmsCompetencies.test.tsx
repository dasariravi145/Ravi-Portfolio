import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { adminService } from '../services/adminService';
import { contentService } from '../services/contentService';
import { AboutPage } from '../pages/admin/AboutPage';
import { HomePage } from '../pages/HomePage';
import {
  Profile,
  PortfolioData,
  DEFAULT_ABOUT_COMPETENCIES,
  DEFAULT_ABOUT_SECONDARY_PARAGRAPH,
} from '../types/portfolio';
import { INITIAL_PORTFOLIO_FIXTURE } from '../fixtures/initialContent';

const MOCK_PROFILE: Profile = {
  ...INITIAL_PORTFOLIO_FIXTURE.profile,
  aboutTitle: 'Bridging Cloud Infrastructure and Security',
  aboutSubtitle: 'Zero-downtime reliability thesis',
  bioLong: 'Seasoned engineering professional with approximately 6.6 years of proven IT expertise spanning 4 years in cloud infrastructure automation and CI/CD pipelines...',
  aboutHighlights: ['Shift-Left Security', 'Kubernetes Orchestration'],
  aboutSecondaryParagraph: DEFAULT_ABOUT_SECONDARY_PARAGRAPH,
  aboutSecondaryParagraphVisible: true,
  aboutCompetenciesTitle: 'Core Competencies',
  aboutCompetenciesVisible: true,
  aboutCompetencies: DEFAULT_ABOUT_COMPETENCIES,
};

describe('About CMS — Secondary Focus Paragraph & Core Competencies (Issues 1, 2, 3)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('1. should load existing About text, default secondary paragraph, highlights, and competencies', async () => {
    vi.spyOn(adminService, 'getProfile').mockResolvedValue({
      success: true,
      data: MOCK_PROFILE,
      etag: 'W/"about-etag-1"',
    });

    render(
      <MemoryRouter>
        <AboutPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue(MOCK_PROFILE.aboutTitle!)).toBeInTheDocument();
      expect(screen.getByDisplayValue(MOCK_PROFILE.aboutCompetenciesTitle!)).toBeInTheDocument();
      expect(screen.getByText('Cloud Infrastructure')).toBeInTheDocument();
      expect(screen.getByText('DevSecOps & CI/CD')).toBeInTheDocument();
      expect(screen.getByText('Shift-Left Security')).toBeInTheDocument();
    });
  });

  it('2. should allow editing the secondary paragraph and preserve current content by default (Issue 1)', async () => {
    vi.spyOn(adminService, 'getProfile').mockResolvedValue({
      success: true,
      data: MOCK_PROFILE,
      etag: 'W/"about-etag-2"',
    });

    const updateSpy = vi.spyOn(adminService, 'updateProfile').mockResolvedValue({
      success: true,
      data: MOCK_PROFILE,
      etag: 'W/"new-about-etag"',
    });

    render(
      <MemoryRouter>
        <AboutPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Secondary Focus Paragraph (Optional)')).toBeInTheDocument();
    });

    // The secondary paragraph should contain the default text
    const secondaryInput = screen.getByDisplayValue(DEFAULT_ABOUT_SECONDARY_PARAGRAPH);
    expect(secondaryInput).toBeInTheDocument();

    // Modify the secondary paragraph
    const updatedSecondary = 'Tailored custom paragraph focusing on Terraform, Kubernetes, and AI orchestration pipelines.';
    fireEvent.change(secondaryInput, { target: { value: updatedSecondary } });

    // Click Save
    const saveBtn = screen.getByRole('button', { name: /Save About Section/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          aboutSecondaryParagraph: updatedSecondary,
          aboutSecondaryParagraphVisible: true,
        }),
        'W/"about-etag-2"'
      );
    });
  });

  it('3. should allow toggling off secondary paragraph visibility (Issue 1)', async () => {
    vi.spyOn(adminService, 'getProfile').mockResolvedValue({
      success: true,
      data: MOCK_PROFILE,
      etag: 'W/"about-etag-3"',
    });

    const updateSpy = vi.spyOn(adminService, 'updateProfile').mockResolvedValue({
      success: true,
      data: MOCK_PROFILE,
      etag: 'W/"new-about-etag"',
    });

    render(
      <MemoryRouter>
        <AboutPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Secondary Focus Paragraph (Optional)')).toBeInTheDocument();
    });

    // Toggle off "Visible on Public Website"
    const visibleCheckbox = screen.getByLabelText(/Visible on Public Website/i);
    expect(visibleCheckbox).toBeChecked();
    fireEvent.click(visibleCheckbox);
    expect(visibleCheckbox).not.toBeChecked();

    // Click Save
    const saveBtn = screen.getByRole('button', { name: /Save About Section/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          aboutSecondaryParagraphVisible: false,
        }),
        'W/"about-etag-3"'
      );
    });
  });

  it('4. should allow adding a new Core Competency category with custom color and description (Issue 2)', async () => {
    vi.spyOn(adminService, 'getProfile').mockResolvedValue({
      success: true,
      data: MOCK_PROFILE,
      etag: 'W/"about-etag-4"',
    });

    const updateSpy = vi.spyOn(adminService, 'updateProfile').mockResolvedValue({
      success: true,
      data: MOCK_PROFILE,
      etag: 'W/"new-about-etag"',
    });

    render(
      <MemoryRouter>
        <AboutPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Core Competencies Card CMS')).toBeInTheDocument();
    });

    // Click "Add Competency Category"
    const addBtn = screen.getByRole('button', { name: /Add Competency Category/i });
    fireEvent.click(addBtn);

    // Modal should be open
    expect(screen.getByText('Add Competency Category', { selector: 'h3 span' })).toBeInTheDocument();

    // Fill in Category Name
    const nameInput = screen.getByPlaceholderText(/e\.g\. Cloud Infrastructure/i);
    fireEvent.change(nameInput, { target: { value: 'Edge Computing & CDN' } });

    // Select color (Emerald)
    const emeraldColorBtn = screen.getByRole('button', { name: 'Emerald' });
    fireEvent.click(emeraldColorBtn);

    // Fill in Description
    const descTextarea = screen.getByPlaceholderText(/AWS, Cloudflare, Linux Systems, Terraform, Helm/i);
    fireEvent.change(descTextarea, { target: { value: 'Cloudflare Workers, Durable Objects, D1, R2, Cache Rules' } });

    // Submit modal
    const submitCategoryBtn = screen.getByRole('button', { name: /Add Category/i });
    fireEvent.click(submitCategoryBtn);

    // Modal should close and new category should appear in the list
    expect(screen.getByText('Edge Computing & CDN')).toBeInTheDocument();

    // Save About Section
    const saveBtn = screen.getByRole('button', { name: /Save About Section/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          aboutCompetencies: expect.arrayContaining([
            expect.objectContaining({
              name: 'Edge Computing & CDN',
              description: 'Cloudflare Workers, Durable Objects, D1, R2, Cache Rules',
              color: 'emerald',
            }),
          ]),
        }),
        'W/"about-etag-4"'
      );
    });
  });

  it('5. should allow reordering categories and deleting a category with confirmation (Issue 2)', async () => {
    vi.spyOn(adminService, 'getProfile').mockResolvedValue({
      success: true,
      data: MOCK_PROFILE,
      etag: 'W/"about-etag-5"',
    });

    const updateSpy = vi.spyOn(adminService, 'updateProfile').mockResolvedValue({
      success: true,
      data: MOCK_PROFILE,
      etag: 'W/"new-about-etag"',
    });

    render(
      <MemoryRouter>
        <AboutPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Cloud Infrastructure')).toBeInTheDocument();
    });

    // Reorder: Move Cloud Infrastructure down
    const moveDownBtns = screen.getAllByTitle('Move Down');
    fireEvent.click(moveDownBtns[0]); // Move Cloud Infrastructure down to index 1

    // Delete "AI Automation"
    const deleteBtns = screen.getAllByTitle('Delete Category');
    const lastDeleteBtn = deleteBtns[deleteBtns.length - 1];
    fireEvent.click(lastDeleteBtn);

    // Delete confirmation modal should open
    expect(screen.getByText(/Are you sure you want to delete/i)).toBeInTheDocument();
    const confirmBtn = screen.getByRole('button', { name: /Confirm Delete/i });
    fireEvent.click(confirmBtn);

    // AI Automation should be removed
    expect(screen.queryByText('AI Automation')).not.toBeInTheDocument();

    // Save Section
    const saveBtn = screen.getByRole('button', { name: /Save About Section/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          aboutCompetencies: expect.not.arrayContaining([
            expect.objectContaining({ name: 'AI Automation' }),
          ]),
        }),
        'W/"about-etag-5"'
      );
    });
  });

  it('6. should render dynamic Core Competencies and Secondary Paragraph on the public HomePage (Issue 1 & 2)', async () => {
    const customPortfolio: PortfolioData = {
      ...INITIAL_PORTFOLIO_FIXTURE,
      profile: {
        ...INITIAL_PORTFOLIO_FIXTURE.profile,
        aboutTitle: 'Specialized Enterprise Cloud Architecture',
        aboutSubtitle: 'Delivering zero-downtime immutable releases at scale',
        aboutSecondaryParagraph: 'This is a verified dynamic secondary focus paragraph rendered through CMS.',
        aboutSecondaryParagraphVisible: true,
        aboutCompetenciesTitle: 'Custom Verified Competencies',
        aboutCompetenciesVisible: true,
        aboutCompetencies: [
          {
            id: 'c1',
            name: 'Cloud Security Mesh',
            description: 'HashiCorp Vault, Falco, SonarQube, Trivy',
            color: 'teal',
            visible: true,
            order: 0,
          },
          {
            id: 'c2',
            name: 'Multi-Region Kubernetes',
            description: 'AWS EKS, ArgoCD, Helm, Crossplane',
            color: 'blue',
            visible: true,
            order: 1,
          },
        ],
      },
    };

    vi.spyOn(contentService, 'getPortfolioData').mockResolvedValue(customPortfolio);

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      // Check customized title and subtitle
      expect(screen.getByText('Specialized Enterprise Cloud Architecture')).toBeInTheDocument();
      expect(screen.getByText('Delivering zero-downtime immutable releases at scale')).toBeInTheDocument();

      // Check dynamic secondary paragraph
      expect(screen.getByText('This is a verified dynamic secondary focus paragraph rendered through CMS.')).toBeInTheDocument();

      // Check dynamic competencies
      expect(screen.getByText('Custom Verified Competencies')).toBeInTheDocument();
      expect(screen.getByText('Cloud Security Mesh:')).toBeInTheDocument();
      expect(screen.getByText('HashiCorp Vault, Falco, SonarQube, Trivy')).toBeInTheDocument();
      expect(screen.getByText('Multi-Region Kubernetes:')).toBeInTheDocument();
    });
  });

  it('7. should hide secondary paragraph on public HomePage when aboutSecondaryParagraphVisible is false (Issue 1)', async () => {
    const customPortfolio: PortfolioData = {
      ...INITIAL_PORTFOLIO_FIXTURE,
      profile: {
        ...INITIAL_PORTFOLIO_FIXTURE.profile,
        aboutSecondaryParagraph: 'Hidden paragraph content that should not render.',
        aboutSecondaryParagraphVisible: false,
      },
    };

    vi.spyOn(contentService, 'getPortfolioData').mockResolvedValue(customPortfolio);

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(INITIAL_PORTFOLIO_FIXTURE.profile.aboutTitle!)).toBeInTheDocument();
    });

    expect(screen.queryByText('Hidden paragraph content that should not render.')).not.toBeInTheDocument();
  });

  it('8. should hide Core Competencies card on public HomePage when aboutCompetenciesVisible is false (Issue 2)', async () => {
    const customPortfolio: PortfolioData = {
      ...INITIAL_PORTFOLIO_FIXTURE,
      profile: {
        ...INITIAL_PORTFOLIO_FIXTURE.profile,
        aboutCompetenciesVisible: false,
      },
    };

    vi.spyOn(contentService, 'getPortfolioData').mockResolvedValue(customPortfolio);

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(INITIAL_PORTFOLIO_FIXTURE.profile.aboutTitle!)).toBeInTheDocument();
    });

    expect(screen.queryByText('Core Competencies')).not.toBeInTheDocument();
  });
});

