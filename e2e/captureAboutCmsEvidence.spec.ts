import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const ARTIFACT_EVIDENCE_DIR = 'C:/Users/ADMIN/.gemini/antigravity/brain/bf778706-df66-44cb-8402-5fa3ebd51b89/evidence/about-cms';

test.describe('Visual Verification Evidence — About CMS & Core Competencies', () => {
  test.beforeAll(() => {
    if (!fs.existsSync(ARTIFACT_EVIDENCE_DIR)) {
      fs.mkdirSync(ARTIFACT_EVIDENCE_DIR, { recursive: true });
    }
  });

  // Mock authenticated session
  const authenticateAdmin = async (page: any) => {
    await page.context().addCookies([
      {
        name: 'portfolio_admin_session',
        value: 'mock-dev-secret-12345',
        domain: 'localhost',
        path: '/',
      },
    ]);
    await page.addInitScript(() => {
      sessionStorage.setItem('admin_test_token', 'mock-dev-secret-12345');
    });
  };

  test('01. Public Homepage: About Section Layout & Core Competencies', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      deviceScaleFactor: 1.0,
    });
    const page = await context.newPage();

    await page.goto('http://localhost:3001/');
    await page.waitForLoadState('networkidle');

    // Scroll to About section
    const aboutSection = page.locator('section#about');
    await expect(aboutSection).toBeVisible();
    await aboutSection.scrollIntoViewIfNeeded();

    // Verify elements
    await expect(page.getByText('Core Competencies')).toBeVisible();
    await expect(page.getByText('Cloud Infrastructure:')).toBeVisible();
    await expect(page.getByText('DevSecOps & CI/CD:')).toBeVisible();

    // Capture screenshot of About section
    await page.screenshot({
      path: path.join(ARTIFACT_EVIDENCE_DIR, '01-public-about-section-desktop.png'),
      fullPage: false,
    });

    // Also capture mobile view (390px)
    await page.setViewportSize({ width: 390, height: 844 });
    await aboutSection.scrollIntoViewIfNeeded();
    await page.screenshot({
      path: path.join(ARTIFACT_EVIDENCE_DIR, '02-public-about-section-mobile-390px.png'),
      fullPage: false,
    });
  });

  test('02. Admin CMS: About Page with Core Competencies & Secondary Paragraph Controls', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 1100 },
      deviceScaleFactor: 1.0,
    });
    const page = await context.newPage();
    await authenticateAdmin(page);

    // Mock /api/admin/auth/me
    await page.route('**/api/admin/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          user: {
            id: 'owner-1',
            email: 'dasariravid145@gmail.com',
            role: 'owner',
            name: 'Ravi Dasari',
          },
        }),
      });
    });

    // Mock /api/admin/profile GET
    await page.route('**/api/admin/profile', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          headers: {
            'ETag': 'W/"test-about-evidence-etag"',
          },
          body: JSON.stringify({
            success: true,
            data: {
              fullName: 'Ravi Dasari',
              headline: 'DevOps Engineer',
              bioShort: 'DevOps Engineer with 6.6 years of IT experience across AWS, Terraform, Docker, Kubernetes, CI/CD pipelines.',
              bioLong: 'DevOps Engineer with 6.6 years of IT experience across cloud infrastructure automation, CI/CD pipelines, and enterprise backend engineering. Approximately 4 years specializing in DevOps and 2.6 years in enterprise Java backend development.',
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
              aboutTitle: 'Bridging Cloud Infrastructure, Security, and Enterprise Software',
              aboutSubtitle: 'Engineering philosophy rooted in zero-downtime reliability, shift-left security automation, and pragmatic modern technologies.',
              aboutHighlights: [
                'Shift-Left DevSecOps Practice',
                'Kubernetes & Cloud Infrastructure',
                'Java & Android Engineering',
                'Autonomous AI Agent Pipelines',
              ],
              aboutSecondaryParagraph: 'My focus centers on eliminating operational friction through Infrastructure as Code (Terraform), robust containerization (Docker, Kubernetes), automated vulnerability scanning (SonarQube, Trivy), and integrating state-of-the-art AI agents to automate business workflows.',
              aboutSecondaryParagraphVisible: true,
              aboutCompetenciesTitle: 'Core Competencies',
              aboutCompetenciesVisible: true,
              aboutCompetencies: [
                {
                  id: 'comp-1',
                  name: 'Cloud Infrastructure',
                  description: 'AWS, Cloudflare, Linux Systems, Terraform, Helm',
                  color: 'blue',
                  visible: true,
                  order: 0,
                },
                {
                  id: 'comp-2',
                  name: 'DevSecOps & CI/CD',
                  description: 'Jenkins, GitHub Actions, SonarQube, Trivy, Vault',
                  color: 'teal',
                  visible: true,
                  order: 1,
                },
                {
                  id: 'comp-3',
                  name: 'Containers',
                  description: 'Docker, Kubernetes (EKS), Zero-Downtime Releases',
                  color: 'indigo',
                  visible: true,
                  order: 2,
                },
                {
                  id: 'comp-4',
                  name: 'Application Dev',
                  description: 'Java, Spring Boot, Kotlin, Android SDK, Room DB',
                  color: 'cyan',
                  visible: true,
                  order: 3,
                },
                {
                  id: 'comp-5',
                  name: 'AI Automation',
                  description: 'LangChain, LLM Agents, Voice Workflows, WebSockets',
                  color: 'amber',
                  visible: true,
                  order: 4,
                },
              ],
            },
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto('http://localhost:3001/admin/about');
    await page.waitForLoadState('networkidle');

    // Verify main landmarks
    await expect(page.getByText('About Section CMS')).toBeVisible();
    await expect(page.getByText('Secondary Focus Paragraph (Optional)')).toBeVisible();
    await expect(page.getByText('Core Competencies Card CMS')).toBeVisible();

    // Capture Full Admin Page Overview
    await page.screenshot({
      path: path.join(ARTIFACT_EVIDENCE_DIR, '03-admin-about-cms-full-controls.png'),
      fullPage: true,
    });

    // Open "Add Competency Category" Modal and capture screenshot
    const addBtn = page.getByRole('button', { name: /Add Competency Category/i });
    await addBtn.click();
    await expect(page.getByRole('heading', { name: /Add Competency Category/i })).toBeVisible();

    await page.screenshot({
      path: path.join(ARTIFACT_EVIDENCE_DIR, '04-admin-add-category-modal.png'),
      fullPage: false,
    });
  });
});

