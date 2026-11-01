import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminService } from '../../services/adminService';
import {
  Profile,
  AboutCompetencyItem,
  DEFAULT_ABOUT_COMPETENCIES,
  DEFAULT_ABOUT_SECONDARY_PARAGRAPH,
  DEFAULT_ABOUT_HIGHLIGHTS,
} from '../../types/portfolio';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { SkeletonLoader } from '../../components/common/SkeletonLoader';
import { RichTextEditor } from '../../components/common/RichTextEditor';
import { RichTextViewer } from '../../components/common/RichTextViewer';
import {
  FileText,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Trash2,
  Cpu,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  Edit2,
  Layers,
  ExternalLink,
  Monitor,
  Smartphone,
  X,
  Sparkles,
} from 'lucide-react';

const APPROVED_ACCENT_COLORS: Array<{
  id: 'blue' | 'teal' | 'indigo' | 'cyan' | 'amber' | 'rose' | 'slate' | 'emerald';
  label: string;
  bgClass: string;
  textClass: string;
  hex: string;
}> = [
  { id: 'blue', label: 'Royal Blue', bgClass: 'bg-brand-primary', textClass: 'text-brand-primary', hex: '#2563EB' },
  { id: 'teal', label: 'Emerald Teal', bgClass: 'bg-brand-teal', textClass: 'text-brand-teal', hex: '#0D9488' },
  { id: 'indigo', label: 'Indigo', bgClass: 'bg-indigo-600', textClass: 'text-indigo-600', hex: '#4F46E5' },
  { id: 'cyan', label: 'Cyan', bgClass: 'bg-cyan-600', textClass: 'text-cyan-600', hex: '#0891B2' },
  { id: 'amber', label: 'Amber', bgClass: 'bg-amber-600', textClass: 'text-amber-600', hex: '#D97706' },
  { id: 'rose', label: 'Rose', bgClass: 'bg-rose-600', textClass: 'text-rose-600', hex: '#E11D48' },
  { id: 'slate', label: 'Slate', bgClass: 'bg-slate-600', textClass: 'text-slate-600', hex: '#475569' },
  { id: 'emerald', label: 'Emerald', bgClass: 'bg-emerald-600', textClass: 'text-emerald-600', hex: '#059669' },
];

function getDotColorClass(color?: string): string {
  const match = APPROVED_ACCENT_COLORS.find((c) => c.id === color);
  return match ? match.bgClass : 'bg-brand-primary';
}

