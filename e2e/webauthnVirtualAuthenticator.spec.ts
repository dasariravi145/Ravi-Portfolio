import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const SCREENSHOT_DIR = path.resolve('test-evidence', 'screenshots');

test.describe('Real Chromium WebAuthn Virtual Authenticator Acceptance Verification', () => {
  test('Virtual Authenticator: Full Passkey Enrollment, Login, Backup Key & Recovery Flow', async ({ page }) => {
    // 1. Reset test credentials store for clean enrollment run
    let devSecret = process.env.ADMIN_API_SECRET || '';
    try {
      const devVars = fs.readFileSync('.dev.vars', 'utf-8');
      const m = devVars.match(/ADMIN_API_SECRET=["']?([^"'\r\n]+)["']?/);
      if (m) devSecret = m[1];
    } catch {
      // ignore
    }
    if (devSecret) {
      await page.request.post('http://localhost:8787/api/admin/auth/test-reset', {
        headers: { Authorization: `Bearer ${devSecret}` },
      });
    }

    // 2. Initialize Chrome DevTools Protocol (CDP) session for WebAuthn virtual authenticator
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('WebAuthn.enable');

    // Add a virtual CTAP2 authenticator supporting user verification and resident keys
    const virtualAuth = await cdp.send('WebAuthn.addVirtualAuthenticator', {
      options: {
        protocol: 'ctap2',
        transport: 'internal',
        hasResidentKey: true,
        hasUserVerification: true,
        isUserVerified: true,
        automaticPresenceSimulation: true,
      },
    });

    expect(virtualAuth.authenticatorId).toBeTruthy();

    // 3. Navigate to Admin Gate on localhost (WebAuthn requires a valid domain string, not raw IP)
    await page.goto('http://localhost:8787/admin');
    await page.waitForLoadState('networkidle');

    // Verify Admin Guard Gate is visible
    const gate = page.getByTestId('admin-auth-gate');
    await expect(gate).toBeVisible();

    // Check if initial setup or login gate
    const isSetup = await page.getByRole('button', { name: /Register Primary Passkey/i }).isVisible();

    let recoveryCodes: string[] = [];

    if (isSetup) {
      // 3. Initial Owner Passkey Enrollment
      const tokenInput = page.getByPlaceholder(/Enter ADMIN_ENROLLMENT_TOKEN/i);
      await tokenInput.fill('dev-enrollment-token-12345');

      const nameInput = page.getByPlaceholder(/e\.g\. MacBook Touch ID/i);
      await nameInput.fill('Chromium Virtual Authenticator');

      // Click Register - triggers navigator.credentials.create()
      const registerBtn = page.getByRole('button', { name: /Register Primary Passkey/i });
      await registerBtn.click();

      // 4. Verify Recovery Codes Modal Appears
      await expect(page.getByText(/Passkey Enrolled & Emergency Recovery Codes/i)).toBeVisible({ timeout: 10000 });
      await expect(page.getByText(/Critical: Save these 5 recovery codes now/i)).toBeVisible();

      // Capture all 5 recovery codes from modal
      const codeElements = await page.locator('.font-mono.text-xs .font-semibold').allTextContents();
      expect(codeElements.length).toBe(5);
      for (const code of codeElements) {
        expect(code).toMatch(/^RD-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}$/);
      }
      recoveryCodes = codeElements;

      // Capture screenshot of recovery codes modal
      if (!fs.existsSync(SCREENSHOT_DIR)) {
        fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
      }
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, 'webauthn-01-recovery-codes-modal.png'),
        fullPage: false,
      });

      // Check acknowledgment checkbox and continue
      const ackCheckbox = page.getByRole('checkbox');
      await ackCheckbox.check();

      const continueBtn = page.getByRole('button', { name: /Continue to Admin CMS/i });
      await continueBtn.click();
    } else {
      // If already enrolled, sign in with passkey
      const signInBtn = page.getByRole('button', { name: /Sign In with Passkey/i });
      await signInBtn.click();
    }

    // 5. Verify Successful Entrance into Admin CMS Dashboard
    await expect(page.getByRole('heading', { name: /System Dashboard Overview/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/dasariravid145@gmail\.com/i).first()).toBeVisible();

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'webauthn-02-authenticated-dashboard.png'),
      fullPage: false,
    });

    // 6. Navigate to Settings Page to inspect Passkeys & Hardware Security section
    await page.goto('http://localhost:8787/admin/settings');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: /Passkeys & Hardware Security/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('heading', { name: /Enrolled Passkeys/i })).toBeVisible();

    // 7. Register a Second Backup Passkey via Settings UI
    // Add a second virtual authenticator to simulate a separate backup hardware key (YubiKey)
    const backupVirtualAuth = await cdp.send('WebAuthn.addVirtualAuthenticator', {
      options: {
        protocol: 'ctap2',
        transport: 'usb',
        hasResidentKey: true,
        hasUserVerification: true,
        isUserVerified: true,
        automaticPresenceSimulation: true,
      },
    });
    expect(backupVirtualAuth.authenticatorId).toBeTruthy();

    const addBackupBtn = page.getByRole('button', { name: /Add Backup Passkey/i });
    await addBackupBtn.click();

    await expect(page.getByRole('heading', { name: /Register Backup Passkey/i })).toBeVisible();
    const backupNameInput = page.getByPlaceholder(/e\.g\. YubiKey 5 NFC/i);
    await backupNameInput.fill('Secondary Backup Virtual Key');

    const startPromptBtn = page.getByRole('button', { name: /Start Device Prompt/i });
    await startPromptBtn.click();

    // Verify success feedback appears and modal closes
    await expect(page.getByText(/Backup passkey registered successfully/i)).toBeVisible({ timeout: 10000 });

    // Verify 2 passkeys are now enrolled
    await expect(page.getByRole('heading', { name: /Enrolled Passkeys \(2\)/i })).toBeVisible({ timeout: 10000 });

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'webauthn-03-backup-passkey-enrolled.png'),
      fullPage: false,
    });

    // 8. Test Logout and Session Termination
    const logoutBtn = page.getByRole('button', { name: /Sign Out|Logout/i }).first();
    await logoutBtn.click();
    await page.getByRole('button', { name: /Confirm Logout/i }).click();

    // Verify redirection to home page and then navigate to Admin Gate
    await page.goto('http://localhost:8787/admin');
    await page.waitForLoadState('networkidle');

    // Verify redirection back to Admin Guard screen
    await expect(page.getByTestId('admin-auth-gate')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Admin Passkey Authentication/i)).toBeVisible();

    // 9. Test Passkey Login with Virtual Authenticator
    const passkeyLoginBtn = page.getByRole('button', { name: /Sign In with Passkey/i });
    await passkeyLoginBtn.click();

    // Verify successful login back into Dashboard
    await expect(page.getByRole('heading', { name: /System Dashboard Overview/i })).toBeVisible({ timeout: 10000 });

    // 10. Test Emergency Recovery Code Sign-In if recovery codes were captured
    if (recoveryCodes.length > 0) {
      // Logout again
      await page.getByRole('button', { name: /Sign Out|Logout/i }).first().click();
      await page.getByRole('button', { name: /Confirm Logout/i }).click();

      await page.goto('http://localhost:8787/admin');
      await page.waitForLoadState('networkidle');
      await expect(page.getByTestId('admin-auth-gate')).toBeVisible();

      // Click "Use Emergency Recovery Code"
      const useRecoveryBtn = page.getByRole('button', { name: /Use Emergency Recovery Code/i });
      await useRecoveryBtn.click();

      // Fill recovery code
      const codeInput = page.getByPlaceholder(/RD-XXXX-XXXX-XXXX/i);
      await codeInput.fill(recoveryCodes[0]);

      const submitCodeBtn = page.getByRole('button', { name: /Authenticate with Code/i });
      await submitCodeBtn.click();

      // Verify entrance into dashboard via recovery code
      await expect(page.getByRole('heading', { name: /System Dashboard Overview/i })).toBeVisible({ timeout: 10000 });
    }

    // Cleanup CDP session
    await cdp.send('WebAuthn.disable');
    await cdp.detach();
  });
});
