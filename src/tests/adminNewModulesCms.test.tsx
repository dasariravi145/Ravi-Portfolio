import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { adminService } from '../services/adminService';
import { ProfilePage } from '../pages/admin/ProfilePage';
import { AboutPage } from '../pages/admin/AboutPage';
import { EducationPage } from '../pages/admin/EducationPage';
import { ContactSocialPage } from '../pages/admin/ContactSocialPage';
import { SettingsPage } from '../pages/admin/SettingsPage';
import { MediaLibraryPage } from '../pages/admin/MediaLibraryPage';
import { Profile, Education, SiteSettings, MediaAsset } from '../types/portfolio';

const MOCK_PROFILE: Profile = {
  fullName: 'Ravi Dasari',
  headline: 'DevOps Engineer',
  bioShort: 'DevOps Engineer with 6.6 years of IT experience (4 years in DevOps and 2.6 years in Java backend).',
  bioLong: 'Seasoned engineering professional with approximately 6.6 years of proven IT expertise spanning 4 years in cloud infrastructure automation...',
  location: 'Bengaluru, Karnataka, India',
  remoteAvailability: 'Open to Global Remote Opportunities',
  contactEmail: 'dasariravid145@gmail.com',
  phone: null,
  availabilityStatus: 'Available for Engineering Roles & Consulting',
  social: {
    github: 'https://github.com/dasariravi145',
    linkedin: 'https://linkedin.com/in/ravid145',
    email: 'dasariravid145@gmail.com',
  },
  avatar: null,
  heroHeadline: 'Architecting Resilient Cloud Systems',
  aboutTitle: 'Bridging Cloud Infrastructure and Security',
  aboutSubtitle: 'Zero-downtime reliability thesis',
  aboutHighlights: ['Shift-Left Security', 'Kubernetes Orchestration'],
};

const MOCK_EDUCATION: Education[] = [
  {
    id: 'edu-1',
    degree: 'Master of Computer Applications (MCA)',
    institution: 'Emeralds Advanced Institute of Management Studies',
    fieldOfStudy: 'Computer Science',
    startYear: 2011,
    endYear: 2014,
    startDate: 'January 2011',
    endDate: 'January 2014',
    description: 'Core computer science, distributed algorithms and systems.',
    grade: 'First Class with Distinction',
    order: 1,
    published: true,
    revision: 1,
  },
  {
    id: 'edu-2',
    degree: 'Cloud Architecture Specialization',
    institution: 'Linux Foundation',
    fieldOfStudy: 'Cloud Native Systems',
    startYear: 2021,
    endYear: 2021,
    startDate: '2021',
    endDate: '2021',
    order: 2,
    published: false,
    revision: 1,
  },
];

const MOCK_SETTINGS: SiteSettings = {
  siteTitle: 'Ravi Dasari — DevOps Engineer',
  metaDescription: 'Executive portfolio of Ravi Dasari. DevOps, Cloud Infrastructure, and AI Solutions.',
  contactEmail: 'dasariravid145@gmail.com',
  footerText: '© 2026 Ravi Dasari. All rights reserved. Deployed on Cloudflare Edge.',
  analyticsEnabled: false,
  turnstileSiteKey: '0x4AAAAAAATestKey',
  keywords: ['DevOps', 'Kubernetes', 'Cloudflare'],
  seoAuthor: 'Ravi Dasari',
  ogImage: null,
};

const MOCK_MEDIA: MediaAsset[] = [
  {
    id: 'media/projects/diagram-1.png',
    key: 'media/projects/diagram-1.png',
    url: '/api/public/media/projects/diagram-1.png',
    filename: 'diagram-1.png',
    mimeType: 'image/png',
    sizeBytes: 154200,
    uploadedAt: '2026-10-31T10:00:00Z',
    altText: 'Architecture Diagram',
  },
  {
    id: 'media/resume/cert-doc.pdf',
    key: 'media/resume/cert-doc.pdf',
    url: '/api/public/media/resume/cert-doc.pdf',
    filename: 'cert-doc.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 345000,
    uploadedAt: '2026-10-31T11:00:00Z',
    altText: 'Certification Document',
  },
];