export const AboutPage: React.FC = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [etag, setEtag] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form Fields — Headings & Primary Narrative
  const [aboutTitle, setAboutTitle] = useState('');
  const [aboutSubtitle, setAboutSubtitle] = useState('');
  const [bioLong, setBioLong] = useState('');

  // Form Fields — Secondary Narrative (Issue 1)
  const [aboutSecondaryParagraph, setAboutSecondaryParagraph] = useState('');
  const [aboutSecondaryParagraphVisible, setAboutSecondaryParagraphVisible] = useState(true);

  // Form Fields — Highlights (Issue 3)
  const [highlights, setHighlights] = useState<string[]>([]);
  const [newHighlight, setNewHighlight] = useState('');

  // Form Fields — Core Competencies (Issue 2)
  const [aboutCompetenciesTitle, setAboutCompetenciesTitle] = useState('Core Competencies');
  const [aboutCompetenciesVisible, setAboutCompetenciesVisible] = useState(true);
  const [competencies, setCompetencies] = useState<AboutCompetencyItem[]>([]);

  // Category Editor Modal State
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [categoryDescription, setCategoryDescription] = useState('');
  const [categoryColor, setCategoryColor] = useState<AboutCompetencyItem['color']>('blue');
  const [categoryVisible, setCategoryVisible] = useState(true);

  // Delete Confirmation Modal State
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<AboutCompetencyItem | null>(null);

  // Preview Mode State for Competencies Card
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');

  const loadData = async () => {
    setLoading(true);
    setError(null);
    const res = await adminService.getProfile();
    if (res.success && res.data) {
      setProfile(res.data);
      setEtag(res.etag);
      setAboutTitle(res.data.aboutTitle || 'Bridging Cloud Infrastructure, Security, and Enterprise Software');
      setAboutSubtitle(
        res.data.aboutSubtitle ||
          'Engineering philosophy rooted in zero-downtime reliability, shift-left security automation, and pragmatic modern technologies.'
      );
      setBioLong(res.data.bioLong || '');

      // Secondary Paragraph
      setAboutSecondaryParagraph(
        res.data.aboutSecondaryParagraph !== undefined
          ? res.data.aboutSecondaryParagraph
          : DEFAULT_ABOUT_SECONDARY_PARAGRAPH
      );
      setAboutSecondaryParagraphVisible(res.data.aboutSecondaryParagraphVisible !== false);

      // Highlights
      setHighlights(
        res.data.aboutHighlights && res.data.aboutHighlights.length > 0
          ? res.data.aboutHighlights
          : DEFAULT_ABOUT_HIGHLIGHTS
      );

      // Competencies
      setAboutCompetenciesTitle(res.data.aboutCompetenciesTitle || 'Core Competencies');
      setAboutCompetenciesVisible(res.data.aboutCompetenciesVisible !== false);
      setCompetencies(
        res.data.aboutCompetencies && res.data.aboutCompetencies.length > 0
          ? res.data.aboutCompetencies
          : DEFAULT_ABOUT_COMPETENCIES
      );
    } else {
      setError(res.error || 'Failed to load about content.');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Highlights handlers
  const handleAddHighlight = () => {
    if (!newHighlight.trim()) return;
    setHighlights((prev) => [...prev, newHighlight.trim()]);
    setNewHighlight('');
  };

  const handleRemoveHighlight = (index: number) => {
    setHighlights((prev) => prev.filter((_, i) => i !== index));
  };

  const handleMoveHighlight = (index: number, direction: 'up' | 'down') => {
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === highlights.length - 1)) {
      return;
    }
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    setHighlights((prev) => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;
      return copy;
    });
  };

  // Competency Category Handlers
  const handleOpenAddCategory = () => {
    setEditingCategoryId(null);
    setCategoryName('');
    setCategoryDescription('');
    setCategoryColor('blue');
    setCategoryVisible(true);
    setIsCategoryModalOpen(true);
  };

  const handleOpenEditCategory = (item: AboutCompetencyItem) => {
    setEditingCategoryId(item.id);
    setCategoryName(item.name);
    setCategoryDescription(item.description);
    setCategoryColor(item.color || 'blue');
    setCategoryVisible(item.visible !== false);
    setIsCategoryModalOpen(true);
  };

  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryName.trim()) {
      alert('Please provide a category name.');
      return;
    }
    if (!categoryDescription.trim()) {
      alert('Please provide a technology list or category description.');
      return;
    }

    if (editingCategoryId) {
      // Edit existing
      setCompetencies((prev) =>
        prev.map((item) =>
          item.id === editingCategoryId
            ? {
                ...item,
                name: categoryName.trim(),
                description: categoryDescription.trim(),
                color: categoryColor,
                visible: categoryVisible,
              }
            : item
        )
      );
    } else {
      // Add new
      const newItem: AboutCompetencyItem = {
        id: `comp-${Date.now()}`,
        name: categoryName.trim(),
        description: categoryDescription.trim(),
        color: categoryColor,
        visible: categoryVisible,
        order: competencies.length,
      };
      setCompetencies((prev) => [...prev, newItem]);
    }

    setIsCategoryModalOpen(false);
  };

  const handleMoveCompetency = (index: number, direction: 'up' | 'down') => {
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === competencies.length - 1)) {
      return;
    }
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    setCompetencies((prev) => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;
      // Re-normalize order
      return copy.map((item, idx) => ({ ...item, order: idx }));
    });
  };

  const handleToggleCompetencyVisibility = (id: string) => {
    setCompetencies((prev) =>
      prev.map((item) => (item.id === id ? { ...item, visible: item.visible === false } : item))
    );
  };

  const handleDeleteCompetency = (id: string) => {
    setCompetencies((prev) => prev.filter((item) => item.id !== id).map((item, idx) => ({ ...item, order: idx })));
    setDeleteConfirmItem(null);
  };

  // Restore defaults
  const handleRestoreDefaultSecondary = () => {
    setAboutSecondaryParagraph(DEFAULT_ABOUT_SECONDARY_PARAGRAPH);
    setAboutSecondaryParagraphVisible(true);
  };

  const handleRestoreDefaultCompetencies = () => {
    if (window.confirm('Reset all Core Competencies to the 5 default categories?')) {
      setCompetencies(DEFAULT_ABOUT_COMPETENCIES);
      setAboutCompetenciesTitle('Core Competencies');
      setAboutCompetenciesVisible(true);
    }
  };

  // Main Save
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    if (!bioLong.trim() || bioLong.trim().length < 50) {
      setFeedback({ type: 'error', message: 'Detailed bio philosophy must be at least 50 characters.' });
      return;
    }

    setSaving(true);
    setFeedback(null);

    const updatedProfile: Profile = {
      ...profile,
      aboutTitle: aboutTitle.trim(),
      aboutSubtitle: aboutSubtitle.trim(),
      bioLong: bioLong.trim(),
      aboutHighlights: highlights,
      aboutSecondaryParagraph: aboutSecondaryParagraph.trim(),
      aboutSecondaryParagraphVisible,
      aboutCompetenciesTitle: aboutCompetenciesTitle.trim() || 'Core Competencies',
      aboutCompetenciesVisible,
      aboutCompetencies: competencies,
    };

    const res = await adminService.updateProfile(updatedProfile, etag);
    setSaving(false);

    if (res.success && res.data) {
      setProfile(res.data);
      if (res.etag) setEtag(res.etag);
      setFeedback({ type: 'success', message: 'About section content updated successfully!' });
    } else if (res.status === 409 || res.error?.includes('modified by another session')) {
      setFeedback({
        type: 'error',
        message: 'Conflict: About content was modified in another session. Please reload to sync the latest version.',
      });
    } else {
      setFeedback({ type: 'error', message: res.error || 'Failed to save about section changes.' });
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
              <FileText className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">About Section CMS</h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Manage your engineering philosophy, secondary focus paragraph, key highlights, and the Core Competencies card.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/admin/skills"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:text-blue-600 hover:border-blue-200 transition-colors shadow-2xs"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Manage Skills Stack</span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </Link>
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

      {/* Main Form */}
      <form onSubmit={handleSave} className="space-y-6">
        {/* 1. Section Headings */}
        <Card className="p-6 border-blue-100/80 shadow-xs bg-white space-y-5">
          <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-600" />
            <span>Section Headings</span>
          </h2>

          <div>
            <RichTextEditor
              label="Section Title"
              required
              value={aboutTitle}
              onChange={setAboutTitle}
              minHeight="70px"
              placeholder="Bridging Cloud Infrastructure, Security, and Enterprise Software"
              helperText="Main heading for the About section. Supports bold emphasis, brand accents, and sizing."
            />
          </div>

          <div>
            <RichTextEditor
              label="Section Subtitle / Narrative Thesis"
              required
              value={aboutSubtitle}
              onChange={setAboutSubtitle}
              minHeight="80px"
              placeholder="Engineering philosophy rooted in zero-downtime reliability..."
              helperText="High-level narrative thesis statement displayed beneath the About section title."
            />
          </div>
        </Card>

        {/* 2. Detailed Philosophy (Bio Long) */}
        <Card className="p-6 border-blue-100/80 shadow-xs bg-white space-y-5">
          <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-blue-600" />
            <span>Primary Engineering Philosophy (Bio Long)</span>
          </h2>

          <div>
            <RichTextEditor
              label="Full Narrative Bio"
              required
              value={bioLong}
              onChange={setBioLong}
              minHeight="140px"
              placeholder="Seasoned engineering professional with approximately 6.6 years of proven IT expertise..."
              helperText="Minimum 50 characters. Rendered in the prominent About section on the homepage with full rich-text formatting, lists, links, and bold highlights."
            />
          </div>
        </Card>

        {/* 3. Secondary Narrative / Focus Paragraph (Issue 1) */}
        <Card className="p-6 border-blue-100/80 shadow-xs bg-white space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span>Secondary Focus Paragraph (Optional)</span>
            </h2>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={aboutSecondaryParagraphVisible}
                  onChange={(e) => setAboutSecondaryParagraphVisible(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                />
                <span>Visible on Public Website</span>
              </label>

              <button
                type="button"
                onClick={handleRestoreDefaultSecondary}
                className="text-xs font-medium text-blue-600 hover:text-blue-800 underline"
                title="Restore default paragraph text"
              >
                Restore Default
              </button>
            </div>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            This paragraph appears directly beneath your main bio narrative. You can customize its text, format it with
            bold terms and approved brand colors, or toggle its visibility off if you prefer only bullet points.
          </p>

          <div className={!aboutSecondaryParagraphVisible ? 'opacity-50 pointer-events-none' : ''}>
            <RichTextEditor
              label="Secondary Paragraph Content"
              value={aboutSecondaryParagraph}
              onChange={setAboutSecondaryParagraph}
              minHeight="110px"
              placeholder="My focus centers on eliminating operational friction through Infrastructure as Code..."
              helperText="Displayed beneath the primary bio narrative. Supports rich formatting, links, and text sizing."
            />
          </div>
        </Card>

        {/* 4. Key Focus Highlights (Issue 3) */}
        <Card className="p-6 border-blue-100/80 shadow-xs bg-white space-y-5">
          <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-blue-600" />
              <span>Key Focus Highlights</span>
            </span>
            <span className="text-xs font-normal text-slate-500">
              {highlights.length} Highlight{highlights.length === 1 ? '' : 's'}
            </span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {highlights.map((item, index) => (
              <div
                key={index}
                className="p-3 rounded-xl border border-blue-100 bg-blue-50/40 flex items-center justify-between gap-3 text-xs font-semibold text-slate-800"
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                  <span className="truncate">{item}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleMoveHighlight(index, 'up')}
                    disabled={index === 0}
                    className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent"
                    title="Move up"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveHighlight(index, 'down')}
                    disabled={index === highlights.length - 1}
                    className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent"
                    title="Move down"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveHighlight(index)}
                    className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-white transition-colors"
                    title="Remove highlight"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2 pt-2">
            <input
              type="text"
              value={newHighlight}
              onChange={(e) => setNewHighlight(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddHighlight();
                }
              }}
              placeholder="e.g. Zero-Trust Cloud Architecture"
              className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus-ring bg-white"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddHighlight}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              Add Highlight
            </Button>
          </div>
        </Card>

        {/* 5. Core Competencies Card CMS (Issue 2) */}
        <Card className="p-6 border-blue-100/80 shadow-xs bg-white space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600" />
              <h2 className="text-base font-bold text-slate-900">Core Competencies Card CMS</h2>
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={aboutCompetenciesVisible}
                  onChange={(e) => setAboutCompetenciesVisible(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                />
                <span>Display Card on Public Site</span>
              </label>

              <button
                type="button"
                onClick={handleRestoreDefaultCompetencies}
                className="text-xs font-medium text-slate-500 hover:text-slate-800 underline"
              >
                Reset to Defaults
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
            <div className="sm:col-span-2">
              <label htmlFor="compTitle" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Card Title
              </label>
              <input
                id="compTitle"
                type="text"
                value={aboutCompetenciesTitle}
                onChange={(e) => setAboutCompetenciesTitle(e.target.value)}
                placeholder="Core Competencies"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus-ring bg-white font-bold"
              />
            </div>

            <div className="flex items-center justify-end pt-5">
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleOpenAddCategory}
                leftIcon={<Plus className="w-3.5 h-3.5" />}
              >
                Add Competency Category
              </Button>
            </div>
          </div>

          {/* Categories List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-1.5">
              <span>Categories ({competencies.length})</span>
              <span>Actions & Reordering</span>
            </div>

            {competencies.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 border-2 border-dashed border-slate-200 rounded-xl">
                No competency categories configured. Click &ldquo;Add Competency Category&rdquo; to create one.
              </div>
            ) : (
              <div className="space-y-2.5">
                {competencies.map((item, index) => (
                  <div
                    key={item.id}
                    className={`p-3.5 rounded-xl border transition-all flex items-start justify-between gap-4 ${
                      item.visible !== false
                        ? 'bg-slate-50/70 border-slate-200 hover:border-blue-200'
                        : 'bg-slate-100/50 border-slate-200 opacity-60'
                    }`}
                  >
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <span className={`w-3 h-3 rounded-full ${getDotColorClass(item.color)} mt-1 shrink-0`} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-slate-900">{item.name}</h4>
                          {item.visible === false && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-200 text-slate-600">
                              Hidden
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-600 mt-1 line-clamp-2">
                          <RichTextViewer content={item.description} as="span" inline />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0 pt-0.5">
                      <button
                        type="button"
                        onClick={() => handleToggleCompetencyVisibility(item.id)}
                        className={`p-1.5 rounded-lg border text-xs ${
                          item.visible !== false
                            ? 'bg-white border-slate-200 text-slate-600 hover:text-blue-600'
                            : 'bg-slate-200 border-slate-300 text-slate-500'
                        }`}
                        title={item.visible !== false ? 'Hide from public site' : 'Show on public site'}
                      >
                        {item.visible !== false ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleMoveCompetency(index, 'up')}
                        disabled={index === 0}
                        className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-slate-900 disabled:opacity-30 disabled:hover:text-slate-600"
                        title="Move Up"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleMoveCompetency(index, 'down')}
                        disabled={index === competencies.length - 1}
                        className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-slate-900 disabled:opacity-30 disabled:hover:text-slate-600"
                        title="Move Down"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenEditCategory(item)}
                        className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-blue-600"
                        title="Edit Category"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeleteConfirmItem(item)}
                        className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-200"
                        title="Delete Category"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Live Preview Card */}
          <div className="pt-4 border-t border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span>Live Interactive Preview</span>
              </span>

              <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-xs font-semibold text-slate-600">
                <button
                  type="button"
                  onClick={() => setPreviewMode('desktop')}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors ${
                    previewMode === 'desktop' ? 'bg-blue-50 text-blue-700 font-bold' : 'hover:bg-slate-50'
                  }`}
                >
                  <Monitor className="w-3 h-3" />
                  <span>Desktop</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode('mobile')}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors ${
                    previewMode === 'mobile' ? 'bg-blue-50 text-blue-700 font-bold' : 'hover:bg-slate-50'
                  }`}
                >
                  <Smartphone className="w-3 h-3" />
                  <span>Mobile (390px)</span>
                </button>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex justify-center">
              <div
                className={`transition-all duration-200 ${
                  previewMode === 'mobile' ? 'w-[390px] max-w-full' : 'w-full max-w-lg'
                }`}
              >
                {aboutCompetenciesVisible ? (
                  <Card className="p-6 bg-white border-blue-100 shadow-sm space-y-4">
                    <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">
                      {aboutCompetenciesTitle || 'Core Competencies'}
                    </h3>
                    <ul className="space-y-3 text-sm">
                      {competencies.filter((c) => c.visible !== false).length === 0 ? (
                        <li className="text-xs text-slate-400 italic">No visible categories to display.</li>
                      ) : (
                        competencies
                          .filter((c) => c.visible !== false)
                          .map((item) => (
                            <li key={item.id} className="flex items-start gap-2.5">
                              <span className={`w-2 h-2 rounded-full ${getDotColorClass(item.color)} mt-1.5 shrink-0`} />
                              <div className="leading-snug text-xs sm:text-sm">
                                <strong className="text-slate-900 font-semibold">{item.name}: </strong>
                                <RichTextViewer content={item.description} as="span" inline />
                              </div>
                            </li>
                          ))
                      )}
                    </ul>
                  </Card>
                ) : (
                  <div className="p-6 bg-white border border-dashed border-slate-300 rounded-xl text-center text-xs text-slate-400">
                    Core Competencies card is currently hidden on the public site.
                  </div>
                )}
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
            {saving ? 'Saving...' : 'Save About Section'}
          </Button>
        </div>
      </form>

      {/* Add / Edit Category Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden space-y-4">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-600" />
                <span>{editingCategoryId ? 'Edit Competency Category' : 'Add Competency Category'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  placeholder="e.g. Cloud Infrastructure"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus-ring bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Accent Color Dot
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {APPROVED_ACCENT_COLORS.map((col) => (
                    <button
                      key={col.id}
                      type="button"
                      onClick={() => setCategoryColor(col.id)}
                      className={`flex items-center gap-1.5 p-2 rounded-lg border text-xs font-semibold transition-all ${
                        categoryColor === col.id
                          ? 'border-blue-600 bg-blue-50/70 text-blue-900 ring-2 ring-blue-500/20'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <span className={`w-2.5 h-2.5 rounded-full ${col.bgClass} shrink-0`} />
                      <span className="truncate text-[11px]">{col.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <RichTextEditor
                  label="Category Description / Technologies *"
                  required
                  value={categoryDescription}
                  onChange={setCategoryDescription}
                  minHeight="90px"
                  placeholder="AWS, Cloudflare, Linux Systems, Terraform, Helm"
                  helperText="List primary frameworks and tools. Supports bold emphasis, links, and sizing."
                />
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={categoryVisible}
                    onChange={(e) => setCategoryVisible(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                  />
                  <span>Visible on Public About Me Card</span>
                </label>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCategoryModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                >
                  {editingCategoryId ? 'Update Category' : 'Add Category'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <span className="p-2 rounded-xl bg-rose-50">
                <Trash2 className="w-5 h-5" />
              </span>
              <h3 className="text-base font-bold text-slate-900">Delete Category</h3>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Are you sure you want to delete <span className="font-bold text-slate-900">&ldquo;{deleteConfirmItem.name}&rdquo;</span>?
              This will remove the category and its technology list from your public Core Competencies card when you save.
            </p>

            <div className="pt-3 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDeleteConfirmItem(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                className="bg-rose-600 hover:bg-rose-700 text-white"
                onClick={() => handleDeleteCompetency(deleteConfirmItem.id)}
              >
                Confirm Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
