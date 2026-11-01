import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const EVIDENCE_DIR = path.resolve('test-evidence', 'contact-form');

test.describe('Contact Form E2E Server-Side Submission Verification', () => {
  test.beforeAll(() => {
    if (!fs.existsSync(EVIDENCE_DIR)) {
      fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
    }
  });

  test('Submits contact inquiry directly to Worker API and renders success state', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('http://127.0.0.1:8787/#contact', { waitUntil: 'networkidle' });

    // Scroll to contact section
    const contactSection = page.locator('section#contact');
    await expect(contactSection).toBeVisible();

    // Verify form input fields
    const nameInput = page.locator('input#contact-name');
    const emailInput = page.locator('input#contact-email');
    const subjectInput = page.locator('input#contact-subject');
    const messageInput = page.locator('textarea#contact-message');
    const submitBtn = page.locator('section#contact button[type="submit"]');

    await expect(nameInput).toBeVisible();
    await expect(emailInput).toBeVisible();
    await expect(subjectInput).toBeVisible();
    await expect(messageInput).toBeVisible();
    await expect(submitBtn).toHaveText(/Send Message/i);

    // Capture initial form screenshot
    await contactSection.screenshot({
      path: path.join(EVIDENCE_DIR, 'contact-form-initial.png'),
    });

    // Fill form with valid visitor details
    await nameInput.fill('David Miller');
    await emailInput.fill('david.miller@cloudarchitecture.com');
    await subjectInput.fill('Lead Platform Engineer Contract');
    await messageInput.fill(
      'Hello Ravi, we are impressed by your AWS, Terraform, and Kubernetes track record and would like to discuss a 6-month consulting engagement.'
    );

    // Submit form and intercept API request
    const [request, response] = await Promise.all([
      page.waitForRequest((req) => req.url().includes('/api/public/contact') && req.method() === 'POST'),
      page.waitForResponse((res) => res.url().includes('/api/public/contact') && res.status() === 200),
      submitBtn.click(),
    ]);

    expect(request.postDataJSON()).toMatchObject({
      name: 'David Miller',
      email: 'david.miller@cloudarchitecture.com',
      subject: 'Lead Platform Engineer Contract',
      message: expect.stringContaining('consulting engagement'),
    });

    const responseBody = await response.json();
    expect(responseBody.success).toBe(true);

    // Verify success confirmation card renders
    const successCard = page.locator('section#contact .bg-emerald-50');
    await expect(successCard).toBeVisible();
    await expect(successCard.getByText('Message Delivered Successfully!')).toBeVisible();
    await expect(successCard.getByText('dasariravid145@gmail.com')).toBeVisible();
    await expect(successCard.getByText('david.miller@cloudarchitecture.com')).toBeVisible();

    // Capture success state screenshot
    await contactSection.screenshot({
      path: path.join(EVIDENCE_DIR, 'contact-form-success.png'),
    });

    // Test form reset
    const sendAnotherBtn = successCard.getByRole('button', { name: /Send Another Message/i });
    await expect(sendAnotherBtn).toBeVisible();
    await sendAnotherBtn.click();

    // Verify form re-appears empty and ready
    await expect(nameInput).toBeVisible();
    await expect(nameInput).toHaveValue('');
    await expect(emailInput).toHaveValue('');
  });
});

