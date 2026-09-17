import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { initialProblems, topics } from '../data/initialData';
import { addDays, differenceInDays } from 'date-fns';

const TrackerContext = createContext();

export const useTracker = () => useContext(TrackerContext);

export const TrackerProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [activeCurriculum, setActiveCurriculum] = useState(localStorage.getItem('activeCurriculum') || 'dsa');
  const [loading, setLoading] = useState(true);
  const [problems, setProblems] = useState([]);
  const [contestLog, setContestLog] = useState([]);
  const [settings, setSettings] = useState({});
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const cache = useRef({});
  const loadedCurriculum = useRef(null);


  const isAuthenticated = !!token;

  const originalProblems = problems.filter(p => !p.id?.toString().startsWith('custom-'));
  const curriculumTopics = [...new Set(originalProblems.map(p => p.topic))];

  const API_BASE = `/api`;

  const getHeaders = () => ({
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  });

  const handleAuthError = (res) => {
    if (res.status === 401) {
      logout();
      throw new Error('Unauthorized');
    }
    return res;
  };

  const login = async (username, password) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to login');
    localStorage.setItem('token', data.token);
    setToken(data.token);
  };

  const register = async (username, password) => {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to register');
    localStorage.setItem('token', data.token);
    setToken(data.token);
  };

  const logout = () => {
    localStorage.removeItem('token');
    cache.current = {};
    loadedCurriculum.current = null;
    setToken(null);
    setProblems([]);
    setContestLog([]);
    setSettings({});
  };

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    
    // Check cache first for instant tab switching
    if (cache.current[activeCurriculum]) {
      const cached = cache.current[activeCurriculum];
      setProblems(cached.problems);
      setContestLog(cached.contests);
      setSettings(cached.settings);
      loadedCurriculum.current = activeCurriculum;
      setLoading(false);
      return;
    }

    setLoading(true);
    fetch(`${API_BASE}/data/${activeCurriculum}`, { headers: getHeaders() })
      .then(handleAuthError)
      .then(res => res.json())
      .then(data => {
        const probs = data.problems || initialProblems;
        const conts = data.contests || [{ id: 1, date: new Date().toISOString().split('T')[0], name: 'Initial Rating', before: 1512, after: 1512, penalty: 0, notes: '' }];
        
        let loadedSettings = data.settings || { isPaused: false, pauseStartDate: null, totalPauseDays: 0, currentRating: 1512, goalRating: 1800 };
        try {
          const globalAiStr = localStorage.getItem('globalAiSettings');
          if (globalAiStr) {
            const globalAi = JSON.parse(globalAiStr);
            loadedSettings = { ...loadedSettings, ...globalAi };
          }
        } catch (e) {
          console.error('Failed to parse global AI settings', e);
        }
        
        // Save to cache
        cache.current[activeCurriculum] = {
          problems: probs,
          contests: conts,
          settings: loadedSettings
        };

        loadedCurriculum.current = activeCurriculum;
        setProblems(probs);
        setContestLog(conts);
        setSettings(loadedSettings);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load local data', err);
        if (err.message !== 'Unauthorized') {
          const probs = initialProblems;
          const conts = [{ id: 1, date: new Date().toISOString().split('T')[0], name: 'Initial Rating', before: 1512, after: 1512, penalty: 0, notes: '' }];
          const defaultSettings = { isPaused: false, pauseStartDate: null, totalPauseDays: 0, currentRating: 1512, goalRating: 1800 };
          
          cache.current[activeCurriculum] = { problems: probs, contests: conts, settings: defaultSettings };
          loadedCurriculum.current = activeCurriculum;
          
          setProblems(probs);
          setContestLog(conts);
          setSettings(defaultSettings);
        }
        setLoading(false);
      });
  }, [activeCurriculum, token]);

  useEffect(() => {
    // Only save if data has been successfully loaded for the CURRENT curriculum
    if (loading || !isAuthenticated || loadedCurriculum.current !== activeCurriculum) return;

    // Update cache with latest changes before saving
    cache.current[activeCurriculum] = { problems, contests: contestLog, settings };

    try {
      if (settings.aiSettings || settings.aiChatSessions || settings.aiChatHistory) {
        localStorage.setItem('globalAiSettings', JSON.stringify({
          aiSettings: settings.aiSettings,
          aiChatHistory: settings.aiChatHistory,
          aiChatSessions: settings.aiChatSessions,
          activeSessionId: settings.activeSessionId
        }));
      }
    } catch (e) {
      console.error('Failed to save global AI settings', e);
    }

    fetch(`${API_BASE}/data/${activeCurriculum}`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ problems, contests: contestLog, settings })
    })
    .then(handleAuthError)
    .catch(err => console.error('Failed to save data', err));
  }, [problems, contestLog, settings, loading, activeCurriculum, token]);

  const togglePause = () => {
    setSettings(prev => {
      const now = new Date().toISOString();
      if (prev.isPaused) {
        // Unpausing: calculate difference and add to totalPauseDays
        const diff = differenceInDays(new Date(now), new Date(prev.pauseStartDate));
        
        // Update all problem repetition dates
        setProblems(currentProblems => currentProblems.map(p => {
          const shiftDate = (dateStr) => {
             if(!dateStr) return null;
             return addDays(new Date(dateStr), diff).toISOString();
          };
          return {
            ...p,
            r1: shiftDate(p.r1),
            r3: shiftDate(p.r3),
            r7: shiftDate(p.r7),
            r14: shiftDate(p.r14)
          };
        }));
        
        return { ...prev, isPaused: false, pauseStartDate: null, totalPauseDays: prev.totalPauseDays + diff };
      } else {
        // Pausing
        return { ...prev, isPaused: true, pauseStartDate: now };
      }
    });
  };

  const updateProblem = (id, updates) => {
    setProblems(prev => prev.map(p => {
      if (p.id === id) {
        const newProb = { ...p, ...updates };
        if (updates.status) {
          if (updates.status === 'Solved' || updates.status === 'Re-solved') {
            const now = new Date();
            if (!newProb.firstSolve) newProb.firstSolve = now.toISOString();
            newProb.r1 = addDays(now, 1).toISOString();
            newProb.r3 = null;
            newProb.r7 = null;
            newProb.r14 = null;
          } else if (updates.status === 'Not Started') {
            newProb.firstSolve = null;
            newProb.r1 = null;
            newProb.r3 = null;
            newProb.r7 = null;
            newProb.r14 = null;
          }
        }
        return newProb;
      }
      return p;
    }));
  };

  const completeRevision = (id, completedInterval) => {
    setProblems(prev => prev.map(p => {
      if (p.id === id) {
        const now = new Date();
        const newProb = { ...p };
        
        // Mark current interval as completed
        newProb[completedInterval] = null;
        
        // Cascade to next interval based on completion date
        if (completedInterval === 'r1') {
          newProb.r3 = addDays(now, 3).toISOString();
        } else if (completedInterval === 'r3') {
          newProb.r7 = addDays(now, 7).toISOString();
        } else if (completedInterval === 'r7') {
          newProb.r14 = addDays(now, 14).toISOString();
        }
        
        return newProb;
      }
      return p;
    }));
  };

  const addCustomProblem = (title, topic, url, dateSolvedStr) => {
    const solvedDate = new Date(dateSolvedStr);
    const newProblem = {
      id: `custom-${Date.now()}`,
      problem: title,
      topic: topic || 'Custom',
      url: url || '',
      difficulty: 'Medium',
      status: 'Solved',
      firstSolve: solvedDate.toISOString(),
      r1: addDays(solvedDate, 1).toISOString(),
      r3: null,
      r7: null,
      r14: null
    };
    setProblems(prev => [...prev, newProblem]);
  };

  const addContest = (contest) => {
    setContestLog(prev => {
       const newLog = [...prev, { ...contest, id: Date.now() }];
       // Update current rating in settings based on the latest contest
       setSettings(s => ({...s, currentRating: contest.after}));
       return newLog;
    });
  };
  
  const getTopicMetrics = () => {
     return curriculumTopics.map(topic => {
        const topicProbs = originalProblems.filter(p => p.topic === topic);
        const solved = topicProbs.filter(p => p.status === 'Solved' || p.status === 'Re-solved').length;
        return { topic, total: topicProbs.length, solved, percent: topicProbs.length > 0 ? (solved / topicProbs.length) * 100 : 0 };
     });
  };

  const resetData = () => {
    if(window.confirm(`Are you sure you want to reset all progress for ${activeCurriculum.toUpperCase()}?`)) {
      fetch(`/api/data/${activeCurriculum}`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ problems: null, contests: null, settings: null })
      })
      .then(handleAuthError)
      .then(() => window.location.reload());
    }
  };

  const switchCurriculum = (newCurriculum) => {
    setLoading(true);
    localStorage.setItem('activeCurriculum', newCurriculum);
    setActiveCurriculum(newCurriculum);
  };

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        Loading your local data...
      </div>
    );
  }

  return (
    <TrackerContext.Provider value={{
      token, isAuthenticated, login, register, logout, getHeaders,
      activeCurriculum, switchCurriculum, loading, problems, updateProblem, completeRevision, addCustomProblem,
      contestLog, addContest, settings, setSettings, togglePause, getTopicMetrics, resetData, topics: curriculumTopics,
      isMobileMenuOpen, setIsMobileMenuOpen
    }}>
      {children}
    </TrackerContext.Provider>
  );
};
