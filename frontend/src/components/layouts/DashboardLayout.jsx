/**
 * DashboardLayout Component
 * Main app layout with sidebar and header
 *
 * Features:
 * - Responsive sidebar (drawer on mobile)
 * - Header with user menu
 * - Main content area
 * - Accessible navigation
 */

import React, { useState } from 'react';
import { cn } from '../../lib/utils';
import Sidebar from './Sidebar';
import Header from './Header';

export default function DashboardLayout({
  children,
  user,
  onLogout,
  currentPath = '/',
  className,
  ...props
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50" {...props}>
      {/* Sidebar - Desktop */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <Sidebar currentPath={currentPath} />
      </div>

      {/* Sidebar - Mobile Overlay */}
      {sidebarOpen && (
        <>
          <div
            className="fixed inset-0 bg-gray-900/50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
          <div className="fixed inset-y-0 left-0 w-64 z-50 lg:hidden">
            <Sidebar currentPath={currentPath} onClose={() => setSidebarOpen(false)} />
          </div>
        </>
      )}

      {/* Main Content */}
      <div className="lg:pl-64 flex flex-col flex-1">
        <Header
          user={user}
          onLogout={onLogout}
          onMenuClick={() => setSidebarOpen(true)}
        />

        <main className={cn('flex-1 pb-8', className)}>
          {children}
        </main>
      </div>
    </div>
  );
}
