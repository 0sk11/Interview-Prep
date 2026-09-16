import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { useTracker } from '../context/TrackerContext';

const AddCustomProblemModal = ({ isOpen, onClose }) => {
  const { addCustomProblem, topics } = useTracker();
  const [title, setTitle] = useState('');
  const [topic, setTopic] = useState(topics[0] || 'Custom');
  const [newTopic, setNewTopic] = useState('');
  const [url, setUrl] = useState('');
  const [dateSolved, setDateSolved] = useState(new Date().toISOString().split('T')[0]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    const finalTopic = topic === 'Other' ? newTopic.trim() : topic;
    addCustomProblem(title, finalTopic || 'Custom', url, dateSolved);
    // Reset form
    setTitle('');
    setTopic(topics[0] || 'Custom');
    setNewTopic('');
    setUrl('');
    setDateSolved(new Date().toISOString().split('T')[0]);
    onClose();
  };

  const modalContent = (
    <div 
      onClick={onClose}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 9999, padding: '1rem'
      }}
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--bg-card)',
          padding: '2rem',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '500px',
          border: '1px solid var(--border-strong)',
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
          maxHeight: '90vh',
          overflowY: 'auto'
        }}
      >
        <h3 style={{ margin: '0 0 1.5rem 0', color: 'var(--text-main)' }}>Add External Problem</h3>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Problem Title *</label>
            <input 
              type="text" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Find Kth Largest Element"
              required
              style={{
                width: '100%', padding: '0.75rem', borderRadius: '6px',
                background: 'var(--bg-app)', border: '1px solid var(--border-strong)',
                color: 'var(--text-main)'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Topic</label>
            <select 
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              style={{
                width: '100%', padding: '0.75rem', borderRadius: '6px',
                background: 'var(--bg-app)', border: '1px solid var(--border-strong)',
                color: 'var(--text-main)'
              }}
            >
              {topics.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
              <option value="Other">Other (Custom)</option>
            </select>
          </div>

          {topic === 'Other' && (
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Custom Topic</label>
              <input 
                type="text" 
                value={newTopic}
                onChange={(e) => setNewTopic(e.target.value)}
                placeholder="Enter custom topic"
                required
                style={{
                  width: '100%', padding: '0.75rem', borderRadius: '6px',
                  background: 'var(--bg-app)', border: '1px solid var(--border-strong)',
                  color: 'var(--text-main)'
                }}
              />
            </div>
          )}

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>URL (Optional)</label>
            <input 
              type="url" 
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://leetcode.com/problems/..."
              style={{
                width: '100%', padding: '0.75rem', borderRadius: '6px',
                background: 'var(--bg-app)', border: '1px solid var(--border-strong)',
                color: 'var(--text-main)'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Date Solved</label>
            <input 
              type="date" 
              value={dateSolved}
              onChange={(e) => setDateSolved(e.target.value)}
              required
              style={{
                width: '100%', padding: '0.75rem', borderRadius: '6px',
                background: 'var(--bg-app)', border: '1px solid var(--border-strong)',
                color: 'var(--text-main)'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <button 
              type="button"
              onClick={onClose}
              style={{
                flex: 1, padding: '0.75rem', borderRadius: '6px',
                background: 'transparent', border: '1px solid var(--border-strong)',
                color: 'var(--text-main)', cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button 
              type="submit"
              style={{
                flex: 1, padding: '0.75rem', borderRadius: '6px',
                background: 'var(--accent-primary)', border: 'none',
                color: '#fff', cursor: 'pointer', fontWeight: 600
              }}
            >
              Add Problem
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalContent, document.body);
};

export default AddCustomProblemModal;
