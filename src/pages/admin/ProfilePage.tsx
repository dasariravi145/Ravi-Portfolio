import React, { useEffect, useState } from 'react';
import { adminService } from '../../services/adminService';
import { Profile } from '../../types/portfolio';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { SkeletonLoader } from '../../components/common/SkeletonLoader';
import { RichTextEditor } from '../../components/common/RichTextEditor';
import {
  User,
  Upload,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Camera,
  Save,
  RotateCcw,
} from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [etag, setEtag] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [headline, setHeadline] = useState('');
  const [bioShort, setBioShort] = useState('');
  const [bioLong, setBioLong] = useState('');
  const [location, setLocation] = useState('');
  const [remoteAvailability, setRemoteAvailability] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [availabilityStatus, setAvailabilityStatus] = useState('');
  const [heroHeadline, setHeroHeadline] = useState('');
  const [heroSubtitle, setHeroSubtitle] = useState('');
  const [heroStat1Value, setHeroStat1Value] = useState('');
  const [heroStat1Label, setHeroStat1Label] = useState('');
  const [heroStat2Value, setHeroStat2Value] = useState('');
  const [heroStat2Label, setHeroStat2Label] = useState('');

  const loadProfile = async () => {
    setLoading(true);
    setError(null);
    const res = await adminService.getProfile();
    if (res.success && res.data) {
      setProfile(res.data);
      setEtag(res.etag);
      setFullName(res.data.fullName || '');
      setHeadline(res.data.headline || '');
      setBioShort(res.data.bioShort || '');
      setBioLong(res.data.bioLong || '');
      setLocation(res.data.location || '');
      setRemoteAvailability(res.data.remoteAvailability || '');
      setContactEmail(res.data.contactEmail || '');
      setPhone(res.data.phone || '');
      setAvailabilityStatus(res.data.availabilityStatus || '');
      setHeroHeadline(res.data.heroHeadline || '');
      setHeroSubtitle(res.data.heroSubtitle || '');
      setHeroStat1Value(res.data.heroStat1Value || '4 Years');
      setHeroStat1Label(res.data.heroStat1Label || 'DevOps & Cloud');
      setHeroStat2Value(res.data.heroStat2Value || '2.6 Years');
      setHeroStat2Label(res.data.heroStat2Label || 'Java Backend');
    } else {
      setError(res.error || 'Failed to load profile.');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    if (!fullName.trim() || fullName.trim().length < 2) {
      setFeedback({ type: 'error', message: 'Full name must be at least 2 characters.' });
      return;
    }
    if (!headline.trim() || headline.trim().length < 5) {
      setFeedback({ type: 'error', message: 'Professional headline must be at least 5 characters.' });
      return;
    }
    if (!bioShort.trim() || bioShort.trim().length < 20) {
      setFeedback({ type: 'error', message: 'Short summary must be at least 20 characters.' });
      return;
    }
    if (!contactEmail.trim() || !contactEmail.includes('@')) {
      setFeedback({ type: 'error', message: 'Please provide a valid contact email.' });
      return;
    }

    setSaving(true);
    setFeedback(null);

    const updatedProfile: Profile = {
      ...profile,
      fullName: fullName.trim(),
      headline: headline.trim(),
      bioShort: bioShort.trim(),
      bioLong: bioLong.trim() || profile.bioLong,
      location: location.trim(),
      remoteAvailability: remoteAvailability.trim() || undefined,
      contactEmail: contactEmail.trim(),
      phone: phone.trim() || null,
      availabilityStatus: availabilityStatus.trim(),
      heroHeadline: heroHeadline.trim() || undefined,
      heroSubtitle: heroSubtitle.trim() || undefined,
      heroStat1Value: heroStat1Value.trim() || '4 Years',
      heroStat1Label: heroStat1Label.trim() || 'DevOps & Cloud',
      heroStat2Value: heroStat2Value.trim() || '2.6 Years',
      heroStat2Label: heroStat2Label.trim() || 'Java Backend',
    };

    const res = await adminService.updateProfile(updatedProfile, etag);
    setSaving(false);

    if (res.success && res.data) {
      setProfile(res.data);
      if (res.etag) setEtag(res.etag);
      setFeedback({ type: 'success', message: 'Profile and Hero content saved successfully!' });
    } else if (res.status === 409 || res.error?.includes('modified by another session')) {
      setFeedback({
        type: 'error',
        message: 'Conflict: Profile was modified in another session. Please click "Reload Latest" to fetch recent changes without losing your edits.',
      });
    } else {
      setFeedback({ type: 'error', message: res.error || 'Failed to save profile changes.' });
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPhoto(true);
    setFeedback(null);

    const res = await adminService.uploadProfilePhoto(file);
    setUploadingPhoto(false);

    if (res.success && res.data) {
      setProfile(res.data);
      if (res.etag) setEtag(res.etag);
      setFeedback({ type: 'success', message: 'Profile photo uploaded and updated successfully!' });
    } else {
      setFeedback({ type: 'error', message: res.error || 'Failed to upload photo.' });
    }
    e.target.value = '';
  };

  const handleDeletePhoto = async () => {
    if (!window.confirm('Are you sure you want to remove your profile photo? The fallback monogram will be shown.')) {
      return;
    }

    setUploadingPhoto(true);
    setFeedback(null);

    const res = await adminService.deleteProfilePhoto();
    setUploadingPhoto(false);

    if (res.success && res.data) {
      setProfile(res.data);
      if (res.etag) setEtag(res.etag);
      setFeedback({ type: 'success', message: 'Profile photo removed.' });
    } else {
      setFeedback({ type: 'error', message: res.error || 'Failed to remove photo.' });
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
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-blue-100/80">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <User className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Personal Profile & Hero CMS</h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Manage your personal bio, headline, availability status, hero section banner, and executive portrait.
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

      {/* Profile Photo Card */}
      <Card className="p-6 border-blue-100/80 shadow-xs bg-white">
        <h2 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
          <Camera className="w-4 h-4 text-blue-600" />
          <span>Executive Profile Portrait</span>
        </h2>
        <p className="text-xs text-slate-500 mb-6">
          High-resolution image rendered on the public Hero section. JPEG, PNG, or WebP up to 5MB.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="relative w-32 h-32 rounded-2xl overflow-hidden border-2 border-blue-100 bg-slate-50 flex items-center justify-center shrink-0 shadow-xs">
            {profile?.avatar?.url ? (
              <img
                src={profile.avatar.url}
                alt={profile.fullName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-blue-600">
                <span className="text-2xl font-extrabold tracking-tight">RD</span>
                <span className="text-[10px] text-slate-400 mt-1 uppercase font-semibold">No Image</span>
              </div>
            )}
          </div>

          <div className="space-y-3 text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
              <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors shadow-xs">
                <Upload className="w-4 h-4" />
                <span>{uploadingPhoto ? 'Uploading...' : 'Upload New Portrait'}</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handlePhotoUpload}
                  disabled={uploadingPhoto}
                  className="hidden"
                />
              </label>

              {profile?.avatar?.url && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDeletePhoto}
                  disabled={uploadingPhoto}
                  leftIcon={<Trash2 className="w-4 h-4 text-rose-500" />}
                >
                  Remove Portrait
                </Button>
              )}
            </div>
            <p className="text-[11px] text-slate-400">
              Recommended: Square 1:1 ratio, minimum 600x600 pixels.
            </p>
          </div>
        </div>
      </Card>

      {/* Main Profile & Hero Form */}
      <form onSubmit={handleSave} className="space-y-6">
        {/* Core Personal Details */}
        <Card className="p-6 border-blue-100/80 shadow-xs bg-white space-y-5">
          <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
            <User className="w-4 h-4 text-blue-600" />
            <span>Personal Identification & Positioning</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="fullName" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Full Name *
              </label>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-900 text-sm focus-ring bg-white"
                placeholder="Ravi Dasari"
              />
            </div>

            <div>
              <label htmlFor="headline" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Professional Headline *
              </label>
              <input
                id="headline"
                type="text"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-900 text-sm focus-ring bg-white"
                placeholder="DevOps Engineer"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="contactEmail" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Public Contact Email *
              </label>
              <input
                id="contactEmail"
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-900 text-sm focus-ring bg-white"
                placeholder="dasariravid145@gmail.com"
              />
            </div>

            <div>
              <label htmlFor="location" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Primary Location
              </label>
              <input
                id="location"
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-900 text-sm focus-ring bg-white"
                placeholder="Bengaluru, Karnataka, India"
              />
            </div>

            <div>
              <label htmlFor="remoteAvailability" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Remote Availability
              </label>
              <input
                id="remoteAvailability"
                type="text"
                value={remoteAvailability}
                onChange={(e) => setRemoteAvailability(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-900 text-sm focus-ring bg-white"
                placeholder="Open to Global Remote Opportunities"
              />
            </div>

            <div>
              <label htmlFor="availability" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Availability Status Tag
              </label>
              <input
                id="availability"
                type="text"
                value={availabilityStatus}
                onChange={(e) => setAvailabilityStatus(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-900 text-sm focus-ring bg-white"
                placeholder="Available for Engineering Roles & Consulting"
              />
            </div>
          </div>

          <div>
            <RichTextEditor
              label="Professional Summary (Short Bio)"
              required
              value={bioShort}
              onChange={setBioShort}
              minHeight="100px"
              placeholder="DevOps Engineer with 6.6 years of IT experience (4 years in DevOps, 2.6 years in Java backend)..."
              helperText="Rendered on the Hero banner beneath the headline and inside SEO description tags. Supports visual styling, bold, colors, and lists."
            />
          </div>
        </Card>

        {/* Hero Section Customization */}
        <Card className="p-6 border-blue-100/80 shadow-xs bg-white space-y-5">
          <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span>Hero Banner Customization</span>
          </h2>

          <div>
            <RichTextEditor
              label="Custom Hero Headline (Optional Override)"
              value={heroHeadline}
              onChange={setHeroHeadline}
              minHeight="80px"
              placeholder="Building Reliable Cloud Infrastructure. Making Deployments Simpler."
              helperText="Main H1 heading on the homepage. Use brand colors (Royal Blue, Emerald Teal) and heading styles to highlight key phrases."
            />
          </div>

          <div>
            <RichTextEditor
              label="Custom Hero Subtitle (Optional Override)"
              value={heroSubtitle}
              onChange={setHeroSubtitle}
              minHeight="80px"
              placeholder="Leave empty to use the Short Summary above."
              helperText="Custom paragraph below the H1 heading. Supports rich formatting, links, and text sizing."
            />
          </div>

          {/* Hero Experience Stat Callouts */}
          <div className="pt-2 border-t border-slate-100">
            <span className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
              Hero Experience Metric Badges
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3.5 rounded-xl border border-blue-100 bg-blue-50/30 space-y-2">
                <span className="text-xs font-bold text-blue-700">Metric Badge 1 (Primary)</span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label htmlFor="stat1Value" className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Value
                    </label>
                    <input
                      id="stat1Value"
                      type="text"
                      value={heroStat1Value}
                      onChange={(e) => setHeroStat1Value(e.target.value)}
                      placeholder="4 Years"
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-900 bg-white focus-ring"
                    />
                  </div>
                  <div>
                    <label htmlFor="stat1Label" className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Label
                    </label>
                    <input
                      id="stat1Label"
                      type="text"
                      value={heroStat1Label}
                      onChange={(e) => setHeroStat1Label(e.target.value)}
                      placeholder="DevOps & Cloud"
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-900 bg-white focus-ring"
                    />
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-teal-100 bg-teal-50/30 space-y-2">
                <span className="text-xs font-bold text-teal-700">Metric Badge 2 (Teal)</span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label htmlFor="stat2Value" className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Value
                    </label>
                    <input
                      id="stat2Value"
                      type="text"
                      value={heroStat2Value}
                      onChange={(e) => setHeroStat2Value(e.target.value)}
                      placeholder="2.6 Years"
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-900 bg-white focus-ring"
                    />
                  </div>
                  <div>
                    <label htmlFor="stat2Label" className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Label
                    </label>
                    <input
                      id="stat2Label"
                      type="text"
                      value={heroStat2Label}
                      onChange={(e) => setHeroStat2Label(e.target.value)}
                      placeholder="Java Backend"
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-900 bg-white focus-ring"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Action Controls */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={loadProfile}
            disabled={saving}
            leftIcon={<RotateCcw className="w-4 h-4 text-slate-500" />}
          >
            Reset Changes
          </Button>

          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={saving}
            leftIcon={<Save className="w-4 h-4" />}
          >
            {saving ? 'Saving...' : 'Save Profile & Hero'}
          </Button>
        </div>
      </form>
    </div>
  );
};

