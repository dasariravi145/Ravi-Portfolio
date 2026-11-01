import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, FileText, Send } from 'lucide-react';
import { Button } from '../common/Button';
import { Container } from '../common/Container';

export const Navbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('hero');
  const [hasCertifications, setHasCertifications] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const checkCerts = () => {
      setHasCertifications(Boolean(document.getElementById('certifications')));
    };
    checkCerts();
    const timer = setTimeout(checkCerts, 600);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  const navLinks = [
    { name: 'Home', href: '/#hero', id: 'hero' },
    { name: 'About', href: '/#about', id: 'about' },
    { name: 'Skills', href: '/#skills', id: 'skills' },
    { name: 'Experience', href: '/#experience', id: 'experience' },
    { name: 'Projects', href: '/#projects', id: 'projects' },
    { name: 'AI Solutions', href: '/#ai-solutions', id: 'ai-solutions' },
    ...(hasCertifications ? [{ name: 'Certifications', href: '/#certifications', id: 'certifications' }] : []),
    { name: 'Contact', href: '/#contact', id: 'contact' },
  ];

  useEffect(() => {
    const sectionIds = [
      'hero',
      'about',
      'skills',
      'experience',
      'projects',
      'ai-solutions',
      ...(hasCertifications ? ['certifications'] : []),
      'contact',
    ];
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);

      // Active section calculation based on scroll offset
      const scrollPosition = window.scrollY + 140;
      for (let i = sectionIds.length - 1; i >= 0; i--) {
        const section = document.getElementById(sectionIds[i]);
        if (section && section.offsetTop <= scrollPosition) {
          setActiveSection(sectionIds[i]);
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  // Accessible keyboard ESC handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'glass-header py-2.5 shadow-subtle'
          : 'bg-white/95 backdrop-blur-sm py-2.5 sm:py-3 border-b border-stroke-subtle'
      }`}
    >
      <Container size="compact">
        <div className="flex items-center justify-between">
          {/* Logo Brand */}
          <Link
            to="/"
            className="flex items-center gap-2.5 group focus-ring rounded-lg p-1"
            aria-label="Ravi Dasari — DevOps Engineer"
          >
            <div className="w-9 h-9 rounded-lg bg-brand-primary flex items-center justify-center text-white font-extrabold text-base shadow-sm group-hover:bg-brand-hover transition-colors">
              RD
            </div>
            <div>
              <span className="text-sm font-bold text-slate-900 tracking-tight block leading-tight">
                Ravi Dasari
              </span>
              <span className="text-[11px] font-medium text-slate-500 block leading-tight">
                DevOps & DevSecOps Engineer
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav
            className="hidden lg:flex items-center gap-1 xl:gap-1.5 bg-slate-100/70 border border-slate-200/80 px-2 py-1 xl:px-3 xl:py-1.5 rounded-full shadow-xs backdrop-blur-xs"
            aria-label="Main Navigation"
          >
            {navLinks.map((link) => {
              const isActive = activeSection === link.id && location.pathname === '/';
              return (
                <a
                  key={link.name}
                  href={link.href}
                  className={`px-2.5 py-1 xl:px-3.5 xl:py-1.5 text-xs font-semibold rounded-full transition-all focus-ring ${
                    isActive
                      ? 'bg-brand-primary text-white shadow-xs'
                      : 'text-slate-600 hover:text-brand-primary hover:bg-white/80'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {link.name}
                </a>
              );
            })}
          </nav>

          {/* Action CTAs */}
          <div className="hidden lg:flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<FileText className="w-3.5 h-3.5 text-brand-primary" />}
              as="a"
              href="#resume"
              title="Download official PDF resume"
            >
              Resume
            </Button>
            <Button
              variant="primary"
              size="sm"
              rightIcon={<Send className="w-3.5 h-3.5" />}
              as="a"
              href="#contact"
            >
              Get in Touch
            </Button>
          </div>

          {/* Mobile Menu Trigger */}
          <div className="flex items-center gap-2 lg:hidden">
            <Button
              variant="ghost"
              size="sm"
              className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
              onClick={() => setIsOpen(!isOpen)}
              aria-expanded={isOpen}
              aria-controls="mobile-navigation"
              aria-label={isOpen ? 'Close menu' : 'Open menu'}
            >
              {isOpen ? <X className="w-6 h-6 text-slate-800" /> : <Menu className="w-6 h-6 text-slate-800" />}
            </Button>
          </div>
        </div>
      </Container>

      {/* Mobile Drawer */}
      {isOpen && (
        <div
          id="mobile-navigation"
          className="lg:hidden glass-header border-b border-stroke-ice animate-in fade-in slide-in-from-top-4 duration-200"
          role="region"
          aria-label="Mobile Navigation Drawer"
        >
          <Container size="lg" className="py-6 space-y-4">
            <nav className="flex flex-col space-y-1" aria-label="Mobile Navigation Menu">
              {navLinks.map((link) => {
                const isActive = activeSection === link.id && location.pathname === '/';
                return (
                  <a
                    key={link.name}
                    href={link.href}
                    className={`px-4 py-2.5 text-sm font-semibold rounded-lg transition-colors focus-ring ${
                      isActive
                        ? 'bg-brand-primary/10 text-brand-primary'
                        : 'text-slate-700 hover:text-brand-primary hover:bg-brand-primary/5'
                    }`}
                    onClick={() => setIsOpen(false)}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    {link.name}
                  </a>
                );
              })}
            </nav>
            <div className="pt-4 border-t border-stroke-subtle flex flex-col sm:flex-row gap-3">
              <Button
                variant="outline"
                size="md"
                className="w-full justify-center"
                leftIcon={<FileText className="w-4 h-4" />}
                as="a"
                href="#resume"
                onClick={() => setIsOpen(false)}
              >
                Download Resume (PDF)
              </Button>
              <Button
                variant="primary"
                size="md"
                className="w-full justify-center"
                rightIcon={<Send className="w-4 h-4" />}
                as="a"
                href="#contact"
                onClick={() => setIsOpen(false)}
              >
                Get in Touch
              </Button>
            </div>
          </Container>
        </div>
      )}
    </header>
  );
};
