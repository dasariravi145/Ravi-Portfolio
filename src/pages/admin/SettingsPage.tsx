import React, { useEffect, useState } from 'react';
import { adminService, EnrolledPasskeyInfo } from '../../services/adminService';
import { SiteSettings } from '../../types/portfolio';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { SkeletonLoader } from '../../components/common/SkeletonLoader';
import { RichTextEditor } from '../../components/common/RichTextEditor';
import { startRegistration, browserSupportsWebAuthn } from '@simplewebauthn/browser';
import {
  Settings,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Globe,
  Shield,
  Upload,
  Image,
  Fingerprint,
  Plus,
  Trash2,
  LifeBuoy,
  Copy,
  Lock,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [etag, setEtag] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingOg, setUploadingOg] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form Fields
  const [siteTitle, setSiteTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [footerText, setFooterText] = useState('');
  const [turnstileSiteKey, setTurnstileSiteKey] = useState('');
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false);
  const [keywords, setKeywords] = useState('');
  const [seoAuthor, setSeoAuthor] = useState('');
  const [ogImageUrl, setOgImageUrl] = useState('');

  // Passkey & Hardware Security Management State
  const [passkeys, setPasskeys] = useState<EnrolledPasskeyInfo[]>([]);
  const [loadingPasskeys, setLoadingPasskeys] = useState(false);
  const [addingPasskey, setAddingPasskey] = useState(false);
  const [newPasskeyName, setNewPasskeyName] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [passkeyFeedback, setPasskeyFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [regeneratedCodes, setRegeneratedCodes] = useState<string[] | null>(null);
  const [copiedRegenCodes, setCopiedRegenCodes] = useState(false);

  const loadPasskeys = async () => {
    setLoadingPasskeys(true);
    const res = await adminService.getPasskeys();
    if (res.success && res.passkeys) {
      setPasskeys(res.passkeys);
    }
    setLoadingPasskeys(false);
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    const res = await adminService.getSettings();
    if (res.success && res.data) {
      setSettings(res.data);
      setEtag(res.etag);
      setSiteTitle(res.data.siteTitle || 'Ravi Dasari — DevOps Engineer');
      setMetaDescription(res.data.metaDescription || '');
      setContactEmail(res.data.contactEmail || 'dasariravid145@gmail.com');
      setFooterText(res.data.footerText || '© 2026 Ravi Dasari. All rights reserved. Deployed on Cloudflare Edge.');
      setTurnstileSiteKey(res.data.turnstileSiteKey || '');
      setAnalyticsEnabled(Boolean(res.data.analyticsEnabled));
      setKeywords(Array.isArray(res.data.keywords) ? res.data.keywords.join(', ') : 'DevOps, DevSecOps, Kubernetes, Cloudflare');
      setSeoAuthor(res.data.seoAuthor || 'Ravi Dasari');
      setOgImageUrl(res.data.ogImage?.url || '');
    } else {
      setError(res.error || 'Failed to load site settings.');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    loadPasskeys();
  }, []);

  const handleAddBackupPasskey = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingPasskey(true);
    setPasskeyFeedback(null);

    try {
      if (!browserSupportsWebAuthn()) {
        throw new Error('Your browser does not support WebAuthn / Passkeys.');
      }

      const optionsRes = await adminService.getAddBackupPasskeyOptions();
      if (!optionsRes.success || !optionsRes.options) {
        throw new Error(optionsRes.error || 'Failed to initialize passkey registration.');
      }

      const attestation = await startRegistration({ optionsJSON: optionsRes.options });
      const verifyRes = await adminService.verifyAddBackupPasskey(
        optionsRes.challengeId,
        attestation,
        newPasskeyName.trim() || 'Backup Passkey'
      );

      if (!verifyRes.success) {
        throw new Error(verifyRes.error || 'Backup passkey verification failed.');
      }

      setPasskeyFeedback({ type: 'success', message: 'Backup passkey registered successfully!' });
      setShowAddModal(false);
      setNewPasskeyName('');
      await loadPasskeys();
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        setPasskeyFeedback({ type: 'error', message: 'Passkey registration was cancelled or timed out.' });
      } else {
        setPasskeyFeedback({ type: 'error', message: err.message || 'Failed to register backup passkey.' });
      }
    } finally {
      setAddingPasskey(false);
    }
  };

  const handleRemovePasskey = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to remove the passkey "${name}"?`)) return;

    setPasskeyFeedback(null);
    const res = await adminService.removePasskey(id);
    if (res.success) {
      setPasskeyFeedback({ type: 'success', message: `Passkey "${name}" removed.` });
      await loadPasskeys();
    } else {
      setPasskeyFeedback({ type: 'error', message: res.error || 'Failed to remove passkey.' });
    }
  };

  const handleRegenerateCodes = async () => {
    if (!window.confirm('Regenerating recovery codes will invalidate all existing unused recovery codes immediately. Proceed?')) {
      return;
    }

    setPasskeyFeedback(null);
    const res = await adminService.regenerateRecoveryCodes();
    if (res.success && res.recoveryCodes) {
      setRegeneratedCodes(res.recoveryCodes);
      setPasskeyFeedback({ type: 'success', message: 'New recovery codes generated successfully.' });
    } else {
      setPasskeyFeedback({ type: 'error', message: res.error || 'Failed to regenerate recovery codes.' });
    }
  };

  const handleOgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingOg(true);
    setFeedback(null);
    const res = await adminService.uploadMedia(file);
    setUploadingOg(false);

    if (res.success && res.data) {
      setOgImageUrl(res.data.url);
      setFeedback({ type: 'success', message: 'OpenGraph preview image uploaded.' });
    } else {
      setFeedback({ type: 'error', message: res.error || 'Failed to upload preview image.' });
    }
    e.target.value = '';
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    if (!siteTitle.trim() || siteTitle.trim().length < 5) {
      setFeedback({ type: 'error', message: 'Site title must be at least 5 characters.' });
      return;
    }
    if (!metaDescription.trim() || metaDescription.trim().length < 20) {
      setFeedback({ type: 'error', message: 'Meta description must be at least 20 characters.' });
      return;
    }
    if (!contactEmail.trim() || !contactEmail.includes('@')) {
      setFeedback({ type: 'error', message: 'Please provide a valid contact email.' });
      return;
    }

    setSaving(true);
    setFeedback(null);

    const parsedKeywords = keywords
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean);

    const updatedSettings: SiteSettings = {
      ...settings,
      siteTitle: siteTitle.trim(),
      metaDescription: metaDescription.trim(),
      contactEmail: contactEmail.trim(),
      footerText: footerText.trim(),
      turnstileSiteKey: turnstileSiteKey.trim() || undefined,
      analyticsEnabled,
      keywords: parsedKeywords,
      seoAuthor: seoAuthor.trim() || 'Ravi Dasari',
      ogImage: ogImageUrl
        ? {
            key: ogImageUrl.replace('/api/public/', ''),
            url: ogImageUrl,
            altText: `${siteTitle} OpenGraph Banner`,
          }
        : null,
    };

    const res = await adminService.updateSettings(updatedSettings, etag);
    setSaving(false);

    if (res.success && res.data) {
      setSettings(res.data);
      if (res.etag) setEtag(res.etag);
      setFeedback({ type: 'success', message: 'Site settings and SEO metadata saved successfully!' });
    } else if (res.status === 409 || res.error?.includes('modified by another session')) {
      setFeedback({
        type: 'error',
        message: 'Conflict: Site settings were modified in another session. Please reload to sync the latest version.',
      });
    } else {
      setFeedback({ type: 'error', message: res.error || 'Failed to save site settings.' });
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <SkeletonLoader className="h-10 w-64" />
        <SkeletonLoader className="h-64 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-blue-100/80">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Settings className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">SEO Metadata & Global Site Settings</h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Configure OpenGraph social card tags, global site title, footer disclaimer, and security keys.
          </p>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          role="alert"
          className={`p-4 rounded-xl text-xs font-semibold flex items-center justify-between gap-3 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-slate-600"
          >
            ✕
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Technical SEO Section */}
        <Card className="p-6 border-blue-100/80 shadow-xs bg-white space-y-5">
          <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
            <Globe className="w-4 h-4 text-blue-600" />
            <span>Search Engine Optimization (SEO) & OpenGraph</span>
          </h2>

          <div>
            <label htmlFor="siteTitle" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Global Site Title *
            </label>
            <input
              id="siteTitle"
              type="text"
              value={siteTitle}
              onChange={(e) => setSiteTitle(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-900 text-sm focus-ring bg-white"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Rendered in browser tab title (&lt;title&gt;) and social bookmark previews.
            </p>
          </div>

          <div>
            <label htmlFor="metaDescription" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Global Meta Description *
            </label>
            <textarea
              id="metaDescription"
              rows={3}
              value={metaDescription}
              onChange={(e) => setMetaDescription(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-900 text-sm focus-ring bg-white leading-relaxed"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Recommended: 120–160 characters for optimal Google search snippet visibility.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="keywords" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Meta Keywords (Comma separated)
              </label>
              <input
                id="keywords"
                type="text"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-900 text-sm focus-ring bg-white"
                placeholder="DevOps, DevSecOps, Kubernetes, Terraform, Cloudflare"
              />
            </div>

            <div>
              <label htmlFor="seoAuthor" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Author Tag
              </label>
              <input
                id="seoAuthor"
                type="text"
                value={seoAuthor}
                onChange={(e) => setSeoAuthor(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-900 text-sm focus-ring bg-white"
                placeholder="Ravi Dasari"
              />
            </div>
          </div>

          {/* OpenGraph Image Preview & Upload */}
          <div className="pt-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 flex items-center gap-2">
              <Image className="w-4 h-4 text-blue-600" />
              <span>OpenGraph Social Share Image</span>
            </label>

            <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-xl border border-slate-200 bg-slate-50/50">
              {ogImageUrl ? (
                <div className="w-36 h-20 rounded-lg overflow-hidden border border-slate-300 bg-white shrink-0">
                  <img
                    src={ogImageUrl}
                    alt="Social Card Preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-36 h-20 rounded-lg border-2 border-dashed border-slate-300 bg-white flex flex-col items-center justify-center text-slate-400 shrink-0">
                  <Image className="w-6 h-6" />
                  <span className="text-[10px] mt-1 font-semibold">No Image</span>
                </div>
              )}

              <div className="space-y-2 text-center sm:text-left flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors shadow-xs">
                    <Upload className="w-3.5 h-3.5 text-blue-600" />
                    <span>{uploadingOg ? 'Uploading...' : 'Upload Social Image'}</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={handleOgUpload}
                      disabled={uploadingOg}
                      className="hidden"
                    />
                  </label>
                  {ogImageUrl && (
                    <button
                      type="button"
                      onClick={() => setOgImageUrl('')}
                      className="px-3 py-1.5 rounded-lg text-rose-600 hover:bg-rose-50 text-xs font-semibold transition-colors"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-slate-400">
                  Optimal dimension: 1200x630 pixels. Shared on Twitter, LinkedIn, and messaging previews.
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Global Site & Security Settings */}
        <Card className="p-6 border-blue-100/80 shadow-xs bg-white space-y-5">
          <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
            <Shield className="w-4 h-4 text-blue-600" />
            <span>General Site & Security Settings</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="settingsEmail" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Site Owner Contact Email *
              </label>
              <input
                id="settingsEmail"
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-900 text-sm focus-ring bg-white"
              />
            </div>

            <div>
              <label htmlFor="turnstileKey" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Cloudflare Turnstile Site Key (Optional)
              </label>
              <input
                id="turnstileKey"
                type="text"
                value={turnstileSiteKey}
                onChange={(e) => setTurnstileSiteKey(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-900 text-sm focus-ring bg-white font-mono text-xs"
                placeholder="0x4AAAAAA..."
              />
            </div>
          </div>

          <div>
            <RichTextEditor
              label="Footer Copyright & Disclaimer Notice"
              required
              value={footerText}
              onChange={setFooterText}
              minHeight="70px"
              placeholder="© 2026 Ravi Dasari. All rights reserved. Deployed on Cloudflare Edge."
              helperText="Rendered in the public site footer. Supports rich links, copyright notices, and custom formatting."
            />
          </div>

          <div className="pt-2">
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={analyticsEnabled}
                onChange={(e) => setAnalyticsEnabled(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
              />
              <div>
                <span className="text-xs font-bold text-slate-900 block">
                  Enable Cloudflare Web Analytics
                </span>
                <span className="text-[11px] text-slate-500">
                  Loads lightweight, privacy-preserving Cloudflare beacon without cookies or user tracking.
                </span>
              </div>
            </label>
          </div>
        </Card>

        {/* Action Controls */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={loadData}
            disabled={saving}
            leftIcon={<RotateCcw className="w-4 h-4 text-slate-500" />}
          >
            Reset
          </Button>

          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={saving}
            leftIcon={<Save className="w-4 h-4" />}
          >
            {saving ? 'Saving...' : 'Save Settings & SEO'}
          </Button>
        </div>
      </form>

      {/* Passkey & Hardware Security Management */}
      <Card className="p-6 space-y-6 mt-8">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
              <Fingerprint className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Passkeys & Hardware Security
              </h2>
              <p className="text-xs text-slate-500">
                Manage registered FIDO2 / WebAuthn passkeys and emergency account recovery.
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowAddModal(true)}
            leftIcon={<Plus className="w-3.5 h-3.5 text-blue-600" />}
          >
            Add Backup Passkey
          </Button>
        </div>

        {passkeyFeedback && (
          <div
            className={`p-3.5 rounded-xl text-xs flex items-center gap-2.5 border ${
              passkeyFeedback.type === 'success'
                ? 'bg-emerald-50/80 text-emerald-800 border-emerald-200'
                : 'bg-red-50/80 text-red-800 border-red-200'
            }`}
          >
            {passkeyFeedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{passkeyFeedback.message}</span>
          </div>
        )}

        {/* Passkeys List */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Enrolled Passkeys ({passkeys.length})
          </h3>

          {loadingPasskeys ? (
            <div className="space-y-2">
              <SkeletonLoader className="h-14 w-full rounded-xl" />
            </div>
          ) : passkeys.length === 0 ? (
            <div className="p-4 rounded-xl border border-dashed border-slate-200 text-xs text-slate-500 text-center">
              No passkeys currently loaded.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white overflow-hidden">
              {passkeys.map((pk) => (
                <div key={pk.id} className="p-3.5 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                      <Lock className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                        <span>{pk.name}</span>
                        {pk.backedUp && (
                          <span className="text-[10px] font-medium bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-200">
                            Synced / Cloud Backup
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Added: {new Date(pk.createdAt).toLocaleDateString()}
                        {pk.lastUsedAt && ` • Last active: ${new Date(pk.lastUsedAt).toLocaleDateString()}`}
                      </div>
                    </div>
                  </div>

                  {passkeys.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemovePasskey(pk.id, pk.name)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Remove passkey"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Emergency Recovery Codes Section */}
        <div className="border-t border-slate-100 pt-5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <LifeBuoy className="w-3.5 h-3.5 text-slate-500" />
                <span>Emergency Recovery Codes</span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Single-use emergency codes used to regain admin access if all enrolled passkeys become unavailable.
              </p>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRegenerateCodes}
            >
              Regenerate Codes
            </Button>
          </div>

          {regeneratedCodes && (
            <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/60 space-y-3">
              <div className="text-xs font-bold text-amber-900">
                New Emergency Recovery Codes Generated (Old codes are now invalid):
              </div>
              <div className="space-y-1 font-mono text-xs text-amber-950 bg-white/80 p-3 rounded-lg border border-amber-200 select-all">
                {regeneratedCodes.map((code, idx) => (
                  <div key={idx} className="flex justify-between py-0.5">
                    <span className="text-slate-400 text-[11px]">#{idx + 1}</span>
                    <span className="font-semibold tracking-wider">{code}</span>
                  </div>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(regeneratedCodes.join('\n'));
                  setCopiedRegenCodes(true);
                  setTimeout(() => setCopiedRegenCodes(false), 2500);
                }}
                leftIcon={copiedRegenCodes ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              >
                {copiedRegenCodes ? 'Copied to Clipboard' : 'Copy All Codes'}
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Add Backup Passkey Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                <Fingerprint className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Register Backup Passkey</h3>
                <p className="text-xs text-slate-500">Add a secondary hardware key or mobile device.</p>
              </div>
            </div>

            <form onSubmit={handleAddBackupPasskey} className="space-y-3.5 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Passkey Name / Device Label
                </label>
                <input
                  type="text"
                  value={newPasskeyName}
                  onChange={(e) => setNewPasskeyName(e.target.value)}
                  placeholder="e.g. YubiKey 5 NFC, Pixel Phone, Work Laptop"
                  required
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus-ring"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={addingPasskey}
                >
                  {addingPasskey ? 'Prompting Device...' : 'Start Device Prompt'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
