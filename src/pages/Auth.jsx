import React, { useState } from 'react';
import { useTracker } from '../context/TrackerContext';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useTracker();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await login(username, password);
      } else {
        await register(username, password);
      }
    } catch (err) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'var(--bg-dark)',
      padding: '1rem',
      fontFamily: 'var(--font-main)'
    }}>
      <div className="card" style={{
        width: '100%',
        maxWidth: '420px',
        padding: '2.5rem',
        boxShadow: '10px 10px 0px var(--border-strong)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Accent Bar */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '8px',
          backgroundColor: 'var(--status-solved)' // Bauhaus Blue
        }}></div>

        <h2 style={{
          marginTop: '1rem',
          marginBottom: '2rem',
          textAlign: 'center',
          fontSize: '2rem',
          fontWeight: 700,
          color: 'var(--text-main)',
          textTransform: 'uppercase',
          letterSpacing: '-1px'
        }}>
          {isLogin ? 'Log In' : 'Sign Up'}
        </h2>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {error && (
            <div style={{
              backgroundColor: 'var(--status-editorial)', // Red
              color: 'white',
              padding: '0.8rem',
              border: '2px solid var(--border-strong)',
              fontWeight: 600,
              textAlign: 'center',
              fontSize: '0.9rem'
            }}>
              {error}
            </div>
          )}
          
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: 'var(--text-main)' }}>
              Username
            </label>
            <input
              name="username"
              type="text"
              required
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{
                width: '100%',
                padding: '0.8rem 1rem',
                border: '2px solid var(--border-strong)',
                backgroundColor: 'var(--bg-card)',
                color: 'var(--text-main)',
                fontSize: '1rem',
                fontFamily: 'var(--font-main)',
                outline: 'none'
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--status-solved)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--border-strong)'}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: 'var(--text-main)' }}>
              Password
            </label>
            <input
              name="password"
              type="password"
              required
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '0.8rem 1rem',
                border: '2px solid var(--border-strong)',
                backgroundColor: 'var(--bg-card)',
                color: 'var(--text-main)',
                fontSize: '1rem',
                fontFamily: 'var(--font-main)',
                outline: 'none'
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--status-solved)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--border-strong)'}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{
              marginTop: '1rem',
              width: '100%',
              padding: '1rem',
              fontSize: '1.1rem',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              backgroundColor: 'var(--status-solved)',
              color: 'white',
              border: '2px solid var(--border-strong)',
              boxShadow: '4px 4px 0px var(--border-strong)',
              transition: 'all 0.1s ease',
              opacity: loading ? 0.7 : 1
            }}
            onMouseDown={(e) => {
              if(!loading) {
                e.target.style.transform = 'translate(2px, 2px)';
                e.target.style.boxShadow = '2px 2px 0px var(--border-strong)';
              }
            }}
            onMouseUp={(e) => {
              if(!loading) {
                e.target.style.transform = 'translate(0px, 0px)';
                e.target.style.boxShadow = '4px 4px 0px var(--border-strong)';
              }
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translate(0px, 0px)';
              e.target.style.boxShadow = '4px 4px 0px var(--border-strong)';
            }}
          >
            {loading ? 'Processing...' : (isLogin ? 'Enter' : 'Create')}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
            }}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              fontSize: '0.9rem',
              fontWeight: 600,
              cursor: 'pointer',
              textDecoration: 'underline',
              fontFamily: 'var(--font-main)'
            }}
            onMouseEnter={(e) => e.target.style.color = 'var(--text-main)'}
            onMouseLeave={(e) => e.target.style.color = 'var(--text-muted)'}
          >
            {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Log in'}
          </button>
        </div>
      </div>
    </div>
  );
}
