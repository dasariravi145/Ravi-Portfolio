import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { adminService } from '../../services/adminService';
import { Project, MediaAsset, ArchitectureDiagram, ArchitectureCategory } from '../../types/portfolio';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { SkeletonLoader } from '../../components/common/SkeletonLoader';
import { RichTextEditor } from '../../components/common/RichTextEditor';
import {
  ArrowLeft,
  Save,
  Eye,
  Upload,
  Trash2,
  Plus,
  X,
  Layers,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Unlock,
  ArrowUp,
  ArrowDown,
  Edit3,
  EyeOff,
} from 'lucide-react';

const ARCHITECTURE_CATEGORIES: ArchitectureCategory[] = [
  'System Architecture',
  'Cloud Infrastructure',
  'CI/CD Pipeline',
  'Deployment Architecture',
  'Security Architecture',
  'Data Flow',
  'AI Workflow',
  'Application Architecture',
];

const STATUS_PRESETS = [
  'Production Pipeline Automated',
  'Google Play Closed Testing ONLY',
  'Published on Google Play Store',
  'Interactive Showcase Demo (Static Frontend Only)',
  'Active Engineering Project',
  'Working Prototype',
];

const CATEGORY_PRESETS = [
  'DevSecOps & Cloud',
  'Android Engineering',
  'E-Commerce Engineering',
  'Cloud Infrastructure & SRE',
  'AI & Autonomous Systems',
];

