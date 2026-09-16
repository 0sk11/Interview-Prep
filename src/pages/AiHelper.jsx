import React, { useState, useEffect, useRef } from 'react';
import { useTracker } from '../context/TrackerContext';
import { studyGuides } from '../data/initialData';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { Bot, User, Send, Key, HelpCircle, Trash2, Cpu, Plus, MessageSquare, ChevronRight, Edit2, Copy } from 'lucide-react';

const PROVIDERS = {
  gemini: {
    name: 'Google Gemini',
    helpText: "Get an API key from aistudio.google.com",
    suggestedModels: ['gemini-3.5-flash', 'gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-2.0-flash']
  },
  groq: {
    name: 'Groq (Free LLaMA)',
    url: 'https://api.groq.com/openai/v1',
    defaultModel: 'llama-3.3-70b-versatile',
    helpText: "Get a free API key from console.groq.com",
    suggestedModels: ['llama-3.3-70b-versatile', 'deepseek-r1-distill-llama-70b', 'qwen-2.5-32b', 'mixtral-8x7b-32768']
  },
  deepseek: {
    name: 'DeepSeek',
    url: 'https://api.deepseek.com',
    defaultModel: 'deepseek-chat',
    helpText: "Get an API key from platform.deepseek.com",
    suggestedModels: ['deepseek-chat', 'deepseek-reasoner']
  },
  openrouter: {
    name: 'OpenRouter',
    url: 'https://openrouter.ai/api/v1',
    defaultModel: 'meta-llama/llama-3.3-70b-instruct:free',
    helpText: "Get an API key from openrouter.ai",
    suggestedModels: ['meta-llama/llama-3.3-70b-instruct:free', 'deepseek/deepseek-r1:free', 'google/gemini-2.0-flash-lite-preview-02-05:free', 'qwen/qwen-2.5-coder-32b-instruct:free']
  }
};

const selectBestChatModel = (modelsList, provider, fallback) => {
  if (!modelsList || !Array.isArray(modelsList) || modelsList.length === 0) return fallback;

  // Filter out audio, whisper, embeddings, moderation, tts, guard models
  const validChatModels = modelsList.filter(m => {
    const id = (m.id || '').toLowerCase();
    if (!id) return false;
    const nonChatKeywords = ['whisper', 'guard', 'embed', 'tts', 'moderation', 'audio', 'transcription', 'safeguard', 'reward'];
    return !nonChatKeywords.some(kw => id.includes(kw));
  });

  if (validChatModels.length === 0) return fallback;

  if (provider === 'groq') {
    const groqPriority = [
      'llama-3.3-70b-versatile',
      'llama-3.1-70b-versatile',
      'llama-3.1-8b-instant',
      'llama-3.2-3b-preview',
      'llama-3.2-1b-preview',
      'llama3-70b-8192',
      'llama3-8b-8192',
      'mixtral-8x7b-32768',
      'gemma2-9b-it',
      'deepseek-r1-distill-llama-70b',
      'qwen-2.5-32b',
      'qwen-2.5-coder-32b'
    ];
    const versatileLlama = validChatModels.find(m => m.id.toLowerCase().includes('llama') && m.id.toLowerCase().includes('versatile') && !m.id.toLowerCase().includes('vision'));
    if (versatileLlama) return versatileLlama.id;

    const largeLlama = validChatModels.find(m => m.id.toLowerCase().includes('llama') && (m.id.toLowerCase().includes('70b') || m.id.toLowerCase().includes('90b') || m.id.toLowerCase().includes('405b')));
    if (largeLlama) return largeLlama.id;

    const fastLlama = validChatModels.find(m => m.id.toLowerCase().includes('llama') && (m.id.toLowerCase().includes('8b') || m.id.toLowerCase().includes('instant')));
    if (fastLlama) return fastLlama.id;

    const genericMatch = validChatModels.find(m => {
      const id = m.id.toLowerCase();
      return id.includes('llama') || id.includes('mixtral') || id.includes('gemma') || id.includes('deepseek') || id.includes('qwen') || id.includes('70b') || id.includes('8b');
    });
    if (genericMatch) return genericMatch.id;
  } else if (provider === 'deepseek') {
    const deepseekPriority = ['deepseek-chat', 'deepseek-coder', 'deepseek-reasoner'];
    for (const pref of deepseekPriority) {
      const match = validChatModels.find(m => m.id === pref || m.id.toLowerCase().includes(pref));
      if (match) return match.id;
    }
  } else if (provider === 'openrouter') {
    const openrouterPriority = [
      'meta-llama/llama-3.3-70b-instruct:free',
      'meta-llama/llama-3.1-8b-instruct:free',
      'meta-llama/llama-3-8b-instruct:free',
      'google/gemini-2.0-flash-exp:free',
      'deepseek/deepseek-chat:free',
      'mistralai/mistral-7b-instruct:free',
      'qwen/qwen-2.5-coder-32b-instruct:free'
    ];
    for (const pref of openrouterPriority) {
      const match = validChatModels.find(m => m.id === pref || m.id.toLowerCase().includes(pref));
      if (match) return match.id;
    }
    const freeMatch = validChatModels.find(m => m.id.toLowerCase().includes(':free'));
    if (freeMatch) return freeMatch.id;
  }

  return validChatModels[0].id || fallback;
};

