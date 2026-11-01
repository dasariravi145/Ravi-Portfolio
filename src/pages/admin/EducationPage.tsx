import React, { useEffect, useState } from 'react';
import { adminService } from '../../services/adminService';
import { Education } from '../../types/portfolio';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { SkeletonLoader } from '../../components/common/SkeletonLoader';
import { EmptyState } from '../../components/common/EmptyState';
import { RichTextEditor } from '../../components/common/RichTextEditor';
import {
  GraduationCap,
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
  Calendar,
  Building2,
  X,
} from 'lucide-react';

export const EducationPage: React.FC = () => {
  const [educations, setEducations] = useState<Education[]>([]);
  const [etag, setEtag] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');
  const [visibilityFilter, setVisibilityFilter] = useState<'all' | 'published' | 'hidden'>('all');

  // Education Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEdu, setEditingEdu] = useState<Education | null>(null);
  const [formData, setFormData] = useState<{
    degree: string;
    institution: string;
    fieldOfStudy: string;
    startDate: string;
    endDate: string;
    startYear: string;
    endYear: string;
    grade: string;
    description: string;
    published: boolean;
  }>({
    degree: '',
    institution: '',
    fieldOfStudy: '',
    startDate: '',
    endDate: '',
    startYear: '',
    endYear: '',
    grade: '',
    description: '',
    published: true,
  });
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Delete modal state
  const [eduToDelete, setEduToDelete] = useState<Education | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    const res = await adminService.getEducation();
    if (res.success && res.data) {
      setEducations(res.data);
      setEtag(res.etag);
    } else {
      setError(res.error || 'Failed to fetch education records.');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAddModal = () => {
    setEditingEdu(null);
    setFormData({
      degree: '',
      institution: '',
      fieldOfStudy: '',
      startDate: '',
      endDate: '',
      startYear: '',
      endYear: '',
      grade: '',
      description: '',
      published: true,
    });
    setModalError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (edu: Education) => {
    setEditingEdu(edu);
    setFormData({
      degree: edu.degree || '',
      institution: edu.institution || '',
      fieldOfStudy: edu.fieldOfStudy || '',
      startDate: edu.startDate || (edu.startYear ? String(edu.startYear) : ''),
      endDate: edu.endDate || (edu.endYear ? String(edu.endYear) : ''),
      startYear: edu.startYear ? String(edu.startYear) : '',
      endYear: edu.endYear ? String(edu.endYear) : '',
      grade: edu.grade || '',
      description: edu.description || '',
      published: edu.published !== false,
    });
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.degree.trim()) {
      setModalError('Degree title is required.');
      return;
    }
    if (!formData.institution.trim()) {
      setModalError('Institution name is required.');
      return;
    }
    if (!formData.fieldOfStudy.trim()) {
      setModalError('Field of study is required.');
      return;
    }

    setSaving(true);
    setModalError(null);

    const payload = {
      degree: formData.degree.trim(),
      institution: formData.institution.trim(),
      fieldOfStudy: formData.fieldOfStudy.trim(),
      startDate: formData.startDate.trim() || undefined,
      endDate: formData.endDate.trim() || undefined,
      startYear: formData.startYear ? parseInt(formData.startYear, 10) : undefined,
      endYear: formData.endYear ? parseInt(formData.endYear, 10) : undefined,
      grade: formData.grade.trim() || undefined,
      description: formData.description.trim() || undefined,
      published: formData.published,
    };

    if (editingEdu) {
      const res = await adminService.updateEducation(editingEdu.id, payload, etag);
      setSaving(false);
      if (res.success && res.data) {
        setEducations((prev) => prev.map((item) => (item.id === editingEdu.id ? res.data! : item)));
        if (res.etag) setEtag(res.etag);
        setIsModalOpen(false);
        setFeedback({ type: 'success', message: `Education "${payload.degree}" updated successfully.` });
      } else if (res.error?.includes('modified by another session')) {
        setModalError('Conflict: Education records were modified in another session. Please reload to sync recent changes.');
      } else {
        setModalError(res.error || 'Failed to update education record.');
      }
    } else {
      const res = await adminService.createEducation(payload, etag);
      setSaving(false);
      if (res.success && res.data) {
        setEducations((prev) => [...prev, res.data!]);
        if (res.etag) setEtag(res.etag);
        setIsModalOpen(false);
        setFeedback({ type: 'success', message: `Education "${payload.degree}" added successfully.` });
      } else if (res.error?.includes('modified by another session')) {
        setModalError('Conflict: Education records were modified in another session. Please reload to sync recent changes.');
      } else {
        setModalError(res.error || 'Failed to create education record.');
      }
    }
  };

  const handleDeleteConfirm = async () => {
    if (!eduToDelete) return;
    setDeleting(true);

    const res = await adminService.deleteEducation(eduToDelete.id, etag);
    setDeleting(false);

    if (res.success) {
      setEducations((prev) => prev.filter((item) => item.id !== eduToDelete.id));
      if (res.etag) setEtag(res.etag);
      setEduToDelete(null);
      setFeedback({ type: 'success', message: `Education record "${eduToDelete.degree}" deleted.` });
    } else {
      setFeedback({ type: 'error', message: res.error || 'Failed to delete education record.' });
    }
  };

  const handleTogglePublish = async (edu: Education) => {
    const updated = !edu.published;
    const res = await adminService.updateEducation(edu.id, { published: updated }, etag);
    if (res.success && res.data) {
      setEducations((prev) => prev.map((item) => (item.id === edu.id ? res.data! : item)));
      if (res.etag) setEtag(res.etag);
      setFeedback({
        type: 'success',
        message: `Education "${edu.degree}" is now ${updated ? 'Published' : 'Unpublished'}.`,
      });
    } else {
      setFeedback({ type: 'error', message: res.error || 'Failed to toggle publication state.' });
    }
  };

  const handleReorder = async (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= educations.length) return;

    const reordered = [...educations];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(newIndex, 0, moved);

    const orderedIds = reordered.map((item) => item.id);
    const res = await adminService.reorderEducation(orderedIds, etag);
    if (res.success && res.data) {
      setEducations(res.data);
      if (res.etag) setEtag(res.etag);
      setFeedback({ type: 'success', message: 'Education order updated.' });
    } else {
      setFeedback({ type: 'error', message: res.error || 'Failed to reorder education records.' });
    }
  };

  const filteredEducations = educations.filter((edu) => {
    const matchesSearch =
      edu.degree.toLowerCase().includes(searchQuery.toLowerCase()) ||
      edu.institution.toLowerCase().includes(searchQuery.toLowerCase()) ||
      edu.fieldOfStudy.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesVisibility =
      visibilityFilter === 'all'
        ? true
        : visibilityFilter === 'published'
        ? edu.published !== false
        : edu.published === false;

    return matchesSearch && matchesVisibility;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-blue-100/80">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <GraduationCap className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Academic Education CMS</h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Manage university degrees, coursework, academic institutions, and graduation timelines.
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={openAddModal}
          leftIcon={<Plus className="w-4 h-4" />}
          className="self-start sm:self-auto"
        >
          Add Education Record
        </Button>
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

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-blue-100/80 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search degrees, institutions, fields..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus-ring bg-slate-50/50"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <div className="flex items-center p-1 bg-slate-100 rounded-xl text-xs font-semibold text-slate-600">
            <button
              type="button"
              onClick={() => setVisibilityFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                visibilityFilter === 'all' ? 'bg-white text-blue-600 shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              All ({educations.length})
            </button>
            <button
              type="button"
              onClick={() => setVisibilityFilter('published')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                visibilityFilter === 'published' ? 'bg-white text-blue-600 shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              Published
            </button>
            <button
              type="button"
              onClick={() => setVisibilityFilter('hidden')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                visibilityFilter === 'hidden' ? 'bg-white text-blue-600 shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              Draft / Hidden
            </button>
          </div>
        </div>
      </div>

      {/* Records List */}
      {loading ? (
        <div className="space-y-4">
          <SkeletonLoader className="h-32 rounded-xl" count={3} />
        </div>
      ) : filteredEducations.length > 0 ? (
        <div className="space-y-4">
          {filteredEducations.map((edu, index) => (
            <Card
              key={edu.id}
              className="p-5 border-blue-100/80 shadow-xs bg-white hover:border-blue-200 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-1.5 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900">{edu.degree}</h3>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                      edu.published !== false
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}
                  >
                    {edu.published !== false ? 'Published' : 'Draft / Unpublished'}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                  <span className="font-semibold text-slate-800 flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-blue-600" />
                    <span>{edu.institution}</span>
                  </span>
                  <span>•</span>
                  <span>{edu.fieldOfStudy}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-slate-500">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{edu.startDate || edu.startYear} – {edu.endDate || edu.endYear || 'Present'}</span>
                  </span>
                </div>

                {edu.description && (
                  <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed">
                    {edu.description}
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
                {/* Reorder Buttons */}
                <button
                  type="button"
                  onClick={() => handleReorder(index, 'up')}
                  disabled={index === 0}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                  title="Move Up"
                >
                  <ArrowUp className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleReorder(index, 'down')}
                  disabled={index === educations.length - 1}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                  title="Move Down"
                >
                  <ArrowDown className="w-4 h-4" />
                </button>

                {/* Publish Toggle */}
                <button
                  type="button"
                  onClick={() => handleTogglePublish(edu)}
                  className={`p-1.5 rounded-lg transition-colors ${
                    edu.published !== false
                      ? 'text-emerald-600 hover:bg-emerald-50'
                      : 'text-slate-400 hover:bg-slate-100'
                  }`}
                  title={edu.published !== false ? 'Unpublish' : 'Publish'}
                >
                  {edu.published !== false ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>

                {/* Edit Button */}
                <button
                  type="button"
                  onClick={() => openEditModal(edu)}
                  className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                  title="Edit Record"
                >
                  <Edit2 className="w-4 h-4" />
                </button>

                {/* Delete Button */}
                <button
                  type="button"
                  onClick={() => setEduToDelete(edu)}
                  className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition-colors"
                  title="Delete Record"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No education records found"
          description={
            searchQuery || visibilityFilter !== 'all'
              ? 'No records match your active search and filter criteria.'
              : 'Add your first academic degree or certification program.'
          }
        />
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs overflow-y-auto"
        >
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-floating border border-slate-200 space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-blue-600" />
                <span>{editingEdu ? 'Edit Education Record' : 'Add New Education'}</span>
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Degree / Qualification *
                </label>
                <input
                  type="text"
                  required
                  value={formData.degree}
                  onChange={(e) => setFormData({ ...formData, degree: e.target.value })}
                  placeholder="e.g. Bachelor of Technology (B.Tech)"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 focus-ring"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Institution / University *
                </label>
                <input
                  type="text"
                  required
                  value={formData.institution}
                  onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
                  placeholder="e.g. Osmania University / JNTU"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 focus-ring"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Field of Study / Major *
                </label>
                <input
                  type="text"
                  required
                  value={formData.fieldOfStudy}
                  onChange={(e) => setFormData({ ...formData, fieldOfStudy: e.target.value })}
                  placeholder="e.g. Computer Science & Engineering"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 focus-ring"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Start Year / Date
                  </label>
                  <input
                    type="text"
                    value={formData.startYear}
                    onChange={(e) => setFormData({ ...formData, startYear: e.target.value, startDate: e.target.value })}
                    placeholder="2016"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 focus-ring"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    End Year / Date
                  </label>
                  <input
                    type="text"
                    value={formData.endYear}
                    onChange={(e) => setFormData({ ...formData, endYear: e.target.value, endDate: e.target.value })}
                    placeholder="2020"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 focus-ring"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Academic Grade / Standing (Optional)
                </label>
                <input
                  type="text"
                  value={formData.grade}
                  onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                  placeholder="e.g. First Class with Distinction"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 focus-ring"
                />
              </div>

              <div>
                <RichTextEditor
                  label="Description / Major Coursework (Optional)"
                  value={formData.description}
                  onChange={(val) => setFormData({ ...formData, description: val })}
                  minHeight="80px"
                  placeholder="Relevant courses, thesis, achievements..."
                  helperText="Academic focus, coursework, or honors displayed on the public education card."
                />
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formData.published}
                    onChange={(e) => setFormData({ ...formData, published: e.target.checked })}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                  />
                  <span className="text-xs font-bold text-slate-800">
                    Publish publicly on portfolio
                  </span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsModalOpen(false)}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={saving}
                >
                  {saving ? 'Saving...' : editingEdu ? 'Save Changes' : 'Create Record'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {eduToDelete && (
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
              <h3 className="text-base font-bold text-slate-900">Delete Education Record?</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Are you sure you want to permanently delete <strong className="text-slate-800">{eduToDelete.degree}</strong> from <strong className="text-slate-800">{eduToDelete.institution}</strong>? This action will remove it from the public portfolio.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEduToDelete(null)}
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