describe('New Admin Modules CMS Verification', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // 1. ProfilePage Tests
  it('1. ProfilePage should load profile data and save modifications', async () => {
    vi.spyOn(adminService, 'getProfile').mockResolvedValue({
      success: true,
      data: MOCK_PROFILE,
      etag: 'W/"mock-profile-etag"',
    });

    const updateSpy = vi.spyOn(adminService, 'updateProfile').mockResolvedValue({
      success: true,
      data: { ...MOCK_PROFILE, fullName: 'Ravi D. Dasari' },
      etag: 'W/"new-etag"',
    });

    render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('Ravi Dasari')).toBeInTheDocument();
      expect(screen.getByDisplayValue(MOCK_PROFILE.headline)).toBeInTheDocument();
      expect(screen.getByDisplayValue(MOCK_PROFILE.heroHeadline!)).toBeInTheDocument();
    });

    // Modify full name
    const nameInput = screen.getByDisplayValue('Ravi Dasari');
    fireEvent.change(nameInput, { target: { value: 'Ravi D. Dasari' } });

    // Click Save
    const saveBtn = screen.getByRole('button', { name: /Save Profile & Hero/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ fullName: 'Ravi D. Dasari' }),
        'W/"mock-profile-etag"'
      );
      expect(screen.getByText(/Profile and Hero content saved successfully/i)).toBeInTheDocument();
    });
  });

  // 2. AboutPage Tests
  it('2. AboutPage should load narrative bio and update highlights', async () => {
    vi.spyOn(adminService, 'getProfile').mockResolvedValue({
      success: true,
      data: MOCK_PROFILE,
      etag: 'W/"mock-about-etag"',
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
      expect(screen.getByDisplayValue(MOCK_PROFILE.aboutTitle!)).toBeInTheDocument();
      expect(screen.getByText('Shift-Left Security')).toBeInTheDocument();
    });

    // Add new highlight
    const newHighlightInput = screen.getByPlaceholderText(/Zero-Trust Cloud Architecture/i);
    fireEvent.change(newHighlightInput, { target: { value: 'Zero-Downtime EKS Deployments' } });
    fireEvent.click(screen.getByRole('button', { name: /Add Highlight/i }));

    expect(screen.getByText('Zero-Downtime EKS Deployments')).toBeInTheDocument();

    // Click Save
    const saveBtn = screen.getByRole('button', { name: /Save About Section/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          aboutHighlights: expect.arrayContaining(['Zero-Downtime EKS Deployments']),
        }),
        'W/"mock-about-etag"'
      );
      expect(screen.getByText(/About section content updated successfully/i)).toBeInTheDocument();
    });
  });

  // 3. EducationPage Tests (CRUD, Publish, Reorder, Delete)
  it('3. EducationPage should render list, add, edit, reorder, and delete records', async () => {
    vi.spyOn(adminService, 'getEducation').mockResolvedValue({
      success: true,
      data: MOCK_EDUCATION,
      etag: 'W/"mock-edu-etag"',
    });

    const createSpy = vi.spyOn(adminService, 'createEducation').mockResolvedValue({
      success: true,
      data: {
        id: 'edu-new',
        degree: 'Master of Science in Distributed Systems',
        institution: 'Tech Institute',
        fieldOfStudy: 'Computer Science',
        startYear: 2022,
        endYear: 2024,
        published: true,
        order: 3,
        revision: 1,
      },
      etag: 'W/"created-etag"',
    });

    const deleteSpy = vi.spyOn(adminService, 'deleteEducation').mockResolvedValue({
      success: true,
    });

    render(
      <MemoryRouter>
        <EducationPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Master of Computer Applications (MCA)')).toBeInTheDocument();
      expect(screen.getByText('Cloud Architecture Specialization')).toBeInTheDocument();
    });

    // Open Add Modal
    fireEvent.click(screen.getByRole('button', { name: /Add Education Record/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Fill form
    fireEvent.change(screen.getByPlaceholderText(/Bachelor of Technology/i), {
      target: { value: 'Master of Science in Distributed Systems' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Osmania University/i), {
      target: { value: 'Tech Institute' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Computer Science & Engineering/i), {
      target: { value: 'Computer Science' },
    });

    // Submit Create
    fireEvent.click(screen.getByRole('button', { name: /Create Record/i }));

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          degree: 'Master of Science in Distributed Systems',
          institution: 'Tech Institute',
        }),
        'W/"mock-edu-etag"'
      );
    });

    // Delete flow: Click trash on second item
    const deleteButtons = screen.getAllByTitle('Delete Record');
    fireEvent.click(deleteButtons[1]);

    // Modal appears
    expect(screen.getByText(/Delete Education Record\?/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Confirm Delete/i }));

    await waitFor(() => {
      expect(deleteSpy).toHaveBeenCalledWith('edu-2', expect.anything());
    });
  });

  // 4. ContactSocialPage Tests
  it('4. ContactSocialPage should load contact and social links and save changes', async () => {
    vi.spyOn(adminService, 'getProfile').mockResolvedValue({
      success: true,
      data: MOCK_PROFILE,
      etag: 'W/"mock-contact-etag"',
    });

    const updateSpy = vi.spyOn(adminService, 'updateProfile').mockResolvedValue({
      success: true,
      data: MOCK_PROFILE,
      etag: 'W/"new-contact-etag"',
    });

    render(
      <MemoryRouter>
        <ContactSocialPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('https://github.com/dasariravi145')).toBeInTheDocument();
      expect(screen.getByDisplayValue('https://linkedin.com/in/ravid145')).toBeInTheDocument();
    });

    // Change twitter link
    const twitterInput = screen.getByPlaceholderText(/https:\/\/twitter\.com/i);
    fireEvent.change(twitterInput, { target: { value: 'https://twitter.com/ravid145' } });

    // Submit
    fireEvent.click(screen.getByRole('button', { name: /Save Contact & Social/i }));

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          social: expect.objectContaining({ twitter: 'https://twitter.com/ravid145' }),
        }),
        'W/"mock-contact-etag"'
      );
      expect(screen.getByText(/Contact details and social links updated successfully/i)).toBeInTheDocument();
    });
  });

  // 5. SettingsPage Tests
  it('5. SettingsPage should load SEO & site settings and handle updates', async () => {
    vi.spyOn(adminService, 'getSettings').mockResolvedValue({
      success: true,
      data: MOCK_SETTINGS,
      etag: 'W/"mock-settings-etag"',
    });

    const updateSpy = vi.spyOn(adminService, 'updateSettings').mockResolvedValue({
      success: true,
      data: { ...MOCK_SETTINGS, siteTitle: 'Updated Portfolio Title' },
      etag: 'W/"new-settings-etag"',
    });

    render(
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue(MOCK_SETTINGS.siteTitle)).toBeInTheDocument();
      expect(screen.getByDisplayValue(MOCK_SETTINGS.turnstileSiteKey!)).toBeInTheDocument();
    });

    // Update site title
    const titleInput = screen.getByDisplayValue(MOCK_SETTINGS.siteTitle);
    fireEvent.change(titleInput, { target: { value: 'Updated Portfolio Title' } });

    // Submit
    fireEvent.click(screen.getByRole('button', { name: /Save Settings & SEO/i }));

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ siteTitle: 'Updated Portfolio Title' }),
        'W/"mock-settings-etag"'
      );
      expect(screen.getByText(/Site settings and SEO metadata saved successfully/i)).toBeInTheDocument();
    });
  });

  // 6. MediaLibraryPage Tests
  it('6. MediaLibraryPage should list assets, copy url, and delete asset', async () => {
    vi.spyOn(adminService, 'getMediaList').mockResolvedValue({
      success: true,
      data: MOCK_MEDIA,
    });

    const deleteSpy = vi.spyOn(adminService, 'deleteMedia').mockResolvedValue({
      success: true,
    });

    // Mock clipboard
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn(),
      },
    });

    render(
      <MemoryRouter>
        <MediaLibraryPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('diagram-1.png')).toBeInTheDocument();
      expect(screen.getByText('cert-doc.pdf')).toBeInTheDocument();
    });

    // Test Copy URL
    const copyButtons = screen.getAllByTitle('Copy Public URL');
    fireEvent.click(copyButtons[0]);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining('/api/public/media/projects/diagram-1.png')
    );

    // Test Delete flow
    const deleteButtons = screen.getAllByLabelText('Delete Asset');
    fireEvent.click(deleteButtons[0]);

    // Modal opens
    expect(screen.getByText(/Delete Media Asset\?/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Confirm Delete/i }));

    await waitFor(() => {
      expect(deleteSpy).toHaveBeenCalledWith('media/projects/diagram-1.png');
    });
  });
});
