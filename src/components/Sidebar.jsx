import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, ListTodo, Trophy, BookOpen, Settings, Calendar, Sun, Moon, Pause, Play, RotateCcw, Bot, X } from 'lucide-react';
import { useTracker } from '../context/TrackerContext';

export default function Sidebar() {
  const { activeCurriculum, switchCurriculum, settings, setSettings, togglePause, resetData, isMobileMenuOpen, setIsMobileMenuOpen } = useTracker();

  return (
    <aside className={`sidebar ${isMobileMenuOpen ? 'mobile-open' : ''}`} style={{ padding: '1.5rem 0' }}>
      <div className="sidebar-header" style={{ padding: '0 1.5rem', position: 'relative' }}>
        <button 
          className="mobile-close-btn"
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <X size={24} />
        </button>
        <h1 className="gradient-text" style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <img src="/logo.jpg" alt="Interview Prep 360 Logo" style={{ width: '32px', height: '32px', border: '2px solid var(--border-strong)', borderRadius: '50%' }} />
          Interview Prep 360
        </h1>
        <p className="text-xs text-muted mt-2">v2.0 Premium</p>
      </div>

      <div style={{ padding: '0 1.5rem', marginBottom: '1.5rem' }}>
        <div className="curriculum-toggle">
          <button 
            className={`curriculum-btn ${activeCurriculum === 'dsa' ? 'active' : ''}`}
            onClick={() => switchCurriculum('dsa')}
          >DSA</button>
          <button 
            className={`curriculum-btn ${activeCurriculum === 'hld' ? 'active' : ''}`}
            onClick={() => switchCurriculum('hld')}
          >HLD</button>
          <button 
            className={`curriculum-btn ${activeCurriculum === 'lld' ? 'active' : ''}`}
            onClick={() => switchCurriculum('lld')}
          >LLD</button>
        </div>
      </div>

      <nav className="sidebar-nav">
        <NavLink to="/" onClick={() => setIsMobileMenuOpen(false)} className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
          <LayoutDashboard size={20} /> Dashboard
        </NavLink>
        <NavLink to="/tracker" onClick={() => setIsMobileMenuOpen(false)} className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
          <ListTodo size={20} />
          <span>Master Tracker</span>
        </NavLink>
        <NavLink to="/calendar" onClick={() => setIsMobileMenuOpen(false)} className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
          <Calendar size={20} />
          <span>Calendar</span>
        </NavLink>
        <NavLink to="/contests" onClick={() => setIsMobileMenuOpen(false)} className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
          <Trophy size={20} /> Contest Log
        </NavLink>
        <NavLink to="/study" onClick={() => setIsMobileMenuOpen(false)} className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
          <BookOpen size={20} /> Study Guides
        </NavLink>
        <NavLink to="/ai-helper" onClick={() => setIsMobileMenuOpen(false)} className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
          <Bot size={20} /> AI Tutor
        </NavLink>
      </nav>

      <div className="mt-auto pt-6" style={{ padding: '0 1.5rem' }}>
        <div className="card glass-panel" style={{ padding: '1rem', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <p className="text-sm mb-2">
            {settings.isPaused ? "Schedule is Paused" : "Schedule Active"}
          </p>
          <button 
            className={`btn ${settings.isPaused ? 'btn-primary' : 'btn-outline'}`} 
            style={{ width: '100%' }}
            onClick={togglePause}
          >
            {settings.isPaused ? "Resume Schedule" : "Pause Schedule"}
          </button>
          
          <button 
            className="btn btn-outline mt-2" 
            style={{ width: '100%' }}
            onClick={() => setSettings(prev => ({...prev, theme: prev.theme === 'light' ? 'dark' : 'light'}))}
          >
            {settings.theme === 'light' ? "🌙 Dark Mode" : "☀️ Light Mode"}
          </button>

          <button 
            className="btn btn-outline mt-2" 
            style={{ width: '100%', borderColor: '#ef4444', color: '#ef4444' }}
            onClick={resetData}
            title="Reloads default data"
          >
            Reset Data
          </button>
        </div>
      </div>
    </aside>
  );
}
