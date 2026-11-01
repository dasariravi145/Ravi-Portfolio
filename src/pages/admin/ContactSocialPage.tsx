import React, { useEffect, useState } from 'react';
import { adminService } from '../../services/adminService';
import { Profile, SocialLinks } from '../../types/portfolio';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { SkeletonLoader } from '../../components/common/SkeletonLoader';
import {
  Mail,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Github,
  Linkedin,
  Twitter,
  Calendar,
  ExternalLink,
} from 'lucide-react';

export const ContactSocialPage: React.FC = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [etag, setEtag] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form Fields
  const [contactEmail, setContactEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [availabilityStatus, setAvailabilityStatus] = useState('');

  // Social Links
  const [github, setGithub] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [socialEmail, setSocialEmail] = useState('');
  const [twitter, setTwitter] = useState('');
  const [medium, setMedium] = useState('');
  const [calendar, setCalendar] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError(null);
    const res = await adminService.getProfile();
    if (res.success && res.data) {
      setProfile(res.data);
      setEtag(res.etag);
      setContactEmail(res.data.contactEmail || '');
      setPhone(res.data.phone || '');
      setLocation(res.data.location || '');
      setAvailabilityStatus(res.data.availabilityStatus || '');

      const social = res.data.social || ({} as SocialLinks);
      setGithub(social.github || 'https://github.com/dasariravi145');
      setLinkedin(social.linkedin || 'https://linkedin.com/in/ravid145');
      setSocialEmail(social.email || res.data.contactEmail || 'dasariravid145@gmail.com');
      setTwitter(social.twitter || '');
      setMedium(social.medium || '');
      setCalendar(social.calendar || '');
    } else {
      setError(res.error || 'Failed to load contact information.');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    if (!contactEmail.trim() || !contactEmail.includes('@')) {
      setFeedback({ type: 'error', message: 'Please provide a valid primary contact email.' });
      return;
    }

    if (!github.trim().startsWith('http')) {
      setFeedback({ type: 'error', message: 'GitHub URL must start with http:// or https://' });
      return;
    }

    if (!linkedin.trim().startsWith('http')) {
      setFeedback({ type: 'error', message: 'LinkedIn URL must start with http:// or https://' });
      return;
    }

    setSaving(true);
    setFeedback(null);

    const updatedSocial: SocialLinks = {
      github: github.trim(),
      linkedin: linkedin.trim(),
      email: (socialEmail.trim() || contactEmail.trim()),
      twitter: twitter.trim() ? twitter.trim() : undefined,
      medium: medium.trim() ? medium.trim() : undefined,
      calendar: calendar.trim() ? calendar.trim() : undefined,
    };

    const updatedProfile: Profile = {
      ...profile,
      contactEmail: contactEmail.trim(),
      phone: phone.trim() || null,
      location: location.trim(),
      availabilityStatus: availabilityStatus.trim(),
      social: updatedSocial,
    };

    const res = await adminService.updateProfile(updatedProfile, etag);
    setSaving(false);

    if (res.success && res.data) {
      setProfile(res.data);
      if (res.etag) setEtag(res.etag);
      setFeedback({ type: 'success', message: 'Contact details and social links updated successfully!' });
    } else if (res.status === 409 || res.error?.includes('modified by another session')) {
      setFeedback({
        type: 'error',
        message: 'Conflict: Contact and social links were modified in another session. Please reload to sync the latest version.',
      });
    } else {
      setFeedback({ type: 'error', message: res.error || 'Failed to save contact changes.' });
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
              <Mail className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Contact Information & Social Links</h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Configure how recruiters and potential clients connect with you via email, GitHub, LinkedIn, and social profiles.
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
        {/* Contact Coordinates */}
        <Card className="p-6 border-blue-100/80 shadow-xs bg-white space-y-5">
          <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
            <Mail className="w-4 h-4 text-blue-600" />
            <span>Direct Inquiries & Coordinates</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="contactEmail" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Primary Contact Email *
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
              <p className="text-[11px] text-slate-400 mt-1">
                Used in the interactive mail composer and public direct contact cards.
              </p>
            </div>

            <div>
              <label htmlFor="phone" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Phone Number (Optional)
              </label>
              <input
                id="phone"
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-900 text-sm focus-ring bg-white"
                placeholder="+91 ... (Leave blank if private)"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="location" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Geographic Base & Relocation
              </label>
              <input
                id="location"
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-900 text-sm focus-ring bg-white"
                placeholder="Hyderabad, India (Available for Global Remote)"
              />
            </div>

            <div>
              <label htmlFor="availabilityStatus" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Availability Badge Text
              </label>
              <input
                id="availabilityStatus"
                type="text"
                value={availabilityStatus}
                onChange={(e) => setAvailabilityStatus(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-900 text-sm focus-ring bg-white"
                placeholder="Available for Engineering Roles & Consulting"
              />
            </div>
          </div>
        </Card>

        {/* Social Network Profiles */}
        <Card className="p-6 border-blue-100/80 shadow-xs bg-white space-y-5">
          <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
            <Github className="w-4 h-4 text-blue-600" />
            <span>Verified Social Network Profiles</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="github" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Github className="w-3.5 h-3.5 text-slate-700" />
                <span>GitHub Profile URL *</span>
              </label>
              <input
                id="github"
                type="url"
                value={github}
                onChange={(e) => setGithub(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-900 text-sm focus-ring bg-white font-mono text-xs"
                placeholder="https://github.com/dasariravi145"
              />
            </div>

            <div>
              <label htmlFor="linkedin" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Linkedin className="w-3.5 h-3.5 text-blue-600" />
                <span>LinkedIn Profile URL *</span>
              </label>
              <input
                id="linkedin"
                type="url"
                value={linkedin}
                onChange={(e) => setLinkedin(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-900 text-sm focus-ring bg-white font-mono text-xs"
                placeholder="https://linkedin.com/in/ravid145"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="twitter" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Twitter className="w-3.5 h-3.5 text-sky-500" />
                <span>Twitter / X (Optional)</span>
              </label>
              <input
                id="twitter"
                type="url"
                value={twitter}
                onChange={(e) => setTwitter(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-900 text-sm focus-ring bg-white font-mono text-xs"
                placeholder="https://twitter.com/..."
              />
            </div>

            <div>
              <label htmlFor="medium" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
                <ExternalLink className="w-3.5 h-3.5 text-slate-600" />
                <span>Medium / Blog (Optional)</span>
              </label>
              <input
                id="medium"
                type="url"
                value={medium}
                onChange={(e) => setMedium(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-900 text-sm focus-ring bg-white font-mono text-xs"
                placeholder="https://medium.com/@..."
              />
            </div>

            <div>
              <label htmlFor="calendar" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-brand-primary" />
                <span>Meeting Booking URL (Optional)</span>
              </label>
              <input
                id="calendar"
                type="url"
                value={calendar}
                onChange={(e) => setCalendar(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-900 text-sm focus-ring bg-white font-mono text-xs"
                placeholder="https://cal.com/..."
              />
            </div>
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
            {saving ? 'Saving...' : 'Save Contact & Social'}
          </Button>
        </div>
      </form>
    </div>
  );
};
