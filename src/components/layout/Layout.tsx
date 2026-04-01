import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { ScrollToTop } from '../common/ScrollToTop';

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex flex-col transition-colors duration-300">
      <Header onMenuToggle={toggleSidebar} />
      <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />
      
      <main className="container mx-auto px-4 py-8 flex-1">
        <Outlet />
      </main>

      {/* Scroll to Top Button */}
      <ScrollToTop />

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 py-6 bg-white dark:bg-slate-900/50 transition-colors duration-300">
        <div className="container mx-auto px-4 text-center text-slate-600 dark:text-slate-400 text-sm">
          <p>StreamDB - GoLedger Challenge 2026</p>
          <p className="mt-1">Built with React, TypeScript & Tailwind CSS</p>
        </div>
      </footer>
    </div>
  );
}
