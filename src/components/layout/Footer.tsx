import React, { useEffect, useState } from 'react';
import { Container } from '../common/Container';
import { RichTextViewer } from '../common/RichTextViewer';
import { contentService } from '../../services/contentService';
import { ArrowUp, Github, Linkedin, Mail, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const [hasCertifications, setHasCertifications] = useState(false);
  const [footerText, setFooterText] = useState<string | null>(null);

  useEffect(() => {
    contentService
      .getPortfolioData()
      .then((res) => {
        if (res?.settings?.footerText) {
          setFooterText(res.settings.footerText);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const checkCerts = () => {
      setHasCertifications(Boolean(document.getElementById('certifications')));
    };
    checkCerts();
    const timer = setTimeout(checkCerts, 600);
    return () => clearTimeout(timer);
  }, []);

  const footerNavLinks = [
    { name: 'Home', href: '/#hero' },
    { name: 'About', href: '/#about' },
    { name: 'Skills', href: '/#skills' },
    { name: 'Experience', href: '/#experience' },
    { name: 'Projects', href: '/#projects' },
    { name: 'AI Solutions', href: '/#ai-solutions' },
    ...(hasCertifications ? [{ name: 'Certifications', href: '/#certifications' }] : []),
    { name: 'Contact', href: '/#contact' },
  ];

  return (
    <footer className="bg-canvas-pearl border-t border-stroke-subtle pt-12 pb-8 text-sm text-slate-600">
      <Container size="lg">
        {/* Upper Grid: Brand + Nav Links + Socials */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pb-10 border-b border-stroke-subtle items-start">
          {/* Brand & Positioning */}
          <div className="md:col-span-5 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-brand-primary flex items-center justify-center text-white font-extrabold text-sm shadow-xs">
                RD
              </div>
              <div>
                <span className="font-bold text-slate-900 block text-base">Ravi Dasari</span>
                <span className="text-xs font-semibold text-brand-primary">DevOps Engineer</span>
              </div>
            </div>
            <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
              Architecting resilient cloud infrastructure, automated CI/CD pipelines, container orchestration with Kubernetes, and enterprise AI automation.
            </p>
          </div>

          {/* Quick Navigation Links */}
          <div className="md:col-span-4 space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-2">
              Portfolio Navigation
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {footerNavLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  className="text-slate-600 hover:text-brand-primary transition-colors focus-ring rounded py-0.5"
                >
                  {link.name}
                </a>
              ))}
            </div>
          </div>

          {/* Social Links & Back to Top */}
          <div className="md:col-span-3 flex flex-col md:items-end space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
              Professional Profiles
            </span>
            <div className="flex items-center gap-3">
              <a
                href="https://github.com/dasariravi145"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-white border border-stroke-subtle text-slate-600 hover:text-brand-primary hover:border-blue-200 transition-all focus-ring shadow-xs"
                aria-label="Ravi Dasari GitHub Profile"
              >
                <Github className="w-4 h-4" />
              </a>
              <a
                href="https://linkedin.com/in/ravid145"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-white border border-stroke-subtle text-slate-600 hover:text-brand-primary hover:border-blue-200 transition-all focus-ring shadow-xs"
                aria-label="Ravi Dasari LinkedIn Profile"
              >
                <Linkedin className="w-4 h-4" />
              </a>
              <a
                href="mailto:dasariravid145@gmail.com"
                className="p-2 rounded-lg bg-white border border-stroke-subtle text-slate-600 hover:text-brand-primary hover:border-blue-200 transition-all focus-ring shadow-xs"
                aria-label="Send Direct Email to Ravi Dasari"
              >
                <Mail className="w-4 h-4" />
              </a>
            </div>

            <button
              onClick={scrollToTop}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-brand-primary focus-ring rounded-md pt-2"
              aria-label="Scroll back to top of page"
            >
              <span>Back to top</span>
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Lower Meta Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 text-xs text-slate-500">
          <div>
            <RichTextViewer
              content={
                footerText ||
                `© ${new Date().getFullYear()} Ravi Dasari. Personal Portfolio. All rights reserved.`
              }
              as="p"
            />
          </div>

          <div className="flex items-center gap-6">
            <span className="inline-flex items-center gap-1.5 text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Edge Architecture Active
            </span>
            <Link
              to="/admin"
              className="inline-flex items-center gap-1 hover:text-brand-primary text-slate-400 hover:underline transition-colors"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Owner Portal</span>
            </Link>
          </div>
        </div>
      </Container>
    </footer>
  );
};