const renderMessageContent = (content) => {
  if (!content) return null;

  let processed = content;
  if (processed.includes('<think>') && !processed.includes('</think>')) {
    processed += '</think>';
  }

  const thinkMatch = processed.match(/<think>([\s\S]*?)<\/think>/);

  const markdownComponents = {
    pre: ({ children }) => <div className="markdown-pre-wrapper" style={{ margin: '1rem 0' }}>{children}</div>,
    code({ node, inline, className, children, ...props }) {
      const match = /language-(\w+)/.exec(className || '');
      return !inline && match ? (
        <div style={{ position: 'relative', overflow: 'hidden', borderRadius: '8px', border: '1px solid var(--border-light)', margin: '1rem 0' }}>
          <div style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)', fontSize: '0.75rem', padding: '0.4rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-light)' }}>
            <span style={{ fontFamily: 'monospace', textTransform: 'uppercase', fontWeight: 600 }}>{match[1]}</span>
            <button 
              onClick={(e) => {
                navigator.clipboard.writeText(String(children).replace(/\n$/, ''));
                const btn = e.currentTarget;
                const originalText = btn.innerHTML;
                btn.innerHTML = '<span style="display:flex;align-items:center;gap:4px">Copied!</span>';
                setTimeout(() => { btn.innerHTML = originalText; }, 2000);
              }}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px', padding: 0 }}
              title="Copy code"
            >
              <Copy size={14} /> Copy
            </button>
          </div>
          <div style={{ margin: 0, padding: '1rem', background: '#1e1e1e', overflowX: 'auto' }}>
            <code className={className} style={{ color: '#d4d4d4', fontFamily: 'monospace', fontSize: '0.85rem', whiteSpace: 'pre', display: 'block', background: 'transparent', border: 'none', padding: 0 }} {...props}>
              {String(children).replace(/\n$/, '')}
            </code>
          </div>
        </div>
      ) : (
        <code style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-light)', padding: '0.2rem 0.4rem', borderRadius: '4px', fontSize: '0.85em', color: 'var(--accent-primary)', fontFamily: 'monospace' }} className={className} {...props}>
          {children}
        </code>
      );
    }
  };

  if (thinkMatch) {
    const thinkContent = thinkMatch[1].trim();
    const restContent = processed.replace(/<think>([\s\S]*?)<\/think>/, '').trim();

    return (
      <>
        {thinkContent && (
          <details style={{ marginBottom: restContent ? '1rem' : '0', background: 'var(--bg-dark)', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
            <summary style={{ cursor: 'pointer', fontWeight: '600', color: 'var(--text-muted)', userSelect: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.1em' }}>🧠</span> Reasoning Process
            </summary>
            <div className="markdown-body" style={{ marginTop: '1rem', color: 'var(--text-muted)', fontSize: '0.95em' }}>
              <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]} components={markdownComponents}>{thinkContent}</ReactMarkdown>
            </div>
          </details>
        )}
        {restContent && (
          <div className="markdown-body" style={{ maxWidth: 'none', color: 'inherit' }}>
            <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]} components={markdownComponents}>{restContent}</ReactMarkdown>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="markdown-body" style={{ maxWidth: 'none', color: 'inherit' }}>
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]} components={markdownComponents}>{processed}</ReactMarkdown>
    </div>
  );
};

