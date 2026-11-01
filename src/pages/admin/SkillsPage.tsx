import React, { useEffect, useState } from 'react';
import { adminService } from '../../services/adminService';
import { Skill, SkillCategory, SkillProficiency } from '../../types/portfolio';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { CategoryPill } from '../../components/common/Badge';
import { SkeletonLoader } from '../../components/common/SkeletonLoader';
import { EmptyState } from '../../components/common/EmptyState';
import { SkillIcon, AVAILABLE_SKILL_ICONS } from '../../components/common/SkillIcon';
import { RichTextEditor } from '../../components/common/RichTextEditor';
import {
  Sparkles,
  Plus,
  Search,
  Filter,
  ArrowUp,
  ArrowDown,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Layers,
  Star,
  X,
  FolderPlus,
} from 'lucide-react';

export const SkillsPage: React.FC = () => {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [categories, setCategories] = useState<SkillCategory[]>([]);
  const [skillsEtag, setSkillsEtag] = useState<string | undefined>();
  const [categoriesEtag, setCategoriesEtag] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedProficiency, setSelectedProficiency] = useState<string>('all');
  const [selectedVisibility, setSelectedVisibility] = useState<'all' | 'published' | 'hidden'>('all');

  // Skill Modal State
  const [isSkillModalOpen, setIsSkillModalOpen] = useState(false);
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
  const [skillFormData, setSkillFormData] = useState<{
    name: string;
    categoryId: string;
    proficiencyLevel: SkillProficiency;
    iconIdentifier: string;
    officialUrl: string;
    description: string;
    featured: boolean;
    published: boolean;
  }>({
    name: '',
    categoryId: '',
    proficiencyLevel: 'Core Competency',
    iconIdentifier: 'layers',
    officialUrl: '',
    description: '',
    featured: false,
    published: true,
  });
  const [savingSkill, setSavingSkill] = useState(false);

  // Category Modal State
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<SkillCategory | null>(null);
  const [categoryFormData, setCategoryFormData] = useState<{
    name: string;
    slug: string;
    icon: string;
    description: string;
    published: boolean;
  }>({
    name: '',
    slug: '',
    icon: 'Layers',
    description: '',
    published: true,
  });
  const [savingCategory, setSavingCategory] = useState(false);

  // Deletion Confirmation State
  const [itemToDelete, setItemToDelete] = useState<
    | { type: 'skill'; item: Skill }
    | { type: 'category'; item: SkillCategory }
    | null
  >(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    const [skillsRes, catsRes] = await Promise.all([
      adminService.getSkills(),
      adminService.getSkillCategories(),
    ]);

    if (skillsRes.success && skillsRes.data) {
      setSkills(skillsRes.data);
      setSkillsEtag(skillsRes.etag);
    } else {
      setError(skillsRes.error || 'Failed to load skills');
    }

    if (catsRes.success && catsRes.data) {
      setCategories(catsRes.data);
      setCategoriesEtag(catsRes.etag);
      // Default to first category if form categoryId is empty
      if (catsRes.data.length > 0 && !skillFormData.categoryId) {
        setSkillFormData((prev) => ({ ...prev, categoryId: catsRes.data![0].id }));
      }
    } else {
      setError(catsRes.error || 'Failed to load skill categories');
    }

    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4500);
  };

  // Reordering Skills
  const handleMoveSkill = async (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === skills.length - 1)
    ) {
      return;
    }

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const reordered = [...skills];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);

    setSkills(reordered);
    const orderedIds = reordered.map((s) => s.id);
    const res = await adminService.reorderSkills(orderedIds, skillsEtag);
    if (res.success && res.data) {
      setSkills(res.data);
      if (res.etag) setSkillsEtag(res.etag);
      showFeedback('success', `Moved "${moved.name}" ${direction}. Order saved.`);
    } else {
      showFeedback('error', res.error || 'Failed to save new skill order.');
      loadData();
    }
  };

  // Reordering Categories
  const handleMoveCategory = async (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === categories.length - 1)
    ) {
      return;
    }

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const reordered = [...categories];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);

    setCategories(reordered);
    const orderedIds = reordered.map((c) => c.id);
    const res = await adminService.reorderSkillCategories(orderedIds, categoriesEtag);
    if (res.success && res.data) {
      setCategories(res.data);
      if (res.etag) setCategoriesEtag(res.etag);
      showFeedback('success', `Moved category "${moved.name}" ${direction}. Order saved.`);
    } else {
      showFeedback('error', res.error || 'Failed to save category order.');
      loadData();
    }
  };

  // Toggle Skill Visibility
  const handleToggleSkillPublish = async (skill: Skill) => {
    const nextState = !skill.published;
    const res = await adminService.updateSkill(
      skill.id,
      { published: nextState },
      skillsEtag
    );
    if (res.success && res.data) {
      setSkills((prev) =>
        prev.map((s) => (s.id === skill.id ? { ...s, published: nextState } : s))
      );
      if (res.etag) setSkillsEtag(res.etag);
      showFeedback(
        'success',
        `Skill "${skill.name}" is now ${nextState ? 'published to public site' : 'hidden from public site'}.`
      );
    } else {
      showFeedback('error', res.error || 'Failed to update skill visibility.');
    }
  };

  // Toggle Category Visibility
  const handleToggleCategoryPublish = async (cat: SkillCategory) => {
    const nextState = !cat.published;
    const res = await adminService.updateSkillCategory(
      cat.id,
      { published: nextState },
      categoriesEtag
    );
    if (res.success && res.data) {
      setCategories((prev) =>
        prev.map((c) => (c.id === cat.id ? { ...c, published: nextState } : c))
      );
      if (res.etag) setCategoriesEtag(res.etag);
      showFeedback(
        'success',
        `Category "${cat.name}" is now ${nextState ? 'published' : 'hidden'}. (Skills in hidden categories are hidden from public view).`
      );
    } else {
      showFeedback('error', res.error || 'Failed to update category visibility.');
    }
  };

  // Open Skill Modal
  const handleOpenAddSkill = () => {
    setEditingSkill(null);
    setSkillFormData({
      name: '',
      categoryId: categories[0]?.id || '',
      proficiencyLevel: 'Core Competency',
      iconIdentifier: 'box',
      officialUrl: '',
      description: '',
      featured: false,
      published: true,
    });
    setIsSkillModalOpen(true);
  };

  const handleOpenEditSkill = (skill: Skill) => {
    setEditingSkill(skill);
    setSkillFormData({
      name: skill.name,
      categoryId: skill.categoryId,
      proficiencyLevel: skill.proficiencyLevel,
      iconIdentifier: skill.iconIdentifier,
      officialUrl: skill.officialUrl || '',
      description: skill.description || '',
      featured: skill.featured,
      published: skill.published !== false,
    });
    setIsSkillModalOpen(true);
  };

  // Save Skill
  const handleSaveSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!skillFormData.name.trim() || skillFormData.name.trim().length < 2) {
      showFeedback('error', 'Skill name must be at least 2 characters long.');
      return;
    }
    if (!skillFormData.categoryId) {
      showFeedback('error', 'Please select a valid category.');
      return;
    }

    setSavingSkill(true);
    const payload = {
      name: skillFormData.name.trim(),
      categoryId: skillFormData.categoryId,
      proficiencyLevel: skillFormData.proficiencyLevel,
      iconIdentifier: skillFormData.iconIdentifier.trim().toLowerCase(),
      officialUrl: skillFormData.officialUrl.trim() || null,
      description: skillFormData.description.trim() || undefined,
      featured: skillFormData.featured,
      published: skillFormData.published,
    };

    if (editingSkill) {
      const res = await adminService.updateSkill(editingSkill.id, payload, skillsEtag);
      if (res.success && res.data) {
        setSkills((prev) => prev.map((s) => (s.id === editingSkill.id ? res.data! : s)));
        if (res.etag) setSkillsEtag(res.etag);
        showFeedback('success', `Skill "${res.data.name}" updated successfully.`);
        setIsSkillModalOpen(false);
      } else if (res.error?.includes('modified by another session')) {
        showFeedback('error', 'Conflict: Skills were modified in another session. Please reload to sync recent changes.');
      } else {
        showFeedback('error', res.error || 'Failed to update skill.');
      }
    } else {
      const res = await adminService.createSkill(payload, skillsEtag);
      if (res.success && res.data) {
        setSkills((prev) => [...prev, res.data!]);
        if (res.etag) setSkillsEtag(res.etag);
        showFeedback('success', `Skill "${res.data.name}" created successfully.`);
        setIsSkillModalOpen(false);
      } else if (res.error?.includes('modified by another session')) {
        showFeedback('error', 'Conflict: Skills were modified in another session. Please reload to sync recent changes.');
      } else {
        showFeedback('error', res.error || 'Failed to create skill.');
      }
    }
    setSavingSkill(false);
  };

  // Open Category Modal
  const handleOpenAddCategory = () => {
    setEditingCategory(null);
    setCategoryFormData({
      name: '',
      slug: '',
      icon: 'Layers',
      description: '',
      published: true,
    });
    setIsCategoryModalOpen(true);
  };

  const handleOpenEditCategory = (cat: SkillCategory) => {
    setEditingCategory(cat);
    setCategoryFormData({
      name: cat.name,
      slug: cat.slug,
      icon: cat.icon || 'Layers',
      description: cat.description || '',
      published: cat.published !== false,
    });
    setIsCategoryModalOpen(true);
  };

  // Save Category
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryFormData.name.trim() || categoryFormData.name.trim().length < 2) {
      showFeedback('error', 'Category name must be at least 2 characters long.');
      return;
    }

    const slug =
      categoryFormData.slug.trim() ||
      categoryFormData.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');

    setSavingCategory(true);
    const payload = {
      name: categoryFormData.name.trim(),
      slug,
      icon: categoryFormData.icon.trim() || 'Layers',
      description: categoryFormData.description.trim() || undefined,
      published: categoryFormData.published,
    };

    if (editingCategory) {
      const res = await adminService.updateSkillCategory(editingCategory.id, payload, categoriesEtag);
      if (res.success && res.data) {
        setCategories((prev) =>
          prev.map((c) => (c.id === editingCategory.id ? res.data! : c))
        );
        if (res.etag) setCategoriesEtag(res.etag);
        showFeedback('success', `Category "${res.data.name}" updated successfully.`);
        setIsCategoryModalOpen(false);
      } else {
        showFeedback('error', res.error || 'Failed to update category.');
      }
    } else {
      const res = await adminService.createSkillCategory(payload, categoriesEtag);
      if (res.success && res.data) {
        setCategories((prev) => [...prev, res.data!]);
        if (res.etag) setCategoriesEtag(res.etag);
        showFeedback('success', `Category "${res.data.name}" created successfully.`);
        setIsCategoryModalOpen(false);
      } else {
        showFeedback('error', res.error || 'Failed to create category.');
      }
    }
    setSavingCategory(false);
  };

  // Execute Deletion
  const handleExecuteDelete = async () => {
    if (!itemToDelete) return;
    setDeleting(true);
    setDeleteError(null);

    if (itemToDelete.type === 'skill') {
      const skill = itemToDelete.item;
      const res = await adminService.deleteSkill(skill.id, skillsEtag);
      if (res.success) {
        setSkills((prev) => prev.filter((s) => s.id !== skill.id));
        if (res.etag) setSkillsEtag(res.etag);
        showFeedback('success', `Skill "${skill.name}" permanently deleted.`);
        setItemToDelete(null);
      } else {
        setDeleteError(res.error || 'Failed to delete skill.');
      }
    } else {
      const cat = itemToDelete.item;
      const res = await adminService.deleteSkillCategory(cat.id, categoriesEtag);
      if (res.success) {
        setCategories((prev) => prev.filter((c) => c.id !== cat.id));
        if (res.etag) setCategoriesEtag(res.etag);
        showFeedback('success', `Category "${cat.name}" deleted successfully.`);
        setItemToDelete(null);
      } else {
        // Safe deletion error explanation
        setDeleteError(res.error || 'Failed to delete category.');
      }
    }
    setDeleting(false);
  };

  // Filter skills
  const filteredSkills = skills.filter((skill) => {
    const matchesSearch =
      skill.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (skill.description && skill.description.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory =
      selectedCategory === 'all' || skill.categoryId === selectedCategory;

    const matchesProficiency =
      selectedProficiency === 'all' || skill.proficiencyLevel === selectedProficiency;

    const matchesVisibility =
      selectedVisibility === 'all'
        ? true
        : selectedVisibility === 'published'
        ? skill.published !== false
        : skill.published === false;

    return matchesSearch && matchesCategory && matchesProficiency && matchesVisibility;
  });

  const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Header and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-stroke-subtle pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-primary/10 text-brand-primary border border-brand-primary/20">
              Content Management
            </span>
            <span className="text-xs text-slate-600 font-medium">Prompt 10 of 18</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Skills & Categories CMS
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Manage categorized competencies, verified proficiency levels, technology icon identifiers, and dynamic public ordering.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleOpenAddCategory}
            className="flex items-center gap-2 border-stroke-subtle"
          >
            <FolderPlus className="w-4 h-4 text-brand-teal" />
            <span>Add Category</span>
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleOpenAddSkill}
            className="flex items-center gap-2 shadow-subtle"
          >
            <Plus className="w-4 h-4" />
            <span>Add Skill</span>
          </Button>
        </div>
      </div>

      {/* Feedback Toast */}
      {feedback && (
        <div
          role="alert"
          className={`p-4 rounded-xl text-sm font-semibold flex items-center justify-between shadow-subtle transition-all ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-slate-600 p-1"
            aria-label="Close notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Global Error Banner */}
      {error && (
        <div
          role="alert"
          className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-semibold flex items-center justify-between shadow-subtle"
        >
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <Button variant="secondary" size="sm" onClick={loadData}>
            Retry
          </Button>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card padding="sm" className="bg-canvas-surface border-stroke-subtle">
          <span className="text-xs font-semibold text-slate-600 block">Total Skills</span>
          <span className="text-2xl font-bold text-slate-900 mt-1 block">{skills.length}</span>
        </Card>
        <Card padding="sm" className="bg-canvas-surface border-stroke-subtle">
          <span className="text-xs font-semibold text-slate-600 block">Published Skills</span>
          <span className="text-2xl font-bold text-brand-primary mt-1 block">
            {skills.filter((s) => s.published !== false).length}
          </span>
        </Card>
        <Card padding="sm" className="bg-canvas-surface border-stroke-subtle">
          <span className="text-xs font-semibold text-slate-600 block">Active Categories</span>
          <span className="text-2xl font-bold text-teal-600 mt-1 block">{categories.length}</span>
        </Card>
        <Card padding="sm" className="bg-canvas-surface border-stroke-subtle">
          <span className="text-xs font-semibold text-slate-600 block">Featured Skills</span>
          <span className="text-2xl font-bold text-amber-600 mt-1 block">
            {skills.filter((s) => s.featured).length}
          </span>
        </Card>
      </div>

      {/* Categories Management Panel */}
      <Card className="p-5 border-stroke-subtle bg-slate-50/50 space-y-4">
        <div className="flex items-center justify-between border-b border-stroke-subtle pb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-brand-primary" />
            <h2 className="text-sm font-bold text-slate-800">Skill Categories ({categories.length})</h2>
          </div>
          <span className="text-xs text-slate-600 font-medium">Reorder or edit categories</span>
        </div>

        {categories.length === 0 ? (
          <p className="text-xs text-slate-600 py-2">No categories created yet. Click "Add Category" above.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {categories.map((cat, idx) => {
              const count = skills.filter((s) => s.categoryId === cat.id).length;
              return (
                <div
                  key={cat.id}
                  className="p-3 rounded-lg bg-white border border-stroke-subtle flex items-center justify-between gap-2 shadow-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded bg-blue-50 text-brand-primary flex items-center justify-center shrink-0">
                      <Layers className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">{cat.name}</p>
                      <p className="text-[11px] text-slate-600">
                        {count} skill{count === 1 ? '' : 's'} • {cat.published ? 'Visible' : 'Hidden'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleMoveCategory(idx, 'up')}
                      disabled={idx === 0}
                      className="p-1 rounded text-slate-400 hover:text-slate-700 disabled:opacity-20"
                      title="Move Category Up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleMoveCategory(idx, 'down')}
                      disabled={idx === categories.length - 1}
                      className="p-1 rounded text-slate-400 hover:text-slate-700 disabled:opacity-20"
                      title="Move Category Down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleToggleCategoryPublish(cat)}
                      className={`p-1 rounded ${
                        cat.published ? 'text-emerald-600 hover:text-emerald-800' : 'text-slate-400 hover:text-slate-600'
                      }`}
                      title={cat.published ? 'Hide category' : 'Publish category'}
                    >
                      {cat.published ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => handleOpenEditCategory(cat)}
                      className="p-1 rounded text-blue-600 hover:text-blue-800"
                      title="Edit Category"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        setDeleteError(null);
                        setItemToDelete({ type: 'category', item: cat });
                      }}
                      className="p-1 rounded text-rose-500 hover:text-rose-700"
                      title="Delete Category"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Filter and Search Bar */}
      <Card className="p-4 bg-canvas-surface border-stroke-subtle flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search skills by title or keywords..."
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm rounded-lg border border-stroke-subtle focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Category Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-stroke-subtle rounded-lg px-2.5 py-1.5 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-transparent font-medium text-slate-700 focus:outline-none"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Proficiency Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-stroke-subtle rounded-lg px-2.5 py-1.5 text-xs">
            <select
              value={selectedProficiency}
              onChange={(e) => setSelectedProficiency(e.target.value)}
              className="bg-transparent font-medium text-slate-700 focus:outline-none"
            >
              <option value="all">All Proficiencies</option>
              <option value="Core Competency">Core Competency</option>
              <option value="Advanced">Advanced</option>
              <option value="Proficient">Proficient</option>
            </select>
          </div>

          {/* Visibility Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-stroke-subtle rounded-lg px-2.5 py-1.5 text-xs">
            <select
              value={selectedVisibility}
              onChange={(e) => setSelectedVisibility(e.target.value as any)}
              className="bg-transparent font-medium text-slate-700 focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="published">Published</option>
              <option value="hidden">Hidden</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Skills List Table */}
      {loading ? (
        <div className="space-y-3">
          <SkeletonLoader className="h-12 w-full rounded-lg" count={5} />
        </div>
      ) : filteredSkills.length === 0 ? (
        <EmptyState
          title="No skills found"
          description={
            searchQuery || selectedCategory !== 'all' || selectedProficiency !== 'all'
              ? 'Try modifying your filter or search terms.'
              : 'Get started by creating your first technical skill.'
          }
          actionText={
            searchQuery || selectedCategory !== 'all' ? 'Clear Filters' : 'Add New Skill'
          }
          onAction={
            searchQuery || selectedCategory !== 'all'
              ? () => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                  setSelectedProficiency('all');
                  setSelectedVisibility('all');
                }
              : handleOpenAddSkill
          }
        />
      ) : (
        <div className="bg-white border border-stroke-subtle rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-stroke-subtle text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-3 w-16 text-center">Order</th>
                  <th className="py-3 px-4">Skill & Technology</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Proficiency</th>
                  <th className="py-3 px-4 text-center">Featured</th>
                  <th className="py-3 px-4 text-center">Visibility</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stroke-subtle text-xs sm:text-sm">
                {filteredSkills.map((skill, index) => {
                  const categoryName = categoryMap.get(skill.categoryId) || 'Unassigned';
                  return (
                    <tr
                      key={skill.id}
                      className="hover:bg-slate-50/70 transition-colors group"
                    >
                      {/* Order Controls */}
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleMoveSkill(index, 'up')}
                            disabled={index === 0}
                            className="p-1 rounded text-slate-400 hover:text-slate-700 disabled:opacity-20 transition-colors"
                            title="Move Up"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleMoveSkill(index, 'down')}
                            disabled={index === filteredSkills.length - 1}
                            className="p-1 rounded text-slate-400 hover:text-slate-700 disabled:opacity-20 transition-colors"
                            title="Move Down"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                      {/* Skill Name & Icon */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-blue-50/80 border border-blue-100 flex items-center justify-center shrink-0">
                            <SkillIcon
                              identifier={skill.iconIdentifier}
                              className="w-4 h-4 text-brand-primary"
                              title={skill.name}
                            />
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 block">{skill.name}</span>
                            {skill.officialUrl ? (
                              <a
                                href={skill.officialUrl}
                                target="_blank"
                                rel="noreferrer noopener"
                                className="inline-flex items-center gap-1 text-[11px] text-brand-primary hover:underline"
                              >
                                <span>Docs</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            ) : (
                              <span className="text-[11px] text-slate-400">icon: {skill.iconIdentifier}</span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3 px-4">
                        <CategoryPill label={categoryName} />
                      </td>

                      {/* Proficiency */}
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded border ${
                            skill.proficiencyLevel === 'Core Competency'
                              ? 'bg-blue-50 text-brand-primary border-blue-200/60'
                              : skill.proficiencyLevel === 'Advanced'
                              ? 'bg-teal-50 text-teal-700 border-teal-200/60'
                              : 'bg-slate-100 text-slate-700 border-slate-200/60'
                          }`}
                        >
                          {skill.proficiencyLevel}
                        </span>
                      </td>

                      {/* Featured */}
                      <td className="py-3 px-4 text-center">
                        {skill.featured ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                            <span>Featured</span>
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>

                      {/* Visibility Toggle */}
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleToggleSkillPublish(skill)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
                            skill.published !== false
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60 hover:bg-emerald-100/70'
                              : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200/70'
                          }`}
                          title={
                            skill.published !== false
                              ? 'Published: Click to hide'
                              : 'Hidden: Click to publish'
                          }
                        >
                          {skill.published !== false ? (
                            <>
                              <Eye className="w-3 h-3 text-emerald-600" />
                              <span>Live</span>
                            </>
                          ) : (
                            <>
                              <EyeOff className="w-3 h-3 text-slate-400" />
                              <span>Hidden</span>
                            </>
                          )}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenEditSkill(skill)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-brand-primary hover:bg-blue-50 transition-colors"
                            title="Edit Skill"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setDeleteError(null);
                              setItemToDelete({ type: 'skill', item: skill });
                            }}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Delete Skill"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ADD / EDIT SKILL MODAL */}
      {/* ========================================================================= */}
      {isSkillModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-stroke-subtle space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-stroke-subtle pb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-brand-primary" />
                <h3 className="text-lg font-bold text-slate-900">
                  {editingSkill ? `Edit "${editingSkill.name}"` : 'Add New Skill'}
                </h3>
              </div>
              <button
                onClick={() => setIsSkillModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSkill} className="space-y-4 text-xs sm:text-sm">
              {/* Skill Name */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Skill Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  minLength={2}
                  value={skillFormData.name}
                  onChange={(e) => setSkillFormData({ ...skillFormData, name: e.target.value })}
                  placeholder="e.g. Terraform, Kubernetes, SonarQube"
                  className="w-full px-3.5 py-2 rounded-lg border border-stroke-subtle focus:border-brand-primary focus:ring-1 focus:ring-brand-primary focus:outline-none"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Category <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={skillFormData.categoryId}
                  onChange={(e) => setSkillFormData({ ...skillFormData, categoryId: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-lg border border-stroke-subtle bg-white focus:border-brand-primary focus:ring-1 focus:ring-brand-primary focus:outline-none"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Proficiency Level */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Proficiency Level <span className="text-rose-500">*</span>
                </label>
                <select
                  value={skillFormData.proficiencyLevel}
                  onChange={(e) =>
                    setSkillFormData({
                      ...skillFormData,
                      proficiencyLevel: e.target.value as SkillProficiency,
                    })
                  }
                  className="w-full px-3.5 py-2 rounded-lg border border-stroke-subtle bg-white focus:border-brand-primary focus:ring-1 focus:ring-brand-primary focus:outline-none"
                >
                  <option value="Core Competency">Core Competency (Primary Enterprise Focus)</option>
                  <option value="Advanced">Advanced (High Autonomy & Production Depth)</option>
                  <option value="Proficient">Proficient (Solid Working Familiarity)</option>
                </select>
              </div>

              {/* Icon Selector */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Technology Icon Identifier <span className="text-rose-500">*</span>
                </label>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                    <SkillIcon
                      identifier={skillFormData.iconIdentifier}
                      className="w-5 h-5 text-brand-primary"
                    />
                  </div>
                  <select
                    value={skillFormData.iconIdentifier}
                    onChange={(e) =>
                      setSkillFormData({ ...skillFormData, iconIdentifier: e.target.value })
                    }
                    className="flex-1 px-3 py-2 rounded-lg border border-stroke-subtle bg-white focus:border-brand-primary focus:outline-none"
                  >
                    {AVAILABLE_SKILL_ICONS.map((icon) => (
                      <option key={icon.id} value={icon.id}>
                        {icon.label} ({icon.id})
                      </option>
                    ))}
                  </select>
                </div>
                <input
                  type="text"
                  value={skillFormData.iconIdentifier}
                  onChange={(e) =>
                    setSkillFormData({ ...skillFormData, iconIdentifier: e.target.value })
                  }
                  placeholder="Or enter custom icon identifier (a-z, 0-9, hyphens)"
                  className="w-full px-3 py-1.5 text-xs rounded border border-slate-200 focus:outline-none"
                />
              </div>

              {/* Official Documentation URL */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Official Tech URL (Optional)</label>
                <input
                  type="url"
                  value={skillFormData.officialUrl}
                  onChange={(e) =>
                    setSkillFormData({ ...skillFormData, officialUrl: e.target.value })
                  }
                  placeholder="https://kubernetes.io"
                  className="w-full px-3.5 py-2 rounded-lg border border-stroke-subtle focus:border-brand-primary focus:ring-1 focus:ring-brand-primary focus:outline-none"
                />
              </div>

              {/* Description */}
              <div>
                <RichTextEditor
                  label="Description (Optional)"
                  value={skillFormData.description}
                  onChange={(val) =>
                    setSkillFormData({ ...skillFormData, description: val })
                  }
                  minHeight="70px"
                  placeholder="Short architectural note or context..."
                  helperText="Optional context rendered on tooltips, modal views, or details."
                />
              </div>

              {/* Flags */}
              <div className="pt-2 flex flex-col sm:flex-row gap-4 border-t border-slate-100">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={skillFormData.featured}
                    onChange={(e) =>
                      setSkillFormData({ ...skillFormData, featured: e.target.checked })
                    }
                    className="w-4 h-4 rounded text-brand-primary focus:ring-brand-primary"
                  />
                  <span className="font-semibold text-slate-800">Featured Skill (Highlight badge)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={skillFormData.published}
                    onChange={(e) =>
                      setSkillFormData({ ...skillFormData, published: e.target.checked })
                    }
                    className="w-4 h-4 rounded text-brand-primary focus:ring-brand-primary"
                  />
                  <span className="font-semibold text-slate-800">Published to Live Site</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-stroke-subtle">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsSkillModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={savingSkill}
                >
                  {editingSkill ? 'Save Changes' : 'Create Skill'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ADD / EDIT CATEGORY MODAL */}
      {/* ========================================================================= */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-stroke-subtle space-y-5">
            <div className="flex items-center justify-between border-b border-stroke-subtle pb-4">
              <div className="flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-brand-teal" />
                <h3 className="text-lg font-bold text-slate-900">
                  {editingCategory ? `Edit "${editingCategory.name}"` : 'Add New Category'}
                </h3>
              </div>
              <button
                onClick={() => setIsCategoryModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="space-y-4 text-xs sm:text-sm">
              {/* Category Name */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Category Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  minLength={2}
                  value={categoryFormData.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    const autoSlug = name
                      .toLowerCase()
                      .replace(/[^a-z0-9]+/g, '-')
                      .replace(/(^-|-$)+/g, '');
                    setCategoryFormData({
                      ...categoryFormData,
                      name,
                      slug: editingCategory ? categoryFormData.slug : autoSlug,
                    });
                  }}
                  placeholder="e.g. Observability & Monitoring"
                  className="w-full px-3.5 py-2 rounded-lg border border-stroke-subtle focus:border-brand-primary focus:ring-1 focus:ring-brand-primary focus:outline-none"
                />
              </div>

              {/* Slug */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Slug (URL-safe identifier) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  minLength={2}
                  value={categoryFormData.slug}
                  onChange={(e) =>
                    setCategoryFormData({ ...categoryFormData, slug: e.target.value })
                  }
                  placeholder="e.g. observability-monitoring"
                  className="w-full px-3.5 py-2 rounded-lg border border-stroke-subtle focus:border-brand-primary focus:ring-1 focus:ring-brand-primary focus:outline-none font-mono text-xs"
                />
              </div>

              {/* Description */}
              <div>
                <RichTextEditor
                  label="Description (Optional)"
                  value={categoryFormData.description}
                  onChange={(val) =>
                    setCategoryFormData({ ...categoryFormData, description: val })
                  }
                  minHeight="70px"
                  placeholder="Domain overview or grouping description..."
                  helperText="Context for this technical category group."
                />
              </div>

              {/* Published */}
              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={categoryFormData.published}
                  onChange={(e) =>
                    setCategoryFormData({ ...categoryFormData, published: e.target.checked })
                  }
                  className="w-4 h-4 rounded text-brand-primary focus:ring-brand-primary"
                />
                <span className="font-semibold text-slate-800">
                  Published (Visible to public site visitors)
                </span>
              </label>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-stroke-subtle">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsCategoryModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={savingCategory}
                >
                  {editingCategory ? 'Save Changes' : 'Create Category'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DELETE CONFIRMATION MODAL */}
      {/* ========================================================================= */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-rose-100 space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-lg font-bold text-slate-900">
                Confirm Deletion of {itemToDelete.type === 'skill' ? 'Skill' : 'Category'}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600">
                Are you sure you want to permanently delete{' '}
                <strong className="text-slate-900">"{itemToDelete.item.name}"</strong>?
              </p>
            </div>

            {deleteError && (
              <div
                role="alert"
                className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold"
              >
                {deleteError}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setItemToDelete(null);
                  setDeleteError(null);
                }}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleExecuteDelete}
                isLoading={deleting}
              >
                Yes, Delete Permanently
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
