import React, { useEffect, useState } from 'react';
import { adminService } from '../../services/adminService';
import { MediaAsset } from '../../types/portfolio';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { SkeletonLoader } from '../../components/common/SkeletonLoader';
import { EmptyState } from '../../components/common/EmptyState';
import {
  Image as ImageIcon,
  Upload,
  Trash2,
  Copy,
  Check,
  Search,
  FileText,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';

export const MediaLibraryPage: React.FC = () => {
  const [mediaList, setMediaList] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'images' | 'documents'>('all');

  // Copy feedback tracking
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Delete modal state
  const [assetToDelete, setAssetToDelete] = useState<MediaAsset | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadMedia = async () => {
    setLoading(true);
    setError(null);
    const res = await adminService.getMediaList();
    if (res.success && res.data) {
      setMediaList(res.data);
    } else {
      setError(res.error || 'Failed to fetch media assets.');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadMedia();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setFeedback(null);
    let successCount = 0;
    let failureCount = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const res = await adminService.uploadMedia(file);
      if (res.success && res.data) {
        successCount++;
        setMediaList((prev) => [res.data!, ...prev.filter((item) => item.key !== res.data!.key)]);
      } else {
        failureCount++;
      }
    }

    setUploading(false);
    if (failureCount === 0) {
      setFeedback({ type: 'success', message: `${successCount} asset${successCount === 1 ? '' : 's'} uploaded to R2 standard storage.` });
    } else {
      setFeedback({ type: 'error', message: `Uploaded ${successCount} assets, but ${failureCount} failed.` });
    }
    e.target.value = '';
  };

  const handleCopyUrl = (url: string, key: string) => {
    const fullUrl = `${window.location.origin}${url}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey(null);
    }, 2000);
  };

  const handleDeleteConfirm = async () => {
    if (!assetToDelete) return;
    setDeleting(true);

    const res = await adminService.deleteMedia(assetToDelete.key);
    setDeleting(false);

    if (res.success) {
      setMediaList((prev) => prev.filter((item) => item.key !== assetToDelete.key));
      setAssetToDelete(null);
      setFeedback({ type: 'success', message: `Asset "${assetToDelete.filename || assetToDelete.key}" deleted from storage.` });
    } else {
      setFeedback({ type: 'error', message: res.error || 'Failed to delete media asset.' });
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  // Filter items
  const filteredMedia = mediaList.filter((item) => {
    const matchesSearch =
      (item.filename || item.key).toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.altText || '').toLowerCase().includes(searchQuery.toLowerCase());

    const isPdf = item.mimeType === 'application/pdf' || item.key.endsWith('.pdf');
    const matchesType =
      typeFilter === 'all'
        ? true
        : typeFilter === 'images'
        ? !isPdf
        : isPdf;

    return matchesSearch && matchesType;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-blue-100/80">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <ImageIcon className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">R2 Media Library</h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Central repository for architecture diagrams, project screenshots, credential badges, and documents.
          </p>
        </div>

        <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors shadow-xs self-start sm:self-auto">
          <Upload className="w-4 h-4" />
          <span>{uploading ? 'Uploading...' : 'Upload Media Files'}</span>
          <input
            type="file"
            multiple
            accept="image/png,image/jpeg,image/webp,image/svg+xml,application/pdf"
            onChange={handleFileUpload}
            disabled={uploading}
            className="hidden"
          />
        </label>
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

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-blue-100/80 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by filename or key..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus-ring bg-slate-50/50"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <div className="flex items-center p-1 bg-slate-100 rounded-xl text-xs font-semibold text-slate-600">
            <button
              type="button"
              onClick={() => setTypeFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                typeFilter === 'all' ? 'bg-white text-blue-600 shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              All Assets ({mediaList.length})
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('images')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                typeFilter === 'images' ? 'bg-white text-blue-600 shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              Images
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('documents')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                typeFilter === 'documents' ? 'bg-white text-blue-600 shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              PDFs
            </button>
          </div>
        </div>
      </div>

      {/* Media Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          <SkeletonLoader className="h-48 rounded-xl" count={10} />
        </div>
      ) : filteredMedia.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filteredMedia.map((asset) => {
            const isPdf = asset.mimeType === 'application/pdf' || asset.key.endsWith('.pdf');
            const isCopied = copiedKey === asset.key;

            return (
              <Card
                key={asset.key}
                padding="none"
                hoverable
                className="flex flex-col justify-between overflow-hidden group border-blue-100/80 bg-white"
              >
                {/* Preview Box */}
                <div className="h-36 w-full bg-slate-50 flex items-center justify-center overflow-hidden relative border-b border-slate-100">
                  {isPdf ? (
                    <div className="flex flex-col items-center justify-center text-rose-500 p-4 text-center">
                      <FileText className="w-10 h-10 mb-1" />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        PDF Document
                      </span>
                    </div>
                  ) : (
                    <img
                      src={asset.url}
                      alt={asset.altText || asset.filename || 'Media'}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-200"
                      onError={(e) => {
                        (e.currentTarget as HTMLElement).style.display = 'none';
                      }}
                    />
                  )}

                  {/* Top-Right Tag */}
                  <span className="absolute top-2 right-2 text-[10px] font-mono px-2 py-0.5 rounded bg-white/90 backdrop-blur-xs border border-slate-200 text-slate-600 shadow-xs">
                    {formatFileSize(asset.sizeBytes)}
                  </span>
                </div>

                {/* Info & Actions */}
                <div className="p-3 space-y-2 flex-grow flex flex-col justify-between">
                  <div>
                    <h3
                      className="text-xs font-bold text-slate-900 truncate"
                      title={asset.filename || asset.key}
                    >
                      {asset.filename || asset.key.split('/').pop()}
                    </h3>
                    <p className="text-[10px] font-mono text-slate-400 truncate mt-0.5">
                      {asset.key}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleCopyUrl(asset.url, asset.key)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                        isCopied
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-50 text-slate-700 hover:bg-blue-50 hover:text-blue-700 border border-slate-200'
                      }`}
                      title="Copy Public URL"
                    >
                      {isCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      <span>{isCopied ? 'Copied' : 'Copy URL'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAssetToDelete(asset)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Delete Asset"
                      aria-label="Delete Asset"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState
          title="No media assets found"
          description={
            searchQuery || typeFilter !== 'all'
              ? 'No media assets match your active search and filter criteria.'
              : 'Upload your first image, diagram, or PDF document to R2 storage.'
          }
        />
      )}

      {/* Delete Confirmation Modal */}
      {assetToDelete && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs"
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-floating border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-base font-bold text-slate-900">Delete Media Asset?</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Are you sure you want to delete <strong className="text-slate-800">{assetToDelete.filename || assetToDelete.key}</strong> from R2 storage? Any project or profile referencing this URL will experience broken images.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAssetToDelete(null)}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="bg-rose-600 hover:bg-rose-700"
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
