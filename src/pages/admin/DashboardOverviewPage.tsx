import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FolderGit2,
  Sparkles,
  Briefcase,
  Award,
  Bot,
  FileText,
  Clock,
  Database,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { adminService, AdminOverviewData } from '../../services/adminService';
import { AdminStatCard } from '../../components/admin/AdminStatCard';
import { SkeletonLoader } from '../../components/common/SkeletonLoader';
import { ErrorState } from '../../components/common/ErrorState';

export const DashboardOverviewPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AdminOverviewData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const fetchOverview = async () => {
    setLoading(true);
    setError(null);
    const res = await adminService.getOverview();
    if (res.success && res.data) {
      setData(res.data);
    } else {
      setError(res.error || 'Failed to load dashboard data');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  if (loading) {
    return (
      <div data-testid="dashboard-loading" className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <SkeletonLoader className="h-7 w-56 rounded-md" />
            <SkeletonLoader className="h-4 w-80 rounded-md" />
          </div>
          <SkeletonLoader className="h-9 w-24 rounded-xl" />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <SkeletonLoader key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div data-testid="dashboard-error">
        <ErrorState
          title="Failed to Load Dashboard Overview"
          message={error || 'Unable to retrieve real-time storage metrics from edge API.'}
          onRetry={fetchOverview}
        />
      </div>
    );
  }

  const { metrics, lastUpdated, ownerEmail, activeResume, resumeVersion } = data;

  return (
    <div data-testid="dashboard-overview" className="space-y-8">
      {/* Top Welcome & Edge Status Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-blue-100/90 bg-white p-6 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              System Dashboard Overview
            </h2>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Edge
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Real-time content management state anchored to Cloudflare R2 standard storage.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={fetchOverview}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Real Metrics Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <AdminStatCard
          title="Portfolio Projects"
          value={metrics.totalProjects}
          subtitle={`${metrics.publishedProjects} Published • ${metrics.draftProjects} Drafts`}
          icon={FolderGit2}
          badge={{
            text: `${metrics.publishedProjects} Live`,
            variant: metrics.publishedProjects > 0 ? 'emerald' : 'amber',
          }}
          onClick={() => navigate('/admin/projects')}
        />

        <AdminStatCard
          title="Skills Catalog"
          value={metrics.totalSkills}
          subtitle={`Organized into ${metrics.totalSkillCategories} skill categories`}
          icon={Sparkles}
          badge={{ text: 'Active', variant: 'blue' }}
          onClick={() => navigate('/admin/skills')}
        />

        <AdminStatCard
          title="AI Services & Workflows"
          value={metrics.totalAIServices}
          subtitle="4-State Lifecycle Classified Offerings"
          icon={Bot}
          badge={{ text: 'Autonomous', variant: 'blue' }}
          onClick={() => navigate('/admin/ai-services')}
        />

        <AdminStatCard
          title="Work Experience"
          value={metrics.totalExperience}
          subtitle="Verified career milestones & roles"
          icon={Briefcase}
          badge={{ text: 'Timeline', variant: 'neutral' }}
          onClick={() => navigate('/admin/experience')}
        />

        <AdminStatCard
          title="Certifications"
          value={metrics.totalCertifications}
          subtitle="Verified enterprise credentials"
          icon={Award}
          badge={{ text: 'Verified', variant: 'emerald' }}
          onClick={() => navigate('/admin/certifications')}
        />

        <AdminStatCard
          title="Executive Resume"
          value={activeResume ? 'Active' : 'Missing'}
          subtitle={activeResume ? `Version: ${resumeVersion}` : 'PDF upload required'}
          icon={FileText}
          badge={{
            text: activeResume ? 'PDF Loaded' : 'Action Required',
            variant: activeResume ? 'emerald' : 'amber',
          }}
          onClick={() => navigate('/admin/resume')}
        />
      </div>

      {/* Quick Access & System Architecture Status */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Quick Management Links */}
        <div className="rounded-2xl border border-blue-100/90 bg-white p-6 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900">Content Management Modules</h3>
          <p className="mt-1 text-xs text-slate-500">
            Select a module to manage records or preview live public changes.
          </p>

          <div className="mt-4 divide-y divide-slate-100">
            {[
              {
                title: 'Manage Projects & Deep Case Studies',
                desc: 'Create, edit, reorder, or publish engineering case studies.',
                path: '/admin/projects',
              },
              {
                title: 'Manage Skills & Categorization',
                desc: 'Reorder competencies and adjust proficiency rankings.',
                path: '/admin/skills',
              },
              {
                title: 'Manage AI Services & Automation Workflows',
                desc: 'Update 4-state lifecycle statuses and tooling tags.',
                path: '/admin/ai-services',
              },
              {
                title: 'Upload & Version Executive Resume',
                desc: 'Publish updated PDF resume with automatic versioning.',
                path: '/admin/resume',
              },
              {
                title: 'Edit Executive Profile & Social Channels',
                desc: 'Update headline, bio copy, and verified contact links.',
                path: '/admin/profile',
              },
            ].map((action) => (
              <button
                key={action.path}
                type="button"
                onClick={() => navigate(action.path)}
                className="flex w-full items-center justify-between py-3 text-left hover:bg-blue-50/50 px-2 rounded-lg transition-colors group"
              >
                <div>
                  <div className="text-xs font-semibold text-slate-800 group-hover:text-blue-600 transition-colors">
                    {action.title}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{action.desc}</div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
              </button>
            ))}
          </div>
        </div>

        {/* Storage & Edge Concurrency Status */}
        <div className="rounded-2xl border border-blue-100/90 bg-white p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <Database className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Runtime & Storage Health</h3>
            </div>
            <p className="mt-2 text-xs text-slate-600 leading-relaxed">
              The portfolio operates entirely on Cloudflare Workers edge nodes backed by
              domain-partitioned Cloudflare R2 Standard Object Storage.
            </p>

            <dl className="mt-4 space-y-2.5 text-xs">
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <dt className="text-slate-500">Authenticated Owner</dt>
                <dd className="font-semibold text-slate-800">{ownerEmail}</dd>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <dt className="text-slate-500">Concurrency Control</dt>
                <dd className="font-semibold text-emerald-700">OCC (R2 ETag onlyIf)</dd>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <dt className="text-slate-500">Backup Policy</dt>
                <dd className="font-semibold text-slate-800">Pre-Mutation Snapshots</dd>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <dt className="text-slate-500">Edge Cache Policy</dt>
                <dd className="font-semibold text-slate-800">max-age=120, s-maxage=86400</dd>
              </div>
              <div className="flex justify-between pt-1">
                <dt className="text-slate-500 flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                  <span>Last Content Sync</span>
                </dt>
                <dd className="font-medium text-slate-600">{new Date(lastUpdated).toLocaleString()}</dd>
              </div>
            </dl>
          </div>

          <div className="mt-5 rounded-xl bg-blue-50/60 p-3 text-xs text-blue-800 border border-blue-100/60 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>Zero-Trust security boundary active. Direct Worker mutation requires verified JWT.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
