import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import ReactMarkdown from 'react-markdown';
import { X, ExternalLink, Edit3, Eye, Save, Bold, Italic, Code, Link as LinkIcon, List, Wand2, Loader2, AlertCircle } from 'lucide-react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import mermaid from 'mermaid';
import { useTracker } from '../context/TrackerContext';

// Simple Mermaid wrapper
const Mermaid = ({ chart }) => {
  const containerRef = useRef(null);

  React.useEffect(() => {
    if (containerRef.current && chart) {
      try {
        mermaid.initialize({ startOnLoad: false, theme: 'default' });
        mermaid.render(`mermaid-${Math.random().toString(36).substring(7)}`, chart).then(({ svg }) => {
          if (containerRef.current) {
            containerRef.current.innerHTML = svg;
          }
        });
      } catch (err) {
        console.error('Mermaid render error', err);
      }
    }
  }, [chart]);

  return <div ref={containerRef} className="mermaid-container my-4 flex-center" />;
};

export default function EditorialModal({ problem, onClose, initialTab = 'suggested' }) {
  const { updateProblem, settings } = useTracker();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(problem.editorial || '');
  const [suggestedContent, setSuggestedContent] = useState(problem.suggestedSolution || '');
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiError, setAiError] = useState('');
  const textareaRef = useRef(null);

  const handleFormat = (prefix, suffix = '') => {
    if (!textareaRef.current) return;
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const currentVal = activeTab === 'suggested' ? suggestedContent : content;
    
    const before = currentVal.substring(0, start);
    const selected = currentVal.substring(start, end);
    const after = currentVal.substring(end);
    
    const newVal = before + prefix + selected + suffix + after;
    if (activeTab === 'suggested') {
      setSuggestedContent(newVal);
    } else {
      setContent(newVal);
    }
    
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(start + prefix.length, end + prefix.length);
      }
    }, 0);
  };

  const handleAutoFill = async () => {
    const aiSettings = settings.aiSettings;
    if (!aiSettings) {
      setAiError('Please configure an AI provider in the AI Tutor tab first.');
      return;
    }
    const provider = aiSettings.provider || 'gemini';
    const apiKey = aiSettings.keys?.[provider];
    if (!apiKey) {
      setAiError(`API key missing for ${provider}. Please configure it in the AI Tutor tab.`);
      return;
    }

    setIsGenerating(true);
    setAiError('');
    
    try {
      const prompt = `Write a detailed, optimal solution for the following DSA/System Design topic: "${problem.problem}". Use clear markdown formatting. If it's a System Design problem, make it as detailed as possible from a FAANG interview perspective, include Mermaid diagrams (\`\`\`mermaid) for the architecture (always use a horizontal orientation like 'graph LR' or 'flowchart LR'), and explicitly explain the role of each component in the design. If it's a coding problem, explain the optimal approach, time/space complexity, and provide the clean code implementation in STRICTLY Java.`;

      if (provider === 'gemini') {
        const genAI = new GoogleGenerativeAI(apiKey);
        const modelName = aiSettings.models?.[provider] || 'gemini-1.5-flash';
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        setSuggestedContent(result.response.text());
      } else {
        const baseURL = {
          groq: 'https://api.groq.com/openai/v1',
          deepseek: 'https://api.deepseek.com',
          openrouter: 'https://openrouter.ai/api/v1'
        }[provider];
        const defaultModel = {
          groq: 'llama-3.3-70b-versatile',
          deepseek: 'deepseek-chat',
          openrouter: 'meta-llama/llama-3.3-70b-instruct:free'
        }[provider];
        
        const openai = new OpenAI({ apiKey, baseURL, dangerouslyAllowBrowser: true });
        const modelName = aiSettings.models?.[provider] || defaultModel;
        
        const response = await openai.chat.completions.create({
          model: modelName,
          messages: [{ role: 'user', content: prompt }]
        });
        setSuggestedContent(response.choices[0].message.content);
      }
      setActiveTab('suggested');
      setIsEditing(true);
    } catch (err) {
      setAiError(err.message || 'Failed to generate solution');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = () => {
    updateProblem(problem.id, { editorial: content, suggestedSolution: suggestedContent });
    setIsEditing(false);
  };

  const modalContent = (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass-panel animate-fade-in" onClick={e => e.stopPropagation()}>
        <button className="btn-icon modal-close" onClick={onClose}>
          <X size={20} />
        </button>

        <div className="mb-4">
          <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }} className="gradient-text">
            Editorial: {problem.problem}
          </h2>
          <div className="text-sm text-muted mt-1">Topic: {problem.topic} | Difficulty: {problem.difficulty}</div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-light)' }}>
          <button 
            style={{ 
              background: 'transparent', border: 'none', cursor: 'pointer', padding: '0.5rem 1rem',
              color: activeTab === 'suggested' ? 'var(--text-main)' : 'var(--text-muted)',
              borderBottom: activeTab === 'suggested' ? '2px solid var(--accent-primary)' : '2px solid transparent',
              fontWeight: activeTab === 'suggested' ? 600 : 400,
              fontSize: '1rem', transition: 'all 0.2s'
            }}
            onClick={() => { setActiveTab('suggested'); setIsEditing(false); }}
          >
            Suggested Solution
          </button>
          <button 
            style={{ 
              background: 'transparent', border: 'none', cursor: 'pointer', padding: '0.5rem 1rem',
              color: activeTab === 'notes' ? 'var(--text-main)' : 'var(--text-muted)',
              borderBottom: activeTab === 'notes' ? '2px solid var(--accent-primary)' : '2px solid transparent',
              fontWeight: activeTab === 'notes' ? 600 : 400,
              fontSize: '1rem', transition: 'all 0.2s'
            }}
            onClick={() => { setActiveTab('notes'); setIsEditing(false); }}
          >
            My Notes
          </button>
        </div>

        <div className="flex-between mb-4">
          <div className="flex-center gap-2">
            <button 
              className={`btn ${!isEditing ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setIsEditing(false)}
            >
              <Eye size={16} /> Preview
            </button>
            <button 
              className={`btn ${isEditing ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setIsEditing(true)}
            >
              <Edit3 size={16} /> Edit
            </button>
            {activeTab === 'suggested' && (
              <button 
                className="btn btn-outline" 
                onClick={handleAutoFill}
                disabled={isGenerating}
                style={{ borderColor: 'var(--accent-primary)', color: 'var(--accent-primary)' }}
              >
                {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
                Auto-fill Solution
              </button>
            )}
          </div>

          <div className="flex-center gap-2">
            {isEditing && (
              <button className="btn btn-primary" onClick={handleSave}>
                <Save size={16} /> Save
              </button>
            )}
          </div>
        </div>

        {aiError && (
          <div className="error-message flex-center gap-2 mb-4" style={{ color: 'var(--status-unsolved)', fontSize: '0.85rem' }}>
            <AlertCircle size={14} /> {aiError}
          </div>
        )}

        {isEditing ? (
          <div>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', background: 'var(--table-header-bg)', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-light)' }}>
              <button className="btn-icon" onClick={() => handleFormat('**', '**')} title="Bold"><Bold size={16} /></button>
              <button className="btn-icon" onClick={() => handleFormat('*', '*')} title="Italic"><Italic size={16} /></button>
              <button className="btn-icon" onClick={() => handleFormat('`', '`')} title="Code"><Code size={16} /></button>
              <button className="btn-icon" onClick={() => handleFormat('[', '](url)')} title="Link"><LinkIcon size={16} /></button>
              <button className="btn-icon" onClick={() => handleFormat('- ', '')} title="List"><List size={16} /></button>
            </div>
            <textarea
              ref={textareaRef}
              className="editor-textarea"
              placeholder={activeTab === 'suggested' ? "Write your optimal solution here..." : "Write your own notes here..."}
              value={activeTab === 'suggested' ? suggestedContent : content}
              onChange={(e) => activeTab === 'suggested' ? setSuggestedContent(e.target.value) : setContent(e.target.value)}
            />
            <div className="text-xs text-muted mt-2">
              Supports Markdown formatting (code blocks, bold, lists, etc.)
            </div>
          </div>
        ) : (
          <div className="markdown-preview">
            {(activeTab === 'suggested' ? suggestedContent : content) ? (
              <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeKatex]}
                components={{
                  code({ node, inline, className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || '');
                    if (!inline && match && match[1] === 'mermaid') {
                      return <Mermaid chart={String(children).replace(/\n$/, '')} />;
                    }
                    return !inline ? (
                      <div className="code-block-wrapper">
                        <pre className={className} style={{ overflowX: 'auto', padding: '1rem', background: 'var(--bg-elevated)', borderRadius: '4px', border: '1px solid var(--border-light)' }}>
                          <code className={className} {...props}>
                            {children}
                          </code>
                        </pre>
                      </div>
                    ) : (
                      <code className={className} style={{ background: 'var(--bg-elevated)', padding: '0.2rem 0.4rem', borderRadius: '4px', fontSize: '0.9em' }} {...props}>
                        {children}
                      </code>
                    );
                  },
                  table({ children, ...props }) {
                    return (
                      <div style={{ overflowX: 'auto', marginBottom: '1rem' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }} {...props}>{children}</table>
                      </div>
                    );
                  },
                  th({ children, ...props }) {
                    return <th style={{ padding: '0.5rem', border: '1px solid var(--border-light)', background: 'var(--table-header-bg)', fontWeight: 'bold' }} {...props}>{children}</th>;
                  },
                  td({ children, ...props }) {
                    return <td style={{ padding: '0.5rem', border: '1px solid var(--border-light)' }} {...props}>{children}</td>;
                  }
                }}
              >
                {activeTab === 'suggested' ? suggestedContent : content}
              </ReactMarkdown>
            ) : (
              <div className="text-muted" style={{ textAlign: 'center', padding: '2rem' }}>
                {activeTab === 'suggested' 
                  ? 'No suggested solution saved yet. Switch to Edit mode to fill out the template.' 
                  : 'No personal notes written yet. Switch to Edit mode to write your own.'}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