export default function AiHelper() {
  const { problems, settings, setSettings, activeCurriculum, getHeaders } = useTracker();

  const aiSettings = settings.aiSettings || { provider: 'gemini', keys: {}, models: {} };

  const [aiContextTab, setAiContextTab] = useState(activeCurriculum || 'dsa');
  const [contextProblems, setContextProblems] = useState([]);

  // Fetch problems for the active AI Context Tab
  useEffect(() => {
    if (aiContextTab === activeCurriculum) {
      setContextProblems(problems);
      return;
    }
    fetch(`/api/data/${aiContextTab}`, { headers: getHeaders() })
      .then(res => res.json())
      .then(data => setContextProblems(data.problems || []))
      .catch(err => setContextProblems([]));
  }, [aiContextTab, activeCurriculum, problems]);

  const [provider, setProvider] = useState(aiSettings.provider);
  const [customModel, setCustomModel] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [isConfigured, setIsConfigured] = useState(false);
  const [dynamicModels, setDynamicModels] = useState([]);
  const [isFetchingModels, setIsFetchingModels] = useState(false);
  const [fetchError, setFetchError] = useState('');

  // Multi-session State
  const [sessions, setSessions] = useState(settings.aiChatSessions || []);
  const [activeSessionId, setActiveSessionId] = useState(settings.activeSessionId || null);

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const messagesEndRef = useRef(null);

  // Sync config
  useEffect(() => {
    if (settings.aiSettings) {
      const savedProvider = settings.aiSettings.provider || 'gemini';
      const savedKey = settings.aiSettings.keys?.[savedProvider];
      const savedModel = settings.aiSettings.models?.[savedProvider] || '';

      setProvider(savedProvider);
      if (savedKey) {
        setApiKey(savedKey);
        setCustomModel(savedModel);
        setIsConfigured(true);
      }
    }
  }, [settings.aiSettings]);

  // Migration and Session Init
  useEffect(() => {
    let currentSessions = settings.aiChatSessions || [];
    let currentActiveId = settings.activeSessionId || null;
    let needsUpdate = false;

    if (settings.aiChatHistory && settings.aiChatHistory.length > 0) {
      const migratedSession = {
        id: Date.now().toString(),
        title: 'Legacy Chat',
        messages: settings.aiChatHistory,
        updatedAt: new Date().toISOString()
      };
      currentSessions = [migratedSession, ...currentSessions];
      if (!currentActiveId) currentActiveId = migratedSession.id;
      needsUpdate = true;
    } else if (currentSessions.length === 0) {
      const localHistory = localStorage.getItem('ai_chat_history');
      if (localHistory) {
        try {
          const parsed = JSON.parse(localHistory);
          if (parsed && parsed.length > 0) {
            const migratedSession = {
              id: Date.now().toString(),
              title: 'Legacy Chat',
              messages: parsed,
              updatedAt: new Date().toISOString()
            };
            currentSessions = [migratedSession];
            currentActiveId = migratedSession.id;
            needsUpdate = true;
            localStorage.removeItem('ai_chat_history');
          }
        } catch (e) { }
      }
    }

    if (currentSessions.length === 0) {
      const newSession = {
        id: Date.now().toString(),
        title: 'New Chat',
        messages: [],
        updatedAt: new Date().toISOString()
      };
      currentSessions = [newSession];
      currentActiveId = newSession.id;
      needsUpdate = true;
    } else if (!currentActiveId) {
      currentActiveId = currentSessions[0].id;
      needsUpdate = true;
    }

    if (currentSessions !== sessions || currentActiveId !== activeSessionId) {
      setSessions(currentSessions);
      setActiveSessionId(currentActiveId);
    }

    if (needsUpdate || !settings.aiChatSessions) {
      setSettings(prev => ({
        ...prev,
        aiChatSessions: currentSessions,
        activeSessionId: currentActiveId,
        aiChatHistory: null
      }));
    }
  }, [settings.aiChatSessions, settings.activeSessionId, settings.aiChatHistory, setSettings]);

  const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0];
  const messages = activeSession ? activeSession.messages : [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleProviderChange = (e) => {
    const newProv = e.target.value;
    setProvider(newProv);
    setApiKey(aiSettings.keys?.[newProv] || '');
    setCustomModel(aiSettings.models?.[newProv] || '');
  };

  const handleSaveKey = (e) => {
    e.preventDefault();
    if (apiKey.trim()) {
      setSettings(prev => {
        const prevAi = prev.aiSettings || { keys: {}, models: {} };
        return {
          ...prev,
          aiSettings: {
            ...prevAi,
            provider: provider,
            keys: { ...prevAi.keys, [provider]: apiKey.trim() },
            models: { ...prevAi.models, [provider]: customModel.trim() }
          }
        };
      });
      setIsConfigured(true);
    }
  };

  const clearKey = () => {
    setSettings(prev => {
      const prevAi = prev.aiSettings || { keys: {}, models: {} };
      const newKeys = { ...prevAi.keys };
      delete newKeys[provider];
      return {
        ...prev,
        aiSettings: {
          ...prevAi,
          keys: newKeys
        }
      };
    });
    setApiKey('');
    setIsConfigured(false);
  };

  const startNewChat = (context = aiContextTab) => {
    const newSession = {
      id: Date.now().toString(),
      title: 'New Chat',
      messages: [],
      updatedAt: new Date().toISOString(),
      context: context
    };
    const newSessions = [newSession, ...sessions];
    setSessions(newSessions);
    setActiveSessionId(newSession.id);
    setSettings(prev => ({
      ...prev,
      aiChatSessions: newSessions,
      activeSessionId: newSession.id
    }));
  };

  const handleContextTabChange = (tab) => {
    setAiContextTab(tab);
    
    // Check if there is an existing session for this context
    const existingSession = sessions.find(s => (s.context || 'dsa') === tab);
    if (existingSession) {
      setActiveSessionId(existingSession.id);
      setSettings(prev => ({ ...prev, activeSessionId: existingSession.id }));
    } else {
      startNewChat(tab);
    }
  };

  const switchSession = (id) => {
    setActiveSessionId(id);
    setSettings(prev => ({ ...prev, activeSessionId: id }));
  };

  const deleteSession = (e, id) => {
    e.stopPropagation();
    if (!window.confirm('Delete this chat?')) return;

    let newSessions = sessions.filter(s => s.id !== id);
    let newActiveId = activeSessionId;

    if (newSessions.length === 0) {
      const newSession = { id: Date.now().toString(), title: 'New Chat', messages: [], updatedAt: new Date().toISOString() };
      newSessions = [newSession];
      newActiveId = newSession.id;
    } else if (activeSessionId === id) {
      newActiveId = newSessions[0].id;
    }

    setSessions(newSessions);
    setActiveSessionId(newActiveId);
    setSettings(prev => ({
      ...prev,
      aiChatSessions: newSessions,
      activeSessionId: newActiveId
    }));
  };

  const renameSession = (e, id, currentTitle) => {
    e.stopPropagation();
    const newTitle = window.prompt('Enter a new name for this conversation:', currentTitle);
    if (newTitle && newTitle.trim()) {
      const newSessions = sessions.map(s => {
        if (s.id === id) return { ...s, title: newTitle.trim(), updatedAt: new Date().toISOString() };
        return s;
      });
      setSessions(newSessions);
      setSettings(prev => ({ ...prev, aiChatSessions: newSessions }));
    }
  };

  const handleFetchModels = async () => {
    if (!apiKey) {
      setFetchError('Please enter an API key first');
      return;
    }
    setIsFetchingModels(true);
    setFetchError('');
    setDynamicModels([]);

    try {
      if (provider === 'gemini') {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        if (!res.ok) throw new Error('Failed to fetch Gemini models');
        const data = await res.json();
        const valid = data.models.filter(m => m.supportedGenerationMethods?.includes('generateContent')).map(m => m.name.replace('models/', ''));
        setDynamicModels(valid);
      } else {
        const provData = PROVIDERS[provider];
        const res = await fetch(`${provData.url}/models`, {
          headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        if (!res.ok) throw new Error('Failed to fetch models');
        const data = await res.json();
        const valid = data.data.map(m => m.id);
        setDynamicModels(valid);
      }
    } catch (err) {
      setFetchError(err.message);
    } finally {
      setIsFetchingModels(false);
    }
  };

  const updateActiveSession = (newMessages, autoTitle = false, userFirstContent = '') => {
    const newSessions = sessions.map(s => {
      if (s.id === activeSessionId) {
        let newTitle = s.title;
        if (autoTitle && s.messages.length === 0 && userFirstContent) {
          newTitle = userFirstContent.slice(0, 30) + (userFirstContent.length > 30 ? '...' : '');
        }
        return { ...s, messages: newMessages, title: newTitle, updatedAt: new Date().toISOString() };
      }
      return s;
    });
    setSessions(newSessions);
    setSettings(prev => ({ ...prev, aiChatSessions: newSessions }));
  };

  const solvedCount = contextProblems.filter(p => p.status === 'Solved' || p.status === 'Re-solved').length;
  
  const topicsList = [...new Set(contextProblems.map(p => p.topic))].filter(Boolean).join(', ');
  
  let guideContext = '';
  if (studyGuides[aiContextTab]) {
     const guides = studyGuides[aiContextTab];
     guideContext = '\\nReference Study Guide:\\n';
     if (guides.patternBible) {
       guideContext += guides.patternBible.map(g => `- Pattern: ${g.pattern}. Cue: ${g.cue}. Mistake: ${g.mistake}`).join('\\n') + '\\n';
     }
  }

  const systemInstruction = `You are an expert Computer Science tutor specialized in ${aiContextTab.toUpperCase()}. 
Your ONLY purpose is to help the user master these topics. If the user asks about anything unrelated to computer science, coding, or system design, you must politely decline and steer them back to CS topics.

Current user context (${aiContextTab.toUpperCase()}):
- Total topics available: ${contextProblems.length}
- User has mastered: ${solvedCount}
- Key Topics in Curriculum: ${topicsList}
${guideContext}
User rating is ${settings.currentRating} and goal rating is ${settings.goalRating}.

Tone: Encouraging, analytical, and highly technical. Never write full code solutions immediately; instead, guide the user to the answer using hints, pseudo-code, and pattern recognition unless they explicitly ask for the full code.`;

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || !isConfigured || isLoading || !activeSession) return;

    const userMsg = { role: 'user', content: input };
    const initialMessages = [...messages, userMsg];

    updateActiveSession(initialMessages, true, input);
    setInput('');
    setIsLoading(true);

    try {
      if (provider === 'gemini') {
        const genAI = new GoogleGenerativeAI(apiKey);
        const modelsRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const modelsData = await modelsRes.json();

        if (!modelsData.models) throw new Error("Invalid API key or unable to access Gemini models.");

        const validModels = modelsData.models.filter(m => m.supportedGenerationMethods?.includes('generateContent'));
        let selectedModelName = 'gemini-1.5-flash';

        if (customModel && customModel.trim()) {
          selectedModelName = customModel.trim();
          const modelExists = validModels.some(m => m.name === `models/${selectedModelName}` || m.name === selectedModelName);
          if (!modelExists) {
            const available = validModels.map(m => m.name.replace('models/', '')).join(', ');
            throw new Error(`Model '${selectedModelName}' is not available for your API key/region. Available models: ${available}`);
          }
        } else {
          // Find the best available flash model, preferring stable over preview/lite and highest version first
          const flashModels = validModels.filter(m => m.name.includes('flash') && !m.name.includes('pro'));
          const stableFlashes = flashModels.filter(m => !m.name.includes('preview') && !m.name.includes('lite') && !m.name.includes('exp'));

          stableFlashes.sort((a, b) => {
            const vA = parseFloat(a.name.match(/(\d+\.\d+)/)?.[1] || "0");
            const vB = parseFloat(b.name.match(/(\d+\.\d+)/)?.[1] || "0");
            return vB - vA;
          });

          const stableFlash = stableFlashes[0];

          if (stableFlash) selectedModelName = stableFlash.name.replace('models/', '');
          else if (flashModels.length > 0) selectedModelName = flashModels[0].name.replace('models/', '');
          else if (validModels.length > 0) selectedModelName = validModels[0].name.replace('models/', '');
        }

        const isOldModel = !selectedModelName.includes('1.5') && !selectedModelName.includes('2.0') && !selectedModelName.includes('2.5') && !selectedModelName.includes('3.');
        const modelParams = { model: selectedModelName };
        if (!isOldModel) modelParams.systemInstruction = systemInstruction;

        const model = genAI.getGenerativeModel(modelParams);

        const history = messages.map(msg => ({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }]
        }));

        const chat = model.startChat({ history });

        let finalPrompt = userMsg.content;
        if (isOldModel) finalPrompt = `[SYSTEM INSTRUCTIONS: ${systemInstruction}]\n\nUser Question: ${userMsg.content}`;

        const result = await chat.sendMessage(finalPrompt);
        const responseText = result.response.text();
        const finishReason = result.response.candidates?.[0]?.finishReason;
        const isTruncated = finishReason === 'MAX_TOKENS';

        let tokenUsage = null;
        if (result.response.usageMetadata) {
          tokenUsage = {
            total: result.response.usageMetadata.totalTokenCount,
            prompt: result.response.usageMetadata.promptTokenCount,
            completion: result.response.usageMetadata.candidatesTokenCount
          };
        }

        updateActiveSession([...initialMessages, { role: 'model', content: responseText, isTruncated, tokenUsage }]);
      } else {
        const provData = PROVIDERS[provider] || PROVIDERS.groq;
        const openai = new OpenAI({
          apiKey: apiKey,
          baseURL: provData.url,
          dangerouslyAllowBrowser: true
        });

        let targetModel = customModel.trim();
        // Ignore invalid models (whisper, guard, etc.)
        if (targetModel && (targetModel.toLowerCase().includes('whisper') || targetModel.toLowerCase().includes('guard') || targetModel.toLowerCase().includes('embed'))) {
          targetModel = '';
        }

        if (!targetModel) {
          try {
            const modelsPage = await openai.models.list();
            targetModel = selectBestChatModel(modelsPage?.data, provider, provData.defaultModel);
          } catch (err) {
            targetModel = provData.defaultModel;
          }
        }

        const history = messages.map(msg => ({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content
        }));

        const reqPayload = {
          model: targetModel,
          messages: [
            { role: 'system', content: systemInstruction },
            ...history,
            { role: 'user', content: userMsg.content }
          ]
        };

        if (provider === 'groq') {
          if (targetModel.toLowerCase().includes('qwen')) {
            reqPayload.max_tokens = 800;
          } else {
            reqPayload.max_tokens = 8192;
          }
        } else if (provider === 'openrouter') {
          reqPayload.max_tokens = 8192;
        }

        const response = await openai.chat.completions.create(reqPayload);

        let responseText = response.choices[0].message.content;
        const finishReason = response.choices[0].finish_reason;
        const isTruncated = finishReason === 'length';

        let tokenUsage = null;
        if (response.usage) {
          tokenUsage = {
            total: response.usage.total_tokens,
            prompt: response.usage.prompt_tokens,
            completion: response.usage.completion_tokens
          };
        }

        updateActiveSession([...initialMessages, { role: 'model', content: responseText, isTruncated, tokenUsage }]);
      }
    } catch (error) {
      updateActiveSession([...initialMessages, {
        role: 'model',
        content: `**Error:** ${error.message || 'Failed to get response.'}`
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinue = async (msgIndex) => {
    if (!isConfigured || isLoading || !activeSession) return;

    setIsLoading(true);
    const updatedMessages = [...messages];
    const targetMsg = updatedMessages[msgIndex];
    targetMsg.isTruncated = false; // hide button while loading
    updateActiveSession(updatedMessages);

    try {
      if (provider === 'gemini') {
        const genAI = new GoogleGenerativeAI(apiKey);
        const modelsRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const modelsData = await modelsRes.json();
        const validModels = modelsData.models.filter(m => m.supportedGenerationMethods?.includes('generateContent'));
        let selectedModelName = 'gemini-1.5-flash';

        if (customModel && customModel.trim()) {
          selectedModelName = customModel.trim();
        } else {
          const prefFlash = validModels.find(m => m.name.includes('gemini-1.5-flash'));
          if (prefFlash) selectedModelName = prefFlash.name.replace('models/', '');
          else if (validModels.length > 0) selectedModelName = validModels[0].name.replace('models/', '');
        }

        const modelParams = { model: selectedModelName, systemInstruction };
        const model = genAI.getGenerativeModel(modelParams);

        const history = messages.slice(0, msgIndex).map(msg => ({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }]
        }));

        const chat = model.startChat({ history });
        await chat.sendMessage(targetMsg.content); // Send what was generated so far
        const result = await chat.sendMessage("Continue exactly from where you left off. Do not repeat anything. Just continue the sentence.");

        const finishReason = result.response.candidates?.[0]?.finishReason;
        targetMsg.isTruncated = finishReason === 'MAX_TOKENS';

        if (result.response.usageMetadata) {
          if (!targetMsg.tokenUsage) targetMsg.tokenUsage = { total: 0, prompt: 0, completion: 0 };
          targetMsg.tokenUsage.total += result.response.usageMetadata.totalTokenCount;
          targetMsg.tokenUsage.completion += result.response.usageMetadata.candidatesTokenCount;
          targetMsg.tokenUsage.prompt = result.response.usageMetadata.promptTokenCount;
        }

        targetMsg.content += result.response.text();
        updateActiveSession(updatedMessages);
      } else {
        const provData = PROVIDERS[provider] || PROVIDERS.groq;
        const openai = new OpenAI({
          apiKey: apiKey,
          baseURL: provData.url,
          dangerouslyAllowBrowser: true
        });

        let targetModel = customModel.trim();
        if (targetModel && (targetModel.toLowerCase().includes('whisper') || targetModel.toLowerCase().includes('guard') || targetModel.toLowerCase().includes('embed'))) {
          targetModel = '';
        }
        if (!targetModel) {
          try {
            const modelsPage = await openai.models.list();
            targetModel = selectBestChatModel(modelsPage?.data, provider, provData.defaultModel);
          } catch (err) {
            targetModel = provData.defaultModel;
          }
        }

        const history = messages.slice(0, msgIndex).map(msg => ({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content
        }));

        const reqPayload = {
          model: targetModel,
          messages: [
            { role: 'system', content: systemInstruction },
            ...history,
            { role: 'assistant', content: targetMsg.content },
            { role: 'user', content: "Continue exactly from where you left off. Do not repeat anything. Just continue the sentence." }
          ]
        };

        if (provider === 'groq') {
          if (targetModel.toLowerCase().includes('qwen')) {
            reqPayload.max_tokens = 800;
          } else {
            reqPayload.max_tokens = 8192;
          }
        } else if (provider === 'openrouter') {
          reqPayload.max_tokens = 8192;
        }

        const response = await openai.chat.completions.create(reqPayload);
        const chunkText = response.choices[0].message.content;
        const finishReason = response.choices[0].finish_reason;

        targetMsg.content += chunkText;
        if (finishReason === 'length') {
          targetMsg.isTruncated = true;
        }

        if (response.usage) {
          if (!targetMsg.tokenUsage) targetMsg.tokenUsage = { total: 0, prompt: 0, completion: 0 };
          targetMsg.tokenUsage.total += response.usage.total_tokens;
          targetMsg.tokenUsage.completion += response.usage.completion_tokens;
          targetMsg.tokenUsage.prompt = response.usage.prompt_tokens;
        }

        updateActiveSession(updatedMessages);
      }
    } catch (error) {
      targetMsg.content += `\n\n**Error continuing:** ${error.message}`;
      updateActiveSession(updatedMessages);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isConfigured) {
    return (
      <div className="animate-fade-in" style={{ height: 'calc(100vh - 4rem)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="card glass-panel" style={{ maxWidth: '500px', width: '100%', padding: '2rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <Bot size={48} style={{ color: 'var(--text-main)', margin: '0 auto', marginBottom: '1rem' }} />
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Setup AI Tutor</h2>
            <p className="text-muted">Connect a provider to activate your personal CS tutor.</p>
          </div>

          <form onSubmit={handleSaveKey}>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ fontSize: '0.9rem', fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>AI Provider</label>
              <select
                value={provider}
                onChange={handleProviderChange}
                className="form-input"
                style={{ marginBottom: '1rem', width: '100%' }}
              >
                {Object.entries(PROVIDERS).map(([key, data]) => (
                  <option key={key} value={key}>{data.name}</option>
                ))}
              </select>

              <div className="flex-between mb-2">
                <label style={{ fontSize: '0.9rem', fontWeight: 600 }}>API Key</label>
                <div className="custom-tooltip-container" style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)', fontSize: '0.8rem', cursor: 'help' }}>
                  <HelpCircle size={14} /> How to get it?
                  <div className="custom-tooltip-text" style={{ width: '250px', whiteSpace: 'normal', textAlign: 'center' }}>
                    {PROVIDERS[provider].helpText}
                  </div>
                </div>
              </div>
              <div style={{ position: 'relative', marginBottom: '1rem' }}>
                <Key size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="form-input"
                  style={{ paddingLeft: '2.5rem', width: '100%', boxSizing: 'border-box' }}
                  placeholder="sk-..."
                  required
                />
              </div>

              <div className="flex-between mb-2 mt-4">
                <label style={{ fontSize: '0.9rem', fontWeight: 600 }}>Select Model (Optional)</label>
                <button
                  type="button"
                  onClick={handleFetchModels}
                  className="btn btn-outline"
                  style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem', background: 'var(--bg-elevated)', borderColor: 'var(--border-light)' }}
                  disabled={isFetchingModels || !apiKey}
                >
                  {isFetchingModels ? 'Loading...' : 'Fetch List'}
                </button>
              </div>

              {fetchError && <div style={{ color: 'var(--status-editorial)', fontSize: '0.75rem', marginBottom: '0.75rem' }}>{fetchError}</div>}

              <div style={{ marginBottom: '1.5rem' }}>
                <select
                  value={dynamicModels.includes(customModel) || PROVIDERS[provider].suggestedModels?.includes(customModel) ? customModel : (customModel ? 'other' : '')}
                  onChange={(e) => {
                    if (e.target.value === 'other') {
                      setCustomModel(' '); // Trigger custom input
                    } else {
                      setCustomModel(e.target.value);
                    }
                  }}
                  className="form-input"
                  style={{ width: '100%', marginBottom: (customModel && !dynamicModels.includes(customModel) && !PROVIDERS[provider].suggestedModels?.includes(customModel)) ? '0.5rem' : '0' }}
                >
                  <option value="">Auto-select Best Model</option>

                  {dynamicModels.length > 0 ? (
                    <optgroup label="Fetched Models (Available for your key)">
                      {dynamicModels.map((modelName) => (
                        <option key={modelName} value={modelName}>{modelName}</option>
                      ))}
                    </optgroup>
                  ) : (
                    <optgroup label="Suggested Models (Click 'Fetch List' above)">
                      {PROVIDERS[provider].suggestedModels?.map((modelName) => (
                        <option key={modelName} value={modelName}>{modelName}</option>
                      ))}
                    </optgroup>
                  )}
                  <option value="other">Other (Custom ID)</option>
                </select>

                {(customModel && !dynamicModels.includes(customModel) && !PROVIDERS[provider].suggestedModels?.includes(customModel)) && (
                  <div style={{ position: 'relative' }}>
                    <Cpu size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                      type="text"
                      value={customModel.trim()}
                      onChange={(e) => setCustomModel(e.target.value)}
                      className="form-input"
                      style={{ paddingLeft: '2.5rem', width: '100%', boxSizing: 'border-box' }}
                      placeholder="Enter custom model ID..."
                      autoFocus
                    />
                  </div>
                )}
              </div>

              {provider !== 'gemini' && (
                <>
                  <label style={{ fontSize: '0.9rem', fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>Model (Optional)</label>
                  <div style={{ position: 'relative' }}>
                    <Cpu size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                      type="text"
                      value={customModel}
                      onChange={(e) => setCustomModel(e.target.value)}
                      className="form-input"
                      style={{ paddingLeft: '2.5rem', width: '100%', boxSizing: 'border-box' }}
                      placeholder={`Default: ${PROVIDERS[provider].defaultModel}`}
                    />
                  </div>
                </>
              )}
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.75rem' }}>
              Connect AI
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ height: 'calc(100vh - 4rem)', display: 'flex', flexDirection: 'column' }}>
      <div className="flex-between mb-4">
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Bot size={32} style={{ color: 'var(--text-main)' }} />
            AI Tutor <span style={{ fontSize: '0.9rem', padding: '2px 8px', background: 'var(--accent-bg)', color: 'var(--accent)', borderRadius: '12px', marginLeft: '8px' }}>{PROVIDERS[provider].name}</span>
          </h1>
          <p className="text-muted">Ask anything about DSA or System Design.</p>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
             {['dsa', 'hld', 'lld'].map(tab => (
                 <button 
                    key={tab}
                    onClick={() => handleContextTabChange(tab)}
                    className={`btn ${aiContextTab === tab ? 'btn-primary' : 'btn-outline'}`}
                    style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem' }}
                 >
                    {tab.toUpperCase()} Context
                 </button>
             ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={clearKey} className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--status-editorial)' }}>
            <Key size={16} /> Disconnect
          </button>
        </div>
      </div>

      <div className="card glass-panel ai-chat-layout" style={{ padding: 0 }}>

        {/* Sidebar History */}
        <div className="ai-chat-sidebar">
          <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-light)' }}>
            <button onClick={() => startNewChat()} className="btn btn-primary" style={{ width: '100%', padding: '0.75rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}>
              <Plus size={18} /> New Chat
            </button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {sessions.filter(s => (s.context || 'dsa') === aiContextTab).map(s => (
              <div
                key={s.id}
                onClick={() => switchSession(s.id)}
                style={{
                  padding: '1rem',
                  borderBottom: '1px solid var(--border-light)',
                  cursor: 'pointer',
                  background: s.id === activeSessionId ? 'var(--bg)' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.5rem'
                }}
                className="hover-bg-subtle"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden' }}>
                  <MessageSquare size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                  <span style={{ fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {s.title}
                  </span>
                </div>
                {s.id === activeSessionId && (
                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                    <button onClick={(e) => renameSession(e, s.id, s.title)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }} title="Rename Chat">
                      <Edit2 size={14} />
                    </button>
                    <button onClick={(e) => deleteSession(e, s.id)} style={{ background: 'none', border: 'none', color: 'var(--status-editorial)', cursor: 'pointer', padding: '4px' }} title="Delete Chat">
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Main Chat Area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {messages.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
                <Bot size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                <p>I'm ready to help you crack your next interview!</p>
                <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>Try asking me to explain a concept or solve a problem.</p>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div key={idx} style={{
                  display: 'flex',
                  gap: '1rem',
                  alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '85%'
                }}>
                  {msg.role === 'model' && (
                    <div style={{ background: 'var(--text-main)', color: 'var(--bg)', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Bot size={18} />
                    </div>
                  )}

                  <div style={{
                    maxWidth: '85%',
                    padding: '1rem',
                    borderRadius: '12px',
                    background: msg.role === 'user' ? 'var(--text-main)' : 'var(--bg-card-hover)',
                    color: msg.role === 'user' ? 'var(--bg-dark)' : 'var(--text-main)',
                    border: msg.role === 'model' ? '1px solid var(--border-light)' : 'none',
                  }}>
                    {msg.role === 'user' ? (
                      <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
                    ) : renderMessageContent(msg.content)}

                    {msg.tokenUsage && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border-light)', display: 'flex', justifyContent: 'flex-end', opacity: 0.7 }}>
                        Tokens: {msg.tokenUsage.total?.toLocaleString() || 0} ({msg.tokenUsage.completion?.toLocaleString() || 0} generated)
                      </div>
                    )}

                    {msg.isTruncated && (
                      <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-light)', display: 'flex', justifyContent: 'center' }}>
                        <button
                          onClick={() => handleContinue(idx)}
                          className="btn btn-outline"
                          style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem', color: 'var(--accent-primary)', borderColor: 'var(--accent-primary)' }}
                        >
                          Continue Generating
                        </button>
                      </div>
                    )}
                  </div>

                  {msg.role === 'user' && (
                    <div style={{ background: 'var(--text-main)', color: 'var(--bg-dark)', border: '1px solid var(--border-light)', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <User size={18} />
                    </div>
                  )}
                </div>
              ))
            )}
            {isLoading && (
              <div style={{ display: 'flex', gap: '1rem', alignSelf: 'flex-start' }}>
                <div style={{ background: 'var(--text-main)', color: 'var(--bg-dark)', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Bot size={18} />
                </div>
                <div style={{ padding: '1rem', background: 'var(--bg-card-hover)', border: '1px solid var(--border-light)', borderRadius: '12px', borderTopLeftRadius: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div className="typing-dot" style={{ width: '6px', height: '6px', background: 'var(--text-muted)', borderRadius: '50%', animation: 'pulse 1.5s infinite' }}></div>
                  <div className="typing-dot" style={{ width: '6px', height: '6px', background: 'var(--text-muted)', borderRadius: '50%', animation: 'pulse 1.5s infinite 0.2s' }}></div>
                  <div className="typing-dot" style={{ width: '6px', height: '6px', background: 'var(--text-muted)', borderRadius: '50%', animation: 'pulse 1.5s infinite 0.4s' }}></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSend} style={{ padding: '1.5rem', borderTop: '1px solid var(--border-light)', display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(e);
                }
              }}
              placeholder="Ask about data structures, algorithms, or system design... (Shift+Enter for new line)"
              className="form-input"
              style={{ flex: 1, padding: '1rem', borderRadius: '12px', resize: 'none', minHeight: '60px', maxHeight: '200px', fontFamily: 'inherit', background: 'var(--bg-dark)', color: 'var(--text-main)', border: '1px solid var(--border-light)' }}
              rows={1}
            />
            <button
              type="submit"
              className="btn-primary"
              style={{ padding: '1rem', borderRadius: '12px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              disabled={isLoading || !input.trim()}
            >
              <Send size={20} style={{ marginLeft: '2px' }} />
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
