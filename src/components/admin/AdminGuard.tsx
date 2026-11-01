import React, { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import {
  ShieldCheck,
  Fingerprint,
  KeyRound,
  RefreshCw,
  Copy,
  CheckCircle2,
  LifeBuoy,
  Lock,
  ArrowRight,
} from 'lucide-react';
import { startAuthentication, startRegistration, browserSupportsWebAuthn } from '@simplewebauthn/browser';
import { adminService, AdminUser } from '../../services/adminService';
import { SkeletonLoader } from '../common/SkeletonLoader';

export const AdminGuard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [user, setUser] = useState<AdminUser | undefined>();
  const [authError, setAuthError] = useState<string | null>(null);

  // WebAuthn state
  const [enrolled, setEnrolled] = useState<boolean | null>(null);
  const [ownerEmail, setOwnerEmail] = useState('dasariravid145@gmail.com');
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Initial Enrollment Form
  const [enrollmentToken, setEnrollmentToken] = useState('');
  const [passkeyNickname, setPasskeyNickname] = useState('');
  const [newRecoveryCodes, setNewRecoveryCodes] = useState<string[] | null>(null);
  const [copiedCodes, setCopiedCodes] = useState(false);
  const [acknowledgedCodes, setAcknowledgedCodes] = useState(false);

  // Recovery Code Form
  const [showRecoveryForm, setShowRecoveryForm] = useState(false);
  const [recoveryCodeInput, setRecoveryCodeInput] = useState('');

  // Offline / Developer Test Token Panel
  const [showDevPanel, setShowDevPanel] = useState(false);
  const [devTokenInput, setDevTokenInput] = useState('');

  const checkStatusAndAuth = async () => {
    setLoading(true);
    setAuthError(null);
    setActionError(null);

    try {
      // 1. Check existing session
      const authResult = await adminService.checkAuth();
      if (authResult.authenticated && authResult.user) {
        setAuthenticated(true);
        setUser(authResult.user);
        setLoading(false);
        return;
      }

      // 2. Query WebAuthn status to see if owner passkey is enrolled
      const statusRes = await adminService.getAuthStatus();
      setEnrolled(statusRes.enrolled);
      if (statusRes.ownerEmail) {
        setOwnerEmail(statusRes.ownerEmail);
      }
      setAuthenticated(false);
      if (authResult.error) {
        setAuthError(authResult.error);
      }
    } catch (err: any) {
      setAuthError(err.message || 'Failed to verify administrative status.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkStatusAndAuth();
  }, []);

  // 1. Handle Passkey Login Flow
  const handlePasskeyLogin = async () => {
    setActionError(null);
    setSubmitting(true);

    try {
      if (!browserSupportsWebAuthn()) {
        throw new Error('Your browser does not support WebAuthn / Passkeys. Please use a modern browser.');
      }

      const optionsRes = await adminService.getLoginOptions();
      if (!optionsRes.success || !optionsRes.options) {
        throw new Error(optionsRes.error || 'Failed to generate authentication challenge.');
      }

      const assertion = await startAuthentication({ optionsJSON: optionsRes.options });
      const verifyRes = await adminService.verifyLogin(optionsRes.challengeId, assertion);

      if (!verifyRes.success) {
        throw new Error(verifyRes.error || 'Passkey signature verification failed.');
      }

      // Login successful
      await checkStatusAndAuth();
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        setActionError('Passkey authentication was cancelled or timed out.');
      } else {
        setActionError(err.message || 'Passkey sign-in failed.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // 2. Handle Initial Passkey Setup Enrollment Flow
  const handleInitialSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enrollmentToken.trim()) {
      setActionError('Please enter your short-lived ADMIN_ENROLLMENT_TOKEN.');
      return;
    }

    setActionError(null);
    setSubmitting(true);

    try {
      if (!browserSupportsWebAuthn()) {
        throw new Error('Your browser does not support WebAuthn / Passkeys. Please use a modern browser.');
      }

      const optionsRes = await adminService.getSetupOptions(enrollmentToken.trim());
      if (!optionsRes.success || !optionsRes.options) {
        throw new Error(optionsRes.error || 'Setup rejected. Check your enrollment token.');
      }

      const attestation = await startRegistration({ optionsJSON: optionsRes.options });
      const verifyRes = await adminService.verifySetup(
        enrollmentToken.trim(),
        optionsRes.challengeId,
        attestation,
        passkeyNickname.trim() || 'Primary Passkey'
      );

      if (!verifyRes.success) {
        throw new Error(verifyRes.error || 'Passkey enrollment verification failed.');
      }

      // Display recovery codes modal before proceeding into dashboard
      if (verifyRes.recoveryCodes && verifyRes.recoveryCodes.length > 0) {
        setNewRecoveryCodes(verifyRes.recoveryCodes);
      } else {
        await checkStatusAndAuth();
      }
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        setActionError('Passkey enrollment was cancelled or timed out.');
      } else {
        setActionError(err.message || 'Passkey registration failed.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // 3. Handle Emergency Recovery Code Sign-In
  const handleRecoveryLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryCodeInput.trim()) {
      setActionError('Please enter your 16-character recovery code (e.g. RD-XXXX-XXXX-XXXX).');
      return;
    }

    setActionError(null);
    setSubmitting(true);

    try {
      const res = await adminService.recoverWithCode(recoveryCodeInput.trim());
      if (!res.success) {
        throw new Error(res.error || 'Invalid or already consumed recovery code.');
      }

      // Session established
      await checkStatusAndAuth();
    } catch (err: any) {
      setActionError(err.message || 'Recovery failed.');
    } finally {
      setSubmitting(false);
    }
  };

  // 4. Handle Offline / Dev Secret Token Injection
  const handleApplyDevToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!devTokenInput.trim()) return;
    adminService.setDevToken(devTokenInput.trim());
    await checkStatusAndAuth();
  };

  // 5. Copy recovery codes to clipboard
  const handleCopyCodes = () => {
    if (!newRecoveryCodes) return;
    navigator.clipboard.writeText(newRecoveryCodes.join('\n'));
    setCopiedCodes(true);
    setTimeout(() => setCopiedCodes(false), 2500);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FBFF] flex items-center justify-center p-6">
        <div className="w-full max-w-lg space-y-4 rounded-2xl border border-blue-100 bg-white p-8 shadow-sm">
          <div className="flex items-center gap-3">
            <SkeletonLoader className="h-10 w-10 rounded-xl" />
            <div className="space-y-1.5 flex-1">
              <SkeletonLoader className="h-4 w-1/2" />
              <SkeletonLoader className="h-3 w-4/5" />
            </div>
          </div>
          <div className="pt-4 space-y-2">
            <SkeletonLoader className="h-10 w-full rounded-xl" />
            <SkeletonLoader className="h-10 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  // Recovery Codes Modal after initial enrollment
  if (newRecoveryCodes && newRecoveryCodes.length > 0) {
    return (
      <div className="min-h-screen bg-[#F8FBFF] flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-lg rounded-2xl border border-emerald-200 bg-white p-7 sm:p-8 shadow-xl">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200">
            <ShieldCheck className="h-6 w-6 text-emerald-600" />
          </div>

          <h2 className="mt-5 text-lg font-bold text-slate-900 tracking-tight">
            Passkey Enrolled & Emergency Recovery Codes
          </h2>
          <p className="mt-2 text-xs text-slate-600 leading-relaxed">
            Your primary administrative passkey has been securely enrolled for{' '}
            <span className="font-semibold text-slate-900">{ownerEmail}</span>.
          </p>

          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 text-xs text-amber-900 leading-relaxed">
            <div className="font-bold flex items-center gap-1.5">
              <span>⚠️ Critical: Save these 5 recovery codes now</span>
            </div>
            <div className="mt-1 text-[11px] text-amber-800">
              Each code can be used once if you ever lose your device or hardware key. These codes are stored only as cryptographic SHA-256 hashes and will never be displayed again.
            </div>
          </div>

          <div className="mt-4 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4 font-mono text-xs text-slate-800 select-all">
            {newRecoveryCodes.map((code, idx) => (
              <div key={idx} className="flex items-center justify-between py-0.5">
                <span className="text-slate-400 text-[11px]">#{idx + 1}</span>
                <span className="font-semibold tracking-wider">{code}</span>
              </div>
            ))}
          </div>

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={handleCopyCodes}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              {copiedCodes ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span className="text-emerald-700">Copied to Clipboard</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 text-slate-500" />
                  <span>Copy All Codes</span>
                </>
              )}
            </button>
          </div>

          <div className="mt-5 border-t border-slate-100 pt-4">
            <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-700">
              <input
                type="checkbox"
                checked={acknowledgedCodes}
                onChange={(e) => setAcknowledgedCodes(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span>I have securely saved these emergency recovery codes in a safe location.</span>
            </label>

            <button
              type="button"
              disabled={!acknowledgedCodes}
              onClick={async () => {
                setNewRecoveryCodes(null);
                await checkStatusAndAuth();
              }}
              className="mt-4 w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <span>Continue to Admin CMS</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Unauthenticated Gate Screen
  if (!authenticated) {
    return (
      <div
        data-testid="admin-auth-gate"
        className="min-h-screen bg-[#F8FBFF] flex items-center justify-center p-4 sm:p-6"
      >
        <div className="w-full max-w-md rounded-2xl border border-blue-100/90 bg-white p-7 sm:p-8 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 ring-1 ring-blue-100">
              <Fingerprint className="h-6 w-6 text-blue-600" />
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50/60 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700">
              <Lock className="h-3 w-3" />
              <span>FIDO2 / WebAuthn</span>
            </span>
          </div>

          <div className="mt-5">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Cloudflare Access Gate
            </span>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              {enrolled === false ? 'Initial Admin Setup' : 'Admin Passkey Authentication'}
            </h2>
          </div>
          <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
            Restricted exclusively to the verified portfolio owner identity (
            <span className="font-semibold text-slate-800">{ownerEmail}</span>).
          </p>

          {/* Action error alerts */}
          {(actionError || authError) && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50/60 p-3 text-xs text-red-800">
              <div className="font-semibold">Authentication Notice:</div>
              <div>{actionError || authError}</div>
            </div>
          )}

          {/* STATE A: Initial Enrollment Mode (When backend reports enrolled === false) */}
          {enrolled === false && (
            <form onSubmit={handleInitialSetup} className="mt-6 space-y-3.5">
              <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 text-[11px] text-amber-900 leading-relaxed">
                <span className="font-bold">Initial Setup Required:</span> Enter your one-time{' '}
                <code className="font-mono bg-amber-100 px-1 py-0.5 rounded text-amber-950 font-semibold">
                  ADMIN_ENROLLMENT_TOKEN
                </code>{' '}
                to enroll your primary biometric passkey or security key.
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Admin Setup Enrollment Token *
                </label>
                <input
                  type="password"
                  value={enrollmentToken}
                  onChange={(e) => setEnrollmentToken(e.target.value)}
                  placeholder="Enter ADMIN_ENROLLMENT_TOKEN..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Passkey Nickname (Optional)
                </label>
                <input
                  type="text"
                  value={passkeyNickname}
                  onChange={(e) => setPasskeyNickname(e.target.value)}
                  placeholder="e.g. MacBook Touch ID, Windows Hello, YubiKey 5C"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-hidden"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Enrolling Hardware Passkey...</span>
                  </>
                ) : (
                  <>
                    <Fingerprint className="h-4 w-4" />
                    <span>Register Primary Passkey</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* STATE B: Normal Login Mode (When owner passkey is enrolled) */}
          {enrolled !== false && !showRecoveryForm && (
            <div className="mt-6 space-y-3">
              <button
                type="button"
                onClick={handlePasskeyLogin}
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Verifying Passkey Biometrics...</span>
                  </>
                ) : (
                  <>
                    <Fingerprint className="h-4 w-4" />
                    <span>Sign In with Passkey</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setShowRecoveryForm(true)}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <LifeBuoy className="h-3.5 w-3.5 text-slate-500" />
                <span>Use Emergency Recovery Code</span>
              </button>

              <button
                type="button"
                onClick={checkStatusAndAuth}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-500 hover:bg-slate-50 transition-colors"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Refresh Session Status</span>
              </button>
            </div>
          )}

          {/* STATE C: Recovery Code Form */}
          {enrolled !== false && showRecoveryForm && (
            <form onSubmit={handleRecoveryLogin} className="mt-6 space-y-3.5">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-[11px] text-slate-600 leading-relaxed">
                Enter one of your 16-character emergency recovery codes. Each code can be redeemed exactly once.
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Emergency Recovery Code *
                </label>
                <input
                  type="text"
                  value={recoveryCodeInput}
                  onChange={(e) => setRecoveryCodeInput(e.target.value.toUpperCase())}
                  placeholder="RD-XXXX-XXXX-XXXX"
                  className="w-full font-mono uppercase tracking-wider rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-hidden"
                  required
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {submitting ? 'Verifying...' : 'Authenticate with Code'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowRecoveryForm(false)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* Local Developer Test Token Injection (Offline Testing Only) */}
          <div className="mt-6 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={() => setShowDevPanel(!showDevPanel)}
              className="text-[11px] font-semibold text-slate-400 hover:text-blue-600 flex items-center gap-1.5"
            >
              <KeyRound className="h-3 w-3" />
              <span>{showDevPanel ? 'Hide Local Test Token' : 'Local Development / Test Token'}</span>
            </button>

            {showDevPanel && (
              <form onSubmit={handleApplyDevToken} className="mt-3 space-y-2.5">
                <p className="text-[11px] text-slate-500">
                  Enter signed test JWT or dev secret for local offline development verification:
                </p>
                <input
                  type="password"
                  value={devTokenInput}
                  onChange={(e) => setDevTokenInput(e.target.value)}
                  placeholder="Bearer token or signed JWT..."
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-hidden"
                />
                <button
                  type="submit"
                  className="w-full rounded-xl bg-slate-800 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-900"
                >
                  Apply Test Token
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Authenticated state: render child routes
  return <Outlet context={{ user }} />;
};
