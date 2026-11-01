import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { contentService } from '../services/contentService';
import { AIService, Project } from '../types/portfolio';
import { Container } from '../components/common/Container';
import { Card } from '../components/common/Card';
import { StatusBadge, EvidenceBadge, CategoryPill, TechTag } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { SkeletonLoader } from '../components/common/SkeletonLoader';
import { RichTextViewer } from '../components/common/RichTextViewer';
import { NotFoundPage } from './NotFoundPage';
import {
  ArrowLeft,
  ExternalLink,
  Bot,
  Sparkles,
  CheckCircle2,
  Workflow,
  Cpu,
  Mail,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

export const AIServiceDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [service, setService] = useState<(AIService & { relatedProjects?: Project[] }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    if (!slug) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    let isMounted = true;
    contentService
      .getAIServiceBySlug(slug)
      .then((res) => {
        if (!isMounted) return;
        if (!res) {
          setNotFound(true);
        } else {
          setService(res as any);
          document.title = res.seoTitle || `${res.title} — AI Solution | Ravi Dasari`;
          const metaDesc = res.seoDescription || res.shortDescription || res.description;
          let metaTag = document.querySelector('meta[name="description"]');
          if (!metaTag) {
            metaTag = document.createElement('meta');
            metaTag.setAttribute('name', 'description');
            document.head.appendChild(metaTag);
          }
          if (metaDesc) metaTag.setAttribute('content', metaDesc);
        }
        setLoading(false);
      })
      .catch(() => {
        if (isMounted) {
          setNotFound(true);
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [slug]);

  if (loading) {
    return (
      <div className="py-24 max-w-5xl mx-auto px-4 space-y-8">
        <SkeletonLoader className="h-6 w-32" />
        <SkeletonLoader className="h-12 w-3/4" />
        <SkeletonLoader className="h-6 w-full" />
        <SkeletonLoader className="h-64 rounded-2xl" />
      </div>
    );
  }

  if (notFound || !service) {
    return <NotFoundPage />;
  }

  return (
    <div className="pt-24 pb-20 bg-canvas-pearl min-h-screen">
      <Container size="lg">
        {/* Breadcrumb / Back Link */}
        <div className="mb-6">
          <Link
            to="/#ai-solutions"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-brand-primary transition-colors focus-ring rounded"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to AI Solutions & Automation</span>
          </Link>
        </div>

        {/* Hero Section */}
        <div className="bg-white rounded-3xl border border-stroke-subtle shadow-card p-6 sm:p-10 mb-10">
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
            <div className="space-y-4 max-w-3xl">
              <div className="flex flex-wrap items-center gap-2">
                <CategoryPill label={service.category} />
                <StatusBadge status={service.deliveryStatus || 'Planned'} size="sm" />
                <EvidenceBadge status={service.evidenceStatus || 'Not Verified'} size="sm" />
              </div>

              <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
                {service.title}
              </h1>

              <div className="text-base sm:text-lg text-slate-600 leading-relaxed font-normal">
                <RichTextViewer content={service.shortDescription || service.description} as="p" />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Button
                  as="a"
                  href="/#contact"
                  variant="primary"
                  size="md"
                  leftIcon={<Mail className="w-4 h-4" />}
                >
                  Discuss This Solution
                </Button>

                {service.demoUrl && (
                  <Button
                    as="a"
                    href={service.demoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="outline"
                    size="md"
                    rightIcon={<ExternalLink className="w-4 h-4" />}
                  >
                    View Live Demo
                  </Button>
                )}
              </div>
            </div>

            {/* Cover Image / Icon */}
            {service.coverImage?.url ? (
              <div className="w-full lg:w-72 h-48 rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 shrink-0">
                <img
                  src={service.coverImage.url}
                  alt={service.title}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-24 h-24 rounded-2xl bg-brand-primary/10 border border-brand-primary/20 text-brand-primary shrink-0 flex items-center justify-center">
                <Bot className="w-12 h-12" />
              </div>
            )}
          </div>
        </div>

        {/* Problem and Solution Grid */}
        {(service.customerProblem || service.proposedSolution) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
            {service.customerProblem && (
              <Card className="p-6 border-stroke-subtle bg-white">
                <div className="flex items-center gap-2 text-rose-600 font-bold text-sm uppercase tracking-wider mb-2">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  <span>The Operational Bottleneck</span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Problem Statement</h3>
                <div className="text-sm text-slate-600 leading-relaxed">
                  <RichTextViewer content={service.customerProblem} />
                </div>
              </Card>
            )}

            {service.proposedSolution && (
              <Card className="p-6 border-stroke-subtle bg-white">
                <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm uppercase tracking-wider mb-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>The Automated Approach</span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Proposed Architecture</h3>
                <div className="text-sm text-slate-600 leading-relaxed">
                  <RichTextViewer content={service.proposedSolution} />
                </div>
              </Card>
            )}
          </div>
        )}

        {/* Detailed Technical Overview */}
        <Card className="p-6 sm:p-8 border-stroke-subtle bg-white mb-10 space-y-4">
          <h2 className="text-xl font-bold text-slate-900">Technical Overview & System Behavior</h2>
          <div className="text-sm sm:text-base text-slate-600 leading-relaxed">
            <RichTextViewer content={service.description} />
          </div>
        </Card>

        {/* Key Capabilities */}
        {service.capabilities && service.capabilities.length > 0 && (
          <div className="mb-10 space-y-4">
            <h2 className="text-xl font-bold text-slate-900">Key Capabilities & Features</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {service.capabilities.map((cap, i) => (
                <Card key={i} className="p-4 border-stroke-subtle bg-white flex items-start gap-3">
                  <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <p className="text-xs sm:text-sm font-semibold text-slate-800 leading-snug">{cap}</p>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Business Use Cases */}
        {service.useCases && service.useCases.length > 0 && (
          <div className="mb-10 space-y-4">
            <h2 className="text-xl font-bold text-slate-900">Practical Enterprise Use Cases</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {service.useCases.map((uc, i) => (
                <Card key={i} className="p-5 border-stroke-subtle bg-white space-y-2">
                  <div className="w-8 h-8 rounded-lg bg-brand-primary/10 text-brand-primary flex items-center justify-center">
                    <Workflow className="w-4 h-4" />
                  </div>
                  <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">{uc}</p>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Technology Stack & Supported Integrations */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-10">
          {service.tooling && service.tooling.length > 0 && (
            <Card className="p-6 border-stroke-subtle bg-white space-y-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Cpu className="w-4 h-4 text-brand-primary" />
                <span>Technology Stack</span>
              </h3>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {service.tooling.map((t) => (
                  <TechTag key={t} label={t} />
                ))}
              </div>
            </Card>
          )}

          {service.integrations && service.integrations.length > 0 && (
            <Card className="p-6 border-stroke-subtle bg-white space-y-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>Supported Integrations</span>
              </h3>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {service.integrations.map((item) => (
                  <span
                    key={item}
                    className="inline-flex items-center px-2.5 py-1 rounded text-xs font-medium bg-slate-100 text-slate-800 border border-slate-200"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Related Published Projects */}
        {service.relatedProjects && service.relatedProjects.length > 0 && (
          <div className="mb-10 space-y-4">
            <h2 className="text-xl font-bold text-slate-900">Related Engineering Projects</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {service.relatedProjects.map((p) => (
                <Card key={p.id} className="p-5 border-stroke-subtle bg-white hover:border-stroke-ice transition-colors">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-xs font-semibold text-brand-primary">{p.category}</span>
                    <StatusBadge status={p.deploymentStatus} size="sm" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mb-1">{p.title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed mb-4">{p.summary}</p>
                  <Link
                    to={`/projects/${p.slug}`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-brand-primary hover:text-brand-hover"
                  >
                    <span>View Engineering Case Study</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Automated Calling Compliance Note if applicable */}
        {(service.categoryId === 'automated-calling' || service.title.toLowerCase().includes('calling')) && (
          <div className="mb-10 p-5 rounded-2xl bg-blue-50/70 border border-stroke-ice text-xs text-slate-600 space-y-1.5">
            <p className="font-bold text-slate-900 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-brand-primary" />
              <span>Regulatory Compliance & Consent Protocol</span>
            </p>
            <p>
              All outbound communication architectures require express prior written consent (TCPA compliance), mandatory caller identification, real-time call recording disclosures, and instant automated opt-out synchronization with systems of record.
            </p>
          </div>
        )}

        {/* Consultation Call to Action */}
        <div className="text-center bg-white rounded-3xl border border-stroke-subtle shadow-card p-8 sm:p-12 space-y-4">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            Deploy Intelligent AI Automation Into Your Organization
          </h2>
          <p className="text-sm sm:text-base text-slate-600 max-w-xl mx-auto leading-relaxed">
            Interested in integrating {service.title} or customized intelligent agent workflows into your operations? Let's discuss requirements.
          </p>
          <div className="pt-2">
            <Button
              as="a"
              href="/#contact"
              variant="primary"
              size="lg"
              leftIcon={<Mail className="w-5 h-5" />}
            >
              Request an Architecture Consultation
            </Button>
          </div>
        </div>
      </Container>
    </div>
  );
};

export default AIServiceDetailPage;
