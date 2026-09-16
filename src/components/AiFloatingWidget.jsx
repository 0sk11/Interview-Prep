import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useTracker } from '../context/TrackerContext';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { Bot, User, Send, Key, HelpCircle, Trash2, X, MessageSquare, Cpu, Plus, Copy } from 'lucide-react';

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
    pre: ({ children }) => <div className="markdown-pre-wrapper" style={{ margin: '0.75rem 0' }}>{children}</div>,
    code({ node, inline, className, children, ...props }) {
      const match = /language-(\w+)/.exec(className || '');
      return !inline && match ? (
        <div style={{ position: 'relative', overflow: 'hidden', borderRadius: '6px', border: '1px solid var(--border-light)', margin: '0.75rem 0' }}>
          <div style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)', fontSize: '0.7rem', padding: '0.3rem 0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-light)' }}>
            <span style={{ fontFamily: 'monospace', textTransform: 'uppercase', fontWeight: 600 }}>{match[1]}</span>
            <button 
              onClick={(e) => {
                navigator.clipboard.writeText(String(children).replace(/\n$/, ''));
                const btn = e.currentTarget;
                const originalText = btn.innerHTML;
                btn.innerHTML = '<span style="display:flex;align-items:center;gap:4px">Copied!</span>';
                setTimeout(() => { btn.innerHTML = originalText; }, 2000);
              }}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '4px', padding: 0 }}
              title="Copy code"
            >
              <Copy size={12} /> Copy
            </button>
          </div>
          <div style={{ margin: 0, padding: '0.75rem', background: '#1e1e1e', overflowX: 'auto' }}>
            <code className={className} style={{ color: '#d4d4d4', fontFamily: 'monospace', fontSize: '0.8rem', whiteSpace: 'pre', display: 'block', background: 'transparent', border: 'none', padding: 0 }} {...props}>
              {String(children).replace(/\n$/, '')}
            </code>
          </div>
        </div>
      ) : (
        <code style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-light)', padding: '0.1rem 0.3rem', borderRadius: '3px', fontSize: '0.85em', color: 'var(--accent-primary)', fontFamily: 'monospace' }} className={className} {...props}>
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
          <details style={{ marginBottom: restContent ? '0.75rem' : '0', background: 'var(--bg-dark)', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid var(--border-light)' }}>
            <summary style={{ cursor: 'pointer', fontWeight: '600', color: 'var(--text-muted)', userSelect: 'none', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9em' }}>
              <span style={{ fontSize: '1.1em' }}>🧠</span> Reasoning Process
            </summary>
            <div className="markdown-body" style={{ marginTop: '0.75rem', color: 'var(--text-muted)', fontSize: '0.9em' }}>
              <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]} components={markdownComponents}>{thinkContent}</ReactMarkdown>
            </div>
          </details>
        )}
        {restContent && (
          <div className="markdown-body" style={{ maxWidth: 'none', color: 'inherit', fontSize: '0.9rem' }}>
            <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]} components={markdownComponents}>{restContent}</ReactMarkdown>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="markdown-body" style={{ maxWidth: 'none', color: 'inherit', fontSize: '0.9rem' }}>
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]} components={markdownComponents}>{processed}</ReactMarkdown>
    </div>
  );
};

