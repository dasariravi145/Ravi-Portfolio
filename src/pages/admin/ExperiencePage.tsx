import React, { useEffect, useState } from 'react';
import { adminService } from '../../services/adminService';
import { WorkExperience, Education } from '../../types/portfolio';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { TechTag } from '../../components/common/Badge';
import { SkeletonLoader } from '../../components/common/SkeletonLoader';
import { EmptyState } from '../../components/common/EmptyState';
import { RichTextEditor } from '../../components/common/RichTextEditor';
import {
  Briefcase,
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
  ExternalLink,
  Calendar,
  Building2,
  MapPin,
  X,
} from 'lucide-react';

interface ExperiencePageProps {
  defaultTab?: 'experience' | 'education';
}

export const ExperiencePage: React.FC<ExperiencePageProps> = ({ defaultTab = 'experience' }) => {
  const [activeTab, setActiveTab] = useState<'experience' | 'education'>(defaultTab);

  // Experience state
  const [experiences, setExperiences] = useState<WorkExperience[]>([]);
  const [experienceEtag, setExperienceEtag] = useState<string | undefined>();

  // Education state
  const [educations, setEducations] = useState<Education[]>([]);
  const [educationEtag, setEducationEtag] = useState<string | undefined>();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');
  const [visibilityFilter, setVisibilityFilter] = useState<'all' | 'published' | 'hidden'>('all');

  // Experience Modal state
  const [isExpModalOpen, setIsExpModalOpen] = useState(false);
  const [editingExp, setEditingExp] = useState<WorkExperience | null>(null);
  const [expFormData, setExpFormData] = useState<{
    role: string;
    company: string;
    companyUrl: string;
    employmentType: string;
    location: string;
    startDate: string;
    endDate: string;
    isCurrent: boolean;
    summary: string;
    responsibilities: string[];
    achievements: string[];
    techStack: string[];
    published: boolean;
  }>({
    role: '',
    company: '',
    companyUrl: '',
    employmentType: 'Full-time',
    location: '',
    startDate: '',
    endDate: '',
    isCurrent: false,
    summary: '',
    responsibilities: [''],
    achievements: [''],
    techStack: [],
    published: true,
  });
  const [savingExp, setSavingExp] = useState(false);
  const [expModalError, setExpModalError] = useState<string | null>(null);
  const [newTechInput, setNewTechInput] = useState('');

  // Education Modal state
  const [isEduModalOpen, setIsEduModalOpen] = useState(false);
  const [editingEdu, setEditingEdu] = useState<Education | null>(null);
  const [eduFormData, setEduFormData] = useState<{
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
  const [savingEdu, setSavingEdu] = useState(false);
  const [eduModalError, setEduModalError] = useState<string | null>(null);

  // Deletion Confirmation state
  const [itemToDelete, setItemToDelete] = useState<
    | { type: 'experience'; item: WorkExperience }
    | { type: 'education'; item: Education }
    | null
  >(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    const [expRes, eduRes] = await Promise.all([
      adminService.getExperience(),
      adminService.getEducation(),
    ]);

    if (expRes.success && expRes.data) {
      setExperiences(expRes.data);
      setExperienceEtag(expRes.etag);
    } else {
      setError(expRes.error || 'Failed to load experience records');
    }

    if (eduRes.success && eduRes.data) {
      setEducations(eduRes.data);
      setEducationEtag(eduRes.etag);
    } else {
      setError(eduRes.error || 'Failed to load education records');
    }

    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // -------------------------------------------------------------
  // Experience Handlers
  // -------------------------------------------------------------
  const handleOpenExpModal = (exp?: WorkExperience) => {
    setExpModalError(null);
    setNewTechInput('');
    if (exp) {
      setEditingExp(exp);
      setExpFormData({
        role: exp.role,
        company: exp.company,
        companyUrl: exp.companyUrl || '',
        employmentType: exp.employmentType || 'Full-time',
        location: exp.location || '',
        startDate: exp.startDate,
        endDate: exp.endDate || '',
        isCurrent: exp.isCurrent,
        summary: exp.summary || '',
        responsibilities: exp.responsibilities && exp.responsibilities.length > 0 ? [...exp.responsibilities] : [''],
        achievements: exp.achievements && exp.achievements.length > 0 ? [...exp.achievements] : [''],
        techStack: [...(exp.techStack || [])],
        published: exp.published !== false,
      });
    } else {
      setEditingExp(null);
      setExpFormData({
        role: '',
        company: '',
        companyUrl: '',
        employmentType: 'Full-time',
        location: '',
        startDate: '',
        endDate: '',
        isCurrent: false,
        summary: '',
        responsibilities: [''],
        achievements: [''],
        techStack: [],
        published: true,
      });
    }
    setIsExpModalOpen(true);
  };

  const handleSaveExp = async (e: React.FormEvent) => {
    e.preventDefault();
    setExpModalError(null);

    // Validation
    if (!expFormData.role.trim() || expFormData.role.trim().length < 2) {
      setExpModalError('Role title must be at least 2 characters.');
      return;
    }
    if (!expFormData.company.trim() || expFormData.company.trim().length < 2) {
      setExpModalError('Company name must be at least 2 characters.');
      return;
    }
    if (!expFormData.startDate.trim() || expFormData.startDate.trim().length < 4) {
      setExpModalError('Start date is required (e.g., 2022-01).');
      return;
    }
    if (!expFormData.isCurrent && expFormData.endDate.trim() && expFormData.startDate.trim()) {
      if (expFormData.endDate.trim() < expFormData.startDate.trim()) {
        setExpModalError('End date cannot be earlier than start date.');
        return;
      }
    }
    if (expFormData.companyUrl.trim() && !/^https?:\/\//i.test(expFormData.companyUrl.trim())) {
      setExpModalError('Company URL must be a valid HTTP or HTTPS URL.');
      return;
    }

    setSavingExp(true);

    const cleanedResponsibilities = expFormData.responsibilities
      .map((r) => r.trim())
      .filter((r) => r.length > 0);

    const cleanedAchievements = expFormData.achievements
      .map((a) => a.trim())
      .filter((a) => a.length > 0);

    const payload = {
      role: expFormData.role.trim(),
      company: expFormData.company.trim(),
      companyUrl: expFormData.companyUrl.trim() || null,
      employmentType: expFormData.employmentType.trim() || undefined,
      location: expFormData.location.trim() || undefined,
      startDate: expFormData.startDate.trim(),
      endDate: expFormData.isCurrent ? null : expFormData.endDate.trim() || null,
      isCurrent: expFormData.isCurrent,
      summary: expFormData.summary.trim() || undefined,
      responsibilities: cleanedResponsibilities,
      achievements: cleanedAchievements,
      techStack: expFormData.techStack,
      published: expFormData.published,
      order: editingExp ? editingExp.order : experiences.length,
      revision: editingExp ? editingExp.revision : 1,
    };

    let res;
    if (editingExp) {
      res = await adminService.updateExperience(editingExp.id, payload, experienceEtag);
    } else {
      res = await adminService.createExperience(payload, experienceEtag);
    }

    setSavingExp(false);

    if (res.success && res.data) {
      setIsExpModalOpen(false);
      setFeedback({
        type: 'success',
        message: `Work experience "${res.data.role} at ${res.data.company}" saved successfully.`,
      });
      await loadData();
    } else if (res.error?.includes('modified by another session')) {
      setExpModalError('Conflict: Experience records were modified in another session. Please reload to sync recent changes.');
    } else {
      setExpModalError(res.error || 'Failed to save experience record.');
    }
  };

  const handleToggleExpVisibility = async (exp: WorkExperience) => {
    const updated = {
      ...exp,
      published: !exp.published,
    };
    const res = await adminService.updateExperience(exp.id, updated, experienceEtag);
    if (res.success) {
      setFeedback({
        type: 'success',
        message: `Experience visibility changed to ${!exp.published ? 'published' : 'hidden'}.`,
      });
      await loadData();
    } else {
      setFeedback({ type: 'error', message: res.error || 'Failed to update visibility.' });
    }
  };

  const handleMoveExp = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= experiences.length) return;

    const newOrder = [...experiences];
    const [moved] = newOrder.splice(index, 1);
    newOrder.splice(targetIndex, 0, moved);

    const orderedIds = newOrder.map((e) => e.id);
    const res = await adminService.reorderExperience(orderedIds, experienceEtag);

    if (res.success && res.data) {
      setExperiences(res.data);
      setFeedback({ type: 'success', message: 'Experience display order updated.' });
      await loadData();
    } else {
      setFeedback({ type: 'error', message: res.error || 'Failed to reorder experience.' });
    }
  };

  // -------------------------------------------------------------
  // Education Handlers
  // -------------------------------------------------------------
  const handleOpenEduModal = (edu?: Education) => {
    setEduModalError(null);
    if (edu) {
      setEditingEdu(edu);
      setEduFormData({
        degree: edu.degree,
        institution: edu.institution,
        fieldOfStudy: edu.fieldOfStudy,
        startDate: edu.startDate || '',
        endDate: edu.endDate || '',
        startYear: edu.startYear ? String(edu.startYear) : '',
        endYear: edu.endYear ? String(edu.endYear) : '',
        grade: edu.grade || '',
        description: edu.description || '',
        published: edu.published !== false,
      });
    } else {
      setEditingEdu(null);
      setEduFormData({
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
    }
    setIsEduModalOpen(true);
  };

  const handleSaveEdu = async (e: React.FormEvent) => {
    e.preventDefault();
    setEduModalError(null);

    // Validation
    if (!eduFormData.degree.trim() || eduFormData.degree.trim().length < 2) {
      setEduModalError('Degree title must be at least 2 characters.');
      return;
    }
    if (!eduFormData.institution.trim() || eduFormData.institution.trim().length < 2) {
      setEduModalError('Institution name must be at least 2 characters.');
      return;
    }
    if (!eduFormData.fieldOfStudy.trim() || eduFormData.fieldOfStudy.trim().length < 2) {
      setEduModalError('Field of study must be at least 2 characters.');
      return;
    }
    if (eduFormData.startDate.trim() && eduFormData.endDate.trim()) {
      if (eduFormData.endDate.trim() < eduFormData.startDate.trim()) {
        setEduModalError('End date cannot be earlier than start date.');
        return;
      }
    }

    setSavingEdu(true);

    const payload = {
      degree: eduFormData.degree.trim(),
      institution: eduFormData.institution.trim(),
      fieldOfStudy: eduFormData.fieldOfStudy.trim(),
      startDate: eduFormData.startDate.trim() || undefined,
      endDate: eduFormData.endDate.trim() || null,
      startYear: eduFormData.startYear ? parseInt(eduFormData.startYear, 10) : undefined,
      endYear: eduFormData.endYear ? parseInt(eduFormData.endYear, 10) : null,
      grade: eduFormData.grade.trim() || undefined,
      description: eduFormData.description.trim() || undefined,
      published: eduFormData.published,
      order: editingEdu ? editingEdu.order : educations.length,
      revision: editingEdu ? editingEdu.revision : 1,
    };

    let res;
    if (editingEdu) {
      res = await adminService.updateEducation(editingEdu.id, payload, educationEtag);
    } else {
      res = await adminService.createEducation(payload, educationEtag);
    }

    setSavingEdu(false);

    if (res.success && res.data) {
      setIsEduModalOpen(false);
      setFeedback({
        type: 'success',
        message: `Education "${res.data.degree} at ${res.data.institution}" saved successfully.`,
      });
      await loadData();
    } else {
      setEduModalError(res.error || 'Failed to save education record.');
    }
  };

  const handleToggleEduVisibility = async (edu: Education) => {
    const updated = {
      ...edu,
      published: !edu.published,
    };
    const res = await adminService.updateEducation(edu.id, updated, educationEtag);
    if (res.success) {
      setFeedback({
        type: 'success',
        message: `Education visibility changed to ${!edu.published ? 'published' : 'hidden'}.`,
      });
      await loadData();
    } else {
      setFeedback({ type: 'error', message: res.error || 'Failed to update visibility.' });
    }
  };

  const handleMoveEdu = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= educations.length) return;

    const newOrder = [...educations];
    const [moved] = newOrder.splice(index, 1);
    newOrder.splice(targetIndex, 0, moved);

    const orderedIds = newOrder.map((e) => e.id);
    const res = await adminService.reorderEducation(orderedIds, educationEtag);

    if (res.success && res.data) {
      setEducations(res.data);
      setFeedback({ type: 'success', message: 'Education display order updated.' });
      await loadData();
    } else {
      setFeedback({ type: 'error', message: res.error || 'Failed to reorder education.' });
    }
  };

  // -------------------------------------------------------------
  // Deletion Execution
  // -------------------------------------------------------------
  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;
    setDeleting(true);
    setDeleteError(null);

    if (itemToDelete.type === 'experience') {
      const res = await adminService.deleteExperience(itemToDelete.item.id, experienceEtag);
      setDeleting(false);
      if (res.success) {
        setItemToDelete(null);
        setFeedback({
          type: 'success',
          message: `Experience record "${itemToDelete.item.role}" deleted.`,
        });
        await loadData();
      } else {
        setDeleteError(res.error || 'Failed to delete experience record.');
      }
    } else {
      const res = await adminService.deleteEducation(itemToDelete.item.id, educationEtag);
      setDeleting(false);
      if (res.success) {
        setItemToDelete(null);
        setFeedback({
          type: 'success',
          message: `Education record "${itemToDelete.item.degree}" deleted.`,
        });
        await loadData();
      } else {
        setDeleteError(res.error || 'Failed to delete education record.');
      }
    }
  };

  // -------------------------------------------------------------
  // Filtered lists
  // -------------------------------------------------------------
  const filteredExperiences = experiences.filter((exp) => {
    const matchesSearch =
      exp.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exp.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (exp.techStack && exp.techStack.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())));
    const matchesVisibility =
      visibilityFilter === 'all'
        ? true
        : visibilityFilter === 'published'
        ? exp.published !== false
        : exp.published === false;
    return matchesSearch && matchesVisibility;
  });

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

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <SkeletonLoader className="h-8 w-64" />
          <SkeletonLoader className="h-10 w-36" />
        </div>
        <SkeletonLoader className="h-40 rounded-xl" count={3} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Tab Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-stroke-subtle pb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Career & Education CMS
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage professional enterprise experience, chronological roles, academic degrees, and public showcase status.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'experience' ? (
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => handleOpenExpModal()}
            >
              Add Experience
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => handleOpenEduModal()}
            >
              Add Education
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-stroke-subtle pb-px">
        <button
          type="button"
          onClick={() => setActiveTab('experience')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'experience'
              ? 'border-brand-primary text-brand-primary'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          <span>Work Experience ({experiences.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('education')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'education'
              ? 'border-brand-primary text-brand-primary'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span>Education & Academics ({educations.length})</span>
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

      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-stroke-subtle shadow-xs">
        <div className="relative flex-grow max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              activeTab === 'experience'
                ? 'Search by role, company, or tech stack...'
                : 'Search by degree, institution, or field...'
            }
            className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-stroke-subtle text-xs text-slate-900 focus-ring bg-slate-50/50"
          />
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
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

      {/* ========================================================= */}
      {/* Tab 1: Work Experience List */}
      {/* ========================================================= */}
      {activeTab === 'experience' && (
        <div className="space-y-4">
          {filteredExperiences.length > 0 ? (
            filteredExperiences.map((exp, idx) => (
              <Card
                key={exp.id}
                className="p-5 border-stroke-subtle hover:border-stroke-ice transition-all"
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  {/* Left Column: Details */}
                  <div className="space-y-2 flex-grow">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-bold text-slate-900">{exp.role}</h3>
                      {exp.isCurrent ? (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Current Role
                        </span>
                      ) : null}
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                          exp.published !== false
                            ? 'bg-blue-50 text-brand-primary border-blue-200'
                            : 'bg-slate-100 text-slate-500 border-slate-200'
                        }`}
                      >
                        {exp.published !== false ? 'Published' : 'Hidden'}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                      <span className="inline-flex items-center gap-1 font-semibold text-slate-800">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        {exp.companyUrl ? (
                          <a
                            href={exp.companyUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-brand-primary hover:underline inline-flex items-center gap-0.5"
                          >
                            <span>{exp.company}</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          exp.company
                        )}
                      </span>
                      {exp.location && (
                        <span className="inline-flex items-center gap-1 text-slate-500">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          {exp.location}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 text-slate-500">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {exp.startDate} – {exp.isCurrent ? 'Present' : exp.endDate || 'Present'}
                      </span>
                      {exp.employmentType && (
                        <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-medium">
                          {exp.employmentType}
                        </span>
                      )}
                    </div>

                    {exp.summary && (
                      <p className="text-xs text-slate-600 leading-relaxed pt-1">
                        {exp.summary}
                      </p>
                    )}

                    {exp.responsibilities && exp.responsibilities.length > 0 && (
                      <ul className="text-xs text-slate-600 list-disc list-inside space-y-1 pt-1">
                        {exp.responsibilities.slice(0, 3).map((resp, i) => (
                          <li key={i}>{resp}</li>
                        ))}
                        {exp.responsibilities.length > 3 && (
                          <li className="text-slate-400 italic">
                            + {exp.responsibilities.length - 3} more responsibilities
                          </li>
                        )}
                      </ul>
                    )}

                    {exp.techStack && exp.techStack.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-2">
                        {exp.techStack.map((tech) => (
                          <TechTag key={tech} label={tech} />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Right Column: Actions */}
                  <div className="flex items-center gap-1 md:self-start shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                    <button
                      type="button"
                      onClick={() => handleMoveExp(idx, 'up')}
                      disabled={idx === 0}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent"
                      title="Move Up"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveExp(idx, 'down')}
                      disabled={idx === experiences.length - 1}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent"
                      title="Move Down"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleExpVisibility(exp)}
                      className={`p-1.5 rounded-lg border ${
                        exp.published !== false
                          ? 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                          : 'border-slate-200 text-slate-400 hover:bg-slate-50'
                      }`}
                      title={exp.published !== false ? 'Hide from public site' : 'Publish to public site'}
                    >
                      {exp.published !== false ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenExpModal(exp)}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                      title="Edit Experience"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setItemToDelete({ type: 'experience', item: exp })}
                      className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50"
                      title="Delete Experience"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </Card>
            ))
          ) : (
            <EmptyState
              title="No experience records found"
              description="No professional experience matches the current filters or query."
            />
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* Tab 2: Education List */}
      {/* ========================================================= */}
      {activeTab === 'education' && (
        <div className="space-y-4">
          {filteredEducations.length > 0 ? (
            filteredEducations.map((edu, idx) => (
              <Card
                key={edu.id}
                className="p-5 border-stroke-subtle hover:border-stroke-ice transition-all"
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  {/* Left Column: Details */}
                  <div className="space-y-2 flex-grow">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-bold text-slate-900">{edu.degree}</h3>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                          edu.published !== false
                            ? 'bg-blue-50 text-brand-primary border-blue-200'
                            : 'bg-slate-100 text-slate-500 border-slate-200'
                        }`}
                      >
                        {edu.published !== false ? 'Published' : 'Hidden'}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                      <span className="font-semibold text-slate-800">{edu.institution}</span>
                      <span>•</span>
                      <span className="text-slate-700">{edu.fieldOfStudy}</span>
                      <span>•</span>
                      <span className="inline-flex items-center gap-1 text-slate-500">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {edu.startDate || edu.startYear} – {edu.endDate || edu.endYear || 'Present'}
                      </span>
                      {edu.grade && (
                        <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-medium">
                          Grade: {edu.grade}
                        </span>
                      )}
                    </div>

                    {edu.description && (
                      <p className="text-xs text-slate-600 leading-relaxed pt-1">
                        {edu.description}
                      </p>
                    )}
                  </div>

                  {/* Right Column: Actions */}
                  <div className="flex items-center gap-1 md:self-start shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                    <button
                      type="button"
                      onClick={() => handleMoveEdu(idx, 'up')}
                      disabled={idx === 0}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent"
                      title="Move Up"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveEdu(idx, 'down')}
                      disabled={idx === educations.length - 1}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent"
                      title="Move Down"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleEduVisibility(edu)}
                      className={`p-1.5 rounded-lg border ${
                        edu.published !== false
                          ? 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                          : 'border-slate-200 text-slate-400 hover:bg-slate-50'
                      }`}
                      title={edu.published !== false ? 'Hide from public site' : 'Publish to public site'}
                    >
                      {edu.published !== false ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenEduModal(edu)}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                      title="Edit Education"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setItemToDelete({ type: 'education', item: edu })}
                      className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50"
                      title="Delete Education"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </Card>
            ))
          ) : (
            <EmptyState
              title="No education records found"
              description="No academic credentials match the current query."
            />
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* Experience Edit/Create Modal */}
      {/* ========================================================= */}
      {isExpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-stroke-subtle shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleSaveExp} className="p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-stroke-subtle pb-4">
                <h2 className="text-lg font-bold text-slate-900">
                  {editingExp ? 'Edit Work Experience' : 'Add Work Experience'}
                </h2>
                <button
                  type="button"
                  onClick={() => setIsExpModalOpen(false)}
                  className="text-slate-400 hover:text-slate-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {expModalError && (
                <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{expModalError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Role Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={expFormData.role}
                    onChange={(e) => setExpFormData({ ...expFormData, role: e.target.value })}
                    placeholder="e.g. DevOps & Cloud Engineer"
                    className="w-full px-3 py-2 rounded-lg border border-stroke-subtle text-xs text-slate-900 focus-ring"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Company Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={expFormData.company}
                    onChange={(e) => setExpFormData({ ...expFormData, company: e.target.value })}
                    placeholder="e.g. Enterprise Cloud Solutions Ltd"
                    className="w-full px-3 py-2 rounded-lg border border-stroke-subtle text-xs text-slate-900 focus-ring"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Company Website (Optional)
                  </label>
                  <input
                    type="url"
                    value={expFormData.companyUrl}
                    onChange={(e) => setExpFormData({ ...expFormData, companyUrl: e.target.value })}
                    placeholder="https://company.com"
                    className="w-full px-3 py-2 rounded-lg border border-stroke-subtle text-xs text-slate-900 focus-ring"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Location & Model
                  </label>
                  <input
                    type="text"
                    value={expFormData.location}
                    onChange={(e) => setExpFormData({ ...expFormData, location: e.target.value })}
                    placeholder="e.g. Hyderabad, India (Hybrid)"
                    className="w-full px-3 py-2 rounded-lg border border-stroke-subtle text-xs text-slate-900 focus-ring"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Start Date *
                  </label>
                  <input
                    type="text"
                    required
                    value={expFormData.startDate}
                    onChange={(e) => setExpFormData({ ...expFormData, startDate: e.target.value })}
                    placeholder="e.g. 2022-01 or Jan 2022"
                    className="w-full px-3 py-2 rounded-lg border border-stroke-subtle text-xs text-slate-900 focus-ring"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    End Date
                  </label>
                  <input
                    type="text"
                    disabled={expFormData.isCurrent}
                    value={expFormData.isCurrent ? '' : expFormData.endDate}
                    onChange={(e) => setExpFormData({ ...expFormData, endDate: e.target.value })}
                    placeholder={expFormData.isCurrent ? 'Present' : 'e.g. 2024-05'}
                    className="w-full px-3 py-2 rounded-lg border border-stroke-subtle text-xs text-slate-900 focus-ring disabled:bg-slate-100 disabled:text-slate-400"
                  />
                </div>

                <div className="pb-2">
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={expFormData.isCurrent}
                      onChange={(e) =>
                        setExpFormData({
                          ...expFormData,
                          isCurrent: e.target.checked,
                          endDate: e.target.checked ? '' : expFormData.endDate,
                        })
                      }
                      className="rounded border-slate-300 text-brand-primary focus:ring-brand-primary"
                    />
                    <span className="text-xs font-semibold text-slate-700">Current Role</span>
                  </label>
                </div>
              </div>

              <div>
                <RichTextEditor
                  label="Executive Role Summary"
                  value={expFormData.summary}
                  onChange={(val) => setExpFormData({ ...expFormData, summary: val })}
                  minHeight="80px"
                  placeholder="Key scope, leadership impact, and operational architecture focus..."
                  helperText="High-level overview rendered on the career timeline. Supports bold highlights, formatting, and colors."
                />
              </div>

              {/* Responsibilities list editor */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Key Responsibilities & Deliverables
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setExpFormData({
                        ...expFormData,
                        responsibilities: [...expFormData.responsibilities, ''],
                      })
                    }
                    className="text-xs text-brand-primary font-semibold hover:underline inline-flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>
                <div className="space-y-2">
                  {expFormData.responsibilities.map((resp, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={resp}
                        onChange={(e) => {
                          const updated = [...expFormData.responsibilities];
                          updated[i] = e.target.value;
                          setExpFormData({ ...expFormData, responsibilities: updated });
                        }}
                        placeholder={`Responsibility #${i + 1}`}
                        className="w-full px-3 py-1.5 rounded-lg border border-stroke-subtle text-xs text-slate-900 focus-ring"
                      />
                      {expFormData.responsibilities.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const updated = expFormData.responsibilities.filter((_, idx) => idx !== i);
                            setExpFormData({ ...expFormData, responsibilities: updated });
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

              {/* Achievements list editor */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Quantified Achievements & Highlights
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setExpFormData({
                        ...expFormData,
                        achievements: [...expFormData.achievements, ''],
                      })
                    }
                    className="text-xs text-brand-primary font-semibold hover:underline inline-flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>
                <div className="space-y-2">
                  {expFormData.achievements.map((ach, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={ach}
                        onChange={(e) => {
                          const updated = [...expFormData.achievements];
                          updated[i] = e.target.value;
                          setExpFormData({ ...expFormData, achievements: updated });
                        }}
                        placeholder={`Achievement #${i + 1}`}
                        className="w-full px-3 py-1.5 rounded-lg border border-stroke-subtle text-xs text-slate-900 focus-ring"
                      />
                      {expFormData.achievements.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const updated = expFormData.achievements.filter((_, idx) => idx !== i);
                            setExpFormData({ ...expFormData, achievements: updated });
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

              {/* Tech Stack Tags */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Associated Tech Stack
                </label>
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="text"
                    value={newTechInput}
                    onChange={(e) => setNewTechInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (newTechInput.trim() && !expFormData.techStack.includes(newTechInput.trim())) {
                          setExpFormData({
                            ...expFormData,
                            techStack: [...expFormData.techStack, newTechInput.trim()],
                          });
                          setNewTechInput('');
                        }
                      }
                    }}
                    placeholder="Type technology (e.g. Kubernetes) and press Add..."
                    className="w-full px-3 py-1.5 rounded-lg border border-stroke-subtle text-xs text-slate-900 focus-ring"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (newTechInput.trim() && !expFormData.techStack.includes(newTechInput.trim())) {
                        setExpFormData({
                          ...expFormData,
                          techStack: [...expFormData.techStack, newTechInput.trim()],
                        });
                        setNewTechInput('');
                      }
                    }}
                  >
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {expFormData.techStack.map((tech) => (
                    <span
                      key={tech}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-800 border border-slate-200"
                    >
                      <span>{tech}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setExpFormData({
                            ...expFormData,
                            techStack: expFormData.techStack.filter((t) => t !== tech),
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

              {/* Published Toggle */}
              <div className="pt-2 border-t border-stroke-subtle">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={expFormData.published}
                    onChange={(e) => setExpFormData({ ...expFormData, published: e.target.checked })}
                    className="rounded border-slate-300 text-brand-primary focus:ring-brand-primary"
                  />
                  <span className="text-xs font-semibold text-slate-800">
                    Publish this experience record to public website
                  </span>
                </label>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-stroke-subtle">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsExpModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={savingExp}
                >
                  {savingExp ? 'Saving...' : editingExp ? 'Update Experience' : 'Create Experience'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* Education Edit/Create Modal */}
      {/* ========================================================= */}
      {isEduModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-stroke-subtle shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleSaveEdu} className="p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-stroke-subtle pb-4">
                <h2 className="text-lg font-bold text-slate-900">
                  {editingEdu ? 'Edit Academic Education' : 'Add Academic Education'}
                </h2>
                <button
                  type="button"
                  onClick={() => setIsEduModalOpen(false)}
                  className="text-slate-400 hover:text-slate-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {eduModalError && (
                <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{eduModalError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Degree / Program *
                </label>
                <input
                  type="text"
                  required
                  value={eduFormData.degree}
                  onChange={(e) => setEduFormData({ ...eduFormData, degree: e.target.value })}
                  placeholder="e.g. Bachelor of Technology (B.Tech)"
                  className="w-full px-3 py-2 rounded-lg border border-stroke-subtle text-xs text-slate-900 focus-ring"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Institution / University *
                </label>
                <input
                  type="text"
                  required
                  value={eduFormData.institution}
                  onChange={(e) => setEduFormData({ ...eduFormData, institution: e.target.value })}
                  placeholder="e.g. Jawaharlal Nehru Technological University"
                  className="w-full px-3 py-2 rounded-lg border border-stroke-subtle text-xs text-slate-900 focus-ring"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Field of Study / Major *
                </label>
                <input
                  type="text"
                  required
                  value={eduFormData.fieldOfStudy}
                  onChange={(e) => setEduFormData({ ...eduFormData, fieldOfStudy: e.target.value })}
                  placeholder="e.g. Computer Science & Engineering"
                  className="w-full px-3 py-2 rounded-lg border border-stroke-subtle text-xs text-slate-900 focus-ring"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Start Date / Year
                  </label>
                  <input
                    type="text"
                    value={eduFormData.startDate}
                    onChange={(e) => setEduFormData({ ...eduFormData, startDate: e.target.value })}
                    placeholder="e.g. 2018 or 2018-08"
                    className="w-full px-3 py-2 rounded-lg border border-stroke-subtle text-xs text-slate-900 focus-ring"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    End Date / Year
                  </label>
                  <input
                    type="text"
                    value={eduFormData.endDate}
                    onChange={(e) => setEduFormData({ ...eduFormData, endDate: e.target.value })}
                    placeholder="e.g. 2022 or 2022-05"
                    className="w-full px-3 py-2 rounded-lg border border-stroke-subtle text-xs text-slate-900 focus-ring"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Grade / Honors (Optional)
                </label>
                <input
                  type="text"
                  value={eduFormData.grade}
                  onChange={(e) => setEduFormData({ ...eduFormData, grade: e.target.value })}
                  placeholder="e.g. First Class with Distinction / GPA 3.8"
                  className="w-full px-3 py-2 rounded-lg border border-stroke-subtle text-xs text-slate-900 focus-ring"
                />
              </div>

              <div>
                <RichTextEditor
                  label="Academic Focus / Description"
                  value={eduFormData.description}
                  onChange={(val) => setEduFormData({ ...eduFormData, description: val })}
                  minHeight="80px"
                  placeholder="Specialization, relevant coursework, or research highlights..."
                  helperText="Educational focus, honors, or project highlights."
                />
              </div>

              {/* Published Toggle */}
              <div className="pt-2 border-t border-stroke-subtle">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={eduFormData.published}
                    onChange={(e) => setEduFormData({ ...eduFormData, published: e.target.checked })}
                    className="rounded border-slate-300 text-brand-primary focus:ring-brand-primary"
                  />
                  <span className="text-xs font-semibold text-slate-800">
                    Publish this academic record to public website
                  </span>
                </label>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-stroke-subtle">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEduModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={savingEdu}
                >
                  {savingEdu ? 'Saving...' : editingEdu ? 'Update Education' : 'Create Education'}
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
                  Delete {itemToDelete.type === 'experience' ? 'Experience Record' : 'Academic Record'}?
                </h3>
                <p className="text-xs text-slate-500">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to permanently delete{' '}
              <strong className="text-slate-900">
                {itemToDelete.type === 'experience'
                  ? `"${itemToDelete.item.role} at ${itemToDelete.item.company}"`
                  : `"${itemToDelete.item.degree} at ${itemToDelete.item.institution}"`}
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
export default ExperiencePage;
