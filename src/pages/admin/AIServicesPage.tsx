import React, { useEffect, useState, useRef } from 'react';
import { adminService } from '../../services/adminService';
import {
  AIService,
  AIServiceCategory,
  AIDeliveryStatus,
  AIEvidenceStatus,
  Project,
} from '../../types/portfolio';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { StatusBadge, EvidenceBadge, TechTag } from '../../components/common/Badge';
import { SkeletonLoader } from '../../components/common/SkeletonLoader';
import { EmptyState } from '../../components/common/EmptyState';
import { RichTextEditor } from '../../components/common/RichTextEditor';
import {
  Bot,
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
  Upload,
  X,
  Star,
  Layers,
  FolderPlus,
} from 'lucide-react';

export const AIServicesPage: React.FC = () => {
  const [services, setServices] = useState<AIService[]>([]);
  const [categories, setCategories] = useState<AIServiceCategory[]>([]);
  const [availableProjects, setAvailableProjects] = useState<Project[]>([]);
  const [servicesEtag, setServicesEtag] = useState<string | undefined>();
  const [categoriesEtag, setCategoriesEtag] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Active view tab: services list vs category manager
  const [activeTab, setActiveTab] = useState<'services' | 'categories'>('services');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDeliveryStatus, setSelectedDeliveryStatus] = useState<string>('all');
  const [selectedPublicationStatus, setSelectedPublicationStatus] = useState<'all' | 'published' | 'draft'>('all');

  // Service Modal State
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<AIService | null>(null);
  const [serviceFormData, setServiceFormData] = useState<{
    title: string;
    slug: string;
    categoryId: string;
    category: string;
    shortDescription: string;
    description: string;
    customerProblem: string;
    proposedSolution: string;
    capabilities: string[];
    useCases: string[];
    integrations: string[];
    tooling: string[];
    targetIndustries: string[];
    coverImageUrl: string;
    demoUrl: string;
    relatedProjectIds: string[];
    deliveryStatus: AIDeliveryStatus;
    evidenceStatus: AIEvidenceStatus;
    published: boolean;
    featured: boolean;
    seoTitle: string;
    seoDescription: string;
  }>({
    title: '',
    slug: '',
    categoryId: '',
    category: '',
    shortDescription: '',
    description: '',
    customerProblem: '',
    proposedSolution: '',
    capabilities: [''],
    useCases: [''],
    integrations: [''],
    tooling: [],
    targetIndustries: [],
    coverImageUrl: '',
    demoUrl: '',
    relatedProjectIds: [],
    deliveryStatus: 'Planned',
    evidenceStatus: 'Not Verified',
    published: false,
    featured: false,
    seoTitle: '',
    seoDescription: '',
  });
  const [savingService, setSavingService] = useState(false);
  const [serviceModalError, setServiceModalError] = useState<string | null>(null);
  const [newToolInput, setNewToolInput] = useState('');
  const [uploadingCover, setUploadingCover] = useState(false);
  const coverFileInputRef = useRef<HTMLInputElement>(null);

  // Category Modal State
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<AIServiceCategory | null>(null);
  const [categoryFormData, setCategoryFormData] = useState<{
    name: string;
    slug: string;
    icon: string;
    description: string;
    published: boolean;
  }>({
    name: '',
    slug: '',
    icon: 'Bot',
    description: '',
    published: true,
  });
  const [savingCategory, setSavingCategory] = useState(false);
  const [categoryModalError, setCategoryModalError] = useState<string | null>(null);

  // Deletion Confirmation State
  const [itemToDelete, setItemToDelete] = useState<
    | { type: 'service'; item: AIService }
    | { type: 'category'; item: AIServiceCategory }
    | null
  >(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    const [servicesRes, catsRes, projectsRes] = await Promise.all([
      adminService.getAIServices(),
      adminService.getAIServiceCategories(),
      adminService.getProjects(),
    ]);

    if (servicesRes.success && servicesRes.data) {
      setServices(servicesRes.data);
      setServicesEtag(servicesRes.etag);
    } else {
      setError(servicesRes.error || 'Failed to load AI services');
    }

    if (catsRes.success && catsRes.data) {
      setCategories(catsRes.data);
      setCategoriesEtag(catsRes.etag);
    } else {
      setError(catsRes.error || 'Failed to load AI service categories');
    }

    if (projectsRes.success && projectsRes.data) {
      setAvailableProjects(projectsRes.data);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // -------------------------------------------------------------
  // Service Handlers
  // -------------------------------------------------------------
  const handleOpenServiceModal = (service?: AIService) => {
    setServiceModalError(null);
    setNewToolInput('');
    if (service) {
      setEditingService(service);
      setServiceFormData({
        title: service.title,
        slug: service.slug,
        categoryId: service.categoryId || (categories[0]?.id ?? 'custom-ai-integrations'),
        category: service.category || (categories[0]?.name ?? 'Custom AI Integrations'),
        shortDescription: service.shortDescription || '',
        description: service.description || '',
        customerProblem: service.customerProblem || '',
        proposedSolution: service.proposedSolution || '',
        capabilities: service.capabilities && service.capabilities.length > 0 ? [...service.capabilities] : [''],
        useCases: service.useCases && service.useCases.length > 0 ? [...service.useCases] : [''],
        integrations: service.integrations && service.integrations.length > 0 ? [...service.integrations] : [''],
        tooling: [...(service.tooling || [])],
        targetIndustries: [...(service.targetIndustries || [])],
        coverImageUrl: service.coverImage?.url || '',
        demoUrl: service.demoUrl || '',
        relatedProjectIds: [...(service.relatedProjectIds || [])],
        deliveryStatus: service.deliveryStatus || 'Planned',
        evidenceStatus: service.evidenceStatus || 'Not Verified',
        published: service.published === true,
        featured: service.featured === true,
        seoTitle: service.seoTitle || '',
        seoDescription: service.seoDescription || '',
      });
    } else {
      setEditingService(null);
      const defaultCat = categories[0] || { id: 'custom-ai-integrations', name: 'Custom AI Integrations' };
      setServiceFormData({
        title: '',
        slug: '',
        categoryId: defaultCat.id,
        category: defaultCat.name,
        shortDescription: '',
        description: '',
        customerProblem: '',
        proposedSolution: '',
        capabilities: [''],
        useCases: [''],
        integrations: [''],
        tooling: [],
        targetIndustries: [],
        coverImageUrl: '',
        demoUrl: '',
        relatedProjectIds: [],
        deliveryStatus: 'Planned',
        evidenceStatus: 'Not Verified',
        published: false,
        featured: false,
        seoTitle: '',
        seoDescription: '',
      });
    }
    setIsServiceModalOpen(true);
  };

  const handleTitleChange = (val: string) => {
    const slugVal = val
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
    setServiceFormData((prev) => ({
      ...prev,
      title: val,
      slug: editingService ? prev.slug : slugVal,
    }));
  };

  const handleCategoryChange = (catId: string) => {
    const selected = categories.find((c) => c.id === catId);
    setServiceFormData((prev) => ({
      ...prev,
      categoryId: catId,
      category: selected ? selected.name : prev.category,
    }));
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingCover(true);
    setServiceModalError(null);

    const res = await adminService.uploadMedia(file);
    setUploadingCover(false);

    if (res.success && res.data) {
      setServiceFormData((prev) => ({
        ...prev,
        coverImageUrl: res.data!.url,
      }));
    } else {
      setServiceModalError(res.error || 'Failed to upload cover image');
    }
  };

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    setServiceModalError(null);

    // Validations
    if (!serviceFormData.title.trim() || serviceFormData.title.trim().length < 2) {
      setServiceModalError('Service title must be at least 2 characters.');
      return;
    }
    if (!serviceFormData.slug.trim() || !/^[a-z0-9-]+$/i.test(serviceFormData.slug.trim())) {
      setServiceModalError('Slug must contain only alphanumeric characters and hyphens.');
      return;
    }
    if (!serviceFormData.description.trim() || serviceFormData.description.trim().length < 10) {
      setServiceModalError('Detailed description must be at least 10 characters.');
      return;
    }
    if (serviceFormData.demoUrl.trim() && !/^https?:\/\//i.test(serviceFormData.demoUrl.trim())) {
      setServiceModalError('Demo URL must be a valid HTTP or HTTPS URL.');
      return;
    }

    setSavingService(true);

    const cleanedCapabilities = serviceFormData.capabilities
      .map((c) => c.trim())
      .filter((c) => c.length > 0);

    const cleanedUseCases = serviceFormData.useCases
      .map((u) => u.trim())
      .filter((u) => u.length > 0);

    const cleanedIntegrations = serviceFormData.integrations
      .map((i) => i.trim())
      .filter((i) => i.length > 0);

    const payload = {
      title: serviceFormData.title.trim(),
      slug: serviceFormData.slug.trim().toLowerCase(),
      categoryId: serviceFormData.categoryId,
      category: serviceFormData.category,
      shortDescription: serviceFormData.shortDescription.trim() || undefined,
      description: serviceFormData.description.trim(),
      customerProblem: serviceFormData.customerProblem.trim() || undefined,
      proposedSolution: serviceFormData.proposedSolution.trim() || undefined,
      capabilities: cleanedCapabilities,
      useCases: cleanedUseCases,
      integrations: cleanedIntegrations,
      tooling: serviceFormData.tooling,
      targetIndustries: serviceFormData.targetIndustries,
      coverImage: serviceFormData.coverImageUrl.trim()
        ? {
            key: `ai-services/${Date.now()}.png`,
            url: serviceFormData.coverImageUrl.trim(),
            filename: `${serviceFormData.slug}-cover.png`,
            mimeType: 'image/png' as const,
            altText: `${serviceFormData.title} cover`,
            uploadedAt: new Date().toISOString(),
          }
        : null,
      demoUrl: serviceFormData.demoUrl.trim() || null,
      relatedProjectIds: serviceFormData.relatedProjectIds,
      deliveryStatus: serviceFormData.deliveryStatus,
      evidenceStatus: serviceFormData.evidenceStatus,
      status: serviceFormData.deliveryStatus,
      published: serviceFormData.published,
      featured: serviceFormData.featured,
      order: editingService ? editingService.order : services.length + 1,
      seoTitle: serviceFormData.seoTitle.trim() || undefined,
      seoDescription: serviceFormData.seoDescription.trim() || undefined,
      revision: editingService ? editingService.revision : 1,
    };

    let res;
    if (editingService) {
      res = await adminService.updateAIService(editingService.id, payload, servicesEtag);
    } else {
      res = await adminService.createAIService(payload, servicesEtag);
    }

    setSavingService(false);

    if (res.success && res.data) {
      setIsServiceModalOpen(false);
      setFeedback({
        type: 'success',
        message: `AI Service "${res.data.title}" saved successfully.`,
      });
      await loadData();
    } else if (res.error?.includes('modified by another session')) {
      setServiceModalError('Conflict: AI Services were modified in another session. Please reload to sync recent changes.');
    } else {
      setServiceModalError(res.error || 'Failed to save AI service.');
    }
  };

  const handleTogglePublish = async (service: AIService) => {
    const res = await adminService.publishAIService(service.id, !service.published, servicesEtag);
    if (res.success) {
      setFeedback({
        type: 'success',
        message: `Service "${service.title}" ${!service.published ? 'published' : 'moved to drafts'}.`,
      });
      await loadData();
    } else {
      setFeedback({ type: 'error', message: res.error || 'Failed to update publication status' });
    }
  };

  const handleToggleFeatured = async (service: AIService) => {
    const res = await adminService.toggleFeaturedAIService(service.id, servicesEtag);
    if (res.success) {
      setFeedback({
        type: 'success',
        message: `Service "${service.title}" ${!service.featured ? 'marked as featured' : 'unmarked from featured'}.`,
      });
      await loadData();
    } else {
      setFeedback({ type: 'error', message: res.error || 'Failed to toggle featured status' });
    }
  };

  const handleMoveService = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= services.length) return;

    const newOrder = [...services];
    const [moved] = newOrder.splice(index, 1);
    newOrder.splice(targetIndex, 0, moved);

    const orderedIds = newOrder.map((s) => s.id);
    const res = await adminService.reorderAIServices(orderedIds, servicesEtag);

    if (res.success && res.data) {
      setServices(res.data);
      setFeedback({ type: 'success', message: 'AI services display order updated.' });
      await loadData();
    } else {
      setFeedback({ type: 'error', message: res.error || 'Failed to reorder AI services' });
    }
  };

  // -------------------------------------------------------------
  // Category Handlers
  // -------------------------------------------------------------
  const handleOpenCategoryModal = (cat?: AIServiceCategory) => {
    setCategoryModalError(null);
    if (cat) {
      setEditingCategory(cat);
      setCategoryFormData({
        name: cat.name,
        slug: cat.slug,
        icon: cat.icon || 'Bot',
        description: cat.description || '',
        published: cat.published !== false,
      });
    } else {
      setEditingCategory(null);
      setCategoryFormData({
        name: '',
        slug: '',
        icon: 'Bot',
        description: '',
        published: true,
      });
    }
    setIsCategoryModalOpen(true);
  };

  const handleCategoryNameChange = (val: string) => {
    const slugVal = val
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
    setCategoryFormData((prev) => ({
      ...prev,
      name: val,
      slug: editingCategory ? prev.slug : slugVal,
    }));
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setCategoryModalError(null);

    if (!categoryFormData.name.trim() || categoryFormData.name.trim().length < 2) {
      setCategoryModalError('Category name must be at least 2 characters.');
      return;
    }

    setSavingCategory(true);

    const payload = {
      name: categoryFormData.name.trim(),
      slug: categoryFormData.slug.trim().toLowerCase(),
      icon: categoryFormData.icon.trim() || 'Bot',
      description: categoryFormData.description.trim() || undefined,
      published: categoryFormData.published,
      order: editingCategory ? editingCategory.order : categories.length + 1,
      revision: editingCategory ? editingCategory.revision : 1,
    };

    let res;
    if (editingCategory) {
      res = await adminService.updateAIServiceCategory(editingCategory.id, payload, categoriesEtag);
    } else {
      res = await adminService.createAIServiceCategory(payload, categoriesEtag);
    }

    setSavingCategory(false);

    if (res.success && res.data) {
      setIsCategoryModalOpen(false);
      setFeedback({
        type: 'success',
        message: `Category "${res.data.name}" saved successfully.`,
      });
      await loadData();
    } else {
      setCategoryModalError(res.error || 'Failed to save category.');
    }
  };

  const handleToggleCategoryPublish = async (cat: AIServiceCategory) => {
    const updated = {
      ...cat,
      published: !cat.published,
    };
    const res = await adminService.updateAIServiceCategory(cat.id, updated, categoriesEtag);
    if (res.success) {
      setFeedback({
        type: 'success',
        message: `Category visibility changed to ${!cat.published ? 'published' : 'hidden'}.`,
      });
      await loadData();
    } else {
      setFeedback({ type: 'error', message: res.error || 'Failed to update category visibility.' });
    }
  };

  const handleMoveCategory = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= categories.length) return;

    const newOrder = [...categories];
    const [moved] = newOrder.splice(index, 1);
    newOrder.splice(targetIndex, 0, moved);

    const orderedIds = newOrder.map((c) => c.id);
    const res = await adminService.reorderAIServiceCategories(orderedIds, categoriesEtag);

    if (res.success && res.data) {
      setCategories(res.data);
      setFeedback({ type: 'success', message: 'Category order updated.' });
      await loadData();
    } else {
      setFeedback({ type: 'error', message: res.error || 'Failed to reorder categories.' });
    }
  };

  // -------------------------------------------------------------
  // Deletion Confirmation
  // -------------------------------------------------------------
  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;
    setDeleting(true);
    setDeleteError(null);

    if (itemToDelete.type === 'service') {
      const res = await adminService.deleteAIService(itemToDelete.item.id, servicesEtag);
      setDeleting(false);
      if (res.success) {
        setItemToDelete(null);
        setFeedback({
          type: 'success',
          message: `AI Service "${itemToDelete.item.title}" deleted.`,
        });
        await loadData();
      } else {
        setDeleteError(res.error || 'Failed to delete AI service');
      }
    } else {
      const res = await adminService.deleteAIServiceCategory(itemToDelete.item.id, categoriesEtag);
      setDeleting(false);
      if (res.success) {
        setItemToDelete(null);
        setFeedback({
          type: 'success',
          message: `Category "${itemToDelete.item.name}" deleted.`,
        });
        await loadData();
      } else {
        setDeleteError(res.error || 'Failed to delete category');
      }
    }
  };

  // -------------------------------------------------------------
  // Filtered List
  // -------------------------------------------------------------
  const filteredServices = services.filter((s) => {
    const matchesSearch =
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.shortDescription && s.shortDescription.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.description && s.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.tooling && s.tooling.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())));

    const matchesCategory =
      selectedCategory === 'all' || s.categoryId === selectedCategory;

    const matchesDelivery =
      selectedDeliveryStatus === 'all' || s.deliveryStatus === selectedDeliveryStatus;

    const matchesPub =
      selectedPublicationStatus === 'all'
        ? true
        : selectedPublicationStatus === 'published'
        ? s.published === true
        : s.published === false;

    return matchesSearch && matchesCategory && matchesDelivery && matchesPub;
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <SkeletonLoader className="h-8 w-64" />
          <SkeletonLoader className="h-10 w-36" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SkeletonLoader className="h-24 rounded-xl" count={4} />
        </div>
        <SkeletonLoader className="h-32 rounded-xl" count={3} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-stroke-subtle pb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            AI Services & Automation CMS
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage autonomous workflows, conversational systems, delivery lifecycle states, and public showcase offerings.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'services' ? (
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => handleOpenServiceModal()}
            >
              Add AI Service
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              leftIcon={<FolderPlus className="w-4 h-4" />}
              onClick={() => handleOpenCategoryModal()}
            >
              Add Category
            </Button>
          )}
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4 border-stroke-subtle bg-white">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Services</p>
          <p className="text-2xl font-extrabold text-slate-900 mt-1">{services.length}</p>
        </Card>
        <Card className="p-4 border-stroke-subtle bg-white">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Published</p>
          <p className="text-2xl font-extrabold text-emerald-600 mt-1">
            {services.filter((s) => s.published).length}
          </p>
        </Card>
        <Card className="p-4 border-stroke-subtle bg-white">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Prototypes / Live</p>
          <p className="text-2xl font-extrabold text-brand-primary mt-1">
            {services.filter((s) => s.deliveryStatus === 'Working Prototype' || s.deliveryStatus === 'Live / Deployed').length}
          </p>
        </Card>
        <Card className="p-4 border-stroke-subtle bg-white">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Featured</p>
          <p className="text-2xl font-extrabold text-amber-500 mt-1">
            {services.filter((s) => s.featured).length}
          </p>
        </Card>
      </div>

      {/* View Switcher Tabs */}
      <div className="flex items-center gap-2 border-b border-stroke-subtle pb-px">
        <button
          type="button"
          onClick={() => setActiveTab('services')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'services'
              ? 'border-brand-primary text-brand-primary'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Bot className="w-4 h-4" />
          <span>Services ({services.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('categories')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'categories'
              ? 'border-brand-primary text-brand-primary'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Categories ({categories.length})</span>
        </button>
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

      {/* ========================================================= */}
      {/* View 1: Services List */}
      {/* ========================================================= */}
      {activeTab === 'services' && (
        <div className="space-y-4">
          {/* Search and Filters Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-stroke-subtle shadow-xs">
            <div className="relative flex-grow max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search AI services by title, tool, or description..."
                className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-stroke-subtle text-xs text-slate-900 focus-ring bg-slate-50/50"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-stroke-subtle text-xs text-slate-700 bg-white focus-ring"
              >
                <option value="all">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <select
                value={selectedDeliveryStatus}
                onChange={(e) => setSelectedDeliveryStatus(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-stroke-subtle text-xs text-slate-700 bg-white focus-ring"
              >
                <option value="all">All Delivery States</option>
                <option value="Live / Deployed">Live / Deployed</option>
                <option value="Working Prototype">Working Prototype</option>
                <option value="In Development">In Development</option>
                <option value="Planned">Planned</option>
                <option value="Not Available">Not Available</option>
              </select>

              <select
                value={selectedPublicationStatus}
                onChange={(e) => setSelectedPublicationStatus(e.target.value as any)}
                className="px-2.5 py-1.5 rounded-lg border border-stroke-subtle text-xs text-slate-700 bg-white focus-ring"
              >
                <option value="all">All Status</option>
                <option value="published">Published Only</option>
                <option value="draft">Draft Only</option>
              </select>
            </div>
          </div>

          {/* Services List */}
          {filteredServices.length > 0 ? (
            filteredServices.map((service, idx) => (
              <Card
                key={service.id}
                className="p-5 border-stroke-subtle hover:border-stroke-ice transition-all"
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  {/* Left Column: Details */}
                  <div className="space-y-2 flex-grow">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-bold text-slate-900">{service.title}</h3>
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-brand-primary/10 text-brand-primary border border-brand-primary/20">
                        {service.category}
                      </span>
                      <StatusBadge status={service.deliveryStatus || 'Planned'} size="sm" />
                      <EvidenceBadge status={service.evidenceStatus || 'Not Verified'} size="sm" />
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                          service.published
                            ? 'bg-blue-50 text-brand-primary border-blue-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                        {service.published ? 'Published' : 'Draft'}
                      </span>
                      {service.featured && (
                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                          <span>Featured</span>
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed">
                      {service.shortDescription || service.description}
                    </p>

                    {service.capabilities && service.capabilities.length > 0 && (
                      <div className="text-xs text-slate-500 space-y-0.5 pt-1">
                        <span className="font-semibold text-slate-700">Capabilities:</span>{' '}
                        <span>{service.capabilities.slice(0, 3).join(' • ')}</span>
                        {service.capabilities.length > 3 && (
                          <span className="text-slate-400 italic"> +{service.capabilities.length - 3} more</span>
                        )}
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-3 pt-2 text-xs">
                      {service.tooling && service.tooling.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {service.tooling.map((t) => (
                            <TechTag key={t} label={t} />
                          ))}
                        </div>
                      )}

                      {service.demoUrl && (
                        <a
                          href={service.demoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-brand-primary hover:underline font-semibold"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Demo Link</span>
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Actions */}
                  <div className="flex items-center gap-1 md:self-start shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                    <button
                      type="button"
                      onClick={() => handleMoveService(idx, 'up')}
                      disabled={idx === 0}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent"
                      title="Move Up"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveService(idx, 'down')}
                      disabled={idx === services.length - 1}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent"
                      title="Move Down"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleFeatured(service)}
                      className={`p-1.5 rounded-lg border ${
                        service.featured
                          ? 'border-amber-300 text-amber-500 bg-amber-50'
                          : 'border-slate-200 text-slate-400 hover:bg-slate-50'
                      }`}
                      title={service.featured ? 'Unmark Featured' : 'Mark Featured'}
                    >
                      <Star className={`w-4 h-4 ${service.featured ? 'fill-amber-500' : ''}`} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTogglePublish(service)}
                      className={`p-1.5 rounded-lg border ${
                        service.published
                          ? 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                          : 'border-slate-200 text-slate-400 hover:bg-slate-50'
                      }`}
                      title={service.published ? 'Unpublish to draft' : 'Publish to live website'}
                    >
                      {service.published ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenServiceModal(service)}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                      title="Edit Service"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setItemToDelete({ type: 'service', item: service })}
                      className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50"
                      title="Delete Service"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </Card>
            ))
          ) : (
            <EmptyState
              title="No AI services found"
              description="No services match the current filters or search query."
            />
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* View 2: Categories Manager */}
      {/* ========================================================= */}
      {activeTab === 'categories' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-stroke-subtle">
            <div>
              <h3 className="text-sm font-bold text-slate-900">AI Service Categories</h3>
              <p className="text-xs text-slate-500">Categories organize offerings on the public website and in navigation filters.</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => handleOpenCategoryModal()}
            >
              Add Category
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {categories.map((cat, idx) => {
              const serviceCount = services.filter((s) => s.categoryId === cat.id).length;
              return (
                <Card key={cat.id} className="p-4 border-stroke-subtle flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900">{cat.name}</h4>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full border ${
                          cat.published !== false
                            ? 'bg-blue-50 text-brand-primary border-blue-200'
                            : 'bg-slate-100 text-slate-500 border-slate-200'
                        }`}
                      >
                        {cat.published !== false ? 'Active' : 'Hidden'}
                      </span>
                    </div>
                    <p className="text-xs font-mono text-slate-400">slug: {cat.slug}</p>
                    {cat.description && (
                      <p className="text-xs text-slate-600 leading-relaxed pt-1">{cat.description}</p>
                    )}
                    <p className="text-[11px] font-semibold text-slate-500 pt-1">
                      {serviceCount} service{serviceCount === 1 ? '' : 's'} assigned
                    </p>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleMoveCategory(idx, 'up')}
                      disabled={idx === 0}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent"
                      title="Move Up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveCategory(idx, 'down')}
                      disabled={idx === categories.length - 1}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent"
                      title="Move Down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleCategoryPublish(cat)}
                      className={`p-1.5 rounded-lg border ${
                        cat.published !== false
                          ? 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                          : 'border-slate-200 text-slate-400 hover:bg-slate-50'
                      }`}
                      title={cat.published !== false ? 'Hide Category' : 'Publish Category'}
                    >
                      {cat.published !== false ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenCategoryModal(cat)}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                      title="Edit Category"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setItemToDelete({ type: 'category', item: cat })}
                      className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50"
                      title="Delete Category"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* Service Create / Edit Modal */}
      {/* ========================================================= */}
      {isServiceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-stroke-subtle shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleSaveService} className="p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-stroke-subtle pb-4">
                <h2 className="text-lg font-bold text-slate-900">
                  {editingService ? 'Edit AI Service & Automation' : 'Create AI Service & Automation'}
                </h2>
                <button
                  type="button"
                  onClick={() => setIsServiceModalOpen(false)}
                  className="text-slate-400 hover:text-slate-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {serviceModalError && (
                <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{serviceModalError}</span>
                </div>
              )}

              {/* Basic Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Service Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={serviceFormData.title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    placeholder="e.g. Autonomous DevOps Triage Agent"
                    className="w-full px-3 py-2 rounded-lg border border-stroke-subtle text-xs text-slate-900 focus-ring"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    URL Slug *
                  </label>
                  <input
                    type="text"
                    required
                    value={serviceFormData.slug}
                    onChange={(e) => setServiceFormData({ ...serviceFormData, slug: e.target.value })}
                    placeholder="e.g. autonomous-devops-agent"
                    className="w-full px-3 py-2 rounded-lg border border-stroke-subtle text-xs text-slate-900 focus-ring font-mono"
                  />
                </div>
              </div>

              {/* Category, Delivery Status, Evidence Status */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Category *
                  </label>
                  <select
                    value={serviceFormData.categoryId}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-stroke-subtle text-xs text-slate-900 focus-ring bg-white"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Delivery Status *
                  </label>
                  <select
                    value={serviceFormData.deliveryStatus}
                    onChange={(e) =>
                      setServiceFormData({ ...serviceFormData, deliveryStatus: e.target.value as AIDeliveryStatus })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-stroke-subtle text-xs text-slate-900 focus-ring bg-white"
                  >
                    <option value="Planned">Planned</option>
                    <option value="In Development">In Development</option>
                    <option value="Working Prototype">Working Prototype</option>
                    <option value="Live / Deployed">Live / Deployed</option>
                    <option value="Not Available">Not Available</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Evidence Status *
                  </label>
                  <select
                    value={serviceFormData.evidenceStatus}
                    onChange={(e) =>
                      setServiceFormData({ ...serviceFormData, evidenceStatus: e.target.value as AIEvidenceStatus })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-stroke-subtle text-xs text-slate-900 focus-ring bg-white"
                  >
                    <option value="Not Verified">Not Verified (Default)</option>
                    <option value="Owner-Reported">Owner-Reported</option>
                    <option value="Verified">Verified</option>
                  </select>
                </div>
              </div>

              {/* Short & Detailed Descriptions */}
              <div>
                <RichTextEditor
                  label="Short Summary (Hero / Card)"
                  value={serviceFormData.shortDescription}
                  onChange={(val) => setServiceFormData({ ...serviceFormData, shortDescription: val })}
                  minHeight="70px"
                  placeholder="Concise 1-sentence value proposition for cards..."
                  helperText="Displayed on showcase cards and service badges."
                />
              </div>

              <div>
                <RichTextEditor
                  label="Detailed Technical Overview"
                  required
                  value={serviceFormData.description}
                  onChange={(val) => setServiceFormData({ ...serviceFormData, description: val })}
                  minHeight="110px"
                  placeholder="Comprehensive technical explanation of system architecture, reasoning loops, and security boundaries..."
                  helperText="Detailed architecture, behaviors, and execution flow."
                />
              </div>

              {/* Customer Problem & Solution */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <RichTextEditor
                    label="Customer Problem"
                    value={serviceFormData.customerProblem}
                    onChange={(val) => setServiceFormData({ ...serviceFormData, customerProblem: val })}
                    minHeight="80px"
                    placeholder="Specific bottleneck, delay, or manual operational friction..."
                    helperText="Operational pain point addressed by this solution."
                  />
                </div>

                <div>
                  <RichTextEditor
                    label="Proposed Solution"
                    value={serviceFormData.proposedSolution}
                    onChange={(val) => setServiceFormData({ ...serviceFormData, proposedSolution: val })}
                    minHeight="80px"
                    placeholder="Technical approach, validation logic, and automated delivery..."
                    helperText="Target architecture and automation workflow."
                  />
                </div>
              </div>

              {/* Capabilities List Editor */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Key Capabilities
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setServiceFormData({
                        ...serviceFormData,
                        capabilities: [...serviceFormData.capabilities, ''],
                      })
                    }
                    className="text-xs text-brand-primary font-semibold hover:underline inline-flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Capability</span>
                  </button>
                </div>
                <div className="space-y-2">
                  {serviceFormData.capabilities.map((cap, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={cap}
                        onChange={(e) => {
                          const updated = [...serviceFormData.capabilities];
                          updated[i] = e.target.value;
                          setServiceFormData({ ...serviceFormData, capabilities: updated });
                        }}
                        placeholder={`Capability #${i + 1}`}
                        className="w-full px-3 py-1.5 rounded-lg border border-stroke-subtle text-xs text-slate-900 focus-ring"
                      />
                      {serviceFormData.capabilities.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const updated = serviceFormData.capabilities.filter((_, idx) => idx !== i);
                            setServiceFormData({ ...serviceFormData, capabilities: updated });
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Business Use Cases List Editor */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Business Use Cases
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setServiceFormData({
                        ...serviceFormData,
                        useCases: [...serviceFormData.useCases, ''],
                      })
                    }
                    className="text-xs text-brand-primary font-semibold hover:underline inline-flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Use Case</span>
                  </button>
                </div>
                <div className="space-y-2">
                  {serviceFormData.useCases.map((uc, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={uc}
                        onChange={(e) => {
                          const updated = [...serviceFormData.useCases];
                          updated[i] = e.target.value;
                          setServiceFormData({ ...serviceFormData, useCases: updated });
                        }}
                        placeholder={`Use Case #${i + 1}`}
                        className="w-full px-3 py-1.5 rounded-lg border border-stroke-subtle text-xs text-slate-900 focus-ring"
                      />
                      {serviceFormData.useCases.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const updated = serviceFormData.useCases.filter((_, idx) => idx !== i);
                            setServiceFormData({ ...serviceFormData, useCases: updated });
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Technology Stack & Integrations */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Technology Stack Tags
                </label>
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="text"
                    value={newToolInput}
                    onChange={(e) => setNewToolInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (newToolInput.trim() && !serviceFormData.tooling.includes(newToolInput.trim())) {
                          setServiceFormData({
                            ...serviceFormData,
                            tooling: [...serviceFormData.tooling, newToolInput.trim()],
                          });
                          setNewToolInput('');
                        }
                      }
                    }}
                    placeholder="Type technology (e.g. LangChain, Python, Gemini Live) and press Add..."
                    className="w-full px-3 py-1.5 rounded-lg border border-stroke-subtle text-xs text-slate-900 focus-ring"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (newToolInput.trim() && !serviceFormData.tooling.includes(newToolInput.trim())) {
                        setServiceFormData({
                          ...serviceFormData,
                          tooling: [...serviceFormData.tooling, newToolInput.trim()],
                        });
                        setNewToolInput('');
                      }
                    }}
                  >
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {serviceFormData.tooling.map((tool) => (
                    <span
                      key={tool}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-800 border border-slate-200"
                    >
                      <span>{tool}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setServiceFormData({
                            ...serviceFormData,
                            tooling: serviceFormData.tooling.filter((t) => t !== tool),
                          })
                        }
                        className="text-slate-400 hover:text-rose-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Demo URL & Related Projects */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Demo URL (Optional)
                  </label>
                  <input
                    type="url"
                    value={serviceFormData.demoUrl}
                    onChange={(e) => setServiceFormData({ ...serviceFormData, demoUrl: e.target.value })}
                    placeholder="https://demo.example.com"
                    className="w-full px-3 py-2 rounded-lg border border-stroke-subtle text-xs text-slate-900 focus-ring"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Must be a verified working prototype or live deployment.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Related Projects
                  </label>
                  <div className="space-y-1.5 max-h-28 overflow-y-auto p-2 rounded-lg border border-stroke-subtle bg-slate-50/50">
                    {availableProjects.map((p) => (
                      <label key={p.id} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={serviceFormData.relatedProjectIds.includes(p.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setServiceFormData({
                                ...serviceFormData,
                                relatedProjectIds: [...serviceFormData.relatedProjectIds, p.id],
                              });
                            } else {
                              setServiceFormData({
                                ...serviceFormData,
                                relatedProjectIds: serviceFormData.relatedProjectIds.filter((id) => id !== p.id),
                              });
                            }
                          }}
                          className="rounded border-slate-300 text-brand-primary focus:ring-brand-primary"
                        />
                        <span className="truncate">{p.title}</span>
                      </label>
                    ))}
                    {availableProjects.length === 0 && (
                      <p className="text-[11px] text-slate-400 italic">No projects found.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Cover Image Upload */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Cover Image
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={serviceFormData.coverImageUrl}
                    onChange={(e) => setServiceFormData({ ...serviceFormData, coverImageUrl: e.target.value })}
                    placeholder="https://... or upload image"
                    className="w-full px-3 py-2 rounded-lg border border-stroke-subtle text-xs text-slate-900 focus-ring"
                  />
                  <input
                    type="file"
                    ref={coverFileInputRef}
                    onChange={handleCoverUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={uploadingCover}
                    onClick={() => coverFileInputRef.current?.click()}
                    leftIcon={<Upload className="w-3.5 h-3.5" />}
                  >
                    {uploadingCover ? 'Uploading...' : 'Upload'}
                  </Button>
                </div>
              </div>

              {/* Publication and Featured Controls */}
              <div className="flex flex-wrap items-center gap-6 pt-3 border-t border-stroke-subtle">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={serviceFormData.published}
                    onChange={(e) => setServiceFormData({ ...serviceFormData, published: e.target.checked })}
                    className="rounded border-slate-300 text-brand-primary focus:ring-brand-primary"
                  />
                  <span className="text-xs font-semibold text-slate-800">
                    Publish Service to Public Website (Checked = Published, Unchecked = Draft)
                  </span>
                </label>

                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={serviceFormData.featured}
                    onChange={(e) => setServiceFormData({ ...serviceFormData, featured: e.target.checked })}
                    className="rounded border-slate-300 text-amber-500 focus:ring-amber-500"
                  />
                  <span className="text-xs font-semibold text-slate-800">
                    Mark as Featured Offering
                  </span>
                </label>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-stroke-subtle">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsServiceModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={savingService}
                >
                  {savingService ? 'Saving...' : editingService ? 'Update Service' : 'Create Service'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* Category Create / Edit Modal */}
      {/* ========================================================= */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-stroke-subtle shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-stroke-subtle pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {editingCategory ? 'Edit Category' : 'Create Category'}
              </h3>
              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {categoryModalError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{categoryModalError}</span>
              </div>
            )}

            <form onSubmit={handleSaveCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  value={categoryFormData.name}
                  onChange={(e) => handleCategoryNameChange(e.target.value)}
                  placeholder="e.g. AI Voice Assistants"
                  className="w-full px-3 py-2 rounded-lg border border-stroke-subtle text-xs text-slate-900 focus-ring"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Slug *
                </label>
                <input
                  type="text"
                  required
                  value={categoryFormData.slug}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, slug: e.target.value })}
                  placeholder="e.g. ai-voice-assistants"
                  className="w-full px-3 py-2 rounded-lg border border-stroke-subtle text-xs text-slate-900 focus-ring font-mono"
                />
              </div>

              <div>
                <RichTextEditor
                  label="Description (Optional)"
                  value={categoryFormData.description}
                  onChange={(val) => setCategoryFormData({ ...categoryFormData, description: val })}
                  minHeight="70px"
                  placeholder="Short category summary for filters..."
                  helperText="Category summary displayed when filtering AI solutions."
                />
              </div>

              <div className="pt-2">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={categoryFormData.published}
                    onChange={(e) => setCategoryFormData({ ...categoryFormData, published: e.target.checked })}
                    className="rounded border-slate-300 text-brand-primary focus:ring-brand-primary"
                  />
                  <span className="text-xs font-semibold text-slate-800">
                    Show Category in Public Website Filters
                  </span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-stroke-subtle">
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
                  disabled={savingCategory}
                >
                  {savingCategory ? 'Saving...' : editingCategory ? 'Update Category' : 'Create Category'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* Deletion Confirmation Modal */}
      {/* ========================================================= */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-stroke-subtle shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Delete {itemToDelete.type === 'service' ? 'AI Service' : 'Category'}?
                </h3>
                <p className="text-xs text-slate-500">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to permanently delete{' '}
              <strong className="text-slate-900">
                {itemToDelete.type === 'service'
                  ? `"${itemToDelete.item.title}"`
                  : `"${itemToDelete.item.name}"`}
              </strong>
              ?
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
                onClick={() => setItemToDelete(null)}
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

export default AIServicesPage;
