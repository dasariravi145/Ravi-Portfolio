import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { adminService } from '../../services/adminService';
import { Project } from '../../types/portfolio';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { StatusBadge, CategoryPill } from '../../components/common/Badge';
import { SkeletonLoader } from '../../components/common/SkeletonLoader';
import { EmptyState } from '../../components/common/EmptyState';
import {
  FolderGit2,
  Plus,
  Search,
  Filter,
  ArrowUp,
  ArrowDown,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  Star,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Layers,
} from 'lucide-react';

export const ProjectsListPage: React.FC = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [etag, setEtag] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'published' | 'draft'>('all');

  // Deletion Modal State
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadProjects = async () => {
    setLoading(true);
    setError(null);
    const res = await adminService.getProjects();
    if (res.success && res.data) {
      setProjects(res.data);
      setEtag(res.etag);
    } else {
      setError(res.error || 'Failed to load projects');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  // Reordering handlers (Accessible Move Up / Down)
  const handleMove = async (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === projects.length - 1)
    ) {
      return;
    }

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const reordered = [...projects];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);

    // Optimistically update local display
    setProjects(reordered);

    const orderedIds = reordered.map((p) => p.id);
    const res = await adminService.reorderProjects(orderedIds, etag);
    if (res.success && res.data) {
      setProjects(res.data);
      if (res.etag) setEtag(res.etag);
      showFeedback('success', `Moved "${moved.title}" ${direction}. Display order saved.`);
    } else {
      showFeedback('error', res.error || 'Failed to save new display order.');
      loadProjects();
    }
  };

  // Toggle Publication
  const handleTogglePublish = async (project: Project) => {
    const nextState = !project.published;
    const res = await adminService.publishProject(project.id, nextState, etag);
    if (res.success && res.data) {
      setProjects((prev) =>
        prev.map((p) => (p.id === project.id ? res.data! : p))
      );
      if (res.etag) setEtag(res.etag);
      showFeedback(
        'success',
        `Project "${project.title}" ${nextState ? 'published' : 'moved to drafts'}.`
      );
    } else {
      showFeedback('error', res.error || 'Failed to update publication status.');
    }
  };

  // Toggle Featured
  const handleToggleFeatured = async (project: Project) => {
    if (!project.published && !project.featured) {
      showFeedback('error', 'Draft projects cannot be featured. Please publish the project first.');
      return;
    }

    const res = await adminService.updateProject(
      project.id,
      { featured: !project.featured },
      etag
    );
    if (res.success && res.data) {
      setProjects((prev) =>
        prev.map((p) => (p.id === project.id ? res.data! : p))
      );
      if (res.etag) setEtag(res.etag);
      showFeedback(
        'success',
        `Project "${project.title}" ${!project.featured ? 'marked as featured' : 'unfeatured'}.`
      );
    } else {
      showFeedback('error', res.error || 'Failed to toggle featured flag.');
    }
  };

  // Delete Project Confirm
  const confirmDelete = async () => {
    if (!projectToDelete) return;
    setDeleting(true);
    const res = await adminService.deleteProject(projectToDelete.id, etag);
    if (res.success) {
      setProjects((prev) => prev.filter((p) => p.id !== projectToDelete.id));
      setProjectToDelete(null);
      showFeedback('success', `Project "${projectToDelete.title}" and its media were deleted.`);
    } else {
      showFeedback('error', res.error || 'Failed to delete project.');
    }
    setDeleting(false);
  };

  // Filtered List
  const categories = Array.from(new Set(projects.map((p) => p.category)));

  const filteredProjects = projects.filter((project) => {
    const matchesSearch =
      project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.summary.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      selectedCategory === 'all' || project.category === selectedCategory;

    const matchesStatus =
      selectedStatus === 'all' ||
      (selectedStatus === 'published' && project.published) ||
      (selectedStatus === 'draft' && !project.published);

    return matchesSearch && matchesCategory && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <FolderGit2 className="w-6 h-6 text-brand-primary" />
            <span>Projects CMS</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage engineering case studies, cover media, galleries, publication state, and ordering.
          </p>
        </div>

        <div>
          <Button
            variant="primary"
            onClick={() => navigate('/admin/projects/new')}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Add New Project
          </Button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          role="status"
          className={`p-4 rounded-xl border flex items-center gap-3 text-sm font-medium transition-all ${
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

      {/* Filter and Search Bar */}
      <Card padding="md" className="space-y-4 sm:space-y-0 sm:flex sm:items-center sm:gap-4 bg-canvas-pearl">
        <div className="relative flex-grow">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search projects by title, slug, or summary..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-stroke-subtle rounded-lg focus-ring text-slate-800"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span>Category:</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-white border border-stroke-subtle rounded-md focus-ring text-slate-800"
            >
              <option value="all">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <span>Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as any)}
              className="px-2.5 py-1.5 text-xs bg-white border border-stroke-subtle rounded-md focus-ring text-slate-800"
            >
              <option value="all">All ({projects.length})</option>
              <option value="published">Published ({projects.filter((p) => p.published).length})</option>
              <option value="draft">Drafts ({projects.filter((p) => !p.published).length})</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Main Content Area */}
      {loading ? (
        <Card padding="lg" className="space-y-4">
          <SkeletonLoader className="h-10 w-full" />
          <SkeletonLoader className="h-16 w-full" />
          <SkeletonLoader className="h-16 w-full" />
          <SkeletonLoader className="h-16 w-full" />
        </Card>
      ) : error ? (
        <Card padding="lg" className="text-center py-12 space-y-4 bg-rose-50/50 border-rose-200">
          <AlertTriangle className="w-8 h-8 text-rose-600 mx-auto" />
          <h2 className="text-lg font-bold text-slate-900">Failed to Load Projects</h2>
          <p className="text-sm text-slate-600">{error}</p>
          <Button variant="outline" size="sm" onClick={loadProjects}>
            Retry Loading
          </Button>
        </Card>
      ) : filteredProjects.length === 0 ? (
        <Card padding="lg">
          <EmptyState
            icon={<FolderGit2 className="w-6 h-6" />}
            title={projects.length === 0 ? 'No Projects in CMS' : 'No Matching Projects'}
            description={
              projects.length === 0
                ? 'Create your first engineering case study to showcase on the live portfolio.'
                : 'Try adjusting your search query or filters to find the project you are looking for.'
            }
            action={
              projects.length === 0 ? (
                <Button variant="primary" onClick={() => navigate('/admin/projects/new')}>
                  Create Project
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('all');
                    setSelectedStatus('all');
                  }}
                >
                  Clear Filters
                </Button>
              )
            }
          />
        </Card>
      ) : (
        <div className="bg-white rounded-xl border border-stroke-subtle shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-stroke-subtle bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4 w-14 text-center">Order</th>
                  <th className="py-3 px-4 w-16">Cover</th>
                  <th className="py-3 px-4">Project Details</th>
                  <th className="py-3 px-4 w-40">Status</th>
                  <th className="py-3 px-4 w-28 text-center">Featured</th>
                  <th className="py-3 px-4 w-28 text-center">Visibility</th>
                  <th className="py-3 px-4 w-32 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stroke-subtle text-sm">
                {filteredProjects.map((project, idx) => (
                  <tr key={project.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Order Controls */}
                    <td className="py-3 px-4 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleMove(idx, 'up')}
                          disabled={idx === 0}
                          className="p-1 rounded text-slate-400 hover:text-slate-800 disabled:opacity-30 disabled:hover:text-slate-400 focus-ring"
                          title="Move Up"
                          aria-label={`Move ${project.title} up`}
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-xs font-semibold text-slate-500">
                          {project.displayOrder || idx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleMove(idx, 'down')}
                          disabled={idx === filteredProjects.length - 1}
                          className="p-1 rounded text-slate-400 hover:text-slate-800 disabled:opacity-30 disabled:hover:text-slate-400 focus-ring"
                          title="Move Down"
                          aria-label={`Move ${project.title} down`}
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>

                    {/* Cover Thumbnail */}
                    <td className="py-3 px-4">
                      {project.coverImage?.url ? (
                        <img
                          src={project.coverImage.url}
                          alt={project.title}
                          className="w-12 h-12 object-cover rounded-lg border border-stroke-subtle"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-slate-100 border border-dashed border-stroke-subtle flex items-center justify-center text-slate-400">
                          <Layers className="w-5 h-5" />
                        </div>
                      )}
                    </td>

                    {/* Details */}
                    <td className="py-3 px-4 max-w-xs sm:max-w-md">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 leading-snug line-clamp-1">
                            {project.title}
                          </span>
                          {project.published && (
                            <Link
                              to={`/projects/${project.slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-slate-400 hover:text-brand-primary p-0.5 rounded focus-ring"
                              title="Preview Live Page"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Link>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 font-mono">
                          /{project.slug}
                        </div>
                        <div className="flex items-center gap-2 pt-0.5">
                          <CategoryPill label={project.category} />
                          <span className="text-xs text-slate-400">
                            {project.techStack.length} techs
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Deployment Status */}
                    <td className="py-3 px-4">
                      <StatusBadge status={project.deploymentStatus} size="sm" />
                    </td>

                    {/* Featured Toggle */}
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleFeatured(project)}
                        className={`p-1.5 rounded-lg border transition-colors focus-ring ${
                          project.featured
                            ? 'bg-amber-50 border-amber-300 text-amber-600 hover:bg-amber-100'
                            : 'bg-white border-stroke-subtle text-slate-300 hover:text-slate-500 hover:bg-slate-50'
                        }`}
                        title={project.featured ? 'Featured on Home (Click to remove)' : 'Feature on Home'}
                        aria-label={`Toggle featured status for ${project.title}`}
                      >
                        <Star className={`w-4 h-4 ${project.featured ? 'fill-current' : ''}`} />
                      </button>
                    </td>

                    {/* Publication Toggle */}
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleTogglePublish(project)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors focus-ring ${
                          project.published
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100'
                            : 'bg-slate-100 border-slate-300 text-slate-600 hover:bg-slate-200'
                        }`}
                        title={project.published ? 'Published (Click to unpublish)' : 'Draft (Click to publish)'}
                      >
                        {project.published ? (
                          <>
                            <Eye className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Live</span>
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-3.5 h-3.5 text-slate-500" />
                            <span>Draft</span>
                          </>
                        )}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/admin/projects/edit/${project.id}`)}
                          leftIcon={<Edit2 className="w-3.5 h-3.5" />}
                          title="Edit Project"
                        >
                          Edit
                        </Button>
                        <button
                          type="button"
                          onClick={() => setProjectToDelete(project)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors focus-ring"
                          title="Delete Project"
                          aria-label={`Delete ${project.title}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {projectToDelete && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-stroke-subtle space-y-5 animate-scaleIn">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-lg font-bold text-slate-900">Delete Project?</h3>
              <p className="text-sm text-slate-600">
                Are you sure you want to delete{' '}
                <strong className="text-slate-900">"{projectToDelete.title}"</strong>?
              </p>
              <p className="text-xs text-rose-600 bg-rose-50 p-2.5 rounded-lg border border-rose-200">
                This action is permanent. All associated cover images, diagrams, and gallery screenshots stored in R2 will be permanently purged.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setProjectToDelete(null)}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={confirmDelete}
                isLoading={deleting}
              >
                Permanently Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
