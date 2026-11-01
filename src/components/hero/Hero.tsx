import React, { useState } from 'react';
import { Container } from '../common/Container';
import { Button } from '../common/Button';
import { RichTextViewer } from '../common/RichTextViewer';
import { ArrowRight, FileText, Send, Github, Linkedin, Mail, CheckCircle2, Cloud, Shield, Bot } from 'lucide-react';
import { Profile, Resume } from '../../types/portfolio';

interface HeroProps {
  profile: Profile;
  resume: Resume;
}

export const Hero: React.FC<HeroProps> = ({ profile, resume }) => {
  const [imageError, setImageError] = useState(false);
  const hasResume = Boolean(resume.activeResume && resume.published !== false);

  return (
    <section id="hero" className="relative pt-6 pb-12 sm:pt-8 sm:pb-14 lg:pt-8 lg:pb-16 bg-ambient-gradient overflow-hidden border-b border-stroke-ice">
      <Container size="compact">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-8 xl:gap-10 items-center">
          {/* Left Column: Headlines & Call to Actions */}
          <div className="lg:col-span-7 space-y-4 lg:space-y-4.5 text-center lg:text-left">
            {/* Unified Executive Eyebrow */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-slate-200/90 shadow-2xs text-xs font-semibold text-slate-800">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" aria-hidden="true" />
                <span className="font-bold text-slate-900">{profile.fullName}</span>
                <span className="text-slate-300" aria-hidden="true">·</span>
                <span className="text-brand-primary tracking-wide uppercase font-semibold">
                  <span>{profile.headline || 'DevOps Engineer'}</span> · AWS · Terraform · Kubernetes
                </span>
              </div>
            </div>

            {/* Main Headline */}
            <h1 className="text-2xl sm:text-3xl lg:text-[1.75rem] xl:text-[1.95rem] font-extrabold text-slate-900 tracking-tight leading-[1.22] max-w-xl mx-auto lg:mx-0">
              {profile.heroHeadline ? (
                <RichTextViewer content={profile.heroHeadline} as="span" inline />
              ) : (
                <>
                  <span className="inline lg:block">Building Reliable <span className="text-brand-primary">Cloud Infrastructure</span>.</span>
                  <span className="inline lg:block">Making Deployments <span className="text-brand-teal">Simpler</span>.</span>
                </>
              )}
            </h1>

            {/* Human-Written Professional Description */}
            <div className="text-sm sm:text-[0.9375rem] text-slate-600 max-w-xl mx-auto lg:mx-0 leading-relaxed font-normal">
              <RichTextViewer
                content={
                  profile.heroSubtitle ||
                  profile.bioShort ||
                  "I'm a DevOps Engineer with 6.6 years of IT experience. I work with AWS, Terraform, Kubernetes, and CI/CD to automate infrastructure, streamline deployments, and support reliable applications."
                }
                as="p"
              />
            </div>

            {/* Factual Experience Details Callout */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2.5 sm:gap-3.5 pt-0.5">
              <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-white/95 border border-slate-200/80 shadow-2xs">
                <div className="w-1 h-5 rounded-full bg-brand-primary" aria-hidden="true" />
                <div className="text-left">
                  <span className="block text-xs font-bold text-slate-900 leading-tight">
                    {profile.heroStat1Value || '4 Years'}
                  </span>
                  <span className="block text-[11px] font-medium text-slate-500 leading-tight">
                    {profile.heroStat1Label || 'DevOps & Cloud'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-white/95 border border-slate-200/80 shadow-2xs">
                <div className="w-1 h-5 rounded-full bg-brand-teal" aria-hidden="true" />
                <div className="text-left">
                  <span className="block text-xs font-bold text-slate-900 leading-tight">
                    {profile.heroStat2Value || '2.6 Years'}
                  </span>
                  <span className="block text-[11px] font-medium text-slate-500 leading-tight">
                    {profile.heroStat2Label || 'Java Backend'}
                  </span>
                </div>
              </div>

              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-600">
                <span className="w-2 h-2 rounded-full bg-emerald-500" aria-hidden="true" />
                <span>{profile.availabilityStatus || 'Available for Roles & Consulting'}</span>
              </div>
            </div>

            {/* Primary Action Buttons */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2.5 pt-1">
              <Button
                variant="primary"
                size="sm"
                className="px-4 py-2 sm:px-4.5 sm:py-2.5 text-xs sm:text-sm font-semibold rounded-lg shadow-xs"
                rightIcon={<ArrowRight className="w-4 h-4" />}
                as="a"
                href="#projects"
              >
                Explore My Work
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="px-4 py-2 sm:px-4.5 sm:py-2.5 text-xs sm:text-sm font-semibold rounded-lg border-slate-300 text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-2xs"
                rightIcon={<Send className="w-4 h-4" />}
                as="a"
                href="#contact"
              >
                Get in Touch
              </Button>

              {hasResume ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-600 hover:text-brand-primary"
                  leftIcon={<FileText className="w-4 h-4 text-brand-primary" />}
                  as="a"
                  href="/api/public/resume/download"
                  download="Ravi_Dasari_Resume.pdf"
                >
                  Download Resume
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-600 hover:text-brand-primary"
                  leftIcon={<FileText className="w-4 h-4 text-brand-primary" />}
                  as="a"
                  href="#contact"
                  title="Resume available on request"
                >
                  Request Resume
                </Button>
              )}
            </div>

            {/* Social Links Row */}
            <div className="flex items-center justify-center lg:justify-start gap-2.5 pt-1 text-xs text-slate-500">
              <span className="font-semibold text-slate-400 uppercase tracking-wider text-[11px]">Direct Profiles:</span>
              <div className="flex items-center gap-1.5">
                <a
                  href={profile.social.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 min-w-[32px] min-h-[32px] inline-flex items-center justify-center rounded-lg bg-white border border-slate-200/80 text-slate-600 hover:text-brand-primary hover:border-brand-primary/40 transition-colors focus-ring shadow-2xs"
                  aria-label="Ravi Dasari GitHub Profile"
                >
                  <Github className="w-3.5 h-3.5" />
                </a>
                <a
                  href={profile.social.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 min-w-[32px] min-h-[32px] inline-flex items-center justify-center rounded-lg bg-white border border-slate-200/80 text-slate-600 hover:text-brand-primary hover:border-brand-primary/40 transition-colors focus-ring shadow-2xs"
                  aria-label="Ravi Dasari LinkedIn Profile"
                >
                  <Linkedin className="w-3.5 h-3.5" />
                </a>
                <a
                  href={`mailto:${profile.contactEmail}`}
                  className="p-1.5 min-w-[32px] min-h-[32px] inline-flex items-center justify-center rounded-lg bg-white border border-slate-200/80 text-slate-600 hover:text-brand-primary hover:border-brand-primary/40 transition-colors focus-ring shadow-2xs"
                  aria-label="Send direct email to Ravi Dasari"
                >
                  <Mail className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>

          {/* Right Column: Profile Portrait / Monogram Card */}
          <div className="lg:col-span-5 flex justify-center lg:justify-end">
            <div className="relative w-64 h-72 sm:w-72 sm:h-80 md:w-[270px] md:h-[330px] lg:w-[280px] lg:h-[340px] xl:w-[290px] xl:h-[355px]">
              {/* Soft decorative aura */}
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-brand-primary/15 to-brand-secondary/25 blur-2xl -z-10" />

              {/* Floating capability pill (top right) */}
              <div className="absolute -top-3 -right-3 z-20 hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/95 backdrop-blur-sm border border-stroke-ice shadow-card text-[11px] font-bold text-slate-800">
                <Shield className="w-3 h-3 text-brand-primary" aria-hidden="true" />
                <span>6.6+ Years Exp</span>
              </div>

              {/* Floating capability pill (bottom left) */}
              <div className="absolute -bottom-3 -left-3 z-20 hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/95 backdrop-blur-sm border border-stroke-ice shadow-card text-[11px] font-bold text-slate-800">
                <Cloud className="w-3 h-3 text-brand-teal" aria-hidden="true" />
                <span>AWS • K8s • IaC</span>
              </div>

              {/* Card Container */}
              <div className="w-full h-full rounded-2xl bg-white p-2 sm:p-2.5 border-2 border-stroke-ice shadow-floating flex flex-col items-center justify-center relative overflow-hidden">
                {profile.avatar?.url && !imageError ? (
                  /* Executive Photo Frame with Balanced Border Matting */
                  <div className="w-full h-full p-2 sm:p-2.5 rounded-xl bg-slate-50/90 border border-slate-200/80 flex items-center justify-center overflow-hidden">
                    <img
                      src={profile.avatar.url}
                      alt={profile.fullName}
                      width={290}
                      height={355}
                      loading="eager"
                      fetchPriority="high"
                      decoding="async"
                      onError={() => setImageError(true)}
                      className="w-full h-full object-cover object-top rounded-lg shadow-2xs"
                    />
                  </div>
                ) : (
                  /* Fallback Geometric Executive Avatar Monogram */
                  <div className="w-full h-full rounded-xl bg-gradient-to-br from-canvas-surface to-white border border-stroke-ice flex flex-col items-center justify-center p-5 sm:p-6 text-center space-y-3">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-brand-primary flex items-center justify-center text-white text-xl sm:text-2xl font-black shadow-card">
                      RD
                    </div>
                    <div>
                      <h2 className="text-base sm:text-lg font-bold text-slate-900">{profile.fullName}</h2>
                      <p className="text-xs font-semibold text-brand-primary mt-0.5">DevOps & DevSecOps Engineer</p>
                      <p className="text-[11px] text-slate-500 mt-1 max-w-[220px] mx-auto leading-relaxed">
                        AWS • Terraform • Docker • Kubernetes • CI/CD • Linux • Java
                      </p>
                    </div>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-medium border border-emerald-200 shadow-xs">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" aria-hidden="true" />
                      <span>Verified Credentials</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Metrics Bar */}
        <div className="mt-8 lg:mt-10 pt-5 border-t border-slate-200/70 grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white/95 backdrop-blur-xs p-3 rounded-lg border border-stroke-subtle shadow-xs hover:shadow-subtle transition-shadow flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-50 text-brand-primary shrink-0">
              <Cloud className="w-4 h-4" />
            </div>
            <div>
              <span className="block text-xs font-bold text-slate-900">100% CI/CD</span>
              <span className="block text-[11px] text-slate-500">Automated Delivery</span>
            </div>
          </div>

          <div className="bg-white/95 backdrop-blur-xs p-3 rounded-lg border border-stroke-subtle shadow-xs hover:shadow-subtle transition-shadow flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-50 text-brand-teal shrink-0">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <span className="block text-xs font-bold text-slate-900">Shift-Left</span>
              <span className="block text-[11px] text-slate-500">Automated SAST/DAST</span>
            </div>
          </div>

          <div className="bg-white/95 backdrop-blur-xs p-3 rounded-lg border border-stroke-subtle shadow-xs hover:shadow-subtle transition-shadow flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <span className="block text-xs font-bold text-slate-900">AI Agents</span>
              <span className="block text-[11px] text-slate-500">Autonomous Workflows</span>
            </div>
          </div>

          <div className="bg-white/95 backdrop-blur-xs p-3 rounded-lg border border-stroke-subtle shadow-xs hover:shadow-subtle transition-shadow flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-cyan-50 text-cyan-700 shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <span className="block text-xs font-bold text-slate-900">Enterprise</span>
              <span className="block text-[11px] text-slate-500">Resilient Infrastructure</span>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
};
