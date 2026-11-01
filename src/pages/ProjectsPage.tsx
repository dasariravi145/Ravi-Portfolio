import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { contentService } from '../services/contentService';
import { Project } from '../types/portfolio';
import { Container } from '../components/common/Container';
import { Card } from '../components/common/Card';
import { StatusBadge, CategoryPill, TechTag } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { SkeletonLoader } from '../components/common/SkeletonLoader';
import { EmptyState } from '../components/common/EmptyState';
import { ErrorState } from '../components/common/ErrorState';
import {
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  Github,
  Search,
  X,
  FolderGit2,
} from 'lucide-react';

export const ProjectsPage: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const loadProjects = () => {
    setLoading(true);
    setError(null);
    contentService
      .getProjects()
      .then((res) => {
        setProjects(res.filter((p) => p.published !== false));
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load projects');
        setLoading(false);
      });
  };

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'Engineering Projects & Case Studies | Ravi Dasari';
    let metaTag = document.querySelector('meta[name="description"]');
    if (!metaTag) {
      metaTag = document.createElement('meta');
      metaTag.setAttribute('name', 'description');
      document.head.appendChild(metaTag);
    }
    metaTag.setAttribute(
      'content',
      'Explore verified DevSecOps engineering pipelines, Android business utilities, and interactive software applications authored by Ravi Dasari.'
    );

    loadProjects();
  }, []);

  const categories = Array.from(new Set(projects.map((p) => p.category)));

  const filteredProjects = projects.filter((project) => {
    const matchesCategory =
      activeCategory === 'all' || project.category === activeCategory;

    const query = searchQuery.trim().toLowerCase();
    const matchesSearch =
      query === '' ||
      project.title.toLowerCase().includes(query) ||
      project.summary.toLowerCase().includes(query) ||
      project.techStack.some((t) => t.toLowerCase().includes(query)) ||
      project.category.toLowerCase().includes(query);

    return matchesCategory && matchesSearch;
  });

  if (loading) {
    return (
      <div className="pt-24 pb-20 bg-canvas-pearl min-h-screen">
        <Container size="lg" className="space-y-8">
          <div className="space-y-3">
            <SkeletonLoader className="h-6 w-32" />
            <SkeletonLoader className="h-10 w-2/3" />
            <SkeletonLoader className="h-5 w-1/2" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <SkeletonLoader className="h-64 rounded-xl" count={6} />
          </div>
        </Container>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pt-28 pb-20 bg-canvas-pearl min-h-screen">
        <Container size="sm">
          <ErrorState
            title="Projects Catalog Unavailable"
            message={error}
            onRetry={loadProjects}
          />
        </Container>
      </div>
    );
  }

  return (
    <div className="pt-24 pb-20 bg-canvas-pearl min-h-screen">
      <Container size="lg">
        {/* Navigation Breadcrumb */}
        <div className="mb-6">
          <Link
            to="/#projects"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-brand-primary transition-colors focus-ring rounded"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Featured Projects</span>
          </Link>
        </div>

        {/* Page Header */}
        <div className="space-y-4 mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-primary/10 text-brand-primary text-xs font-bold uppercase tracking-wider">
            <FolderGit2 className="w-3.5 h-3.5" />
            <span>Engineering Showcase</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Engineering Projects & Case Studies
          </h1>
          <p className="text-base text-slate-600 max-w-2xl leading-relaxed">
            Verified production DevSecOps pipelines, automated cloud infrastructure, published Android applications, and interactive modern platforms.
          </p>
        </div>

        {/* Search & Category Filter Controls */}
        <div className="bg-white p-5 rounded-2xl border border-stroke-subtle shadow-xs mb-8 space-y-4">
          {/* Search Input Bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search projects by title, summary, or technology tag (e.g. Kubernetes, Kotlin)..."
              className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-stroke-subtle bg-canvas-pearl text-sm text-slate-900 focus-ring"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                aria-label="Clear search query"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Category Filter Pills */}
          {categories.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 mr-2">
                Category:
              </span>
              <button
                type="button"
                onClick={() => setActiveCategory('all')}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all focus-ring ${
                  activeCategory === 'all'
                    ? 'bg-brand-primary text-white shadow-xs'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-stroke-subtle'
                }`}
              >
                All Projects ({projects.length})
              </button>
              {categories.map((cat) => {
                const count = projects.filter((p) => p.category === cat).length;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setActiveCategory(cat)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-all focus-ring ${
                      activeCategory === cat
                        ? 'bg-brand-primary text-white shadow-xs'
                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-stroke-subtle'
                    }`}
                  >
                    {cat} ({count})
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Projects Cards Grid */}
        {filteredProjects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project) => (
              <Card
                key={project.id}
                padding="none"
                hoverable
                className="flex flex-col overflow-hidden group border-stroke-subtle bg-white"
              >
                {/* Cover Image */}
                {project.coverImage?.url && (
                  <div className="h-44 w-full overflow-hidden bg-slate-100 border-b border-stroke-subtle">
                    <img
                      src={project.coverImage.url}
                      alt={project.coverImage.altText || project.title}
                      className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                      onError={(e) => {
                        (e.currentTarget.parentElement as HTMLElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}

                {/* Card Header Badge Bar */}
                <div className="p-4 pb-3 border-b border-stroke-subtle flex flex-wrap items-center justify-between gap-2 bg-canvas-pearl/50">
                  <CategoryPill label={project.category} />
                  <StatusBadge status={project.deploymentStatus} size="sm" />
                </div>

                {/* Card Body */}
                <div className="p-5 flex-grow flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <h3 className="text-lg font-bold text-slate-900 group-hover:text-brand-primary transition-colors leading-snug">
                      {project.title}
                    </h3>
                    <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                      {project.summary}
                    </p>
                  </div>

                  {/* Tech Stack Tags */}
                  <div className="flex flex-wrap gap-1 pt-1">
                    {project.techStack.map((tag) => (
                      <TechTag key={tag} label={tag} />
                    ))}
                  </div>

                  {/* Footer Action Links */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <Link
                      to={`/projects/${project.slug}`}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-primary hover:text-brand-hover focus-ring rounded"
                    >
                      <span>View Case Study</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>

                    <div className="flex items-center gap-2">
                      {project.githubUrl && (
                        <a
                          href={project.githubUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded text-slate-500 hover:text-slate-900 border border-slate-200 hover:border-slate-300 transition-colors focus-ring"
                          aria-label={`Source code for ${project.title}`}
                        >
                          <Github className="w-3.5 h-3.5" />
                        </a>
                      )}
                      {project.liveDemoUrl && (
                        <a
                          href={project.liveDemoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded bg-brand-primary text-white hover:bg-brand-hover transition-colors focus-ring"
                        >
                          <span>Live</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      {project.googlePlayUrl && (
                        <a
                          href={project.googlePlayUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded bg-teal-600 text-white hover:bg-teal-700 transition-colors focus-ring"
                        >
                          <span>Play Store</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No projects match your criteria"
            description="Try modifying your search query or selecting a different category filter."
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setActiveCategory('all');
                }}
              >
                Reset Filters
              </Button>
            }
          />
        )}
      </Container>
    </div>
  );
};

