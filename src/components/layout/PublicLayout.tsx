import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Footer } from './Footer';

export const PublicLayout: React.FC = () => {
  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* WCAG 2.2 AA Skip Link for Keyboard Navigation */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-brand-primary focus:text-white focus:rounded-lg focus:shadow-floating focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary font-semibold text-sm transition-all"
      >
        Skip to main content
      </a>
      <Navbar />
      <main id="main-content" tabIndex={-1} className="flex-grow pt-16 focus:outline-none">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

