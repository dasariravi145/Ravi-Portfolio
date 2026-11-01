import React, { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  User,
  FileText,
  FileCheck,
  FolderGit2,
  Sparkles,
  Briefcase,
  GraduationCap,
  Award,
  Bot,
  Image,
  Settings,
  Mail,
  ExternalLink,
  LogOut,
  Menu,
  X,
  ShieldCheck,
} from 'lucide-react';
import { adminService } from '../../services/adminService';

const NAV_ITEMS = [
  { name: 'Dashboard Overview', path: '/admin', icon: LayoutDashboard, exact: true },
  { name: 'Profile & Bio', path: '/admin/profile', icon: User },
  { name: 'About Content', path: '/admin/about', icon: FileText },
  { name: 'Skills & Categories', path: '/admin/skills', icon: Sparkles },
  { name: 'Work Experience', path: '/admin/experience', icon: Briefcase },
  { name: 'Education', path: '/admin/education', icon: GraduationCap },
  { name: 'Certifications', path: '/admin/certifications', icon: Award },
  { name: 'Projects CMS', path: '/admin/projects', icon: FolderGit2 },
  { name: 'AI Services', path: '/admin/ai-services', icon: Bot },
  { name: 'Media Library', path: '/admin/media', icon: Image },
  { name: 'Resume Management', path: '/admin/resume', icon: FileCheck },
  { name: 'Contact & Social', path: '/admin/contact', icon: Mail },
  { name: 'Site Settings & SEO', path: '/admin/settings', icon: Settings },
];

export const AdminLayout: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await adminService.logout();
    setShowLogoutModal(false);
    navigate('/');
  };

  const currentNav = NAV_ITEMS.find((item) =>
    item.exact ? location.pathname === item.path : location.pathname.startsWith(item.path)
  ) || NAV_ITEMS[0];

  return (
    <div className="flex min-h-screen bg-[#F8FBFF] text-slate-800 antialiased font-sans">
      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div
          data-testid="mobile-backdrop"
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-sm lg:hidden transition-opacity"
          aria-hidden="true"
        />
      )}

      {/* Sidebar (Desktop + Mobile Drawer) */}
      <aside
        data-testid="admin-sidebar"
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-blue-100/80 bg-white shadow-sm transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand / Logo */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-blue-100/60 px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-sky-500 text-white font-bold text-sm shadow-sm">
              RD
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900 tracking-tight leading-none">Ravi Dasari</div>
              <div className="text-[11px] font-semibold text-blue-600 mt-1 uppercase tracking-wider">
                Admin CMS
              </div>
            </div>
          </div>
          <button
            type="button"
            data-testid="close-mobile-menu"
            onClick={() => setMobileMenuOpen(false)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 lg:hidden"
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Security Indicator */}
        <div className="px-4 py-3 border-b border-blue-50 bg-blue-50/40">
          <div className="flex items-center gap-2 text-xs font-medium text-blue-800">
            <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>Cloudflare Access Protected</span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4" aria-label="Admin Navigation">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = item.exact
              ? location.pathname === item.path
              : location.pathname.startsWith(item.path);

            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-all duration-150 ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-200/60'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon
                  className={`h-4 w-4 shrink-0 transition-colors ${
                    isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'
                  }`}
                />
                <span className="truncate">{item.name}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="shrink-0 border-t border-blue-100/60 p-4">
          <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500 border border-slate-100">
            <div className="font-semibold text-slate-800">Single-Owner Session</div>
            <div className="text-[11px] truncate mt-0.5 text-slate-500">dasariravid145@gmail.com</div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-x-hidden min-w-0">
        {/* Top Header */}
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-blue-100/80 bg-white/95 px-4 backdrop-blur-md sm:px-6 lg:px-8 shadow-xs">
          <div className="flex items-center gap-3">
            <button
              type="button"
              data-testid="open-mobile-menu"
              onClick={() => setMobileMenuOpen(true)}
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
              aria-label="Open navigation"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-base font-bold text-slate-900">{currentNav.name}</h1>
              <p className="hidden sm:block text-xs text-slate-400">
                ravi-portfolio.dsecops88.online / {currentNav.path.replace('/', '')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200/80 bg-blue-50/50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100/60 hover:text-blue-800 transition-colors"
            >
              <span>Live Site</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>

            <button
              type="button"
              data-testid="logout-button"
              onClick={() => setShowLogoutModal(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>

        {/* Page Content Viewport */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div
          data-testid="logout-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/25 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-2xl border border-blue-100 bg-white p-6 shadow-xl">
            <h3 className="text-base font-bold text-slate-900">Sign Out of Admin CMS</h3>
            <p className="mt-2 text-xs text-slate-600 leading-relaxed">
              Are you sure you want to exit? To completely revoke your Cloudflare Access session
              across all organizational applications, also visit the Cloudflare Access App
              Launcher.
            </p>
            <div className="mt-5 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                data-testid="confirm-logout-button"
                onClick={handleLogout}
                className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 shadow-xs"
              >
                Confirm Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

