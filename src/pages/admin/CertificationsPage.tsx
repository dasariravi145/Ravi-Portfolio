import React, { useEffect, useState, useRef } from 'react';
import { adminService } from '../../services/adminService';
import { Certification, VerificationStatus } from '../../types/portfolio';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { VerificationBadge } from '../../components/common/Badge';
import { SkeletonLoader } from '../../components/common/SkeletonLoader';
import { EmptyState } from '../../components/common/EmptyState';
import { RichTextEditor } from '../../components/common/RichTextEditor';
import {
  Award,
  Plus,
  Search,
  ArrowUp,
  ArrowDown,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Calendar,
  Upload,
  X,
} from 'lucide-react';

// Safe fallback badge icon component (completely eliminates raw innerHTML)
const AdminBadgeImage: React.FC<{ url?: string; title: string }> = ({ url, title }) => {
  const [error, setError] = React.useState(false);

  if (!url || error) {
    return (
      <div className="w-12 h-12 rounded-xl bg-brand-primary/10 border border-brand-primary/20 text-brand-primary shrink-0 flex items-center justify-center">
        <Award className="w-6 h-6" />
      </div>
    );
  }

  return (
    <div className="w-12 h-12 rounded-xl border border-slate-200 bg-white overflow-hidden p-1 shrink-0 flex items-center justify-center">
      <img
        src={url}
        alt={title}
        width={48}
        height={48}
        loading="lazy"
        decoding="async"
        className="w-full h-full object-contain"
        onError={() => setError(true)}
      />
    </div>
  );
};

