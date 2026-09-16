import React, { useEffect } from 'react';
import { Menu } from 'lucide-react';
import Sidebar from './Sidebar';
import AiFloatingWidget from './AiFloatingWidget';
import { useTracker } from '../context/TrackerContext';

import logo from '../assets/logo.jpg';

export default function Layout({ children }) {
  const { settings, isMobileMenuOpen, setIsMobileMenuOpen, activeCurriculum } = useTracker();

  // Handle CSS variable injection based on theme
  useEffect(() => {
    if (settings.theme === 'dark') {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, [settings.theme]);

  return (
    <div className="app-container">
      {/* Mobile Header (only visible on mobile via CSS) */}
      <header className="mobile-header">
        <div className="flex-center gap-2">
          <img src={logo} alt="Interview Prep 360 Logo" style={{ width: '28px', height: '28px', border: '2px solid var(--border-strong)', borderRadius: '50%', objectFit: 'cover' }} />
          <h1 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
            Interview Prep 360
          </h1>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(true)}
          style={{ background: 'none', border: 'none', color: 'var(--text-main)' }}
        >
          <Menu size={24} />
        </button>
      </header>

      {/* Mobile Sidebar Overlay */}
      <div 
        className={`mobile-overlay ${isMobileMenuOpen ? 'active' : ''}`}
        onClick={() => setIsMobileMenuOpen(false)}
      ></div>

      <Sidebar />
      <main className="main-content animate-fade-in">
        {children}
      </main>
      <AiFloatingWidget />
    </div>
  );
}
