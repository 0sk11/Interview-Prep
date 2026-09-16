import React, { useEffect } from 'react';
import { Menu } from 'lucide-react';
import Sidebar from './Sidebar';
import AiFloatingWidget from './AiFloatingWidget';
import { useTracker } from '../context/TrackerContext';

export default function Layout({ children }) {
  const { settings, isMobileMenuOpen, setIsMobileMenuOpen, activeCurriculum } = useTracker();

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
        <h1 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
          {activeCurriculum.toUpperCase()} Tracker
        </h1>
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
