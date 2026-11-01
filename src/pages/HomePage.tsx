import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Hero } from '../components/hero/Hero';
import { SectionWrapper } from '../components/common/SectionWrapper';
import { SectionHeading } from '../components/common/SectionHeading';
import { Card } from '../components/common/Card';
import { StatusBadge, CategoryPill, TechTag, VerificationBadge, EvidenceBadge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { SkeletonLoader } from '../components/common/SkeletonLoader';
import { ErrorState } from '../components/common/ErrorState';
import { EmptyState } from '../components/common/EmptyState';
import { SkillIcon } from '../components/common/SkillIcon';
import { RichTextViewer } from '../components/common/RichTextViewer';
import { contentService } from '../services/contentService';
import {
  PortfolioData,
  DEFAULT_ABOUT_COMPETENCIES,
  DEFAULT_ABOUT_SECONDARY_PARAGRAPH,
  DEFAULT_ABOUT_HIGHLIGHTS,
} from '../types/portfolio';
import {
  ExternalLink,
  ArrowRight,
  ShieldCheck,
  Briefcase,
  GraduationCap,
  Award,
  Terminal,
  Cpu,
  Bot,
  Send,
  FileText,
  Calendar,
  Mail,
  Github,
  Linkedin,
  MapPin,
  Globe,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Shield,
} from 'lucide-react';

function getCompetencyColorClass(color?: string): string {
  switch (color) {
    case 'blue':
      return 'bg-brand-primary';
    case 'teal':
      return 'bg-brand-teal';
    case 'indigo':
      return 'bg-indigo-600';
    case 'cyan':
      return 'bg-cyan-600';
    case 'amber':
      return 'bg-amber-600';
    case 'rose':
      return 'bg-rose-600';
    case 'slate':
      return 'bg-slate-600';
    case 'emerald':
      return 'bg-emerald-600';
    default:
      return 'bg-brand-primary';
  }
}

function getHighlightIcon(index: number) {
  switch (index % 4) {
    case 0:
      return ShieldCheck;
    case 1:
      return Cpu;
    case 2:
      return Terminal;
    case 3:
      return Bot;
    default:
      return CheckCircle2;
  }
}

function getHighlightColorClass(index: number) {
  switch (index % 4) {
    case 0:
      return 'text-brand-primary';
    case 1:
      return 'text-brand-teal';
    case 2:
      return 'text-indigo-600';
    case 3:
      return 'text-cyan-600';
    default:
      return 'text-brand-primary';
  }
}

// Safe fallback badge icon component (completely eliminates raw innerHTML)
const SafeBadgeImage: React.FC<{ url?: string; title: string }> = ({ url, title }) => {
  const [error, setError] = React.useState(false);

  if (!url || error) {
    return (
      <div className="w-12 h-12 rounded-xl bg-brand-primary/10 text-brand-primary flex items-center justify-center shrink-0">
        <Award className="w-6 h-6" />
      </div>
    );
  }

  return (
    <div className="w-12 h-12 rounded-xl border border-slate-200 bg-white p-1 shrink-0 flex items-center justify-center overflow-hidden">
      <img
        src={url}
        alt={title}
        width={48}
        height={48}
        loading="lazy"
        decoding="async"
        className="w-full h-full object-contain"
        onError={() => setError(true)}
      />
    </div>
  );
};

export const HomePage: React.FC = () => {
  const [data, setData] = useState<PortfolioData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSkillCategory, setActiveSkillCategory] = useState<string>('all');
  const [activeProjectCategory, setActiveProjectCategory] = useState<string>('all');
  const [activeAICategory, setActiveAICategory] = useState<string>('all');

  // Direct Contact Form State
  const [contactState, setContactState] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [contactErrorMessage, setContactErrorMessage] = useState<string | null>(null);
  const [contactFieldErrors, setContactFieldErrors] = useState<Record<string, string>>({});
  const [submittedEmail, setSubmittedEmail] = useState<string>('');
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
    website: '',
  });

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setContactState('submitting');
    setContactErrorMessage(null);
    setContactFieldErrors({});

    try {
      const res = await fetch('/api/public/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(contactForm),
      });

      const result = (await res.json()) as any;

      if (!res.ok || !result.success) {
        setContactState('error');
        setContactErrorMessage(result.error || 'Failed to deliver message. Please try again or reach out directly.');
        if (result.details) {
          setContactFieldErrors(result.details);
        }
        return;
      }

      setSubmittedEmail(contactForm.email);
      setContactState('success');
      setContactForm({
        name: '',
        email: '',
        subject: '',
        message: '',
        website: '',
      });
    } catch {
      setContactState('error');
      setContactErrorMessage('Network error communicating with the server. Please check your internet connection or email directly.');
    }
  };

  const loadData = () => {
    setLoading(true);
    setError(null);
    contentService
      .getPortfolioData()
      .then((res) => {
        setData(res);
        if (res?.settings) {
          document.title = res.settings.siteTitle || 'Ravi Dasari — DevOps Engineer';
          const metaDesc = res.settings.metaDescription || res.profile?.bioShort;
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
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load portfolio content');
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="py-24 max-w-7xl mx-auto px-4 space-y-12">
        <div className="space-y-4 max-w-2xl">
          <SkeletonLoader className="h-10 w-3/4" />
          <SkeletonLoader className="h-6 w-full" />
          <SkeletonLoader className="h-6 w-2/3" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <SkeletonLoader className="h-48 rounded-xl" count={4} />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="py-24 max-w-3xl mx-auto px-4">
        <ErrorState
          title="Portfolio Data Unavailable"
          message={error || 'Failed to initialize portfolio data.'}
          onRetry={loadData}
        />
      </div>
    );
  }

  const { profile, resume, projects, skills, skillCategories, experience, certifications, education, aiServices, aiServiceCategories } = data;

  const publishedSkills = (skills || []).filter((s) => s.published !== false);
  const publishedSkillCategories = (skillCategories || []).filter((c) => c.published !== false);
  const filteredSkills =
    activeSkillCategory === 'all'
      ? publishedSkills
      : publishedSkills.filter((s) => s.categoryId === activeSkillCategory);

  const publishedProjects = (projects || []).filter((p) => p.published !== false);
  const projectCategories = Array.from(new Set(publishedProjects.map((p) => p.category)));
  const filteredProjects =
    activeProjectCategory === 'all'
      ? publishedProjects
      : publishedProjects.filter((p) => p.category === activeProjectCategory);

  const publishedExperience = (experience || []).filter((e) => e.published === true);
  const publishedEducation = (education || []).filter((e) => e.published === true);
  const publishedCertifications = (certifications || []).filter((c) => c.published === true);

  const publishedAICategories = (aiServiceCategories || []).filter((c) => c.published !== false);
  const publishedAIServices = (aiServices || []).filter((s) => s.published !== false);
  const filteredAIServices =
    activeAICategory === 'all'
      ? publishedAIServices
      : publishedAIServices.filter((s) => s.categoryId === activeAICategory);

  return (
    <div>
      {/* 1. Hero Section */}
      <Hero profile={profile} resume={resume} />

      {/* 2. About Me Section */}
      <SectionWrapper id="about" background="white">
        <SectionHeading
          badge="About Me"
          title={profile.aboutTitle || "Bridging Cloud Infrastructure, Security, and Enterprise Software"}
          subtitle={profile.aboutSubtitle || "Engineering philosophy rooted in zero-downtime reliability, shift-left security automation, and pragmatic modern technologies."}
        />

        {(() => {
          const showCompetencies = profile.aboutCompetenciesVisible !== false;
          const competenciesList = (profile.aboutCompetencies && profile.aboutCompetencies.length > 0)
            ? profile.aboutCompetencies
            : DEFAULT_ABOUT_COMPETENCIES;
          const visibleCompetencies = competenciesList
            .filter((c) => c.visible !== false)
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
          const highlightsList = (profile.aboutHighlights && profile.aboutHighlights.length > 0)
            ? profile.aboutHighlights
            : DEFAULT_ABOUT_HIGHLIGHTS;
          const showSecondary = profile.aboutSecondaryParagraphVisible !== false;
          const secondaryContent = profile.aboutSecondaryParagraph ?? DEFAULT_ABOUT_SECONDARY_PARAGRAPH;

          return (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
              <div className={`${showCompetencies ? 'lg:col-span-7' : 'lg:col-span-12'} space-y-5 text-slate-700 leading-relaxed text-base sm:text-lg`}>
                <RichTextViewer content={profile.bioLong} />

                {showSecondary && secondaryContent.trim() && (
                  <div className="text-slate-700 leading-relaxed text-base sm:text-lg">
                    <RichTextViewer content={secondaryContent} as="p" />
                  </div>
                )}

                {highlightsList.length > 0 && (
                  <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm font-medium">
                    {highlightsList.map((highlight, idx) => {
                      const IconComponent = getHighlightIcon(idx);
                      const colorClass = getHighlightColorClass(idx);
                      return (
                        <div key={idx} className="flex items-center gap-2 p-3 rounded-lg bg-canvas-pearl border border-stroke-subtle">
                          <IconComponent className={`w-5 h-5 shrink-0 ${colorClass}`} />
                          <span><RichTextViewer content={highlight} as="span" inline /></span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {showCompetencies && (
                <div className="lg:col-span-5">
                  <Card className="p-6 sm:p-8 bg-canvas-surface border-stroke-ice space-y-6">
                    <h3 className="text-xl font-bold text-slate-900 border-b border-stroke-ice pb-4">
                      {profile.aboutCompetenciesTitle || "Core Competencies"}
                    </h3>
                    <ul className="space-y-3.5 text-sm">
                      {visibleCompetencies.map((item) => (
                        <li key={item.id} className="flex items-start gap-3">
                          <span className={`w-2 h-2 rounded-full ${getCompetencyColorClass(item.color)} mt-1.5 shrink-0`} />
                          <div className="leading-snug">
                            <strong className="text-slate-900 font-semibold">{item.name}: </strong>
                            <RichTextViewer content={item.description} as="span" inline />
                          </div>
                        </li>
                      ))}
                    </ul>
                  </Card>
                </div>
              )}
            </div>
          );
        })()}
      </SectionWrapper>

      {/* 3. Technical Skills Section */}
      <SectionWrapper id="skills" background="pearl">
        <SectionHeading
          badge="Technical Skills"
          title="Verified Tools & Infrastructure Stack"
          subtitle="All competencies are dynamic and managed directly through the portfolio CMS."
        />

        {/* Category Filter Pills */}
        {publishedSkillCategories.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
            <button
              onClick={() => setActiveSkillCategory('all')}
              className={`px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all focus-ring ${
                activeSkillCategory === 'all'
                  ? 'bg-brand-primary text-white shadow-subtle'
                  : 'bg-white text-slate-600 border border-stroke-subtle hover:bg-slate-50'
              }`}
            >
              All Skills ({publishedSkills.length})
            </button>
            {publishedSkillCategories.map((cat) => {
              const catSkillCount = publishedSkills.filter((s) => s.categoryId === cat.id).length;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveSkillCategory(cat.id)}
                  className={`px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all focus-ring ${
                    activeSkillCategory === cat.id
                      ? 'bg-brand-primary text-white shadow-subtle'
                      : 'bg-white text-slate-600 border border-stroke-subtle hover:bg-slate-50'
                  }`}
                >
                  {cat.name} ({catSkillCount})
                </button>
              );
            })}
          </div>
        )}

        {/* Skills Cards Grid */}
        {filteredSkills.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5 sm:gap-4">
            {filteredSkills.map((skill) => {
              const badgeColor =
                skill.proficiencyLevel === 'Core Competency'
                  ? 'bg-blue-50 text-brand-primary border-blue-200/60'
                  : skill.proficiencyLevel === 'Advanced'
                  ? 'bg-teal-50 text-teal-700 border-teal-200/60'
                  : 'bg-slate-100 text-slate-700 border-slate-200/60';

              return (
                <Card
                  key={skill.id}
                  padding="sm"
                  hoverable
                  className="text-center flex flex-col items-center justify-between py-5 px-3 border-stroke-subtle relative group min-h-[148px]"
                >
                  {skill.featured && (
                    <span
                      title="Featured Core Skill"
                      className="absolute top-2 right-2 text-amber-500 text-xs"
                      aria-label="Featured Skill"
                    >
                      ★
                    </span>
                  )}

                  <div className="w-11 h-11 rounded-xl bg-blue-50/80 border border-blue-100 flex items-center justify-center mb-2.5 group-hover:scale-105 group-hover:bg-blue-100/60 transition-transform">
                    <SkillIcon
                      identifier={skill.iconIdentifier}
                      className="w-5 h-5 text-brand-primary"
                      title={skill.name}
                    />
                  </div>

                  <div className="space-y-1 my-auto">
                    <span className="text-sm font-bold text-slate-900 block leading-tight">
                      {skill.name}
                    </span>
                    {skill.officialUrl && (
                      <a
                        href={skill.officialUrl}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="inline-flex items-center gap-1 text-[11px] text-brand-primary hover:underline"
                        title={`Official documentation for ${skill.name}`}
                      >
                        Docs
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>

                  <span
                    className={`text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded border mt-2 ${badgeColor}`}
                  >
                    {skill.proficiencyLevel}
                  </span>
                </Card>
              );
            })}
          </div>
        ) : (
          <EmptyState
            title="No skills available"
            description="No verified skills match the selected category filter."
          />
        )}
      </SectionWrapper>

      {/* 4. Professional Experience Timeline */}
      <SectionWrapper id="experience" background="white">
        <SectionHeading
          badge="Experience"
          title="Professional Career Journey"
          subtitle="Verified employment track record across DevOps, cloud infrastructure, and enterprise engineering."
        />

        {publishedExperience.length > 0 ? (
          <div className="max-w-3xl mx-auto space-y-8 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-stroke-subtle">
            {publishedExperience.map((exp) => (
              <div key={exp.id} className="relative pl-10">
                {/* Timeline Marker */}
                <div className="absolute left-0 top-1.5 w-7 h-7 rounded-full bg-white border-2 border-brand-primary flex items-center justify-center">
                  <Briefcase className="w-3.5 h-3.5 text-brand-primary" />
                </div>

                <Card className="p-6 border-stroke-subtle hover:border-stroke-ice transition-colors">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-bold text-slate-900">{exp.role}</h3>
                      {exp.isCurrent && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Current Role
                        </span>
                      )}
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-primary/10 text-brand-primary">
                      <Calendar className="w-3 h-3" />
                      <span>{exp.startDate} – {exp.isCurrent ? 'Present' : exp.endDate || 'Present'}</span>
                    </span>
                  </div>

                  <p className="text-sm font-semibold text-slate-600 mb-3">
                    {exp.companyUrl ? (
                      <a
                        href={exp.companyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-brand-primary hover:underline inline-flex items-center gap-1"
                      >
                        <span>{exp.company}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      exp.company
                    )}
                    {exp.location ? ` • ${exp.location}` : ''}
                    {exp.employmentType ? ` • ${exp.employmentType}` : ''}
                  </p>

                  {exp.summary && (
                    <div className="text-sm text-slate-600 mb-4 leading-relaxed font-normal">
                      <RichTextViewer content={exp.summary} />
                    </div>
                  )}

                  {exp.responsibilities && exp.responsibilities.length > 0 && (
                    <div className="mb-3 space-y-1">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Key Responsibilities:</h4>
                      <ul className="space-y-1.5 text-sm text-slate-600 list-disc list-inside">
                        {exp.responsibilities.map((item, idx) => (
                          <li key={idx} className="leading-relaxed">
                            <RichTextViewer content={item} as="span" inline />
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {exp.achievements && exp.achievements.length > 0 && (
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Key Achievements:</h4>
                      <ul className="space-y-1.5 text-sm text-slate-600 list-disc list-inside">
                        {exp.achievements.map((item, idx) => (
                          <li key={idx} className="leading-relaxed">
                            <RichTextViewer content={item} as="span" inline />
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {exp.techStack && exp.techStack.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap gap-1.5">
                      {exp.techStack.map((tech) => (
                        <TechTag key={tech} label={tech} />
                      ))}
                    </div>
                  )}
                </Card>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No experience available"
            description="Professional experience records will appear here once published."
          />
        )}
      </SectionWrapper>

      {/* 5. Education & Academic Credentials */}
      <SectionWrapper id="education" background="pearl">
        <SectionHeading
          badge="Education"
          title="Academic Foundation & Engineering Degrees"
          subtitle="Accredited degree programs, engineering coursework, and academic qualifications."
        />

        {publishedEducation.length > 0 ? (
          <div className="max-w-3xl mx-auto space-y-6">
            {publishedEducation.map((edu) => (
              <Card key={edu.id} className="p-6 border-stroke-subtle hover:border-stroke-ice transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-primary/10 text-brand-primary flex items-center justify-center shrink-0">
                      <GraduationCap className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">{edu.degree}</h3>
                      <p className="text-sm font-semibold text-slate-600">{edu.institution} • {edu.fieldOfStudy}</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-primary/10 text-brand-primary self-start sm:self-auto">
                    <Calendar className="w-3 h-3" />
                    <span>{edu.startDate || edu.startYear} – {edu.endDate || edu.endYear || 'Present'}</span>
                  </span>
                </div>

                {edu.grade && (
                  <div className="mt-3 text-xs font-semibold text-slate-700">
                    Grade / Academic Standing: <span className="text-brand-primary">{edu.grade}</span>
                  </div>
                )}

                {edu.description && (
                  <div className="mt-2 text-sm text-slate-600 leading-relaxed">
                    <RichTextViewer content={edu.description} />
                  </div>
                )}
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No education records available"
            description="Academic credentials will appear here once published."
          />
        )}
      </SectionWrapper>

      {/* 6. Certifications Showcase (Hidden entirely when no published certifications exist) */}
      {publishedCertifications.length > 0 && (
        <SectionWrapper id="certifications" background="white">
          <SectionHeading
            badge="Certifications"
            title="Enterprise Certifications & Professional Accreditations"
            subtitle="Validated cloud architecture, DevSecOps infrastructure, and engineering accreditations."
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {publishedCertifications.map((cert) => (
              <Card key={cert.id} padding="md" hoverable className="flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <SafeBadgeImage url={cert.badgeImage?.url} title={cert.title} />
                    <VerificationBadge status={cert.verificationStatus || 'NOT PROVIDED'} size="sm" />
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-slate-900 leading-snug">{cert.title}</h3>
                    <p className="text-xs font-semibold text-slate-600 mt-0.5">{cert.issuer}</p>
                  </div>

                  {cert.issueDate && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      <span>Issued: {cert.issueDate}</span>
                      {cert.expiryDate ? <span>• Expires: {cert.expiryDate}</span> : null}
                    </div>
                  )}

                  {cert.description && (
                    <div className="text-xs text-slate-600 leading-relaxed">
                      <RichTextViewer content={cert.description} />
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  {cert.credentialId ? (
                    <span className="font-mono text-[11px] text-slate-500 truncate">
                      ID: {cert.credentialId}
                    </span>
                  ) : <span />}

                  {cert.credentialUrl && (
                    <a
                      href={cert.credentialUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-brand-primary hover:text-brand-hover"
                    >
                      <span>Verify Credential</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </SectionWrapper>
      )}

      {/* 5. Featured Personal Projects */}
      <SectionWrapper id="projects" background="pearl">
        <SectionHeading
          badge="Featured Projects"
          title="Engineering Solutions & Software Applications"
          subtitle="Production DevSecOps pipelines, Android applications, and interactive modern platforms."
        />

        {/* Project Category Filter Bar */}
        {projectCategories.length > 1 && (
          <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
            <button
              type="button"
              onClick={() => setActiveProjectCategory('all')}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all focus-ring ${
                activeProjectCategory === 'all'
                  ? 'bg-brand-primary text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-stroke-subtle'
              }`}
            >
              All Projects ({projects.length})
            </button>
            {projectCategories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveProjectCategory(cat)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all focus-ring ${
                  activeProjectCategory === cat
                    ? 'bg-brand-primary text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-stroke-subtle'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {filteredProjects.map((project) => (
            <Card key={project.id} padding="none" hoverable className="flex flex-col overflow-hidden group">
              {/* Cover Image if present */}
              {project.coverImage?.url && (
                <div className="h-48 w-full overflow-hidden bg-slate-100 border-b border-stroke-subtle">
                  <img
                    src={project.coverImage.url}
                    alt={project.coverImage.altText || project.title}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                    onError={(e) => {
                      (e.currentTarget.parentElement as HTMLElement).style.display = 'none';
                    }}
                  />
                </div>
              )}

              {/* Project Card Header Badge Bar */}
              <div className="p-6 pb-4 border-b border-stroke-subtle flex flex-wrap items-center justify-between gap-2 bg-canvas-pearl/50">
                <CategoryPill label={project.category} />
                <StatusBadge status={project.deploymentStatus} size="sm" />
              </div>

              {/* Body */}
              <div className="p-6 flex-grow flex flex-col justify-between space-y-4">
                <div className="space-y-2.5">
                  <h3 className="text-xl font-bold text-slate-900 leading-snug">
                    {project.title}
                  </h3>
                  <div className="text-sm text-slate-600 leading-relaxed">
                    <RichTextViewer content={project.summary} />
                  </div>
                </div>

                {/* Tech Stack Tags */}
                <div className="flex flex-wrap gap-1.5 pt-2">
                  {project.techStack.map((tag) => (
                    <TechTag key={tag} label={tag} />
                  ))}
                </div>

                {/* Card Action Footer */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                  <Link
                    to={`/projects/${project.slug}`}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-primary hover:text-brand-hover focus-ring rounded"
                  >
                    <span>View Case Study</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>

                  <div className="flex items-center gap-2">
                    {project.githubUrl && (
                      <a
                        href={project.githubUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded text-slate-500 hover:text-slate-900 border border-slate-200 hover:border-slate-300 transition-colors focus-ring"
                        aria-label="View Source Code on GitHub"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                    {project.liveDemoUrl && (
                      <a
                        href={project.liveDemoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded bg-brand-primary text-white hover:bg-brand-hover transition-colors focus-ring"
                      >
                        <span>Live Demo</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Full Catalog Navigation Link */}
        <div className="mt-10 text-center">
          <Link to="/projects" className="inline-block focus-ring rounded-lg">
            <Button
              variant="outline"
              size="md"
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Explore Complete Projects Catalog ({publishedProjects.length})
            </Button>
          </Link>
        </div>
      </SectionWrapper>

      {/* 6. AI Agents & Automation Showcase */}
      <SectionWrapper id="ai-solutions" background="white">
        <SectionHeading
          badge="AI & Automation"
          title="Intelligent Agents, Voice & Automated Pipelines"
          subtitle="Explore custom autonomous workflows, conversational systems, and API integrations with verified status indicators."
        />

        {/* AI Category Filter Bar */}
        {publishedAICategories.length > 1 && (
          <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
            <button
              type="button"
              onClick={() => setActiveAICategory('all')}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all focus-ring ${
                activeAICategory === 'all'
                  ? 'bg-brand-primary text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-stroke-subtle'
              }`}
            >
              All Solutions ({publishedAIServices.length})
            </button>
            {publishedAICategories.map((cat) => {
              const count = publishedAIServices.filter((s) => s.categoryId === cat.id).length;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveAICategory(cat.id)}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all focus-ring ${
                    activeAICategory === cat.id
                      ? 'bg-brand-primary text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-stroke-subtle'
                  }`}
                >
                  {cat.name} ({count})
                </button>
              );
            })}
          </div>
        )}

        {filteredAIServices.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAIServices.map((service) => {
              const categoryName =
                service.category ||
                publishedAICategories.find((c) => c.id === service.categoryId)?.name ||
                'AI Solution';

              return (
                <Card
                  key={service.id}
                  padding="none"
                  hoverable
                  className="flex flex-col overflow-hidden group border-stroke-subtle"
                >
                  {/* Cover Image if available */}
                  {service.coverImage?.url && (
                    <div className="h-44 w-full overflow-hidden bg-slate-100 border-b border-stroke-subtle">
                      <img
                        src={service.coverImage.url}
                        alt={service.coverImage.altText || service.title}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                        onError={(e) => {
                          (e.currentTarget.parentElement as HTMLElement).style.display = 'none';
                        }}
                      />
                    </div>
                  )}

                  {/* Header Badge Bar */}
                  <div className="p-5 pb-3 border-b border-stroke-subtle flex flex-wrap items-center justify-between gap-2 bg-canvas-pearl/50">
                    <div className="flex items-center gap-1.5">
                      <CategoryPill label={categoryName} />
                      {service.featured && (
                        <span
                          className="text-amber-500 text-xs font-bold ml-1"
                          title="Featured Solution"
                          aria-label="Featured"
                        >
                          ★
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <StatusBadge status={service.deliveryStatus || service.status} size="sm" />
                      <EvidenceBadge status={service.evidenceStatus || 'Not Verified'} size="sm" />
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-5 flex-grow flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <h3 className="text-lg font-bold text-slate-900 group-hover:text-brand-primary transition-colors leading-snug">
                        {service.title}
                      </h3>
                      <div className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                        <RichTextViewer content={service.shortDescription || service.description} />
                      </div>
                    </div>

                    {/* Capabilities preview */}
                    {service.capabilities && service.capabilities.length > 0 && (
                      <div className="space-y-1 text-xs text-slate-600 bg-slate-50/80 p-2.5 rounded-lg border border-slate-100">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                          Capabilities:
                        </span>
                        <ul className="space-y-0.5 list-disc list-inside">
                          {service.capabilities.slice(0, 2).map((cap, i) => (
                            <li key={i} className="truncate">
                              {cap}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Tooling tags */}
                    {service.tooling && service.tooling.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {service.tooling.slice(0, 4).map((tool) => (
                          <TechTag key={tool} label={tool} />
                        ))}
                        {service.tooling.length > 4 && (
                          <span className="text-[10px] text-slate-400 font-mono py-0.5 self-center">
                            +{service.tooling.length - 4}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Action Footer */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <Link
                        to={`/ai-solutions/${service.slug}`}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-primary hover:text-brand-hover focus-ring rounded"
                      >
                        <span>View Details</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>

                      <div className="flex items-center gap-2">
                        {service.demoUrl && (
                          <a
                            href={service.demoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded bg-brand-primary text-white hover:bg-brand-hover transition-colors focus-ring"
                          >
                            <span>Demo</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                        <a
                          href="#contact"
                          className="p-1.5 rounded text-slate-500 hover:text-brand-primary border border-slate-200 hover:border-blue-200 transition-colors focus-ring"
                          title="Discuss this solution"
                          aria-label="Discuss solution"
                        >
                          <Send className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <EmptyState
            title="No AI solutions available"
            description="No verified AI services match the selected category filter."
          />
        )}

        {/* Consent Notice for Voice & Calling */}
        <div className="mt-8 p-4 rounded-xl bg-blue-50/60 border border-stroke-ice max-w-3xl mx-auto text-center text-xs text-slate-600">
          <p>
            <strong>Compliance Note:</strong> All outbound calling and automated messaging capabilities adhere to strict TCPA consent verification, recording disclaimers, and automated opt-out protocols.
          </p>
        </div>
      </SectionWrapper>

      {/* 7. Resume Download Center */}
      <SectionWrapper id="resume" background="pearl">
        <div className="max-w-3xl mx-auto">
          <Card className="p-8 sm:p-10 border-stroke-ice shadow-card text-center space-y-6">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-brand-primary/10 text-brand-primary flex items-center justify-center">
              <FileText className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                <RichTextViewer content={resume.headline || "Ravi Dasari — Professional Resume"} as="span" inline />
              </h2>
              <div className="text-slate-600 text-sm sm:text-base max-w-xl mx-auto">
                <RichTextViewer
                  content={
                    resume.description ||
                    "Comprehensive overview of verified DevSecOps engineering roles, Kubernetes infrastructure projects, Android applications, and technical certifications."
                  }
                />
              </div>
            </div>

            <div className="inline-flex items-center gap-4 text-xs font-semibold text-slate-500 bg-canvas-pearl px-4 py-2 rounded-full border border-stroke-subtle">
              <span>Format: Strict PDF</span>
              <span>•</span>
              <span>Updated: {resume.lastUpdated}</span>
              <span>•</span>
              <span>Version: {resume.versionTag}</span>
            </div>

            <div>
              {resume.activeResume && resume.published !== false ? (
                <Button
                  variant="primary"
                  size="lg"
                  leftIcon={<FileText className="w-5 h-5" />}
                  as="a"
                  href="/api/public/resume/download"
                  download="Ravi_Dasari_Resume.pdf"
                >
                  Download PDF Resume
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="lg"
                  leftIcon={<Mail className="w-5 h-5" />}
                  as="a"
                  href="#contact"
                >
                  Request Official Resume
                </Button>
              )}
            </div>
          </Card>
        </div>
      </SectionWrapper>

      {/* 8. Contact Section */}
      <SectionWrapper id="contact" background="white">
        <SectionHeading
          badge="Get in Touch"
          title="Let’s Discuss Engineering Opportunities"
          subtitle="Open to DevOps engineering roles, cloud infrastructure contracts, and advisory DevSecOps architecture consultations."
        />

        <div className="max-w-4xl mx-auto space-y-8">
          {/* Location & Remote Availability Banner */}
          <div className="flex flex-wrap items-center justify-center gap-3 p-3.5 rounded-xl bg-canvas-pearl border border-stroke-ice text-xs sm:text-sm text-slate-700">
            <div className="inline-flex items-center gap-1.5 font-semibold text-slate-800">
              <MapPin className="w-4 h-4 text-brand-primary" aria-hidden="true" />
              <span>{profile.location || 'Bengaluru, Karnataka, India'}</span>
            </div>
            <span className="text-slate-300 hidden sm:inline" aria-hidden="true">•</span>
            <div className="inline-flex items-center gap-1.5 font-semibold text-teal-700">
              <Globe className="w-4 h-4 text-brand-teal" aria-hidden="true" />
              <span>{profile.remoteAvailability || 'Open to Global Remote Opportunities'}</span>
            </div>
          </div>

          {/* Quick Contact Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Direct Email Card */}
            <a
              href={`mailto:${profile.contactEmail || 'dasariravid145@gmail.com'}`}
              className="p-5 rounded-2xl bg-canvas-pearl border border-stroke-subtle hover:border-brand-primary/40 hover:shadow-subtle transition-all group focus-ring block"
              aria-label={`Send direct email to ${profile.contactEmail || 'dasariravid145@gmail.com'}`}
            >
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-brand-primary flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <Mail className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">
                Direct Email
              </span>
              <span className="text-sm font-bold text-slate-900 group-hover:text-brand-primary transition-colors block truncate">
                {profile.contactEmail || 'dasariravid145@gmail.com'}
              </span>
              <span className="text-xs text-brand-primary font-semibold mt-2 inline-flex items-center gap-1">
                <span>Compose Email</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </span>
            </a>

            {/* LinkedIn Profile Card */}
            <a
              href={profile.social?.linkedin || 'https://linkedin.com/in/ravid145'}
              target="_blank"
              rel="noopener noreferrer"
              className="p-5 rounded-2xl bg-canvas-pearl border border-stroke-subtle hover:border-brand-primary/40 hover:shadow-subtle transition-all group focus-ring block"
              aria-label="View Ravi Dasari LinkedIn Profile"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-brand-primary flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <Linkedin className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">
                Professional Network
              </span>
              <span className="text-sm font-bold text-slate-900 group-hover:text-brand-primary transition-colors block">
                {profile.social?.linkedin ? profile.social.linkedin.replace(/^https?:\/\//i, '') : 'linkedin.com/in/ravid145'}
              </span>
              <span className="text-xs text-brand-primary font-semibold mt-2 inline-flex items-center gap-1">
                <span>Connect on LinkedIn</span>
                <ExternalLink className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </span>
            </a>

            {/* GitHub Profile Card */}
            <a
              href={profile.social?.github || 'https://github.com/dasariravi145'}
              target="_blank"
              rel="noopener noreferrer"
              className="p-5 rounded-2xl bg-canvas-pearl border border-stroke-subtle hover:border-brand-primary/40 hover:shadow-subtle transition-all group focus-ring block sm:col-span-2 lg:col-span-1"
              aria-label="View Ravi Dasari GitHub Profile"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-slate-800 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <Github className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">
                Open Source & Code
              </span>
              <span className="text-sm font-bold text-slate-900 group-hover:text-brand-primary transition-colors block">
                {profile.social?.github ? profile.social.github.replace(/^https?:\/\//i, '') : 'github.com/dasariravi145'}
              </span>
              <span className="text-xs text-brand-primary font-semibold mt-2 inline-flex items-center gap-1">
                <span>Explore Repositories</span>
                <ExternalLink className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </span>
            </a>
          </div>

          {/* Direct Server-Side Contact Form */}
          <Card className="p-6 sm:p-8 border-stroke-subtle shadow-card">
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              Send an Inbound Inquiry
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 mb-6 leading-relaxed">
              Fill in your opportunity details below to send an inquiry directly to Ravi Dasari. No email client setup required.
            </p>

            {contactState === 'success' ? (
              <div className="p-6 sm:p-8 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="text-lg font-bold text-slate-900">Message Delivered Successfully!</h4>
                <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
                  Thank you for reaching out. Your inquiry has been sent directly to Ravi Dasari at <span className="font-semibold text-slate-800">dasariravid145@gmail.com</span>. A reply will be sent to <span className="font-semibold text-slate-800">{submittedEmail}</span>.
                </p>
                <div className="pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setContactState('idle');
                      setContactErrorMessage(null);
                      setContactFieldErrors({});
                    }}
                  >
                    Send Another Message
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleContactSubmit} className="space-y-4">
                {/* Error Banner */}
                {contactState === 'error' && (
                  <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs sm:text-sm text-red-700 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block">Delivery Failed</span>
                      <span>{contactErrorMessage || 'Unable to deliver your message. Please try again or reach out directly via email.'}</span>
                    </div>
                  </div>
                )}

                {/* Honeypot field (hidden from genuine users) */}
                <div className="hidden" aria-hidden="true">
                  <label htmlFor="contact-website">Leave this field blank</label>
                  <input
                    id="contact-website"
                    name="website"
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                    value={contactForm.website}
                    onChange={(e) => setContactForm((prev) => ({ ...prev, website: e.target.value }))}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="contact-name" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Your Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="contact-name"
                      name="name"
                      type="text"
                      required
                      disabled={contactState === 'submitting'}
                      placeholder="e.g. Jane Doe"
                      value={contactForm.name}
                      onChange={(e) => setContactForm((prev) => ({ ...prev, name: e.target.value }))}
                      className={`w-full px-4 py-2.5 rounded-lg border text-slate-900 focus-ring bg-white text-sm ${
                        contactFieldErrors.name ? 'border-red-400 focus:ring-red-400' : 'border-stroke-subtle'
                      }`}
                    />
                    {contactFieldErrors.name && (
                      <span className="text-xs text-red-600 mt-1 block">{contactFieldErrors.name}</span>
                    )}
                  </div>

                  <div>
                    <label htmlFor="contact-email" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Your Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="contact-email"
                      name="email"
                      type="email"
                      required
                      disabled={contactState === 'submitting'}
                      placeholder="e.g. jane@company.com"
                      value={contactForm.email}
                      onChange={(e) => setContactForm((prev) => ({ ...prev, email: e.target.value }))}
                      className={`w-full px-4 py-2.5 rounded-lg border text-slate-900 focus-ring bg-white text-sm ${
                        contactFieldErrors.email ? 'border-red-400 focus:ring-red-400' : 'border-stroke-subtle'
                      }`}
                    />
                    {contactFieldErrors.email && (
                      <span className="text-xs text-red-600 mt-1 block">{contactFieldErrors.email}</span>
                    )}
                  </div>
                </div>

                <div>
                  <label htmlFor="contact-subject" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Subject / Opportunity Type <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="contact-subject"
                    name="subject"
                    type="text"
                    required
                    disabled={contactState === 'submitting'}
                    placeholder="e.g. DevOps Role / Infrastructure Architecture Engagement"
                    value={contactForm.subject}
                    onChange={(e) => setContactForm((prev) => ({ ...prev, subject: e.target.value }))}
                    className={`w-full px-4 py-2.5 rounded-lg border text-slate-900 focus-ring bg-white text-sm ${
                      contactFieldErrors.subject ? 'border-red-400 focus:ring-red-400' : 'border-stroke-subtle'
                    }`}
                  />
                  {contactFieldErrors.subject && (
                    <span className="text-xs text-red-600 mt-1 block">{contactFieldErrors.subject}</span>
                  )}
                </div>

                <div>
                  <label htmlFor="contact-message" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Message Details <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="contact-message"
                    name="message"
                    required
                    rows={4}
                    disabled={contactState === 'submitting'}
                    placeholder="Provide brief details about the role, technical scope, or consulting requirement..."
                    value={contactForm.message}
                    onChange={(e) => setContactForm((prev) => ({ ...prev, message: e.target.value }))}
                    className={`w-full px-4 py-2.5 rounded-lg border text-slate-900 focus-ring bg-white text-sm ${
                      contactFieldErrors.message ? 'border-red-400 focus:ring-red-400' : 'border-stroke-subtle'
                    }`}
                  />
                  {contactFieldErrors.message && (
                    <span className="text-xs text-red-600 mt-1 block">{contactFieldErrors.message}</span>
                  )}
                </div>

                <div className="p-3 bg-blue-50/70 rounded-lg border border-stroke-ice text-xs text-slate-600 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-brand-primary" aria-hidden="true" />
                    <span>Direct Server Delivery: Verified Resend integration routing to dasariravid145@gmail.com.</span>
                  </div>
                  <span className="font-mono text-[11px] text-brand-primary font-bold">Reply-To Enabled</span>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full justify-center shadow-sm"
                  disabled={contactState === 'submitting'}
                  rightIcon={
                    contactState === 'submitting' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )
                  }
                >
                  {contactState === 'submitting' ? 'Sending Inbound Message...' : 'Send Message'}
                </Button>
              </form>
            )}
          </Card>
        </div>
      </SectionWrapper>
    </div>
  );
};
