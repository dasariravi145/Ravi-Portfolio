import React, { useEffect, useState, useRef } from 'react';
import {
  FileText,
  Upload,
  Download,
  Trash2,
  Eye,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Globe,
  Lock,
  History,
  Save,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { adminService } from '../../services/adminService';
import { Resume } from '../../types/portfolio';
import { SkeletonLoader } from '../../components/common/SkeletonLoader';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { RichTextEditor } from '../../components/common/RichTextEditor';

export const ResumePage: React.FC = () => {
  const [resume, setResume] = useState<Resume | null>(null);
  const [etag, setEtag] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [headline, setHeadline] = useState('');
  const [description, setDescription] = useState('');
  const [savingText, setSavingText] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchResume = async () => {
    setLoading(true);
    const res = await adminService.getResume();
    if (res.success && res.data) {
      setResume(res.data);
      setEtag(res.etag);
      setHeadline(res.data.headline || 'Ravi Dasari — Professional Resume');
      setDescription(
        res.data.description ||
          'Comprehensive overview of verified DevSecOps engineering roles, Kubernetes infrastructure projects, Android applications, and technical certifications.'
      );
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchResume();
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStatusMessage(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setStatusMessage({
        type: 'error',
        text: `PDF exceeds maximum limit of 10 MB (${(file.size / (1024 * 1024)).toFixed(2)} MB).`,
      });
      return;
    }

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setStatusMessage({
        type: 'error',
        text: 'Invalid file format. Resumes must strictly be in PDF (.pdf) format.',
      });
      return;
    }

    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    setStatusMessage(null);

    const res = await adminService.uploadResume(selectedFile);
    if (res.success && res.data) {
      setResume(res.data);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setStatusMessage({
        type: 'success',
        text: 'Executive resume successfully uploaded to Cloudflare R2 and published.',
      });
    } else {
      setStatusMessage({ type: 'error', text: res.error || 'Failed to upload resume.' });
    }
    setUploading(false);
  };

  const handleSaveText = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resume) return;
    setSavingText(true);
    setStatusMessage(null);
    const updated: Resume = {
      ...resume,
      headline: headline.trim(),
      description: description.trim(),
    };
    const res = await adminService.updateResume(updated, etag);
    if (res.success && res.data) {
      setResume(res.data);
      if (res.etag) setEtag(res.etag);
      setStatusMessage({
        type: 'success',
        text: 'Resume section headline and narrative saved successfully.',
      });
    } else {
      setStatusMessage({
        type: 'error',
        text: res.error || 'Failed to update resume narrative.',
      });
    }
    setSavingText(false);
  };

  const handleTogglePublish = async () => {
    if (!resume?.activeResume) return;
    setUploading(true);
    setStatusMessage(null);

    const nextPublished = !(resume.published ?? true);
    const res = await adminService.publishResume(nextPublished);
    if (res.success && res.data) {
      setResume(res.data);
      setStatusMessage({
        type: 'success',
        text: nextPublished
          ? 'Resume is now PUBLISHED and available for public download.'
          : 'Resume is now UNPUBLISHED. Public download endpoints will return HTTP 404.',
      });
    } else {
      setStatusMessage({ type: 'error', text: res.error || 'Failed to update publication status.' });
    }
    setUploading(false);
  };

  const handleDelete = async () => {
    setUploading(true);
    setShowDeleteModal(false);
    setStatusMessage(null);

    const res = await adminService.deleteResume();
    if (res.success && res.data) {
      setResume(res.data);
      setStatusMessage({
        type: 'success',
        text: 'Resume deleted from R2 storage. Public download links have been revoked.',
      });
    } else {
      setStatusMessage({ type: 'error', text: res.error || 'Failed to delete resume.' });
    }
    setUploading(false);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <SkeletonLoader className="h-8 w-64 rounded-md" />
        <SkeletonLoader className="h-64 rounded-2xl" />
      </div>
    );
  }

  const activeDoc = resume?.activeResume;
  const isPublished = resume?.published ?? false;

  return (
    <div data-testid="resume-manager" className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900">
          Executive Resume & Document Management
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Manage the verified executive PDF resume served to recruiters and prospective clients.
          Stores active and archived revisions in Cloudflare R2 Standard storage.
        </p>
      </div>

      {/* Status Notifications */}
      {statusMessage && (
        <div
          data-testid="resume-status-message"
          className={`flex items-start gap-3 rounded-2xl border p-4 text-xs ${
            statusMessage.type === 'success'
              ? 'border-emerald-200 bg-emerald-50/80 text-emerald-800'
              : 'border-red-200 bg-red-50/80 text-red-800'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
          )}
          <div className="font-medium leading-relaxed">{statusMessage.text}</div>
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Active Document Card */}
        <div className="rounded-2xl border border-blue-100/90 bg-white p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Active Document Status</h3>
              {activeDoc ? (
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
                    isPublished
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      : 'border-amber-200 bg-amber-50 text-amber-700'
                  }`}
                >
                  {isPublished ? <Globe className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                  <span>{isPublished ? 'Publicly Live' : 'Unpublished (Draft)'}</span>
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                  No Resume Uploaded
                </span>
              )}
            </div>

            {activeDoc ? (
              <div className="mt-5 space-y-4">
                <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50/40 p-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-slate-900 truncate">
                      {activeDoc.filename || 'Ravi_Dasari_Resume.pdf'}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {(activeDoc.sizeBytes ? activeDoc.sizeBytes / (1024 * 1024) : 0).toFixed(2)} MB •
                      PDF Document • Tag: <span className="font-semibold text-blue-700">{resume.versionTag}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">
                      Last Updated: {resume.lastUpdated}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  <a
                    href="/api/admin/resume/preview"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50/60 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100/60 transition-colors"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span>Preview PDF</span>
                  </a>

                  {isPublished && (
                    <a
                      href="/api/public/resume/download"
                      download="Ravi_Dasari_Resume.pdf"
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Download</span>
                    </a>
                  )}

                  <button
                    type="button"
                    data-testid="toggle-publish-btn"
                    disabled={uploading}
                    onClick={handleTogglePublish}
                    className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors ${
                      isPublished
                        ? 'border-amber-200 text-amber-700 hover:bg-amber-50'
                        : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                    }`}
                  >
                    {isPublished ? <Lock className="h-3.5 w-3.5" /> : <Globe className="h-3.5 w-3.5" />}
                    <span>{isPublished ? 'Unpublish' : 'Publish Resume'}</span>
                  </button>

                  <button
                    type="button"
                    data-testid="delete-resume-btn"
                    disabled={uploading}
                    onClick={() => setShowDeleteModal(true)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors ml-auto"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-6 rounded-xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-500">
                No active resume published in R2. Upload a verified PDF to activate the public
                resume download CTA on the hero section.
              </div>
            )}
          </div>

          {/* Audit History Snapshot */}
          {resume?.auditHistory && resume.auditHistory.length > 0 && (
            <div className="mt-6 border-t border-slate-100 pt-4">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 mb-2">
                <History className="h-3.5 w-3.5 text-slate-500" />
                <span>Version History ({resume.auditHistory.length} revisions archived)</span>
              </div>
              <div className="max-h-24 overflow-y-auto space-y-1 text-[11px] text-slate-500">
                {resume.auditHistory.map((item, idx) => (
                  <div key={idx} className="flex justify-between py-0.5 border-b border-slate-50">
                    <span className="truncate max-w-[200px]">{item.filename}</span>
                    <span>{new Date(item.uploadedAt).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Upload New Revision Card */}
        <div className="rounded-2xl border border-blue-100/90 bg-white p-6 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-2">Upload or Replace Resume</h3>
            <p className="text-xs text-slate-500 mb-6 leading-relaxed">
              Upload a verified PDF resume. The previous document is safely archived into
              historical R2 storage, ensuring zero downtime or link breakage.
            </p>

            <input
              ref={fileInputRef}
              type="file"
              data-testid="resume-file-input"
              accept="application/pdf"
              onChange={handleFileSelect}
              className="hidden"
            />

            {!selectedFile ? (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/30 p-8 text-center hover:border-blue-400 hover:bg-blue-50/60 transition-all cursor-pointer group"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 ring-1 ring-blue-100 group-hover:scale-105 transition-transform">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
                <div className="mt-4 text-xs font-bold text-slate-800">
                  Select PDF Resume File
                </div>
                <p className="mt-1 text-[11px] text-slate-400">
                  Strictly PDF only (%PDF- signature verified • Max 10 MB)
                </p>
              </button>
            ) : (
              <div className="space-y-4 rounded-2xl border border-blue-200 bg-blue-50/30 p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-slate-900 truncate">
                      {selectedFile.name}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • application/pdf
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-blue-100">
                  <button
                    type="button"
                    data-testid="confirm-resume-upload-btn"
                    disabled={uploading}
                    onClick={handleUpload}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60 transition-colors"
                  >
                    {uploading ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Upload className="h-3.5 w-3.5" />
                    )}
                    <span>{uploading ? 'Archiving & Storing...' : 'Upload & Publish PDF'}</span>
                  </button>

                  <button
                    type="button"
                    disabled={uploading}
                    onClick={() => {
                      setSelectedFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 rounded-xl bg-slate-50 p-4 border border-slate-100 text-xs text-slate-500 space-y-1">
            <div className="font-semibold text-slate-700">Security & Integrity Enforced:</div>
            <div>• Server-side %PDF- magic-byte validation prevents disguised binaries.</div>
            <div>• Unpublishing strictly returns HTTP 404 on the public download route.</div>
          </div>
        </div>
      </div>

      {/* Public Resume Section Narrative (Visual CMS) */}
      <Card className="p-6 border-blue-100/90 shadow-xs bg-white space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span>Public Resume Section Narrative (Visual CMS)</span>
          </h3>
          <span className="text-xs text-slate-500 font-medium">Rendered on Homepage Resume Download Card</span>
        </div>

        <form onSubmit={handleSaveText} className="space-y-4">
          <div>
            <RichTextEditor
              label="Resume Card Heading"
              value={headline}
              onChange={setHeadline}
              minHeight="70px"
              placeholder="Ravi Dasari — Professional Resume"
              helperText="Main heading displayed on the homepage resume download section."
            />
          </div>

          <div>
            <RichTextEditor
              label="Resume Overview & Summary Paragraph"
              value={description}
              onChange={setDescription}
              minHeight="100px"
              placeholder="Comprehensive overview of verified DevSecOps engineering roles..."
              helperText="Summary paragraph describing the resume contents. Supports formatting, links, and bold highlights."
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={fetchResume}
              disabled={savingText}
              leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
            >
              Reset
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={savingText}
              leftIcon={<Save className="w-3.5 h-3.5" />}
            >
              {savingText ? 'Saving Narrative...' : 'Save Resume Narrative'}
            </Button>
          </div>
        </form>
      </Card>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div
          data-testid="delete-resume-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/25 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-2xl border border-blue-100 bg-white p-6 shadow-xl">
            <h3 className="text-base font-bold text-slate-900">Delete Active Resume?</h3>
            <p className="mt-2 text-xs text-slate-600 leading-relaxed">
              Are you sure you want to delete the active resume? The document will be purged from R2
              storage, and public download links will immediately return HTTP 404.
            </p>
            <div className="mt-5 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                data-testid="confirm-delete-resume-btn"
                onClick={handleDelete}
                className="rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 shadow-xs"
              >
                Delete Resume
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

