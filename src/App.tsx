import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { PublicLayout } from './components/layout/PublicLayout';
import { HomePage } from './pages/HomePage';
import { NotFoundPage } from './pages/NotFoundPage';

// Lazy-loaded Public Routes (Optimizes initial bundle for Homepage visitors)
const ProjectsPage = React.lazy(() =>
  import('./pages/ProjectsPage').then((m) => ({ default: m.ProjectsPage }))
);
const ProjectDetailPage = React.lazy(() =>
  import('./pages/ProjectDetailPage').then((m) => ({ default: m.ProjectDetailPage }))
);
const AIServiceDetailPage = React.lazy(() =>
  import('./pages/AIServiceDetailPage').then((m) => ({ default: m.AIServiceDetailPage }))
);

// Admin CMS Architecture (Lazy loaded so public visitors never download admin bundle)
import { AdminGuard } from './components/admin/AdminGuard';
import { AdminLayout } from './components/admin/AdminLayout';

const DashboardOverviewPage = React.lazy(() =>
  import('./pages/admin/DashboardOverviewPage').then((m) => ({ default: m.DashboardOverviewPage }))
);
const ProfilePage = React.lazy(() =>
  import('./pages/admin/ProfilePage').then((m) => ({ default: m.ProfilePage }))
);
const AboutPage = React.lazy(() =>
  import('./pages/admin/AboutPage').then((m) => ({ default: m.AboutPage }))
);
const EducationPage = React.lazy(() =>
  import('./pages/admin/EducationPage').then((m) => ({ default: m.EducationPage }))
);
const ContactSocialPage = React.lazy(() =>
  import('./pages/admin/ContactSocialPage').then((m) => ({ default: m.ContactSocialPage }))
);
const MediaLibraryPage = React.lazy(() =>
  import('./pages/admin/MediaLibraryPage').then((m) => ({ default: m.MediaLibraryPage }))
);
const SettingsPage = React.lazy(() =>
  import('./pages/admin/SettingsPage').then((m) => ({ default: m.SettingsPage }))
);
const ResumePage = React.lazy(() =>
  import('./pages/admin/ResumePage').then((m) => ({ default: m.ResumePage }))
);
const ProjectsListPage = React.lazy(() =>
  import('./pages/admin/ProjectsListPage').then((m) => ({ default: m.ProjectsListPage }))
);
const ProjectFormPage = React.lazy(() =>
  import('./pages/admin/ProjectFormPage').then((m) => ({ default: m.ProjectFormPage }))
);
const SkillsPage = React.lazy(() =>
  import('./pages/admin/SkillsPage').then((m) => ({ default: m.SkillsPage }))
);
const ExperiencePage = React.lazy(() =>
  import('./pages/admin/ExperiencePage').then((m) => ({ default: m.ExperiencePage }))
);
const CertificationsPage = React.lazy(() =>
  import('./pages/admin/CertificationsPage').then((m) => ({ default: m.CertificationsPage }))
);
const AIServicesPage = React.lazy(() =>
  import('./pages/admin/AIServicesPage').then((m) => ({ default: m.AIServicesPage }))
);

const RouteLoadingSpinner: React.FC = () => (
  <div
    className="min-h-[50vh] flex flex-col items-center justify-center p-8 space-y-4"
    role="status"
    aria-live="polite"
  >
    <div className="w-10 h-10 border-3 border-brand-primary/20 border-t-brand-primary rounded-full animate-spin" />
    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Loading...</span>
  </div>
);

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Suspense fallback={<RouteLoadingSpinner />}>
        <Routes>
          {/* Protected Admin CMS Routes */}
          <Route path="/admin" element={<AdminGuard />}>
            <Route element={<AdminLayout />}>
              <Route index element={<DashboardOverviewPage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="about" element={<AboutPage />} />
              <Route path="skills" element={<SkillsPage />} />
              <Route path="experience" element={<ExperiencePage defaultTab="experience" />} />
              <Route path="education" element={<EducationPage />} />
              <Route path="certifications" element={<CertificationsPage />} />
              <Route path="projects" element={<ProjectsListPage />} />
              <Route path="projects/new" element={<ProjectFormPage />} />
              <Route path="projects/edit/:id" element={<ProjectFormPage />} />
              <Route path="ai-services" element={<AIServicesPage />} />
              <Route path="media" element={<MediaLibraryPage />} />
              <Route path="resume" element={<ResumePage />} />
              <Route path="contact" element={<ContactSocialPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
          </Route>

          {/* Public Website Routes */}
          <Route path="/" element={<PublicLayout />}>
            <Route index element={<HomePage />} />
            <Route path="projects" element={<ProjectsPage />} />
            <Route path="projects/:slug" element={<ProjectDetailPage />} />
            <Route path="ai-solutions/:slug" element={<AIServiceDetailPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
};

export default App;
