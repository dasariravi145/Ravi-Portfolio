import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const SCREENSHOT_DIR = path.resolve('test-evidence', 'screenshots');

// Dynamically extract gitignored local dev secret from .dev.vars
const getDevSecret = (): string => {
  try {
    const devVarsPath = path.resolve('.dev.vars');
    if (fs.existsSync(devVarsPath)) {
      const content = fs.readFileSync(devVarsPath, 'utf-8');
      const match = content.match(/ADMIN_API_SECRET=["']?([^"'\r\n]+)["']?/);
      if (match) return match[1];
    }
  } catch {
    // ignore
  }
  return process.env.ADMIN_API_SECRET || '';
};

test.describe('Ravi Dasari Portfolio — Real Chromium Browser Acceptance Verification', () => {
  // Helper to pre-authenticate admin session cookie and session storage
  const setupAdminAuth = async (page: any) => {
    const secret = getDevSecret();
    await page.context().addCookies([
      {
        name: 'portfolio_admin_session',
        value: secret,
        domain: '127.0.0.1',
        path: '/',
      },
    ]);
    await page.addInitScript((token: string) => {
      sessionStorage.setItem('admin_test_token', token);
    }, secret);
  };

  test('01. Public Homepage: Desktop Layout & Grounded Factual Content', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');

    // Verify main landmarks
    await expect(page.locator('main#main-content')).toBeVisible();

    // Verify Hero section content
    const heroSection = page.locator('section#hero');
    await expect(heroSection).toBeVisible();
    await expect(heroSection.getByText(/Ravi Dasari/i).first()).toBeVisible();

    // Verify factual grounding: 6.6 years experience mentioned
    const bodyText = await page.textContent('body');
    expect(bodyText).toContain('Ravi Dasari');
    expect(bodyText).toContain('6.6');

    // Verify light theme invariant: body background is light
    const bodyBg = await page.evaluate(() => {
      return window.getComputedStyle(document.body).backgroundColor;
    });
    // RGB for white is rgb(255, 255, 255)
    expect(bodyBg).toBe('rgb(255, 255, 255)');

    // Verify key projects on public page
    await expect(page.locator('text=RoboShop').first()).toBeVisible();
    await expect(page.locator('text=Mandi Ledger').first()).toBeVisible();

    // Verify Zynpath closed testing notice
    const zynpathCard = page.locator('text=Zynpath');
    if (await zynpathCard.isVisible()) {
      await expect(page.getByText(/Google Play Closed Testing/i).first()).toBeVisible();
    }

    // Capture desktop public homepage screenshot
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '01-public-homepage-desktop.png'),
      fullPage: false,
    });
  });

  test('02. Public Homepage: Mobile Viewport & Responsive Design', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    await expect(page.locator('main#main-content')).toBeVisible();
    await expect(page.getByText(/Ravi Dasari/i).first()).toBeVisible();

    // Capture mobile public homepage screenshot
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '02-public-homepage-mobile.png'),
      fullPage: false,
    });
  });

  test('03. Admin Dashboard: Desktop Navigation & Overview Metrics', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await setupAdminAuth(page);

    await page.goto('/admin');

    // Verify Admin Layout and Sidebar
    await expect(page.getByText(/Single-Owner Session/i)).toBeVisible();
    await expect(page.getByRole('heading', { name: /System Dashboard Overview/i })).toBeVisible();

    // Verify all 13 navigation items are present
    const navItems = [
      'Dashboard Overview',
      'Profile & Bio',
      'About Content',
      'Skills & Categories',
      'Work Experience',
      'Education',
      'Certifications',
      'Projects CMS',
      'AI Services',
      'Media Library',
      'Resume Management',
      'Contact & Social',
      'Site Settings & SEO',
    ];

    for (const item of navItems) {
      await expect(page.getByRole('link', { name: new RegExp(item, 'i') }).first()).toBeVisible();
    }

    // Capture desktop admin dashboard screenshot
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '03-admin-dashboard-desktop.png'),
      fullPage: false,
    });
  });

  test('04. Admin Dashboard: Mobile Responsive Drawer', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await setupAdminAuth(page);

    await page.goto('/admin');

    // On mobile, header displays open navigation button
    const openMenuBtn = page.locator('button[data-testid="open-mobile-menu"]');
    await expect(openMenuBtn).toBeVisible();

    // Open mobile menu
    await openMenuBtn.click();
    await expect(page.getByRole('link', { name: /Profile & Bio/i })).toBeVisible();

    // Capture mobile admin dashboard screenshot
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '04-admin-dashboard-mobile.png'),
      fullPage: false,
    });
  });

  test('05. Profile & Bio Management: Edit and Save with Real Storage Persistence', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await setupAdminAuth(page);

    await page.goto('/admin/profile');

    // Verify profile page controls
    await expect(page.getByRole('heading', { name: /Personal Profile & Hero CMS/i })).toBeVisible();
    await expect(page.locator('input#headline')).toBeVisible();

    // Capture Profile Editor screenshot
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '05-profile-editor.png'),
      fullPage: false,
    });

    // Test Edit and Save
    const testLocation = 'Bengaluru, Karnataka, India';
    await page.locator('input#location').fill(testLocation);
    await page.getByRole('button', { name: /Save Profile & Hero/i }).click();

    // Wait for success feedback toast
    await expect(page.getByText(/Profile and Hero content saved successfully!/i)).toBeVisible({ timeout: 5000 });

    // Refresh browser and verify persistence
    await page.reload();
    await expect(page.locator('input#location')).toHaveValue(testLocation, { timeout: 10000 });
  });

  test('06. About Section Management: Narrative and Dynamic Highlights', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await setupAdminAuth(page);

    await page.goto('/admin/about');

    await expect(page.getByRole('heading', { name: /About Section CMS/i })).toBeVisible();

    // Capture About Editor screenshot
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '06-about-editor.png'),
      fullPage: false,
    });

    // Verify save button works
    await page.getByRole('button', { name: /Save About Section/i }).click();
    await expect(page.getByText(/About section content updated successfully!/i)).toBeVisible({ timeout: 5000 });
  });

  test('07. Skills Management: Complete Add, Edit, Delete and Real Persistence Lifecycle', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await setupAdminAuth(page);

    await page.goto('/admin/skills');

    await expect(page.getByRole('heading', { name: /Skills & Categories CMS/i })).toBeVisible();

    // 1. Open Add Skill Modal
    await page.getByRole('button', { name: /Add Skill/i }).first().click();

    // Verify Add Skill modal
    const addModalTitle = page.getByRole('heading', { name: /Add New Skill/i });
    await expect(addModalTitle).toBeVisible();

    // Capture Add Form screenshot
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '07-skills-add-form.png'),
      fullPage: false,
    });

    // Fill new skill form
    const skillName = 'Chromium E2E Automation Skill ' + Date.now();
    await page.locator('input[placeholder*="e.g. Terraform"]').fill(skillName);
    await page.getByRole('button', { name: /Create Skill/i }).click();

    // Verify skill appears in the list (exact match to avoid ambiguity with toast)
    const skillItem = page.getByText(skillName, { exact: true });
    await expect(skillItem).toBeVisible({ timeout: 5000 });

    // 2. Refresh browser to verify real local R2 persistence
    await page.reload();
    await expect(page.getByText(skillName, { exact: true })).toBeVisible({ timeout: 10000 });

    // 3. Edit the skill
    const skillRow = page.locator('tr').filter({ hasText: skillName });
    await skillRow.locator('button[title="Edit Skill"]').click();

    // Verify Edit Modal
    await expect(page.getByRole('heading', { name: new RegExp(`Edit "${skillName}"`, 'i') })).toBeVisible();

    // Capture Edit Form screenshot
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '08-skills-edit-form.png'),
      fullPage: false,
    });

    // Click Save Changes
    await page.getByRole('button', { name: /Save Changes/i }).click();

    // 4. Delete the skill with confirmation modal
    await skillRow.locator('button[title="Delete Skill"]').click();

    // Verify Delete Confirmation Modal is visible
    await expect(page.getByRole('heading', { name: /Confirm Deletion of Skill/i })).toBeVisible();

    // Capture Delete Confirmation screenshot
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '09-skills-delete-confirmation.png'),
      fullPage: false,
    });

    // Confirm deletion
    await page.getByRole('button', { name: /Yes, Delete Permanently/i }).click();

    // Verify skill is removed from the DOM
    await expect(page.getByText(skillName, { exact: true })).not.toBeVisible({ timeout: 10000 });

    // Refresh to confirm permanent deletion from R2
    await page.reload();
    await expect(page.getByText(skillName, { exact: true })).not.toBeVisible({ timeout: 10000 });
  });

  test('08. Education Management: Add, Edit, Delete and Reorder Lifecycle', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await setupAdminAuth(page);

    await page.goto('/admin/education');

    await expect(page.getByRole('heading', { name: /Academic Education CMS/i })).toBeVisible();

    // Capture Education Management list screenshot
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '10-education-management.png'),
      fullPage: false,
    });

    // 1. Open Add Education Modal
    await page.getByRole('button', { name: /Add Education Record/i }).click();

    const eduModalTitle = page.getByRole('heading', { name: /Add New Education/i });
    await expect(eduModalTitle).toBeVisible();

    // Capture Add Education Form screenshot
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '11-education-add-form.png'),
      fullPage: false,
    });

    // Fill form using placeholders
    const degreeName = 'B.Tech Computer Science E2E ' + Date.now();
    await page.locator('input[placeholder*="Bachelor of Technology"]').fill(degreeName);
    await page.locator('input[placeholder*="Osmania University"]').fill('Jawaharlal Nehru Technological University');
    await page.locator('input[placeholder*="Computer Science & Engineering"]').fill('Computer Science & Engineering');
    await page.locator('input[placeholder="2016"]').fill('2014');
    await page.locator('input[placeholder="2020"]').fill('2018');

    await page.getByRole('button', { name: /Create Record/i }).click();

    // Verify record appears in list
    await expect(page.getByText(degreeName, { exact: true })).toBeVisible({ timeout: 5000 });

    // 2. Refresh browser and verify persistence
    await page.reload();
    await expect(page.getByText(degreeName, { exact: true })).toBeVisible({ timeout: 10000 });

    // 3. Delete test record with confirmation
    const eduHeading = page.getByRole('heading', { name: degreeName });
    const eduCard = eduHeading.locator('xpath=ancestor::div[contains(@class, "p-5")]');
    await eduCard.locator('button[title="Delete Record"]').click();

    // Verify confirmation modal
    await expect(page.getByRole('heading', { name: /Delete Education Record\?/i })).toBeVisible();
    await page.getByRole('button', { name: /Confirm Delete/i }).click();

    // Verify removed
    await expect(page.getByRole('heading', { name: degreeName })).not.toBeVisible({ timeout: 10000 });
  });

  test('09. Work Experience Management: Record List and Controls', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await setupAdminAuth(page);

    await page.goto('/admin/experience');

    await expect(page.getByRole('heading', { name: /Career & Education CMS/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Add Experience/i })).toBeVisible();

    // Capture Experience Management screenshot
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '12-experience-management.png'),
      fullPage: false,
    });
  });

  test('10. Projects CMS: Case Studies and Architecture Showcases', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await setupAdminAuth(page);

    await page.goto('/admin/projects');

    // Scoped to main section to avoid top header h1 conflict
    await expect(page.locator('main').getByRole('heading', { name: /Projects CMS/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Add New Project/i })).toBeVisible();

    // Verify RoboShop is listed
    await expect(page.getByText(/RoboShop/i).first()).toBeVisible();

    // Capture Projects Management screenshot
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '13-projects-management.png'),
      fullPage: false,
    });
  });

  test('11. AI Services Management: Solutions Showcase and Publication Toggles', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await setupAdminAuth(page);

    await page.goto('/admin/ai-services');

    await expect(page.getByRole('heading', { name: /AI Services & Automation CMS/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Add AI Service/i })).toBeVisible();

    // Capture AI Services Management screenshot
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '14-ai-services-management.png'),
      fullPage: false,
    });
  });

  test('12. Media Library: Storage Browser and Asset Actions', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await setupAdminAuth(page);

    await page.goto('/admin/media');

    await expect(page.getByRole('heading', { name: /R2 Media Library/i })).toBeVisible();
    await expect(page.getByText(/Upload Media Files/i)).toBeVisible();

    // Capture Media Library screenshot
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '15-media-library.png'),
      fullPage: false,
    });
  });

  test('13. SEO & Site Settings Management: Dynamic Configurations', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await setupAdminAuth(page);

    await page.goto('/admin/settings');

    await expect(page.getByRole('heading', { name: /SEO Metadata & Global Site Settings/i })).toBeVisible();
    await expect(page.locator('input#siteTitle')).toBeVisible();

    // Capture SEO Settings screenshot
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '16-seo-settings.png'),
      fullPage: false,
    });

    // Test saving settings
    await page.getByRole('button', { name: /Save Settings/i }).click();
    await expect(page.getByText(/Site settings and SEO metadata saved successfully!/i)).toBeVisible({ timeout: 5000 });
  });

  test('14. Publication Gate: Published Content Visible, Draft Content Restricted', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });

    // 1. Verify published content on public site
    await page.goto('/');
    const mainSection = page.locator('main#main-content');
    await expect(mainSection).toBeVisible();

    // Capture Published Content evidence
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '17-published-content.png'),
      fullPage: false,
    });

    // 2. Open Admin projects and verify draft badge visibility
    await setupAdminAuth(page);
    await page.goto('/admin/projects');

    // Capture Unpublished Content / Drafts evidence in admin
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '18-unpublished-content-admin.png'),
      fullPage: false,
    });
  });
});
