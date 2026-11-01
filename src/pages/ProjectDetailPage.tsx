import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { contentService } from '../services/contentService';
import { Project } from '../types/portfolio';
import { Container } from '../components/common/Container';
import { Card } from '../components/common/Card';
import { StatusBadge, CategoryPill, TechTag } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { SkeletonLoader } from '../components/common/SkeletonLoader';
import { RichTextViewer } from '../components/common/RichTextViewer';
import { ArchitectureGallery } from '../components/project/ArchitectureGallery';
import { ScreenshotGallery } from '../components/project/ScreenshotGallery';
import {
  ArrowLeft,
  ExternalLink,
  Github,
  CheckCircle2,
  AlertTriangle,
  Smartphone,
  ShieldCheck,
  Zap,
} from 'lucide-react';

export const ProjectDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [relatedProjects, setRelatedProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    let isMounted = true;
    setLoading(true);

    Promise.all([
      contentService.getProjectBySlug(slug),
      contentService.getProjects(),
    ]).then(([res, allProjects]) => {
      if (isMounted) {
        setProject(res);
        if (res) {
          const others = allProjects
            .filter((p: Project) => p.slug !== slug && p.published)
            .slice(0, 2);
          setRelatedProjects(others);

          // Update Dynamic Document Title & Meta Description
          const metaTitle = res.seo?.metaTitle || `${res.title} — Case Study | Ravi Dasari`;
          document.title = metaTitle;

          const metaDesc = res.seo?.metaDescription || res.summary;
          let metaTag = document.querySelector('meta[name="description"]');
          if (!metaTag) {
            metaTag = document.createElement('meta');
            metaTag.setAttribute('name', 'description');
            document.head.appendChild(metaTag);
          }
          metaTag.setAttribute('content', metaDesc);

          // Update Canonical Link
          const canonicalHref = `${window.location.origin}/projects/${res.slug}`;
          let canonicalLink = document.querySelector('link[rel="canonical"]');
          if (!canonicalLink) {
            canonicalLink = document.createElement('link');
            canonicalLink.setAttribute('rel', 'canonical');
            document.head.appendChild(canonicalLink);
          }
          canonicalLink.setAttribute('href', canonicalHref);

          // Update Open Graph Tags
          const setMetaProp = (prop: string, content: string) => {
            let el = document.querySelector(`meta[property="${prop}"]`);
            if (!el) {
              el = document.createElement('meta');
              el.setAttribute('property', prop);
              document.head.appendChild(el);
            }
            el.setAttribute('content', content);
          };

          setMetaProp('og:title', metaTitle);
          setMetaProp('og:description', metaDesc);
          setMetaProp('og:url', canonicalHref);
          if (res.coverImage?.url) {
            setMetaProp('og:image', res.coverImage.url.startsWith('http') ? res.coverImage.url : `${window.location.origin}${res.coverImage.url}`);
          }

          // Inject Client-Side JSON-LD Script
          const jsonLdData = {
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name: res.title,
            description: res.summary,
            applicationCategory: 'DeveloperApplication',
            operatingSystem: 'Cloud / Linux / Android',
            author: {
              '@type': 'Person',
              name: 'Ravi Dasari',
              url: window.location.origin,
            },
            url: canonicalHref,
            keywords: (res.techStack || []).join(', '),
          };

          let jsonLdScript = document.getElementById('project-jsonld');
          if (!jsonLdScript) {
            jsonLdScript = document.createElement('script');
            jsonLdScript.id = 'project-jsonld';
            jsonLdScript.setAttribute('type', 'application/ld+json');
            document.head.appendChild(jsonLdScript);
          }
          jsonLdScript.textContent = JSON.stringify(jsonLdData);
        }
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      const script = document.getElementById('project-jsonld');
      if (script) script.remove();
    };
  }, [slug]);

  if (loading) {
    return (
      <Container size="lg" className="py-20 space-y-8">
        <SkeletonLoader className="h-8 w-48" />
        <SkeletonLoader className="h-14 w-3/4" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <SkeletonLoader className="lg:col-span-8 h-96 rounded-xl" />
          <SkeletonLoader className="lg:col-span-4 h-96 rounded-xl" />
        </div>
      </Container>
    );
  }

  if (!project) {
    return (
      <Container size="sm" className="py-28 text-center space-y-6">
        <div className="w-16 h-16 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
          <AlertTriangle className="w-8 h-8 text-amber-600" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Project Not Found or In Draft</h1>
        <p className="text-slate-600 text-sm max-w-md mx-auto">
          The requested project case study could not be located or has not yet been published by the owner.
        </p>
        <div>
          <Button variant="primary" as="a" href="/#projects" leftIcon={<ArrowLeft className="w-4 h-4" />}>
            Back to Featured Projects
          </Button>
        </div>
      </Container>
    );
  }

  return (
    <div className="py-12 md:py-16 bg-white min-h-screen">
      <Container size="lg" className="space-y-10">
        {/* Navigation Breadcrumb */}
        <div>
          <Link
            to="/#projects"
            className="inline-flex items-center gap-2 text-sm font-semibold text-brand-primary hover:text-brand-hover focus-ring rounded"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to All Projects</span>
          </Link>
        </div>

        {/* Project Header */}
        <div className="space-y-4 max-w-4xl">
          <div className="flex flex-wrap items-center gap-2.5">
            <CategoryPill label={project.category} />
            <StatusBadge status={project.deploymentStatus} />
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
            {project.title}
          </h1>

          <div className="text-lg text-slate-600 leading-relaxed font-normal">
            <RichTextViewer content={project.summary} as="p" />
          </div>

          {/* Direct Action Links */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            {project.githubUrl && (
              <Button
                variant="outline"
                size="md"
                leftIcon={<Github className="w-4 h-4" />}
                rightIcon={<ExternalLink className="w-3.5 h-3.5" />}
                as="a"
                href={project.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                GitHub Repository
              </Button>
            )}

            {project.liveDemoUrl && (
              <Button
                variant="primary"
                size="md"
                rightIcon={<ExternalLink className="w-4 h-4" />}
                as="a"
                href={project.liveDemoUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Launch Live Demo
              </Button>
            )}

            {project.googlePlayUrl && (
              <Button
                variant="outline"
                size="md"
                leftIcon={<Smartphone className="w-4 h-4 text-emerald-600" />}
                rightIcon={<ExternalLink className="w-3.5 h-3.5" />}
                as="a"
                href={project.googlePlayUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Google Play Listing
              </Button>
            )}
          </div>
        </div>

        {/* Cover Image Banner (If present) */}
        {project.coverImage?.url && (
          <div className="rounded-2xl overflow-hidden border border-stroke-subtle shadow-pearl bg-canvas-pearl">
            <img
              src={project.coverImage.url}
              alt={project.coverImage.altText || project.title}
              className="w-full max-h-[460px] object-cover"
              onError={(e) => {
                (e.currentTarget.parentElement as HTMLElement).style.display = 'none';
              }}
            />
          </div>
        )}

        {/* Main Content & Sticky Sidebar Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start pt-4 border-t border-stroke-subtle">
          {/* Main Column (8 Cols) */}
          <div className="lg:col-span-8 space-y-10 text-slate-700 leading-relaxed">
            {/* 1. Detailed Overview */}
            {project.detailedOverview && (
              <section className="space-y-3">
                <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-2 h-6 bg-brand-primary rounded-full shrink-0" />
                  <span>Project Overview & Scope</span>
                </h2>
                <div className="text-base text-slate-700 leading-relaxed">
                  <RichTextViewer content={project.detailedOverview} />
                </div>
              </section>
            )}

            {/* 2. Problem Statement */}
            {project.problemStatement && (
              <section className="space-y-3">
                <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-2 h-6 bg-brand-primary rounded-full shrink-0" />
                  <span>The Engineering Problem & Challenge</span>
                </h2>
                <Card className="p-6 bg-canvas-pearl border-stroke-subtle">
                  <div className="text-base text-slate-700 leading-relaxed">
                    <RichTextViewer content={project.problemStatement} />
                  </div>
                </Card>
              </section>
            )}

            {/* 3. Solution Architecture */}
            {project.solutionArchitecture && (
              <section className="space-y-3">
                <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-2 h-6 bg-brand-teal rounded-full shrink-0" />
                  <span>Architecture & System Design</span>
                </h2>
                <div className="space-y-4 text-base text-slate-700 leading-relaxed">
                  <RichTextViewer content={project.solutionArchitecture} />
                </div>
              </section>
            )}

            {/* 4. Technical Architecture Showcase */}
            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                <span className="w-2 h-6 bg-brand-teal rounded-full shrink-0" />
                <span>Technical Architecture Showcase</span>
              </h2>
              <ArchitectureGallery
                diagrams={
                  project.architectureDiagrams && project.architectureDiagrams.length > 0
                    ? project.architectureDiagrams
                    : project.architectureDiagram?.url
                    ? [
                        {
                          id: 'legacy-diagram',
                          projectId: project.id,
                          title: 'System Architecture Diagram',
                          description: project.solutionArchitecture || 'System and infrastructure architecture topology.',
                          category: 'System Architecture',
                          image: project.architectureDiagram,
                          displayOrder: 1,
                          published: true,
                          componentDescriptions: [],
                          technologyReferences: project.techStack.slice(0, 4),
                          components: [],
                          technologies: project.techStack.slice(0, 4),
                          revision: 1,
                        },
                      ]
                    : []
                }
                projectTitle={project.title}
              />
            </section>

            {/* 5. Key Features */}
            {project.features && project.features.length > 0 && (
              <section className="space-y-4">
                <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-2 h-6 bg-brand-primary rounded-full shrink-0" />
                  <span>Key Features & Capabilities</span>
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {project.features.map((feat, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl border border-stroke-subtle bg-canvas-surface flex items-start gap-3 shadow-xs"
                    >
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                      <span className="text-sm text-slate-700 leading-snug">{feat}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* 6. Technical Challenges */}
            {project.technicalChallenges && (
              <section className="space-y-3">
                <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-2 h-6 bg-indigo-600 rounded-full shrink-0" />
                  <span>Technical Challenges & Trade-offs</span>
                </h2>
                <Card className="p-6 bg-canvas-pearl border-stroke-subtle">
                  <div className="text-base text-slate-700 leading-relaxed">
                    <RichTextViewer content={project.technicalChallenges} />
                  </div>
                </Card>
              </section>
            )}

            {/* 7. Testing & Verification Details */}
            {project.testingDetails && (
              <section className="space-y-3">
                <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-2 h-6 bg-emerald-600 rounded-full shrink-0" />
                  <span>Testing Strategy & Verification</span>
                </h2>
                <Card className="p-6 bg-emerald-50/40 border-emerald-100">
                  <div className="text-base text-slate-700 leading-relaxed">
                    <RichTextViewer content={project.testingDetails} />
                  </div>
                </Card>
              </section>
            )}

            {/* 8. Screenshot Gallery */}
            {project.screenshots && project.screenshots.length > 0 && (
              <section className="space-y-4 pt-4 border-t border-stroke-subtle">
                <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-2 h-6 bg-brand-primary rounded-full shrink-0" />
                  <span>Application & Visual Gallery</span>
                </h2>
                <ScreenshotGallery screenshots={project.screenshots} projectTitle={project.title} />
              </section>
            )}
          </div>

          {/* Sticky Sidebar (4 Cols) */}
          <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-28">
            <Card className="p-6 border-stroke-ice bg-canvas-surface space-y-6 shadow-pearl">
              <h3 className="text-base font-bold text-slate-900 border-b border-stroke-ice pb-3">
                Project Overview
              </h3>

              <div className="space-y-3 text-sm">
                <div>
                  <span className="block text-xs font-semibold uppercase text-slate-500 tracking-wider">
                    Category
                  </span>
                  <span className="font-medium text-slate-900">{project.category}</span>
                </div>

                <div>
                  <span className="block text-xs font-semibold uppercase text-slate-500 tracking-wider">
                    Status
                  </span>
                  <span className="font-medium text-slate-900">{project.deploymentStatus}</span>
                </div>

                <div>
                  <span className="block text-xs font-semibold uppercase text-slate-500 tracking-wider">
                    Architecture Role
                  </span>
                  <span className="font-medium text-slate-900">Lead Architect & Engineer</span>
                </div>

                {project.revision && (
                  <div>
                    <span className="block text-xs font-semibold uppercase text-slate-500 tracking-wider">
                      Revision
                    </span>
                    <span className="font-medium text-slate-900">v{project.revision}</span>
                  </div>
                )}
              </div>

              <div>
                <span className="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-2">
                  Verified Technology Stack
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {project.techStack.map((tech) => (
                    <TechTag key={tech} label={tech} />
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-stroke-ice space-y-2">
                <span className="block text-xs font-semibold uppercase text-slate-500 tracking-wider">
                  Key Verification Controls
                </span>
                <ul className="text-xs space-y-1.5 text-slate-600">
                  <li className="flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Automated Security Scanning</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-brand-primary shrink-0" />
                    <span>Zero-Downtime Deployments</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Edge CDN Cached Delivery</span>
                  </li>
                </ul>
              </div>
            </Card>
          </div>
        </div>

        {/* Related Projects Section */}
        {relatedProjects.length > 0 && (
          <div className="pt-12 border-t border-stroke-subtle space-y-6">
            <h2 className="text-2xl font-bold text-slate-900">
              Other Engineering Case Studies
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {relatedProjects.map((rel) => (
                <Card key={rel.id} padding="lg" hoverable className="flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <CategoryPill label={rel.category} />
                      <StatusBadge status={rel.deploymentStatus} size="sm" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">{rel.title}</h3>
                    <p className="text-xs text-slate-600 line-clamp-2">{rel.summary}</p>
                  </div>
                  <div>
                    <Link
                      to={`/projects/${rel.slug}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-brand-primary hover:text-brand-hover focus-ring rounded"
                    >
                      <span>Explore Case Study</span>
                      <ArrowLeft className="w-3.5 h-3.5 rotate-180" />
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </Container>
    </div>
  );
};
