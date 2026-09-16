import React, { useState } from 'react';
import { useTracker } from '../context/TrackerContext';
import { Trophy, Target, ExternalLink, ChevronDown, ChevronUp, Tag, BarChart3, X, Plus } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import AddCustomProblemModal from '../components/AddCustomProblemModal';

export default function Dashboard() {
  const { problems, updateProblem, settings, getTopicMetrics, topics } = useTracker();
  const metrics = getTopicMetrics();
  const [expandedTopic, setExpandedTopic] = useState(null);
  const [selectedTopic, setSelectedTopic] = useState('All');
  const [isOtherQuestionsCollapsed, setIsOtherQuestionsCollapsed] = useState(false);
  const [selectedCustomTag, setSelectedCustomTag] = useState('All');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  const originalProblems = problems.filter(p => !p.id?.toString().startsWith('custom-'));
  const customProblems = problems.filter(p => p.id?.toString().startsWith('custom-'));

  const uniqueTopics = topics || [...new Set(originalProblems.map(p => p.topic))].sort();

  const isOtherQuestionsView = selectedTopic === 'Other Questions';
  let filteredProblems = [];
  if (isOtherQuestionsView) {
    filteredProblems = customProblems;
  } else if (selectedTopic === 'All') {
    filteredProblems = originalProblems;
  } else {
    filteredProblems = originalProblems.filter(p => p.topic === selectedTopic);
  }
  
  const totalProblems = filteredProblems.length;
  const solvedProblems = filteredProblems.filter(p => p.status === 'Solved' || p.status === 'Re-solved').length;
  const completionPercent = totalProblems > 0 ? Math.round((solvedProblems / totalProblems) * 100) : 0;

  const solvedEasy = filteredProblems.filter(p => p.difficulty === 'Easy' && (p.status === 'Solved' || p.status === 'Re-solved')).length;
  const solvedMedium = filteredProblems.filter(p => p.difficulty === 'Medium' && (p.status === 'Solved' || p.status === 'Re-solved')).length;
  const solvedHard = filteredProblems.filter(p => p.difficulty === 'Hard' && (p.status === 'Solved' || p.status === 'Re-solved')).length;

  const totalEasy = filteredProblems.filter(p => p.difficulty === 'Easy').length;
  const totalMedium = filteredProblems.filter(p => p.difficulty === 'Medium').length;
  const totalHard = filteredProblems.filter(p => p.difficulty === 'Hard').length;

  const difficultyData = [
    { name: 'Easy', Solved: solvedEasy, Total: totalEasy, fill: '#009A44' },
    { name: 'Med', Solved: solvedMedium, Total: totalMedium, fill: '#C18F00' },
    { name: 'Hard', Solved: solvedHard, Total: totalHard, fill: '#E3000F' }
  ];

  const completionData = [
    { name: 'Solved', value: solvedProblems, color: 'var(--text-main)' },
    { name: 'Remaining', value: Math.max(0, totalProblems - solvedProblems), color: 'rgba(128,128,128,0.2)' }
  ];

  const removeCustomTag = (problemId, tagToRemove) => {
    const problem = problems.find(p => p.id === problemId);
    if (!problem || !problem.company) return;
    const remaining = problem.company
      .split(',')
      .map(c => c.trim())
      .filter(c => c && c.toLowerCase() !== tagToRemove.toLowerCase());
    updateProblem(problemId, { company: remaining.length ? remaining.join(', ') : 'General' });
  };

  const addCustomTag = (problemId) => {
    const problem = problems.find(p => p.id === problemId);
    if (!problem) return;
    const tag = window.prompt('Enter a new tag:');
    if (tag && tag.trim()) {
      const existing = problem.company && problem.company !== 'General' ? problem.company.split(',').map(x => x.trim()) : [];
      if (!existing.map(x => x.toLowerCase()).includes(tag.trim().toLowerCase())) {
        const newCompany = existing.length ? `${existing.join(', ')}, ${tag.trim()}` : tag.trim();
        updateProblem(problemId, { company: newCompany });
      }
    }
  };

  // Compute tags & histogram data for Other Questions (without duplicate topics)
  const allCustomTags = [];
  customProblems.forEach(p => {
    if (p.company && p.company !== 'General') {
      p.company.split(',').forEach(c => {
        const tag = c.trim();
        if (tag && !allCustomTags.some(t => t.toLowerCase() === tag.toLowerCase())) {
          allCustomTags.push(tag);
        }
      });
    }
  });
  // If no company tags exist on a custom problem, fallback to its topic
  customProblems.forEach(p => {
    if (!p.company || p.company === 'General') {
      if (p.topic && !allCustomTags.some(t => t.toLowerCase() === p.topic.toLowerCase())) {
        allCustomTags.push(p.topic);
      }
    }
  });

  const customTagStats = allCustomTags.map(tag => {
    const matching = customProblems.filter(p => 
      p.topic === tag || (p.company && p.company.split(',').map(c => c.trim()).includes(tag))
    );
    const solved = matching.filter(p => p.status === 'Solved' || p.status === 'Re-solved').length;
    return {
      tag,
      Total: matching.length,
      Solved: solved,
      Remaining: matching.length - solved
    };
  }).sort((a, b) => b.Total - a.Total);

  const displayedCustomProblems = selectedCustomTag === 'All' 
    ? customProblems 
    : customProblems.filter(p => p.topic === selectedCustomTag || (p.company && p.company.split(',').map(c => c.trim()).includes(selectedCustomTag)));

  return (
    <div className="animate-fade-in">
      <div className="flex-between mb-6">
        <div>
          <h2 style={{ fontSize: '2rem', fontWeight: 600 }}>Welcome Back!</h2>
          <p className="text-muted">Here's your DSA progress at a glance.</p>
        </div>
        <select 
          className="btn btn-outline" 
          value={selectedTopic} 
          onChange={(e) => setSelectedTopic(e.target.value)}
        >
          <option value="All">All Topics</option>
          {uniqueTopics.map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
          <option value="Other Questions">Other Questions ({customProblems.length})</option>
        </select>
      </div>

      <div className="dashboard-grid">
        
        {/* Rating Card */}
        <div className="card glass-panel" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div className="flex-between mb-4">
            <h3 className="card-header" style={{margin: 0, border: 'none', padding: 0}}>Current Rating</h3>
            <Trophy size={24} style={{ color: 'var(--text-main)' }} />
          </div>
          <div style={{ fontSize: '3rem', fontWeight: 700, lineHeight: 1 }}>{settings.currentRating}</div>
          <p className="text-muted text-sm mt-2">Goal: {settings.goalRating}</p>
        </div>
        
        {/* Completion Donut Card */}
        <div className="card glass-panel" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="flex-between mb-2">
            <h3 className="card-header" style={{margin: 0, border: 'none', padding: 0}}>
              {isOtherQuestionsView ? 'Other Questions Completion' : 'Curriculum Completion'}
            </h3>
            <Target size={20} style={{ color: 'var(--text-main)' }} />
          </div>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
            <div style={{ width: '100px', height: '100px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={completionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={30}
                    outerRadius={45}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                  >
                    {completionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'var(--bg-card)', borderColor: 'var(--border-light)', color: 'var(--text-main)', borderRadius: '4px' }} itemStyle={{ color: 'var(--text-main)' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ marginLeft: '1rem' }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 700, lineHeight: 1 }}>{completionPercent}%</div>
              <p className="text-muted text-xs mt-1">{solvedProblems} / {totalProblems} Solved</p>
            </div>
          </div>
        </div>

        {/* Difficulty Bar Chart Card */}
        <div className="card glass-panel" style={{ display: 'flex', flexDirection: 'column' }}>
          <h3 className="card-header" style={{margin: 0, border: 'none', padding: 0, marginBottom: '0.5rem'}}>By Difficulty</h3>
          <div style={{ flex: 1, width: '100%', minHeight: '100px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={difficultyData} layout="vertical" margin={{ top: 0, right: 20, left: -20, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
                <Tooltip 
                  cursor={{ fill: 'rgba(128,128,128,0.1)' }} 
                  contentStyle={{ background: 'var(--bg-card)', borderColor: 'var(--border-light)', color: 'var(--text-main)', borderRadius: '0', padding: '8px 12px', fontWeight: 600, boxShadow: '4px 4px 0 var(--border-strong)' }} 
                  itemStyle={{ color: 'var(--text-main)', padding: 0 }} 
                  formatter={(value, name, props) => [`${value} / ${props.payload.Total}`, name]} 
                />
                <Bar dataKey="Solved" radius={[0, 4, 4, 0]} barSize={12}>
                  {difficultyData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Topic Mastery (Hidden if filtered specifically to Other Questions) */}
      {!isOtherQuestionsView && (
        <div className="card glass-panel mb-6">
          <h3 className="card-header">Topic Mastery</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {metrics.map(m => {
              const topicOriginal = originalProblems.filter(p => p.topic === m.topic);
              const topicCustom = customProblems.filter(p => p.topic === m.topic);

              return (
                <div key={m.topic} style={{ cursor: 'pointer' }} onClick={() => setExpandedTopic(expandedTopic === m.topic ? null : m.topic)}>
                  <div className="flex-between mb-2">
                    <span className="text-sm" style={{ fontWeight: expandedTopic === m.topic ? 600 : 400, color: expandedTopic === m.topic ? 'var(--accent-primary)' : 'inherit' }}>{m.topic}</span>
                    <span className="text-sm text-muted">{m.solved}/{m.total}</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: 'var(--border-light)', borderRadius: '0', overflow: 'hidden' }}>
                    <div style={{ 
                      width: `${m.percent}%`, 
                      height: '100%', 
                      background: 'var(--text-main)',
                      transition: 'width 0.5s ease'
                    }} />
                  </div>
                  {expandedTopic === m.topic && (
                    <div style={{ marginTop: '1rem', padding: '1rem', background: 'var(--bg-card)', border: '2px solid var(--border-light)', overflowX: 'auto' }} onClick={(e) => e.stopPropagation()}>
                      <ul style={{ listStyleType: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem', minWidth: '600px' }}>
                        {topicOriginal.map(p => (
                          <li key={p.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto 70px 100px', gap: '1rem', alignItems: 'center', padding: '0.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: '4px' }}>
                            <a 
                              href={p.url || `https://leetcode.com/problems/${p.slug}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              style={{ 
                                fontSize: '0.9rem', 
                                color: 'var(--text-main)', 
                                fontWeight: (p.status === 'Solved' || p.status === 'Re-solved') ? 600 : 400,
                                textDecoration: 'none', 
                                whiteSpace: 'nowrap', 
                                overflow: 'hidden', 
                                textOverflow: 'ellipsis' 
                              }}
                            >
                              {p.problem}
                            </a>
                            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                              {p.company && p.company !== 'General' && (() => {
                                const companies = p.company.split(',').map(c => c.trim());
                                const displayCompanies = companies.slice(0, 1);
                                const extraCount = companies.length - displayCompanies.length;
                                return (
                                  <>
                                    {displayCompanies.map(c => (
                                      <span key={c} style={{ background: 'rgba(128,128,128,0.2)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', lineHeight: '1.2' }}>{c}</span>
                                    ))}
                                    {extraCount > 0 && (
                                      <span className="custom-tooltip-container" style={{ background: 'rgba(128,128,128,0.2)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', color: 'var(--text-muted)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', lineHeight: '1.2' }}>
                                        +{extraCount}
                                        <span className="custom-tooltip-text">{companies.slice(1).join(', ')}</span>
                                      </span>
                                    )}
                                  </>
                                );
                              })()}
                            </div>
                            <span style={{ fontSize: '0.8rem', color: p.difficulty === 'Easy' ? '#009A44' : (p.difficulty === 'Medium' ? '#C18F00' : '#E3000F'), fontWeight: 600 }}>
                              {p.difficulty}
                            </span>
                            <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                              <span className={`badge badge-${p.status.toLowerCase().replace(/[- ]/g, '')}`}>
                                {p.status}
                              </span>
                            </div>
                          </li>
                        ))}

                        {topicCustom.length > 0 && (
                          <>
                            <div style={{ marginTop: '0.75rem', marginBottom: '0.25rem', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>
                              Other Questions in {m.topic}
                            </div>
                            {topicCustom.map(p => (
                              <li key={p.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto 70px 100px', gap: '1rem', alignItems: 'center', padding: '0.5rem', background: 'rgba(255,255,255,0.05)', borderLeft: '3px solid var(--accent-primary)', borderRadius: '4px' }}>
                                <a 
                                  href={p.url || `https://leetcode.com/problems/${p.slug || ''}`} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  style={{ 
                                    fontSize: '0.9rem', 
                                    color: 'var(--text-main)', 
                                    fontWeight: 600,
                                    textDecoration: 'none', 
                                    whiteSpace: 'nowrap', 
                                    overflow: 'hidden', 
                                    textOverflow: 'ellipsis' 
                                  }}
                                >
                                  {p.problem}
                                </a>
                                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                  {p.company && p.company !== 'General' && p.company.split(',').map(c => (
                                    <span key={c} style={{ background: 'rgba(128,128,128,0.2)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', lineHeight: '1.2' }}>{c.trim()}</span>
                                  ))}
                                </div>
                                <span style={{ fontSize: '0.8rem', color: p.difficulty === 'Easy' ? '#009A44' : (p.difficulty === 'Medium' ? '#C18F00' : '#E3000F'), fontWeight: 600 }}>
                                  {p.difficulty}
                                </span>
                                <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                                  <span className={`badge badge-${p.status.toLowerCase().replace(/[- ]/g, '')}`}>
                                    {p.status}
                                  </span>
                                </div>
                              </li>
                            ))}
                          </>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Collapsible Other Questions Section */}
      <div className="card glass-panel mb-6">
        <div 
          className="flex-between" 
          style={{ cursor: 'pointer', paddingBottom: isOtherQuestionsCollapsed ? 0 : '1rem', borderBottom: isOtherQuestionsCollapsed ? 'none' : '1px solid var(--border-light)' }}
          onClick={() => setIsOtherQuestionsCollapsed(!isOtherQuestionsCollapsed)}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <h3 className="card-header" style={{ margin: 0, padding: 0, border: 'none' }}>Other Questions</h3>
            <span style={{ fontSize: '0.8rem', padding: '2px 8px', borderRadius: '12px', background: 'rgba(128,128,128,0.15)', color: 'var(--text-muted)', fontWeight: 600 }}>
              {customProblems.length} Added
            </span>
            <button 
              onClick={(e) => { e.stopPropagation(); setIsAddModalOpen(true); }}
              className="btn btn-primary" 
              style={{ padding: '0.2rem 0.6rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem', marginLeft: '0.5rem' }}
            >
              <Plus size={14} /> Add Question
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {customProblems.length > 0 && (
              <span className="text-sm text-muted">
                {customProblems.filter(p => p.status === 'Solved' || p.status === 'Re-solved').length} / {customProblems.length} Solved
              </span>
            )}
            <button className="btn-icon" style={{ padding: '0.2rem', color: 'var(--text-muted)' }}>
              {isOtherQuestionsCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
            </button>
          </div>
        </div>

        {!isOtherQuestionsCollapsed && (
          <div style={{ marginTop: '1rem' }}>
            {customProblems.length === 0 ? (
              <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <p className="text-sm">No external questions added yet. You can add extra questions from the Calendar to track and revise them!</p>
              </div>
            ) : (
              <>
                {/* Histogram & Tag Analytics for Other Questions */}
                {customTagStats.length > 0 && (
                  <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(128,128,128,0.03)', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
                    <div className="flex-between mb-3">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <BarChart3 size={16} style={{ color: 'var(--accent-primary)' }} />
                        <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Questions by Tag / Topic Breakdown</span>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Filter Tag:</span>
                        <select 
                          value={selectedCustomTag} 
                          onChange={(e) => setSelectedCustomTag(e.target.value)}
                          className="form-input"
                          style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem', borderRadius: '4px' }}
                        >
                          <option value="All">All Tags ({customProblems.length})</option>
                          {allCustomTags.map(tag => (
                            <option key={tag} value={tag}>{tag}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Tag Histogram Chart */}
                    <div style={{ width: '100%', height: '140px', marginTop: '0.5rem' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={customTagStats} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                          <XAxis dataKey="tag" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                          <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                          <Tooltip 
                            cursor={{ fill: 'rgba(128,128,128,0.1)' }} 
                            contentStyle={{ background: 'var(--bg-card)', borderColor: 'var(--border-light)', color: 'var(--text-main)', borderRadius: '4px' }} 
                            itemStyle={{ color: 'var(--text-main)' }} 
                          />
                          <Bar dataKey="Solved" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} barSize={24} name="Solved" />
                          <Bar dataKey="Remaining" stackId="a" fill="rgba(128,128,128,0.25)" radius={[4, 4, 0, 0]} barSize={24} name="Remaining" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Quick Tag Pills */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.75rem' }}>
                      <button 
                        onClick={() => setSelectedCustomTag('All')}
                        style={{
                          background: selectedCustomTag === 'All' ? 'var(--text-main)' : 'rgba(128,128,128,0.1)',
                          color: selectedCustomTag === 'All' ? 'var(--bg-card)' : 'var(--text-muted)',
                          border: 'none',
                          borderRadius: '12px',
                          padding: '2px 8px',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                          fontWeight: selectedCustomTag === 'All' ? 600 : 400
                        }}
                      >
                        All ({customProblems.length})
                      </button>
                      {customTagStats.map(stat => (
                        <button 
                          key={stat.tag}
                          onClick={() => setSelectedCustomTag(selectedCustomTag === stat.tag ? 'All' : stat.tag)}
                          style={{
                            background: selectedCustomTag === stat.tag ? 'var(--accent-primary)' : 'rgba(128,128,128,0.1)',
                            color: selectedCustomTag === stat.tag ? '#fff' : 'var(--text-muted)',
                            border: 'none',
                            borderRadius: '12px',
                            padding: '2px 8px',
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                            fontWeight: selectedCustomTag === stat.tag ? 600 : 400,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <Tag size={10} />
                          {stat.tag} ({stat.Solved}/{stat.Total})
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* List of Custom Questions */}
                <div style={{ overflowX: 'auto' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', minWidth: '700px' }}>
                    {displayedCustomProblems.map(p => (
                      <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto 90px 70px 100px', gap: '1rem', alignItems: 'center', padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-light)', borderRadius: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden' }}>
                          <a 
                            href={p.url || `https://leetcode.com/problems/${p.slug || ''}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            style={{ 
                              fontSize: '0.95rem', 
                              color: 'var(--text-main)', 
                              fontWeight: 600,
                              textDecoration: 'none', 
                              whiteSpace: 'nowrap', 
                              overflow: 'hidden', 
                              textOverflow: 'ellipsis' 
                            }}
                          >
                            {p.problem}
                          </a>
                          {p.url && <ExternalLink size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />}
                        </div>

                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'wrap' }}>
                          {p.company && p.company !== 'General' && p.company.split(',').map(c => c.trim()).filter(Boolean).map(c => (
                            <span key={c} style={{ background: 'rgba(128,128,128,0.15)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '4px', lineHeight: '1.2' }}>
                              {c}
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeCustomTag(p.id, c);
                                }}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', lineHeight: 1 }}
                                title={`Remove tag "${c}"`}
                              >
                                <X size={10} />
                              </button>
                            </span>
                          ))}
                          <button 
                            onClick={() => addCustomTag(p.id)}
                            style={{ background: 'transparent', border: '1px dashed var(--border-strong)', borderRadius: '4px', fontSize: '0.65rem', padding: '2px 8px', cursor: 'pointer', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', lineHeight: '1.2' }}
                            title="Add Tag"
                          >
                            + Tag
                          </button>
                        </div>

                        <span style={{ fontSize: '0.8rem', color: 'var(--accent-primary)', fontWeight: 500, textAlign: 'center' }}>
                          {p.topic}
                        </span>

                        <span style={{ fontSize: '0.8rem', color: p.difficulty === 'Easy' ? '#009A44' : (p.difficulty === 'Medium' ? '#C18F00' : '#E3000F'), fontWeight: 600, textAlign: 'center' }}>
                          {p.difficulty}
                        </span>

                        <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                          <span className={`badge badge-${p.status.toLowerCase().replace(/[- ]/g, '')}`}>
                            {p.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <AddCustomProblemModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
      />
    </div>
  );
}
