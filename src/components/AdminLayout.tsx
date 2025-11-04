/**
 * ============================================
 * ADMIN LAYOUT - Modern Dashboard UI
 * ============================================
 * 
 * Responsive sidebar navigation
 * Clean, modern design
 * Easy access to all features
 */

'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { Toaster } from 'react-hot-toast';
import '../styles/styles.css';
import '../app/globals.css';
import { logout } from '@/lib/utils/auth';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const pathname = usePathname();

  const navItems = [
    { href: '/admin/dashboard', icon: '🏠', label: 'Dashboard' },
    { href: '/admin/drafts', icon: '📝', label: 'Drafts' },
    { href: '/admin/published', icon: '🚀', label: 'Published' },
  ];

  const isActive = (href: string) => pathname === href || pathname?.startsWith(href + '/');

  return (
    <div className="admin-container">
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? '' : 'collapsed'}`}>
        {/* Logo/Header */}
        <div className="sidebar-header">
          <div className="sidebar-logo">
            {sidebarOpen && (
              <div>
                <h1 className="sidebar-title">AI PostGen</h1>
                <p className="sidebar-subtitle">Content Management</p>
              </div>
            )}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="sidebar-toggle"
            >
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-item ${isActive(item.href) ? 'active' : ''}`}
            >
              <span className="nav-icon">{item.icon}</span>
              {sidebarOpen && (
                <span className="nav-label">{item.label}</span>
              )}
              {isActive(item.href) && sidebarOpen && (
                <span className="nav-indicator"></span>
              )}
            </Link>
          ))}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          <button
            onClick={logout}
            className="logout-button"
          >
            <span>🚪</span>
            {sidebarOpen && <span>Logout</span>}
          </button>
          {sidebarOpen && (
            <p style={{fontSize: '12px', color: '#9ca3af', textAlign: 'center', marginTop: '16px'}}>
              © 2025 AI PostGen
            </p>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <Toaster position="top-right" />
        {children}
      </main>
    </div>
  );
}