export const ProjectFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const isEditMode = Boolean(id);
  const navigate = useNavigate();

  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [etag, setEtag] = useState<string | undefined>();
  const [concurrencyConflict, setConcurrencyConflict] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [slugLocked, setSlugLocked] = useState(isEditMode);
  const [category, setCategory] = useState(CATEGORY_PRESETS[0]);
  const [customCategory, setCustomCategory] = useState('');
  const [deploymentStatus, setDeploymentStatus] = useState(STATUS_PRESETS[0]);
  const [summary, setSummary] = useState('');
  const [detailedOverview, setDetailedOverview] = useState('');

  // Tech Stack Tag Input
  const [techStack, setTechStack] = useState<string[]>([]);
  const [techInput, setTechInput] = useState('');

  // Problem / Solution / Challenges / Testing
  const [problemStatement, setProblemStatement] = useState('');
  const [solutionArchitecture, setSolutionArchitecture] = useState('');
  const [technicalChallenges, setTechnicalChallenges] = useState('');
  const [testingDetails, setTestingDetails] = useState('');

  // Key Features Dynamic List
  const [features, setFeatures] = useState<string[]>([]);
  const [featureInput, setFeatureInput] = useState('');

  // External Links
  const [githubUrl, setGithubUrl] = useState('');
  const [liveDemoUrl, setLiveDemoUrl] = useState('');
  const [googlePlayUrl, setGooglePlayUrl] = useState('');

  // Visibility & Ordering
  const [published, setPublished] = useState(false);
  const [featured, setFeatured] = useState(false);
  const [displayOrder, setDisplayOrder] = useState(1);

  // Media
  const [coverImage, setCoverImage] = useState<MediaAsset | null>(null);
  const [architectureDiagram, setArchitectureDiagram] = useState<MediaAsset | null>(null);
  const [architectureDiagrams, setArchitectureDiagrams] = useState<ArchitectureDiagram[]>([]);
  const [screenshots, setScreenshots] = useState<MediaAsset[]>([]);
  const [uploadingMedia, setUploadingMedia] = useState<'cover' | 'diagram' | 'screenshot' | 'modal-diagram' | null>(null);

  // Architecture Diagram Modal State
  const [diagramModalOpen, setDiagramModalOpen] = useState(false);
  const [editingDiagramIdx, setEditingDiagramIdx] = useState<number | null>(null);
  const [diagTitle, setDiagTitle] = useState('');
  const [diagCategory, setDiagCategory] = useState<ArchitectureCategory>('System Architecture');
  const [diagDescription, setDiagDescription] = useState('');
  const [diagImage, setDiagImage] = useState<MediaAsset | null>(null);
  const [diagComponentsInput, setDiagComponentsInput] = useState('');
  const [diagTechInput, setDiagTechInput] = useState('');
  const [diagPublished, setDiagPublished] = useState(true);
  const [diagError, setDiagError] = useState('');

  // SEO
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [keywordsInput, setKeywordsInput] = useState('');

  // Form Validation Errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Auto-generate slug from title if not manually customized
  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!slugManuallyEdited && !isEditMode) {
      const generated = val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
      setSlug(generated);
    }
  };

  // Load existing project if editing
  useEffect(() => {
    if (!isEditMode || !id) return;

    let isMounted = true;
    adminService.getProject(id).then((res) => {
      if (!isMounted) return;
      if (res.success && res.data) {
        const p = res.data;
        setEtag(res.etag);
        setTitle(p.title);
        setSlug(p.slug);
        setSlugManuallyEdited(true);

        if (CATEGORY_PRESETS.includes(p.category)) {
          setCategory(p.category);
        } else {
          setCategory('custom');
          setCustomCategory(p.category);
        }

        setDeploymentStatus(p.deploymentStatus);
        setSummary(p.summary);
        setDetailedOverview(p.detailedOverview || '');
        setTechStack(p.techStack || []);
        setProblemStatement(p.problemStatement || '');
        setSolutionArchitecture(p.solutionArchitecture || '');
        setTechnicalChallenges(p.technicalChallenges || '');
        setTestingDetails(p.testingDetails || '');
        setFeatures(p.features || []);
        setGithubUrl(p.githubUrl || '');
        setLiveDemoUrl(p.liveDemoUrl || '');
        setGooglePlayUrl(p.googlePlayUrl || '');
        setPublished(p.published);
        setFeatured(p.featured);
        setDisplayOrder(p.displayOrder || 1);
        setCoverImage(p.coverImage || null);
        setArchitectureDiagram(p.architectureDiagram || null);
        setArchitectureDiagrams(p.architectureDiagrams || []);
        setScreenshots(p.screenshots || []);

        if (p.seo) {
          setMetaTitle(p.seo.metaTitle || '');
          setMetaDescription(p.seo.metaDescription || '');
          setKeywordsInput((p.seo.keywords || []).join(', '));
        }
      } else {
        setFeedback({
          type: 'error',
          message: res.error || 'Failed to load project details.',
        });
      }
      setLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [id, isEditMode]);

  // Tech stack tag helpers
  const handleAddTech = () => {
    const trimmed = techInput.trim();
    if (trimmed && !techStack.includes(trimmed)) {
      setTechStack([...techStack, trimmed]);
      setTechInput('');
      setErrors((prev) => ({ ...prev, techStack: '' }));
    }
  };

  const handleRemoveTech = (tag: string) => {
    setTechStack(techStack.filter((t) => t !== tag));
  };

  // Feature list helpers
  const handleAddFeature = () => {
    const trimmed = featureInput.trim();
    if (trimmed) {
      setFeatures([...features, trimmed]);
      setFeatureInput('');
    }
  };

  const handleRemoveFeature = (index: number) => {
    setFeatures(features.filter((_, idx) => idx !== index));
  };

  // Media upload handlers
  const handleUploadCover = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingMedia('cover');
    const res = await adminService.uploadMedia(file);
    if (res.success && res.data) {
      setCoverImage(res.data);
      setFeedback({ type: 'success', message: 'Cover image uploaded.' });
    } else {
      setFeedback({ type: 'error', message: res.error || 'Failed to upload cover image.' });
    }
    setUploadingMedia(null);
  };

  const handleUploadDiagram = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingMedia('diagram');
    const res = await adminService.uploadMedia(file);
    if (res.success && res.data) {
      setArchitectureDiagram(res.data);
      setFeedback({ type: 'success', message: 'Architecture diagram uploaded.' });
    } else {
      setFeedback({ type: 'error', message: res.error || 'Failed to upload diagram.' });
    }
    setUploadingMedia(null);
  };

  const handleUploadScreenshot = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingMedia('screenshot');
    const res = await adminService.uploadMedia(file);
    if (res.success && res.data) {
      setScreenshots([...screenshots, res.data]);
      setFeedback({ type: 'success', message: 'Screenshot added to gallery.' });
    } else {
      setFeedback({ type: 'error', message: res.error || 'Failed to upload screenshot.' });
    }
    setUploadingMedia(null);
  };

  const handleMoveScreenshot = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === screenshots.length - 1)
    ) {
      return;
    }
    const target = direction === 'up' ? index - 1 : index + 1;
    const reordered = [...screenshots];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(target, 0, moved);
    setScreenshots(reordered);
  };

  const handleUpdateScreenshotCaption = (index: number, caption: string) => {
    const updated = [...screenshots];
    updated[index] = { ...updated[index], caption };
    setScreenshots(updated);
  };

  const handleRemoveScreenshot = (index: number) => {
    setScreenshots(screenshots.filter((_, idx) => idx !== index));
  };

  // Architecture Diagram Handlers
  const handleOpenAddDiagram = () => {
    setEditingDiagramIdx(null);
    setDiagTitle('');
    setDiagCategory('System Architecture');
    setDiagDescription('');
    setDiagImage(null);
    setDiagComponentsInput('');
    setDiagTechInput('');
    setDiagPublished(true);
    setDiagError('');
    setDiagramModalOpen(true);
  };

  const handleOpenEditDiagram = (index: number) => {
    const diag = architectureDiagrams[index];
    if (!diag) return;
    setEditingDiagramIdx(index);
    setDiagTitle(diag.title);
    setDiagCategory(diag.category);
    setDiagDescription(diag.description || '');
    setDiagImage(diag.image);
    setDiagComponentsInput((diag.components || []).join(', '));
    setDiagTechInput((diag.technologies || []).join(', '));
    setDiagPublished(diag.published !== false);
    setDiagError('');
    setDiagramModalOpen(true);
  };

  const handleUploadDiagramModalImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingMedia('modal-diagram');
    const res = await adminService.uploadMedia(file);
    if (res.success && res.data) {
      setDiagImage(res.data);
      setDiagError('');
    } else {
      setDiagError(res.error || 'Failed to upload architecture diagram image.');
    }
    setUploadingMedia(null);
  };

  const handleSaveDiagramModal = () => {
    if (!diagTitle.trim()) {
      setDiagError('Diagram title is required.');
      return;
    }
    if (!diagImage) {
      setDiagError('Please upload an architecture diagram image.');
      return;
    }

    const components = diagComponentsInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const technologies = diagTechInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    if (editingDiagramIdx !== null && editingDiagramIdx >= 0) {
      const updated = [...architectureDiagrams];
      updated[editingDiagramIdx] = {
        ...updated[editingDiagramIdx],
        title: diagTitle.trim(),
        category: diagCategory,
        description: diagDescription.trim() || undefined,
        image: diagImage,
        components: components,
        technologies: technologies,
        componentDescriptions: components,
        technologyReferences: technologies,
        published: diagPublished,
      };
      setArchitectureDiagrams(updated);
    } else {
      const newDiagram: ArchitectureDiagram = {
        id: `diag-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        title: diagTitle.trim(),
        category: diagCategory,
        description: diagDescription.trim() || undefined,
        image: diagImage,
        components: components,
        technologies: technologies,
        componentDescriptions: components,
        technologyReferences: technologies,
        displayOrder: architectureDiagrams.length + 1,
        published: diagPublished,
        revision: 1,
      };
      setArchitectureDiagrams([...architectureDiagrams, newDiagram]);
    }

    setDiagramModalOpen(false);
    setEditingDiagramIdx(null);
    setDiagError('');
  };

  const handleMoveDiagram = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === architectureDiagrams.length - 1)
    ) {
      return;
    }
    const target = direction === 'up' ? index - 1 : index + 1;
    const reordered = [...architectureDiagrams];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(target, 0, moved);
    const updated = reordered.map((d, i) => ({ ...d, displayOrder: i + 1 }));
    setArchitectureDiagrams(updated);
  };

  const handleToggleDiagramPublish = (index: number) => {
    const updated = [...architectureDiagrams];
    const current = updated[index];
    updated[index] = { ...current, published: !current.published };
    setArchitectureDiagrams(updated);
  };

  const handleDeleteDiagram = (index: number) => {
    const updated = architectureDiagrams
      .filter((_, i) => i !== index)
      .map((d, i) => ({ ...d, displayOrder: i + 1 }));
    setArchitectureDiagrams(updated);
  };

  // Form Validation
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!title.trim() || title.trim().length < 3) {
      newErrors.title = 'Title must be at least 3 characters long.';
    }

    if (!slug.trim() || slug.trim().length < 2) {
      newErrors.slug = 'Slug must be at least 2 characters long.';
    } else if (!/^[a-z0-9-]+$/.test(slug)) {
      newErrors.slug = 'Slug can only contain lowercase letters, numbers, and hyphens.';
    }

    const effectiveCategory = category === 'custom' ? customCategory.trim() : category;
    if (!effectiveCategory) {
      newErrors.category = 'Category is required.';
    }

    if (!summary.trim() || summary.trim().length < 10) {
      newErrors.summary = 'Summary must be at least 10 characters long.';
    }

    if (techStack.length === 0) {
      newErrors.techStack = 'Please add at least one technology to the stack.';
    }

    if (featured && !published) {
      newErrors.featured = 'Featured projects must be published.';
    }

    // URL validations if provided
    const urlPattern = /^https?:\/\//i;
    if (githubUrl && !urlPattern.test(githubUrl)) {
      newErrors.githubUrl = 'GitHub URL must start with http:// or https://';
    }
    if (liveDemoUrl && !urlPattern.test(liveDemoUrl)) {
      newErrors.liveDemoUrl = 'Live Demo URL must start with http:// or https://';
    }
    if (googlePlayUrl && !urlPattern.test(googlePlayUrl)) {
      newErrors.googlePlayUrl = 'Google Play URL must start with http:// or https://';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit Handler
  const handleSave = async (targetPublishState?: boolean) => {
    const willPublish = targetPublishState !== undefined ? targetPublishState : published;

    // Temporarily set published state for validation check
    if (featured && !willPublish) {
      setErrors((prev) => ({
        ...prev,
        featured: 'Featured projects must be published. Please unfeature or publish.',
      }));
      return;
    }

    if (!validateForm()) {
      setFeedback({ type: 'error', message: 'Please fix validation errors before saving.' });
      return;
    }

    setSaving(true);
    setConcurrencyConflict(false);

    const effectiveCategory = category === 'custom' ? customCategory.trim() : category;
    const keywords = keywordsInput
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean);

    const payload: Partial<Project> = {
      title: title.trim(),
      slug: slug.trim(),
      category: effectiveCategory,
      deploymentStatus: deploymentStatus.trim(),
      summary: summary.trim(),
      detailedOverview: detailedOverview.trim() || undefined,
      techStack,
      problemStatement: problemStatement.trim() || undefined,
      solutionArchitecture: solutionArchitecture.trim() || undefined,
      technicalChallenges: technicalChallenges.trim() || undefined,
      testingDetails: testingDetails.trim() || undefined,
      features,
      githubUrl: githubUrl.trim() || null,
      liveDemoUrl: liveDemoUrl.trim() || null,
      googlePlayUrl: googlePlayUrl.trim() || null,
      published: willPublish,
      featured,
      displayOrder: Number(displayOrder) || 1,
      coverImage,
      architectureDiagram,
      architectureDiagrams,
      screenshots,
      seo: {
        metaTitle: metaTitle.trim() || undefined,
        metaDescription: metaDescription.trim() || undefined,
        keywords,
      },
    };

    try {
      if (isEditMode && id) {
        const res = await adminService.updateProject(id, payload, etag);
        if (res.success && res.data) {
          setEtag(res.etag);
          setPublished(res.data.published);
          setFeedback({
            type: 'success',
            message: `Project "${res.data.title}" updated successfully!`,
          });
          setTimeout(() => navigate('/admin/projects'), 1500);
        } else if (res.error?.includes('conflict') || res.error?.includes('409') || res.error?.includes('Concurrency') || res.error?.includes('modified by another session')) {
          setConcurrencyConflict(true);
          setFeedback({
            type: 'error',
            message: 'Conflict: This project was modified in another session. Please reload before saving.',
          });
        } else {
          setFeedback({ type: 'error', message: res.error || 'Failed to update project.' });
        }
      } else {
        const res = await adminService.createProject(payload, etag);
        if (res.success && res.data) {
          setFeedback({
            type: 'success',
            message: `Project "${res.data.title}" created successfully!`,
          });
          setTimeout(() => navigate('/admin/projects'), 1500);
        } else {
          setFeedback({ type: 'error', message: res.error || 'Failed to create project.' });
        }
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <SkeletonLoader className="h-10 w-48" />
        <Card padding="lg" className="space-y-6">
          <SkeletonLoader className="h-12 w-full" />
          <SkeletonLoader className="h-24 w-full" />
          <SkeletonLoader className="h-32 w-full" />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl pb-16">
      {/* Top Header & Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            to="/admin/projects"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-primary hover:text-brand-hover focus-ring rounded mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Projects List</span>
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">
            {isEditMode ? `Edit Project: ${title || 'Case Study'}` : 'Create New Engineering Project'}
          </h1>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSave(false)}
            isLoading={saving}
            leftIcon={<Save className="w-4 h-4" />}
          >
            Save Draft
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => handleSave(true)}
            isLoading={saving}
            leftIcon={<Eye className="w-4 h-4" />}
          >
            Save & Publish
          </Button>
        </div>
      </div>

      {/* Concurrency Conflict Alert */}
      {concurrencyConflict && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm space-y-2">
            <h4 className="font-bold">Optimistic Concurrency Conflict Detected</h4>
            <p>
              Another user or tab updated this project since you opened it. Overwriting would discard their changes.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.reload()}
            >
              Reload Latest Data
            </Button>
          </div>
        </div>
      )}

      {/* Feedback Banner */}
      {feedback && (
        <div
          role="status"
          className={`p-4 rounded-xl border flex items-center gap-3 text-sm font-medium ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Section 1: Core Identifiers & Metadata */}
      <Card padding="lg" className="space-y-6">
        <h2 className="text-base font-bold text-slate-900 border-b border-stroke-subtle pb-3">
          1. Core Identification & Status
        </h2>

        <div className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600 tracking-wider mb-1.5">
              Project Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="e.g. RoboShop E-Commerce DevSecOps Pipeline & Infrastructure"
              className={`w-full px-3.5 py-2.5 text-sm bg-white border rounded-lg focus-ring text-slate-900 ${
                errors.title ? 'border-rose-400 bg-rose-50/20' : 'border-stroke-subtle'
              }`}
            />
            {errors.title && <p className="text-xs text-rose-600 mt-1">{errors.title}</p>}
          </div>

          {/* Slug */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold uppercase text-slate-600 tracking-wider">
                URL Slug <span className="text-rose-500">*</span>
              </label>
              {isEditMode && (
                <button
                  type="button"
                  onClick={() => setSlugLocked(!slugLocked)}
                  className="text-xs text-brand-primary hover:underline inline-flex items-center gap-1 focus-ring rounded"
                >
                  {slugLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                  <span>{slugLocked ? 'Unlock to Edit' : 'Lock Slug'}</span>
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-mono">/projects/</span>
              <input
                type="text"
                value={slug}
                disabled={slugLocked}
                onChange={(e) => {
                  setSlug(e.target.value);
                  setSlugManuallyEdited(true);
                }}
                placeholder="roboshop-devsecops"
                className={`w-full px-3.5 py-2 text-sm bg-white border rounded-lg focus-ring text-slate-900 font-mono disabled:bg-slate-50 disabled:text-slate-500 ${
                  errors.slug ? 'border-rose-400 bg-rose-50/20' : 'border-stroke-subtle'
                }`}
              />
            </div>
            {errors.slug && <p className="text-xs text-rose-600 mt-1">{errors.slug}</p>}
          </div>

          {/* Category & Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600 tracking-wider mb-1.5">
                Category <span className="text-rose-500">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-white border border-stroke-subtle rounded-lg focus-ring text-slate-900"
              >
                {CATEGORY_PRESETS.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
                <option value="custom">Custom Category...</option>
              </select>
              {category === 'custom' && (
                <input
                  type="text"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  placeholder="Enter custom category"
                  className="mt-2 w-full px-3 py-1.5 text-xs bg-white border border-stroke-subtle rounded-md focus-ring"
                />
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600 tracking-wider mb-1.5">
                Deployment / Operational Status <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={deploymentStatus}
                onChange={(e) => setDeploymentStatus(e.target.value)}
                placeholder="e.g. Production Pipeline Automated"
                className="w-full px-3.5 py-2 text-sm bg-white border border-stroke-subtle rounded-lg focus-ring text-slate-900"
              />
              <div className="flex flex-wrap gap-1 mt-2">
                {STATUS_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setDeploymentStatus(preset)}
                    className="text-[11px] px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Short Summary */}
          <div>
            <RichTextEditor
              label="Executive Summary (Card Preview)"
              required
              value={summary}
              onChange={setSummary}
              minHeight="90px"
              placeholder="High-level engineering summary for portfolio cards and search results (min 10 characters)..."
              helperText="Summary displayed on homepage cards and case study hero."
            />
            {errors.summary && <p className="text-xs text-rose-600 mt-1">{errors.summary}</p>}
          </div>

          {/* Detailed Overview */}
          <div>
            <RichTextEditor
              label="Detailed Case Study Overview (Optional)"
              value={detailedOverview}
              onChange={setDetailedOverview}
              minHeight="120px"
              placeholder="Expanded project overview detailing project scope, team role, and background..."
              helperText="Comprehensive breakdown displayed in the project overview section."
            />
          </div>

          {/* Technology Stack Tags */}
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600 tracking-wider mb-1.5">
              Technology Stack <span className="text-rose-500">*</span>
            </label>
            <div className="flex items-center gap-2 mb-2">
              <input
                type="text"
                value={techInput}
                onChange={(e) => setTechInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTech();
                  }
                }}
                placeholder="Type technology (e.g. Docker, Kubernetes, Kotlin) and press Enter"
                className="w-full px-3.5 py-2 text-sm bg-white border border-stroke-subtle rounded-lg focus-ring text-slate-900"
              />
              <Button type="button" variant="outline" size="sm" onClick={handleAddTech}>
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5 min-h-[32px] p-2 bg-slate-50 rounded-lg border border-stroke-subtle">
              {techStack.length === 0 ? (
                <span className="text-xs text-slate-400 italic">No technologies added yet.</span>
              ) : (
                techStack.map((tech) => (
                  <span
                    key={tech}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-brand-primary/10 text-brand-primary border border-brand-primary/20"
                  >
                    <span>{tech}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTech(tech)}
                      className="hover:text-rose-600 focus-ring rounded"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))
              )}
            </div>
            {errors.techStack && <p className="text-xs text-rose-600 mt-1">{errors.techStack}</p>}
          </div>
        </div>
      </Card>

      {/* Section 2: Technical Narrative */}
      <Card padding="lg" className="space-y-6">
        <h2 className="text-base font-bold text-slate-900 border-b border-stroke-subtle pb-3">
          2. Engineering Narrative & Architecture
        </h2>

        <div className="space-y-4">
          {/* Problem Statement */}
          {/* Problem Statement */}
          <div>
            <RichTextEditor
              label="The Engineering Problem & Challenge"
              value={problemStatement}
              onChange={setProblemStatement}
              minHeight="90px"
              placeholder="Describe the architectural pain point, bottleneck, or scaling challenge..."
              helperText="Outlines the technical obstacles and engineering requirements."
            />
          </div>

          {/* Solution Architecture */}
          <div>
            <RichTextEditor
              label="Solution & System Architecture"
              value={solutionArchitecture}
              onChange={setSolutionArchitecture}
              minHeight="110px"
              placeholder="Detail the technical implementation, patterns used, pipeline configuration, or cloud components..."
              helperText="Architectural approach and technical stack integration."
            />
          </div>

          {/* Key Features List */}
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600 tracking-wider mb-1.5">
              Key Features & Deliverables
            </label>
            <div className="flex items-center gap-2 mb-2">
              <input
                type="text"
                value={featureInput}
                onChange={(e) => setFeatureInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddFeature();
                  }
                }}
                placeholder="Enter a key feature or milestone and press Enter..."
                className="w-full px-3.5 py-2 text-sm bg-white border border-stroke-subtle rounded-lg focus-ring text-slate-900"
              />
              <Button type="button" variant="outline" size="sm" onClick={handleAddFeature}>
                Add
              </Button>
            </div>
            <div className="space-y-2">
              {features.map((feat, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-stroke-subtle text-xs text-slate-800"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{feat}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveFeature(idx)}
                    className="text-slate-400 hover:text-rose-600 focus-ring rounded p-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Technical Challenges */}
          <div>
            <RichTextEditor
              label="Technical Challenges & Trade-offs"
              value={technicalChallenges}
              onChange={setTechnicalChallenges}
              minHeight="90px"
              placeholder="Edge cases encountered, race conditions, memory limits, or trade-offs..."
              helperText="Technical trade-offs and hurdles overcome during delivery."
            />
          </div>

          {/* Testing Details */}
          <div>
            <RichTextEditor
              label="Testing Strategy & Verification"
              value={testingDetails}
              onChange={setTestingDetails}
              minHeight="90px"
              placeholder="Unit tests, integration tests, Trivy/SonarQube scans, E2E benchmarks..."
              helperText="Testing methodology, test automation, and security scans."
            />
          </div>
        </div>
      </Card>

      {/* Section 3: Media & Gallery Management */}
      <Card padding="lg" className="space-y-6">
        <h2 className="text-base font-bold text-slate-900 border-b border-stroke-subtle pb-3 flex items-center justify-between">
          <span>3. Project Media & Visuals</span>
          <span className="text-xs font-normal text-slate-400">JPEG, PNG, WebP (Max 5 MB each)</span>
        </h2>

        {/* Cover Image */}
        <div className="space-y-3">
          <label className="block text-xs font-semibold uppercase text-slate-600 tracking-wider">
            Cover Image
          </label>
          {coverImage?.url ? (
            <div className="flex items-center gap-4 p-4 rounded-xl border border-stroke-subtle bg-slate-50">
              <img
                src={coverImage.url}
                alt="Cover Preview"
                className="w-24 h-24 object-cover rounded-lg border border-stroke-subtle"
              />
              <div className="flex-grow space-y-1 text-xs">
                <span className="font-semibold text-slate-800">{coverImage.filename}</span>
                <p className="text-slate-500 font-mono">{coverImage.key}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCoverImage(null)}
                  leftIcon={<Trash2 className="w-3.5 h-3.5 text-rose-500" />}
                >
                  Remove Cover
                </Button>
              </div>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-stroke-subtle rounded-xl hover:bg-slate-50/80 cursor-pointer transition-colors text-center">
              <Upload className="w-6 h-6 text-slate-400 mb-2" />
              <span className="text-xs font-semibold text-brand-primary">Upload Cover Image</span>
              <span className="text-[11px] text-slate-400 mt-0.5">JPEG, PNG, or WebP up to 5 MB</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                disabled={uploadingMedia === 'cover'}
                onChange={handleUploadCover}
              />
            </label>
          )}
        </div>

        {/* Architecture Diagrams Management */}
        <div className="space-y-4 pt-4 border-t border-stroke-subtle">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-xs font-semibold uppercase text-slate-600 tracking-wider">
                Architecture Diagrams Showcase ({architectureDiagrams.length})
              </label>
              <p className="text-[11px] text-slate-400">
                Detailed architecture topologies, CI/CD pipelines, and cloud designs with interactive zoom.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleOpenAddDiagram}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              Add Architecture Diagram
            </Button>
          </div>

          {architectureDiagrams.length === 0 ? (
            <div className="p-8 border border-dashed border-stroke-subtle rounded-xl text-center text-xs text-slate-400 bg-slate-50/50">
              No structured architecture diagrams added yet. Click &quot;Add Architecture Diagram&quot; to showcase your system architecture, cloud topology, or CI/CD pipelines.
            </div>
          ) : (
            <div className="space-y-3">
              {architectureDiagrams.map((diag, idx) => (
                <div
                  key={diag.id || idx}
                  className="p-3.5 rounded-xl border border-stroke-subtle bg-white flex flex-col sm:flex-row items-start sm:items-center gap-4 hover:border-brand-primary/30 transition-colors"
                >
                  <img
                    src={diag.image.url}
                    alt={diag.title}
                    className="w-24 h-16 object-contain rounded-lg bg-slate-50 border border-stroke-subtle shrink-0 p-1"
                  />
                  <div className="flex-grow space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-slate-900 truncate">{diag.title}</span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-brand-subtle text-brand-primary border border-brand-primary/20">
                        {diag.category}
                      </span>
                      {diag.published !== false ? (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Live
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                          Hidden
                        </span>
                      )}
                    </div>
                    {diag.description && (
                      <p className="text-xs text-slate-600 line-clamp-1">{diag.description}</p>
                    )}
                    <div className="flex items-center gap-1.5 flex-wrap text-[10px] text-slate-400">
                      {diag.components && diag.components.length > 0 && (
                        <span>Components: {diag.components.join(', ')}</span>
                      )}
                      {diag.technologies && diag.technologies.length > 0 && (
                        <span>• Tech: {diag.technologies.join(', ')}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 self-end sm:self-center shrink-0">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMoveDiagram(idx, 'up')}
                      className="p-1 rounded text-slate-400 hover:text-slate-800 disabled:opacity-30 focus-ring"
                      title="Move Up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === architectureDiagrams.length - 1}
                      onClick={() => handleMoveDiagram(idx, 'down')}
                      className="p-1 rounded text-slate-400 hover:text-slate-800 disabled:opacity-30 focus-ring"
                      title="Move Down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleDiagramPublish(idx)}
                      className={`p-1 rounded focus-ring ${
                        diag.published !== false
                          ? 'text-emerald-600 hover:text-emerald-800'
                          : 'text-amber-500 hover:text-amber-700'
                      }`}
                      title={diag.published !== false ? 'Hide Diagram' : 'Show Diagram'}
                    >
                      {diag.published !== false ? (
                        <Eye className="w-3.5 h-3.5" />
                      ) : (
                        <EyeOff className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenEditDiagram(idx)}
                      className="p-1 rounded text-slate-400 hover:text-brand-primary focus-ring"
                      title="Edit Diagram Details"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteDiagram(idx)}
                      className="p-1 rounded text-slate-400 hover:text-rose-600 focus-ring"
                      title="Delete Diagram"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Legacy / Top-Level Architecture Diagram Fallback */}
        <div className="space-y-3 pt-4 border-t border-stroke-subtle">
          <label className="block text-xs font-semibold uppercase text-slate-600 tracking-wider">
            Primary / Legacy Diagram (Optional Fallback)
          </label>
          {architectureDiagram?.url ? (
            <div className="p-4 rounded-xl border border-stroke-subtle bg-slate-50 space-y-3">
              <div className="flex items-center gap-4">
                <img
                  src={architectureDiagram.url}
                  alt="Architecture Diagram"
                  className="w-28 h-20 object-contain rounded-lg bg-white border border-stroke-subtle"
                />
                <div className="flex-grow space-y-1 text-xs">
                  <span className="font-semibold text-slate-800">{architectureDiagram.filename}</span>
                  <p className="text-slate-500 font-mono">{architectureDiagram.key}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setArchitectureDiagram(null)}
                    leftIcon={<Trash2 className="w-3.5 h-3.5 text-rose-500" />}
                  >
                    Remove Diagram
                  </Button>
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Diagram Caption / Notes
                </label>
                <input
                  type="text"
                  value={architectureDiagram.caption || ''}
                  onChange={(e) =>
                    setArchitectureDiagram({ ...architectureDiagram, caption: e.target.value })
                  }
                  placeholder="e.g. AWS Multi-Tier Microservices Deployment Topology"
                  className="w-full px-3 py-1.5 text-xs bg-white border border-stroke-subtle rounded-md focus-ring"
                />
              </div>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-stroke-subtle rounded-xl hover:bg-slate-50/80 cursor-pointer transition-colors text-center">
              <Layers className="w-6 h-6 text-slate-400 mb-2" />
              <span className="text-xs font-semibold text-brand-primary">Upload Primary Architecture Diagram</span>
              <span className="text-[11px] text-slate-400 mt-0.5">High-resolution architecture diagram</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                disabled={uploadingMedia === 'diagram'}
                onChange={handleUploadDiagram}
              />
            </label>
          )}
        </div>

        {/* Screenshot Gallery */}
        <div className="space-y-3 pt-4 border-t border-stroke-subtle">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold uppercase text-slate-600 tracking-wider">
              Screenshots Gallery ({screenshots.length})
            </label>
            <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stroke-subtle text-xs font-semibold text-brand-primary hover:bg-slate-50 cursor-pointer focus-ring">
              <Plus className="w-3.5 h-3.5" />
              <span>Add Screenshot</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                disabled={uploadingMedia === 'screenshot'}
                onChange={handleUploadScreenshot}
              />
            </label>
          </div>

          {screenshots.length === 0 ? (
            <div className="p-8 border border-dashed border-stroke-subtle rounded-xl text-center text-xs text-slate-400 bg-slate-50/50">
              No screenshots added to gallery yet. Click "Add Screenshot" to upload visual previews.
            </div>
          ) : (
            <div className="space-y-3">
              {screenshots.map((shot, idx) => (
                <div
                  key={shot.id || idx}
                  className="p-3 rounded-xl border border-stroke-subtle bg-canvas-surface flex flex-col sm:flex-row items-start sm:items-center gap-4"
                >
                  <img
                    src={shot.url}
                    alt={shot.altText || `Screenshot ${idx + 1}`}
                    className="w-20 h-16 object-cover rounded-lg border border-stroke-subtle shrink-0"
                  />
                  <div className="flex-grow space-y-1 w-full">
                    <input
                      type="text"
                      value={shot.caption || ''}
                      onChange={(e) => handleUpdateScreenshotCaption(idx, e.target.value)}
                      placeholder="Optional screenshot caption or feature note..."
                      className="w-full px-3 py-1.5 text-xs bg-white border border-stroke-subtle rounded-md focus-ring"
                    />
                    <div className="text-[11px] text-slate-400 font-mono truncate">
                      {shot.key}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 self-end sm:self-center">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMoveScreenshot(idx, 'up')}
                      className="p-1 rounded text-slate-400 hover:text-slate-800 disabled:opacity-30 focus-ring"
                      title="Move Up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === screenshots.length - 1}
                      onClick={() => handleMoveScreenshot(idx, 'down')}
                      className="p-1 rounded text-slate-400 hover:text-slate-800 disabled:opacity-30 focus-ring"
                      title="Move Down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveScreenshot(idx)}
                      className="p-1 rounded text-slate-400 hover:text-rose-600 focus-ring"
                      title="Delete Screenshot"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Section 4: External Links & Visibility */}
      <Card padding="lg" className="space-y-6">
        <h2 className="text-base font-bold text-slate-900 border-b border-stroke-subtle pb-3">
          4. External Links & Publication Status
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600 tracking-wider mb-1.5">
              GitHub Repository URL
            </label>
            <input
              type="text"
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              placeholder="https://github.com/dsecops88/..."
              className="w-full px-3 py-2 text-sm bg-white border border-stroke-subtle rounded-lg focus-ring text-slate-900"
            />
            {errors.githubUrl && <p className="text-xs text-rose-600 mt-1">{errors.githubUrl}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600 tracking-wider mb-1.5">
              Live Demo / Website URL
            </label>
            <input
              type="text"
              value={liveDemoUrl}
              onChange={(e) => setLiveDemoUrl(e.target.value)}
              placeholder="https://nexora.dsecops88.online"
              className="w-full px-3 py-2 text-sm bg-white border border-stroke-subtle rounded-lg focus-ring text-slate-900"
            />
            {errors.liveDemoUrl && <p className="text-xs text-rose-600 mt-1">{errors.liveDemoUrl}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600 tracking-wider mb-1.5">
              Google Play Store URL
            </label>
            <input
              type="text"
              value={googlePlayUrl}
              onChange={(e) => setGooglePlayUrl(e.target.value)}
              placeholder="https://play.google.com/store/apps/..."
              className="w-full px-3 py-2 text-sm bg-white border border-stroke-subtle rounded-lg focus-ring text-slate-900"
            />
            {errors.googlePlayUrl && <p className="text-xs text-rose-600 mt-1">{errors.googlePlayUrl}</p>}
          </div>
        </div>

        {/* Publication & Featured Checkboxes */}
        <div className="pt-4 border-t border-stroke-subtle grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={published}
              onChange={(e) => {
                const nextVal = e.target.checked;
                setPublished(nextVal);
                if (!nextVal) setFeatured(false);
              }}
              className="w-4 h-4 rounded text-brand-primary focus-ring border-stroke-subtle"
            />
            <div>
              <span className="text-sm font-semibold text-slate-900">Publish Immediately</span>
              <p className="text-xs text-slate-500">Live on public portfolio</p>
            </div>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={featured}
              onChange={(e) => {
                const nextVal = e.target.checked;
                if (nextVal && !published) {
                  setErrors((prev) => ({ ...prev, featured: 'Featured projects must be published.' }));
                } else {
                  setErrors((prev) => ({ ...prev, featured: '' }));
                }
                setFeatured(nextVal);
              }}
              className="w-4 h-4 rounded text-brand-primary focus-ring border-stroke-subtle"
            />
            <div>
              <span className="text-sm font-semibold text-slate-900">Feature on Homepage</span>
              <p className="text-xs text-slate-500">Top-tier spotlight card</p>
            </div>
          </label>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600 tracking-wider mb-1">
              Display Order
            </label>
            <input
              type="number"
              min={1}
              value={displayOrder}
              onChange={(e) => setDisplayOrder(parseInt(e.target.value, 10) || 1)}
              className="w-24 px-3 py-1.5 text-sm bg-white border border-stroke-subtle rounded-lg focus-ring"
            />
          </div>
        </div>
        {errors.featured && <p className="text-xs text-rose-600">{errors.featured}</p>}
      </Card>

      {/* Section 5: SEO & Search Metadata */}
      <Card padding="lg" className="space-y-6">
        <h2 className="text-base font-bold text-slate-900 border-b border-stroke-subtle pb-3">
          5. Search Engine Optimization (SEO)
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600 tracking-wider mb-1.5">
              Custom Meta Title
            </label>
            <input
              type="text"
              value={metaTitle}
              onChange={(e) => setMetaTitle(e.target.value)}
              placeholder="e.g. RoboShop DevSecOps Pipeline & Infrastructure | Ravi Dasari"
              className="w-full px-3 py-2 text-sm bg-white border border-stroke-subtle rounded-lg focus-ring text-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600 tracking-wider mb-1.5">
              Meta Description
            </label>
            <textarea
              rows={2}
              value={metaDescription}
              onChange={(e) => setMetaDescription(e.target.value)}
              placeholder="Target description for search index snippets and OpenGraph shares..."
              className="w-full px-3 py-2 text-sm bg-white border border-stroke-subtle rounded-lg focus-ring text-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600 tracking-wider mb-1.5">
              SEO Keywords (Comma Separated)
            </label>
            <input
              type="text"
              value={keywordsInput}
              onChange={(e) => setKeywordsInput(e.target.value)}
              placeholder="DevSecOps, Kubernetes, CI/CD, Trivy, Docker"
              className="w-full px-3 py-2 text-sm bg-white border border-stroke-subtle rounded-lg focus-ring text-slate-900"
            />
          </div>
        </div>
      </Card>

      {/* Bottom Action Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-stroke-subtle">
        <Button
          variant="outline"
          onClick={() => navigate('/admin/projects')}
          disabled={saving}
        >
          Cancel
        </Button>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => handleSave(false)}
            isLoading={saving}
            leftIcon={<Save className="w-4 h-4" />}
          >
            Save as Draft
          </Button>
          <Button
            variant="primary"
            onClick={() => handleSave(true)}
            isLoading={saving}
            leftIcon={<Eye className="w-4 h-4" />}
          >
            Save & Publish
          </Button>
        </div>
      </div>
      {/* Architecture Diagram Add/Edit Modal */}
      {diagramModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="diagram-modal-title"
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
        >
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4 border border-stroke-subtle my-8">
            <div className="flex items-center justify-between border-b border-stroke-subtle pb-3">
              <h3 id="diagram-modal-title" className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-brand-primary" />
                <span>{editingDiagramIdx !== null ? 'Edit Architecture Diagram' : 'Add Architecture Diagram'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setDiagramModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 focus-ring rounded p-1"
                aria-label="Close dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {diagError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{diagError}</span>
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Diagram Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={diagTitle}
                  onChange={(e) => setDiagTitle(e.target.value)}
                  placeholder="e.g. Multi-Tier VPC & EKS Deployment Architecture"
                  className="w-full px-3 py-2 text-sm bg-white border border-stroke-subtle rounded-lg focus-ring text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Architecture Category <span className="text-rose-500">*</span>
                </label>
                <select
                  value={diagCategory}
                  onChange={(e) => setDiagCategory(e.target.value as ArchitectureCategory)}
                  className="w-full px-3 py-2 text-sm bg-white border border-stroke-subtle rounded-lg focus-ring text-slate-900"
                >
                  {ARCHITECTURE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Diagram Description (Optional)
                </label>
                <textarea
                  rows={2}
                  value={diagDescription}
                  onChange={(e) => setDiagDescription(e.target.value)}
                  placeholder="Explain data ingress, security boundaries, VPC peering, or pipeline stages..."
                  className="w-full px-3 py-2 text-sm bg-white border border-stroke-subtle rounded-lg focus-ring text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Diagram Image <span className="text-rose-500">*</span>
                </label>
                {diagImage?.url ? (
                  <div className="flex items-center gap-3 p-3 bg-slate-50 border border-stroke-subtle rounded-lg">
                    <img
                      src={diagImage.url}
                      alt="Uploaded Diagram"
                      className="w-20 h-14 object-contain rounded bg-white border border-stroke-subtle"
                    />
                    <div className="flex-grow min-w-0">
                      <p className="font-semibold text-slate-800 truncate">{diagImage.filename}</p>
                      <p className="text-slate-400 font-mono text-[10px] truncate">{diagImage.key}</p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setDiagImage(null)}
                      leftIcon={<Trash2 className="w-3.5 h-3.5 text-rose-500" />}
                    >
                      Remove
                    </Button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-stroke-subtle rounded-xl hover:bg-slate-50/80 cursor-pointer text-center">
                    <Upload className="w-5 h-5 text-slate-400 mb-1" />
                    <span className="font-semibold text-brand-primary">Upload Diagram File</span>
                    <span className="text-[11px] text-slate-400">PNG, JPEG, WebP (Max 5 MB)</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      disabled={uploadingMedia === 'modal-diagram'}
                      onChange={handleUploadDiagramModalImage}
                    />
                  </label>
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Key Components (Comma-separated)
                </label>
                <input
                  type="text"
                  value={diagComponentsInput}
                  onChange={(e) => setDiagComponentsInput(e.target.value)}
                  placeholder="e.g. ALB Ingress, Cart Service, Redis Cache, Postgres DB"
                  className="w-full px-3 py-2 text-sm bg-white border border-stroke-subtle rounded-lg focus-ring text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Technologies / Tools (Comma-separated)
                </label>
                <input
                  type="text"
                  value={diagTechInput}
                  onChange={(e) => setDiagTechInput(e.target.value)}
                  placeholder="e.g. Kubernetes, AWS EKS, Helm, Terraform, Trivy"
                  className="w-full px-3 py-2 text-sm bg-white border border-stroke-subtle rounded-lg focus-ring text-slate-900"
                />
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={diagPublished}
                    onChange={(e) => setDiagPublished(e.target.checked)}
                    className="w-4 h-4 rounded text-brand-primary focus-ring border-stroke-subtle"
                  />
                  <div>
                    <span className="font-semibold text-slate-900">Publish in Public Gallery</span>
                    <p className="text-[11px] text-slate-400">Visible on the case-study page</p>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-stroke-subtle">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDiagramModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleSaveDiagramModal}
                leftIcon={<Save className="w-3.5 h-3.5" />}
              >
                {editingDiagramIdx !== null ? 'Update Diagram' : 'Save Diagram'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