export const CertificationsPage: React.FC = () => {
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [etag, setEtag] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | VerificationStatus>('all');
  const [visibilityFilter, setVisibilityFilter] = useState<'all' | 'published' | 'hidden'>('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCert, setEditingCert] = useState<Certification | null>(null);
  const [formData, setFormData] = useState<{
    title: string;
    issuer: string;
    issueDate: string;
    expiryDate: string;
    credentialId: string;
    credentialUrl: string;
    badgeUrl: string;
    description: string;
    verificationStatus: VerificationStatus;
    published: boolean;
  }>({
    title: '',
    issuer: '',
    issueDate: '',
    expiryDate: '',
    credentialId: '',
    credentialUrl: '',
    badgeUrl: '',
    description: '',
    verificationStatus: 'NOT PROVIDED',
    published: true,
  });
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [uploadingBadge, setUploadingBadge] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Deletion Confirmation State
  const [certToDelete, setCertToDelete] = useState<Certification | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    const res = await adminService.getCertifications();
    if (res.success && res.data) {
      setCertifications(res.data);
      setEtag(res.etag);
    } else {
      setError(res.error || 'Failed to load certifications');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenModal = (cert?: Certification) => {
    setModalError(null);
    if (cert) {
      setEditingCert(cert);
      setFormData({
        title: cert.title,
        issuer: cert.issuer,
        issueDate: cert.issueDate || '',
        expiryDate: cert.expiryDate || '',
        credentialId: cert.credentialId || '',
        credentialUrl: cert.credentialUrl || '',
        badgeUrl: cert.badgeImage?.url || '',
        description: cert.description || '',
        verificationStatus: cert.verificationStatus || 'NOT PROVIDED',
        published: cert.published !== false,
      });
    } else {
      setEditingCert(null);
      setFormData({
        title: '',
        issuer: '',
        issueDate: '',
        expiryDate: '',
        credentialId: '',
        credentialUrl: '',
        badgeUrl: '',
        description: '',
        verificationStatus: 'NOT PROVIDED',
        published: true,
      });
    }
    setIsModalOpen(true);
  };

  const handleBadgeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingBadge(true);
    setModalError(null);

    const res = await adminService.uploadMedia(file);

    setUploadingBadge(false);

    if (res.success && res.data) {
      setFormData((prev) => ({
        ...prev,
        badgeUrl: res.data!.url,
      }));
    } else {
      setModalError(res.error || 'Badge image upload failed');
    }
  };

  const handleSaveCert = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    if (!formData.title.trim() || formData.title.trim().length < 2) {
      setModalError('Certification title must be at least 2 characters.');
      return;
    }
    if (!formData.issuer.trim() || formData.issuer.trim().length < 2) {
      setModalError('Issuing organization must be at least 2 characters.');
      return;
    }
    if (formData.credentialUrl.trim() && !/^https?:\/\//i.test(formData.credentialUrl.trim())) {
      setModalError('Credential URL must be a valid HTTP or HTTPS URL.');
      return;
    }

    setSaving(true);

    const payload = {
      title: formData.title.trim(),
      issuer: formData.issuer.trim(),
      issueDate: formData.issueDate.trim() || null,
      expiryDate: formData.expiryDate.trim() || null,
      credentialId: formData.credentialId.trim() || undefined,
      credentialUrl: formData.credentialUrl.trim() || null,
      badgeImage: formData.badgeUrl.trim()
        ? {
            key: `cert-badges/${Date.now()}.png`,
            url: formData.badgeUrl.trim(),
            filename: 'badge-image.png',
            mimeType: 'image/png' as const,
            altText: `${formData.title} badge`,
            uploadedAt: new Date().toISOString(),
          }
        : null,
      description: formData.description.trim() || undefined,
      verificationStatus: formData.verificationStatus,
      published: formData.published,
      order: editingCert ? editingCert.order : certifications.length,
      revision: editingCert ? editingCert.revision : 1,
    };

    let res;
    if (editingCert) {
      res = await adminService.updateCertification(editingCert.id, payload, etag);
    } else {
      res = await adminService.createCertification(payload, etag);
    }

    setSaving(false);

    if (res.success && res.data) {
      setIsModalOpen(false);
      setFeedback({
        type: 'success',
        message: `Certification "${res.data.title}" saved successfully.`,
      });
      await loadData();
    } else if (res.error?.includes('modified by another session')) {
      setModalError('Conflict: Certification records were modified in another session. Please reload to sync recent changes.');
    } else {
      setModalError(res.error || 'Failed to save certification record.');
    }
  };

  const handleToggleVisibility = async (cert: Certification) => {
    const updated = {
      ...cert,
      published: !cert.published,
    };
    const res = await adminService.updateCertification(cert.id, updated, etag);
    if (res.success) {
      setFeedback({
        type: 'success',
        message: `Certification visibility changed to ${!cert.published ? 'published' : 'hidden'}.`,
      });
      await loadData();
    } else {
      setFeedback({ type: 'error', message: res.error || 'Failed to update visibility.' });
    }
  };

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= certifications.length) return;

    const newOrder = [...certifications];
    const [moved] = newOrder.splice(index, 1);
    newOrder.splice(targetIndex, 0, moved);

    const orderedIds = newOrder.map((c) => c.id);
    const res = await adminService.reorderCertifications(orderedIds, etag);

    if (res.success && res.data) {
      setCertifications(res.data);
      setFeedback({ type: 'success', message: 'Certifications display order updated.' });
      await loadData();
    } else {
      setFeedback({ type: 'error', message: res.error || 'Failed to reorder certifications.' });
    }
  };

  const handleDeleteConfirm = async () => {
    if (!certToDelete) return;
    setDeleting(true);
    setDeleteError(null);

    const res = await adminService.deleteCertification(certToDelete.id, etag);
    setDeleting(false);

    if (res.success) {
      setCertToDelete(null);
      setFeedback({
        type: 'success',
        message: `Certification "${certToDelete.title}" deleted.`,
      });
      await loadData();
    } else {
      setDeleteError(res.error || 'Failed to delete certification record.');
    }
  };

  const filteredCertifications = certifications.filter((cert) => {
    const matchesSearch =
      cert.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cert.issuer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (cert.credentialId && cert.credentialId.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus =
      statusFilter === 'all' ? true : (cert.verificationStatus || 'NOT PROVIDED') === statusFilter;
    const matchesVisibility =
      visibilityFilter === 'all'
        ? true
        : visibilityFilter === 'published'
        ? cert.published !== false
        : cert.published === false;

    return matchesSearch && matchesStatus && matchesVisibility;
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <SkeletonLoader className="h-8 w-64" />
          <SkeletonLoader className="h-10 w-36" />
        </div>
        <SkeletonLoader className="h-32 rounded-xl" count={3} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-stroke-subtle pb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Certifications & Credentials CMS
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage industry certifications, issuing authorities, digital verification links, and public showcase status.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => handleOpenModal()}
        >
          Add Certification
        </Button>
      </div>

      {/* Feedback Toast */}
      {feedback && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-sm animate-fadeIn ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-slate-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-sm flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-stroke-subtle shadow-xs">
        <div className="relative flex-grow max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by certification title, issuer, or ID..."
            className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-stroke-subtle text-xs text-slate-900 focus-ring bg-slate-50/50"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-2.5 py-1.5 rounded-lg border border-stroke-subtle text-xs text-slate-700 bg-white focus-ring"
          >
            <option value="all">All Verification Statuses</option>
            <option value="VERIFIED">Verified Only</option>
            <option value="UNVERIFIED">Unverified Only</option>
            <option value="NOT PROVIDED">Not Provided Only</option>
          </select>

          <select
            value={visibilityFilter}
            onChange={(e) => setVisibilityFilter(e.target.value as any)}
            className="px-2.5 py-1.5 rounded-lg border border-stroke-subtle text-xs text-slate-700 bg-white focus-ring"
          >
            <option value="all">All Visibility</option>
            <option value="published">Published Only</option>
            <option value="hidden">Hidden Only</option>
          </select>
        </div>
      </div>

      {/* Certifications List */}
      <div className="space-y-4">
        {filteredCertifications.length > 0 ? (
          filteredCertifications.map((cert, idx) => (
            <Card
              key={cert.id}
              className="p-5 border-stroke-subtle hover:border-stroke-ice transition-all"
            >
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                {/* Left: Badge Icon & Information */}
                <div className="flex items-start gap-4 flex-grow">
                  <AdminBadgeImage url={cert.badgeImage?.url} title={cert.title} />

                  <div className="space-y-1.5 flex-grow">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-bold text-slate-900">{cert.title}</h3>
                      <VerificationBadge status={cert.verificationStatus || 'NOT PROVIDED'} size="sm" />
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                          cert.published !== false
                            ? 'bg-blue-50 text-brand-primary border-blue-200'
                            : 'bg-slate-100 text-slate-500 border-slate-200'
                        }`}
                      >
                        {cert.published !== false ? 'Published' : 'Hidden'}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                      <span className="font-semibold text-slate-800">{cert.issuer}</span>
                      {cert.issueDate && (
                        <>
                          <span>•</span>
                          <span className="inline-flex items-center gap-1 text-slate-500">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            Issued: {cert.issueDate}
                            {cert.expiryDate ? ` (Expires: ${cert.expiryDate})` : ''}
                          </span>
                        </>
                      )}
                      {cert.credentialId && (
                        <>
                          <span>•</span>
                          <span className="font-mono text-slate-500 text-[11px]">
                            ID: {cert.credentialId}
                          </span>
                        </>
                      )}
                    </div>

                    {cert.description && (
                      <p className="text-xs text-slate-600 leading-relaxed pt-1">
                        {cert.description}
                      </p>
                    )}

                    {cert.credentialUrl && (
                      <div className="pt-1">
                        <a
                          href={cert.credentialUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-semibold text-brand-primary hover:text-brand-hover"
                        >
                          <span>Verify Digital Credential</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-1 md:self-start shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                  <button
                    type="button"
                    onClick={() => handleMove(idx, 'up')}
                    disabled={idx === 0}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent"
                    title="Move Up"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMove(idx, 'down')}
                    disabled={idx === certifications.length - 1}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent"
                    title="Move Down"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleVisibility(cert)}
                    className={`p-1.5 rounded-lg border ${
                      cert.published !== false
                        ? 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                        : 'border-slate-200 text-slate-400 hover:bg-slate-50'
                    }`}
                    title={cert.published !== false ? 'Hide from public site' : 'Publish to public site'}
                  >
                    {cert.published !== false ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenModal(cert)}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    title="Edit Certification"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setCertToDelete(cert)}
                    className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50"
                    title="Delete Certification"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </Card>
          ))
        ) : (
          <EmptyState
            title="No certifications found"
            description="No credentials match the current filter or search criteria."
          />
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-stroke-subtle shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleSaveCert} className="p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-stroke-subtle pb-4">
                <h2 className="text-lg font-bold text-slate-900">
                  {editingCert ? 'Edit Certification' : 'Add Certification'}
                </h2>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="text-slate-400 hover:text-slate-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {modalError && (
                <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Certification Title *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. AWS Certified Solutions Architect – Associate"
                  className="w-full px-3 py-2 rounded-lg border border-stroke-subtle text-xs text-slate-900 focus-ring"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Issuing Organization *
                </label>
                <input
                  type="text"
                  required
                  value={formData.issuer}
                  onChange={(e) => setFormData({ ...formData, issuer: e.target.value })}
                  placeholder="e.g. Amazon Web Services (AWS)"
                  className="w-full px-3 py-2 rounded-lg border border-stroke-subtle text-xs text-slate-900 focus-ring"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Issue Date
                  </label>
                  <input
                    type="text"
                    value={formData.issueDate}
                    onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
                    placeholder="e.g. 2023-06"
                    className="w-full px-3 py-2 rounded-lg border border-stroke-subtle text-xs text-slate-900 focus-ring"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Expiry Date
                  </label>
                  <input
                    type="text"
                    value={formData.expiryDate}
                    onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                    placeholder="e.g. 2026-06 or None"
                    className="w-full px-3 py-2 rounded-lg border border-stroke-subtle text-xs text-slate-900 focus-ring"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Credential ID
                  </label>
                  <input
                    type="text"
                    value={formData.credentialId}
                    onChange={(e) => setFormData({ ...formData, credentialId: e.target.value })}
                    placeholder="e.g. SAA-12345678"
                    className="w-full px-3 py-2 rounded-lg border border-stroke-subtle text-xs text-slate-900 focus-ring"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Verification Status *
                  </label>
                  <select
                    value={formData.verificationStatus}
                    onChange={(e) =>
                      setFormData({ ...formData, verificationStatus: e.target.value as VerificationStatus })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-stroke-subtle text-xs text-slate-900 focus-ring bg-white"
                  >
                    <option value="NOT PROVIDED">NOT PROVIDED (Default)</option>
                    <option value="VERIFIED">VERIFIED</option>
                    <option value="UNVERIFIED">UNVERIFIED</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Credential Verification URL
                </label>
                <input
                  type="url"
                  value={formData.credentialUrl}
                  onChange={(e) => setFormData({ ...formData, credentialUrl: e.target.value })}
                  placeholder="https://www.credly.com/badges/..."
                  className="w-full px-3 py-2 rounded-lg border border-stroke-subtle text-xs text-slate-900 focus-ring"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Note: Supplying a link does not automatically verify the credential. Set Verification Status explicitly.
                </p>
              </div>

              {/* Badge Image Upload & URL */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Badge Icon / Logo
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={formData.badgeUrl}
                    onChange={(e) => setFormData({ ...formData, badgeUrl: e.target.value })}
                    placeholder="https://... or upload image"
                    className="w-full px-3 py-2 rounded-lg border border-stroke-subtle text-xs text-slate-900 focus-ring"
                  />
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleBadgeUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={uploadingBadge}
                    onClick={() => fileInputRef.current?.click()}
                    leftIcon={<Upload className="w-3.5 h-3.5" />}
                  >
                    {uploadingBadge ? 'Uploading...' : 'Upload'}
                  </Button>
                </div>
              </div>

              <div>
                <RichTextEditor
                  label="Description / Topics Covered"
                  value={formData.description}
                  onChange={(val) => setFormData({ ...formData, description: val })}
                  minHeight="70px"
                  placeholder="Key competencies demonstrated by this credential..."
                  helperText="Summary of topics, skills, and validation criteria for this certification."
                />
              </div>

              {/* Published Toggle */}
              <div className="pt-2 border-t border-stroke-subtle">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.published}
                    onChange={(e) => setFormData({ ...formData, published: e.target.checked })}
                    className="rounded border-slate-300 text-brand-primary focus:ring-brand-primary"
                  />
                  <span className="text-xs font-semibold text-slate-800">
                    Publish this certification to public website
                  </span>
                </label>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-stroke-subtle">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={saving}
                >
                  {saving ? 'Saving...' : editingCert ? 'Update Certification' : 'Create Certification'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Deletion Modal */}
      {certToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-stroke-subtle shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Delete Certification?
                </h3>
                <p className="text-xs text-slate-500">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to permanently delete certification{' '}
              <strong className="text-slate-900">"{certToDelete.title}"</strong> issued by{' '}
              <strong className="text-slate-900">"{certToDelete.issuer}"</strong>?
            </p>

            {deleteError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                {deleteError}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCertToDelete(null)}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleDeleteConfirm}
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Confirm Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default CertificationsPage;