export default function AiFloatingWidget() {
  const location = useLocation();
  const { problems, settings, setSettings } = useTracker();

  const [isOpen, setIsOpen] = useState(false);

  const aiSettings = settings.aiSettings || { provider: 'gemini', keys: {}, models: {} };

  const [provider, setProvider] = useState(aiSettings.provider);
  const [customModel, setCustomModel] = useState('');
  const [dynamicModels, setDynamicModels] = useState([]);
  const [isFetchingModels, setIsFetchingModels] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [isConfigured, setIsConfigured] = useState(false);

  // Multi-session State
  const [sessions, setSessions] = useState(settings.aiChatSessions || []);
  const [activeSessionId, setActiveSessionId] = useState(settings.activeSessionId || null);

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (isOpen && settings.aiSettings) {
      const savedProvider = settings.aiSettings.provider || 'gemini';
      const savedKey = settings.aiSettings.keys?.[savedProvider];
      const savedModel = settings.aiSettings.models?.[savedProvider] || '';

      setProvider(savedProvider);
      if (savedKey) {
        setApiKey(savedKey);
        setCustomModel(savedModel);
        setIsConfigured(true);
      } else {
        setIsConfigured(false);
      }
    }
  }, [isOpen, settings.aiSettings]);

  useEffect(() => {
    if (!isOpen) return;

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
  }, [isOpen, settings.aiChatSessions, settings.activeSessionId, settings.aiChatHistory, setSettings]);

  const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0];
  const messages = activeSession ? activeSession.messages : [];

  useEffect(() => {
    if (isOpen) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  if (location.pathname === '/ai-helper') {
    return null;
  }

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

  const startNewChat = () => {
    const newSession = {
      id: Date.now().toString(),
      title: 'New Chat',
      messages: [],
      updatedAt: new Date().toISOString()
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

  const updateActiveSession = (newMessages) => {
    if (!activeSessionId) return;
    setSessions(prev => prev.map(s => {
      if (s.id === activeSessionId) {
        return { ...s, messages: newMessages, updatedAt: new Date().toISOString() };
      }
      return s;
    }));
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

  const handleConnect = () => {
    setSettings(prev => ({ ...prev, aiChatSessions: sessions }));
  };

  const solvedCount = problems.filter(p => p.status === 'Solved' || p.status === 'Re-solved').length;

  const systemInstruction = `You are an expert Computer Science tutor specialized in Data Structures, Algorithms (DSA), High-Level System Design (HLD), and Low-Level Design (LLD). 
Your ONLY purpose is to help the user master these topics. If the user asks about anything unrelated to computer science, coding, or system design, you must politely decline and steer them back to CS topics.

User Context:
The user is currently using a Tracker app to prepare. 
Their current rating is ${settings.currentRating} and their goal rating is ${settings.goalRating}.
They have solved ${solvedCount} problems so far.

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

        const prefFlash2 = validModels.find(m => m.name.includes('gemini-2.0-flash'));
        const prefFlash = validModels.find(m => m.name.includes('gemini-1.5-flash'));
        const prefPro = validModels.find(m => m.name.includes('gemini-1.5-pro'));
        const prefOldPro = validModels.find(m => m.name.includes('gemini-pro'));

        if (prefFlash2) selectedModelName = prefFlash2.name.replace('models/', '');
        else if (prefFlash) selectedModelName = prefFlash.name.replace('models/', '');
        else if (prefPro) selectedModelName = prefPro.name.replace('models/', '');
        else if (prefOldPro) selectedModelName = prefOldPro.name.replace('models/', '');
        else if (validModels.length > 0) selectedModelName = validModels[0].name.replace('models/', '');

        const isOldModel = !selectedModelName.includes('1.5') && !selectedModelName.includes('2.0');
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

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="btn btn-primary"
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 9999,
          padding: 0,
          transition: 'transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
        }}
      >
        {isOpen ? <X size={28} /> : <MessageSquare size={28} />}
      </button>

      {isOpen && (
        <div
          className="card glass-panel animate-fade-in"
          style={{
            position: 'fixed',
            bottom: '100px',
            right: '24px',
            width: '400px',
            height: '600px',
            maxHeight: 'calc(100vh - 120px)',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: 'var(--shadow)',
            zIndex: 9998,
            overflow: 'hidden'
          }}
        >
          <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-card)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Bot size={20} style={{ color: 'var(--text-main)' }} />
              <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                AI Tutor
                {isConfigured && <span style={{ fontSize: '0.7rem', padding: '2px 6px', background: 'var(--accent-bg)', color: 'var(--accent)', borderRadius: '12px' }}>{PROVIDERS[provider].name}</span>}
              </h3>
            </div>
            {isConfigured && (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={startNewChat} className="btn btn-outline" style={{ padding: '4px', border: 'none', color: 'var(--accent)' }} title="New Chat">
                  <Plus size={16} />
                </button>
                <button onClick={clearKey} className="btn btn-outline" style={{ padding: '4px', border: 'none', color: 'var(--status-editorial)' }} title="Disconnect">
                  <Key size={16} />
                </button>
              </div>
            )}
          </div>

          {!isConfigured ? (
            <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, overflowY: 'auto' }}>
              <Bot size={40} style={{ color: 'var(--text-main)', marginBottom: '1rem' }} />
              <h4 style={{ margin: '0 0 1rem 0', textAlign: 'center' }}>Connect your AI</h4>
              <form onSubmit={handleSaveKey} style={{ width: '100%' }}>

                <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>AI Provider</label>
                <select
                  value={provider}
                  onChange={handleProviderChange}
                  className="form-input"
                  style={{ marginBottom: '1rem', width: '100%', fontSize: '0.9rem' }}
                >
                  {Object.entries(PROVIDERS).map(([key, data]) => (
                    <option key={key} value={key}>{data.name}</option>
                  ))}
                </select>

                <div className="flex-between mb-1">
                  <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>API Key</label>
                </div>
                <div style={{ position: 'relative', marginBottom: '0.5rem' }}>
                  <Key size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="form-input"
                    style={{ paddingLeft: '2.2rem', fontSize: '0.9rem', padding: '0.75rem 0.75rem 0.75rem 2.2rem', width: '100%', boxSizing: 'border-box' }}
                    placeholder="API Key..."
                    required
                  />
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1rem', textAlign: 'right' }}>
                  {PROVIDERS[provider].helpText}
                </div>

                <div className="flex-between mb-1 mt-3">
                  <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Select Model (Optional)</label>
                  <button
                    type="button"
                    onClick={handleFetchModels}
                    className="btn btn-outline"
                    style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', background: 'var(--bg-elevated)', borderColor: 'var(--border-light)' }}
                    disabled={isFetchingModels || !apiKey}
                  >
                    {isFetchingModels ? 'Loading...' : 'Fetch List'}
                  </button>
                </div>

                {fetchError && <div style={{ color: 'var(--status-editorial)', fontSize: '0.75rem', marginBottom: '0.75rem' }}>{fetchError}</div>}

                <div style={{ marginBottom: '1rem' }}>
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
                    style={{ width: '100%', fontSize: '0.9rem', marginBottom: (customModel && !dynamicModels.includes(customModel) && !PROVIDERS[provider].suggestedModels?.includes(customModel)) ? '0.5rem' : '0' }}
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
                      <Cpu size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                      <input
                        type="text"
                        value={customModel.trim()}
                        onChange={(e) => setCustomModel(e.target.value)}
                        className="form-input"
                        style={{ paddingLeft: '2.2rem', fontSize: '0.9rem', padding: '0.75rem 0.75rem 0.75rem 2.2rem', width: '100%', boxSizing: 'border-box' }}
                        placeholder="Enter custom model ID..."
                        autoFocus
                      />
                    </div>
                  )}
                </div>

                {provider !== 'gemini' && (
                  <>
                    <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>Model (Optional)</label>
                    <div style={{ position: 'relative', marginBottom: '1rem' }}>
                      <Cpu size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                      <input
                        type="text"
                        value={customModel}
                        onChange={(e) => setCustomModel(e.target.value)}
                        className="form-input"
                        style={{ paddingLeft: '2.2rem', fontSize: '0.9rem', padding: '0.75rem 0.75rem 0.75rem 2.2rem', width: '100%', boxSizing: 'border-box' }}
                        placeholder={`Default: ${PROVIDERS[provider].defaultModel}`}
                      />
                    </div>
                  </>
                )}

                <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.5rem' }}>
                  Connect
                </button>
              </form>
            </div>
          ) : (
            <>
              <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {messages.length === 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
                    <Bot size={32} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                    <p style={{ textAlign: 'center', fontSize: '0.9rem' }}>Ready to help! Ask me a question.</p>
                  </div>
                ) : (
                  messages.map((msg, idx) => (
                    <div key={idx} style={{
                      display: 'flex',
                      gap: '0.5rem',
                      alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                      maxWidth: '90%'
                    }}>
                      {msg.role === 'model' && (
                        <div style={{ background: 'var(--text-main)', color: 'var(--bg-dark)', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '4px' }}>
                          <Bot size={14} />
                        </div>
                      )}

                      <div style={{
                        maxWidth: '85%',
                        padding: '0.75rem 1rem',
                        borderRadius: '12px',
                        background: msg.role === 'user' ? 'var(--text-main)' : 'var(--bg-card-hover)',
                        color: msg.role === 'user' ? 'var(--bg-dark)' : 'var(--text-main)',
                        border: msg.role === 'model' ? '1px solid var(--border-light)' : 'none',
                      }}>
                        {msg.role === 'user' ? (
                          <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
                        ) : renderMessageContent(msg.content)}

                        {msg.tokenUsage && (
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border-light)', display: 'flex', justifyContent: 'flex-end', opacity: 0.7 }}>
                            Tokens: {msg.tokenUsage.total?.toLocaleString() || 0}
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
                    </div>
                  ))
                )}
                {isLoading && (
                  <div style={{ display: 'flex', gap: '0.5rem', alignSelf: 'flex-start' }}>
                    <div style={{ background: 'var(--text-main)', color: 'var(--bg-dark)', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Bot size={14} />
                    </div>
                    <div style={{ padding: '0.75rem', background: 'var(--bg-card-hover)', border: '1px solid var(--border-light)', borderRadius: '12px', borderTopLeftRadius: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <div className="typing-dot" style={{ width: '5px', height: '5px', background: 'var(--text-muted)', borderRadius: '50%', animation: 'pulse 1.5s infinite' }}></div>
                      <div className="typing-dot" style={{ width: '5px', height: '5px', background: 'var(--text-muted)', borderRadius: '50%', animation: 'pulse 1.5s infinite 0.2s' }}></div>
                      <div className="typing-dot" style={{ width: '5px', height: '5px', background: 'var(--text-muted)', borderRadius: '50%', animation: 'pulse 1.5s infinite 0.4s' }}></div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <form onSubmit={handleSend} style={{ padding: '0.75rem', borderTop: '1px solid var(--border-light)', display: 'flex', gap: '0.5rem', background: 'var(--bg-card)' }}>
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask something..."
                  className="form-input"
                  style={{ flex: 1, padding: '0.75rem', borderRadius: '20px', fontSize: '0.9rem' }}
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ borderRadius: '50%', width: '40px', height: '40px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  disabled={isLoading || !input.trim()}
                >
                  <Send size={16} style={{ marginLeft: '2px' }} />
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </>
  );
}
