import fs from 'fs';

const path = 'src/context/TrackerContext.jsx';
let content = fs.readFileSync(path, 'utf8');

// Replace imports to include useRef
content = content.replace(
  "import React, { createContext, useContext, useState, useEffect } from 'react';",
  "import React, { createContext, useContext, useState, useEffect, useRef } from 'react';"
);

// Add refs inside TrackerProvider
const refsToAdd = `
  const cache = useRef({});
  const loadedCurriculum = useRef(null);
`;
content = content.replace(
  "const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);",
  "const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);\n" + refsToAdd
);

// Update logout
const newLogout = `
  const logout = () => {
    localStorage.removeItem('token');
    cache.current = {};
    loadedCurriculum.current = null;
    setToken(null);
    setProblems([]);
    setContestLog([]);
    setSettings({});
  };
`;
content = content.replace(/const logout = \(\) => \{[\s\S]*?setSettings\(\{\}\);\n  \};/, newLogout.trim());

// Update load useEffect
const oldLoadEffect = `
  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch(\`\${API_BASE}/data/\${activeCurriculum}\`, { headers: getHeaders() })
      .then(handleAuthError)
      .then(res => res.json())
      .then(data => {
        setProblems(data.problems || initialProblems);
        setContestLog(data.contests || [{ id: 1, date: new Date().toISOString().split('T')[0], name: 'Initial Rating', before: 1512, after: 1512, penalty: 0, notes: '' }]);
        
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
        
        setSettings(loadedSettings);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load local data', err);
        if (err.message !== 'Unauthorized') {
          setProblems(initialProblems);
          setContestLog([{ id: 1, date: new Date().toISOString().split('T')[0], name: 'Initial Rating', before: 1512, after: 1512, penalty: 0, notes: '' }]);
          setSettings({ isPaused: false, pauseStartDate: null, totalPauseDays: 0, currentRating: 1512, goalRating: 1800 });
        }
        setLoading(false);
      });
  }, [activeCurriculum, token]);
`;

const newLoadEffect = `
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
    fetch(\`\${API_BASE}/data/\${activeCurriculum}\`, { headers: getHeaders() })
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
`;
content = content.replace(oldLoadEffect.trim(), newLoadEffect.trim());

// Update save useEffect
const oldSaveEffect = `
  useEffect(() => {
    if (loading || !isAuthenticated) return;

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

    fetch(\`\${API_BASE}/data/\${activeCurriculum}\`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ problems, contests: contestLog, settings })
    })
    .then(handleAuthError)
    .catch(err => console.error('Failed to save data', err));
  }, [problems, contestLog, settings, loading, activeCurriculum, token]);
`;

const newSaveEffect = `
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

    fetch(\`\${API_BASE}/data/\${activeCurriculum}\`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ problems, contests: contestLog, settings })
    })
    .then(handleAuthError)
    .catch(err => console.error('Failed to save data', err));
  }, [problems, contestLog, settings, loading, activeCurriculum, token]);
`;
content = content.replace(oldSaveEffect.trim(), newSaveEffect.trim());

fs.writeFileSync(path, content);
console.log('Successfully updated TrackerContext.jsx');
