import React, { useState } from 'react';
import { useTracker } from '../context/TrackerContext';
import { ExternalLink, CalendarPlus, ChevronDown, ChevronUp, BookOpen, X, Shuffle, Plus, FileText } from 'lucide-react';
import { format, isPast, isToday, addDays } from 'date-fns';
import EditorialModal from '../components/EditorialModal';
import AddCustomProblemModal from '../components/AddCustomProblemModal';

export default function MasterTracker() {
  const { problems, updateProblem, topics } = useTracker();
  const [filterTopic, setFilterTopic] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [selectedEditorial, setSelectedEditorial] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());

  const removeTag = (problemId, tagToRemove) => {
    const problem = problems.find(p => p.id === problemId);
    if (!problem || !problem.company) return;
    const remaining = problem.company
      .split(',')
      .map(c => c.trim())
      .filter(c => c && c.toLowerCase() !== tagToRemove.toLowerCase());
    updateProblem(problemId, { company: remaining.length ? remaining.join(', ') : 'General' });
  };

  const filtered = problems.filter(p => {
    if (filterTopic === 'Other Questions') {
      if (!p.id?.toString().startsWith('custom-')) return false;
    } else if (filterTopic !== 'All' && p.topic !== filterTopic) {
      return false;
    }
    if (filterStatus !== 'All' && p.status !== filterStatus) return false;
    return true;
  });

  const getNextRev = (p) => {
    const revDates = [p.r1, p.r3, p.r7, p.r14].filter(Boolean).map(d => new Date(d));
    return revDates.sort((a, b) => a - b)[0];
  };

  const sorted = [...filtered].sort((a, b) => {
    if (!sortConfig.key) return 0;
    
    let aVal = a[sortConfig.key];
    let bVal = b[sortConfig.key];

    if (sortConfig.key === 'nextRev') {
      const aRev = getNextRev(a);
      const bRev = getNextRev(b);
      aVal = aRev ? aRev.getTime() : Infinity;
      bVal = bRev ? bRev.getTime() : Infinity;
    } else if (sortConfig.key === 'difficulty') {
      const diffMap = { 'Easy': 1, 'Medium': 2, 'Hard': 3 };
      aVal = diffMap[aVal] || 0;
      bVal = diffMap[bVal] || 0;
    }

    if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const SortIcon = ({ columnKey }) => {
    if (sortConfig.key !== columnKey) return <ChevronDown size={14} style={{ opacity: 0.2 }} />;
    return sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />;
  };

  const getStatusClass = (status) => {
    return 'badge badge-' + status.toLowerCase().replace(/[- ]/g, '');
  };

  const handleStatusChange = (id, newStatus) => {
    updateProblem(id, { status: newStatus });
  };

  const generateGoogleCalendarLink = (problem, dateStr) => {
    if (!dateStr) return '#';
    const d = new Date(dateStr);
    const start = d.toISOString().replace(/-|:|\.\d\d\d/g, '');
    const endObj = new Date(d.getTime() + 60 * 60 * 1000);
    const end = endObj.toISOString().replace(/-|:|\.\d\d\d/g, '');
    const text = encodeURIComponent(`Revise DSA: ${problem.problem}`);
    const link = problem.url || `https://leetcode.com/problems/${problem.slug}`;
    const details = encodeURIComponent(`Time to revise ${problem.problem} (${problem.topic}). \nLink: ${link}`);
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${start}/${end}&details=${details}`;
  };

  const handleSingleCalendarPopup = (e, link) => {
    e.preventDefault();
    window.open(link, 'googleCalendarPopup', 'width=800,height=600');
  };

  const generateICS = () => {
    if (selectedIds.size === 0) return;
    
    const selectedProblems = problems.filter(p => selectedIds.has(p.id));
    const uniqueTopics = [...new Set(selectedProblems.map(p => p.topic))].join(', ');
    const title = `${uniqueTopics} -> Revision`;
    
    // In ICS, literal newlines in description text must be encoded as '\n' (backslash-n)
    let description = 'Problems to revise:\\n\\n';
    selectedProblems.forEach(p => {
      const link = p.url || `https://leetcode.com/problems/${p.slug}`;
      description += `${p.problem}: ${link}\\n`;
    });
    
    const CRLF = '\r\n';
    const foldLine = (line) => {
      const parts = [];
      let current = line;
      while (current.length > 75) {
        parts.push(current.substring(0, 75));
        current = current.substring(75);
      }
      parts.push(current);
      return parts.join(CRLF + ' ');
    };
    
    const now = new Date();
    const daysToAdd = [1, 3, 7];
    let icsContent = 'BEGIN:VCALENDAR' + CRLF + 'VERSION:2.0' + CRLF + 'PRODID:-//DSA Tracker//EN' + CRLF;
    
    daysToAdd.forEach(days => {
      const targetDate = addDays(now, days);
      const formatIcsDate = (date) => {
        return date.toISOString().split('T')[0].replace(/-/g, '');
      };
      const startStr = formatIcsDate(targetDate);
      const endStr = formatIcsDate(addDays(targetDate, 1));
      
      const uid = `${targetDate.getTime()}-${Math.random().toString(36).substring(2, 9)}@dsatracker.com`;
      const dtstamp = now.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      
      icsContent += 'BEGIN:VEVENT' + CRLF;
      icsContent += `UID:${uid}` + CRLF;
      icsContent += `DTSTAMP:${dtstamp}` + CRLF;
      icsContent += `DTSTART;VALUE=DATE:${startStr}` + CRLF;
      icsContent += `DTEND;VALUE=DATE:${endStr}` + CRLF;
      icsContent += foldLine(`SUMMARY:${title}`) + CRLF;
      icsContent += foldLine(`DESCRIPTION:${description}`) + CRLF;
      icsContent += 'END:VEVENT' + CRLF;
    });
    
    icsContent += 'END:VCALENDAR' + CRLF;
    
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = 'dsa-revisions.ics';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setIsSelectionMode(false);
    setSelectedIds(new Set());
  };

  const handleSolveRandom = () => {
    const eligible = problems.filter(p => p.status !== 'Solved' && p.status !== 'Re-solved');
    const pool = eligible.length > 0 ? eligible : problems;
    if (pool.length === 0) return;
    const randomIdx = Math.floor(Math.random() * pool.length);
    const p = pool[randomIdx];
    const url = p.url || `https://leetcode.com/problems/${p.slug}`;
    window.open(url, '_blank');
  };


  const getRoiStyle = (roi) => {
    if (roi === '★★★★★') return { color: 'var(--text-main)', fontWeight: 700 };
    if (roi === '★★★★☆') return { color: 'var(--text-main)', fontWeight: 600 };
    return { color: 'var(--text-muted)', fontWeight: 500 };
  };

  return (
    <div>
      <div className="flex-between mb-6" style={{ flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <h2 style={{ fontSize: '2rem', fontWeight: 600 }}>Master Tracker</h2>
            {(() => {
              const topicProbs = filterTopic === 'All'
                ? problems
                : filterTopic === 'Other Questions'
                  ? problems.filter(p => p.id?.toString().startsWith('custom-'))
                  : problems.filter(p => p.topic === filterTopic && !p.id?.toString().startsWith('custom-'));
              const completed = topicProbs.filter(p => p.status === 'Solved' || p.status === 'Re-solved').length;
              return (
                <span style={{ fontSize: '0.85rem', padding: '0.2rem 0.6rem', background: 'var(--table-header-bg)', color: 'var(--text-main)', fontWeight: 600 }}>
                  {completed}/{topicProbs.length}
                </span>
              );
            })()}
          </div>
          <p className="text-muted">Manage your problems and spaced repetition.</p>
        </div>
        
        <div className="flex-center gap-4">
          <button className="btn btn-primary" onClick={() => setIsAddModalOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Plus size={16} /> Add Problem
          </button>
          <button className="btn btn-outline" onClick={handleSolveRandom} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Shuffle size={16} /> Random
          </button>
          {!isSelectionMode ? (
            <button className="btn btn-primary" onClick={() => setIsSelectionMode(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CalendarPlus size={16} /> Add to Calendar
            </button>
          ) : (
            <div className="flex-center gap-2">
              <button className="btn btn-outline" onClick={() => { setIsSelectionMode(false); setSelectedIds(new Set()); }}>
                Cancel
              </button>
              <button 
                className="btn btn-primary" 
                onClick={generateICS}
                disabled={selectedIds.size === 0}
              >
                Download .ics ({selectedIds.size})
              </button>
            </div>
          )}

          <select 
            className="btn btn-outline" 
            value={filterTopic} 
            onChange={(e) => setFilterTopic(e.target.value)}
          >
            <option value="All">All Topics</option>
            {topics && topics.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
            <option value="Other Questions">Other Questions</option>
          </select>

          <select 
            className="btn btn-outline" 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="All">All Statuses</option>
            <option value="Not Started">Not Started</option>
            <option value="Solved">Solved</option>
            <option value="Hint">Hint</option>
            <option value="Editorial">Editorial</option>
            <option value="Re-solved">Re-solved</option>
          </select>
        </div>
      </div>

      <div className="card glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="responsive-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid var(--border-light)' }}>
                {isSelectionMode && (
                  <th style={{ padding: '1rem', width: '40px' }}>
                    <input 
                      type="checkbox" 
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedIds(new Set(filtered.map(p => p.id)));
                        } else {
                          setSelectedIds(new Set());
                        }
                      }}
                      checked={selectedIds.size === filtered.length && filtered.length > 0}
                    />
                  </th>
                )}
                <th style={{ padding: '1rem', cursor: 'pointer' }} onClick={() => handleSort('problem')}>
                  <div className="flex-center gap-1" style={{ justifyContent: 'flex-start' }}>Problem <SortIcon columnKey="problem" /></div>
                </th>
                <th style={{ padding: '1rem', cursor: 'pointer' }} onClick={() => handleSort('difficulty')}>
                  <div className="flex-center gap-1" style={{ justifyContent: 'flex-start' }}>Difficulty <SortIcon columnKey="difficulty" /></div>
                </th>
                <th style={{ padding: '1rem', cursor: 'pointer' }} onClick={() => handleSort('roi')}>
                  <div className="flex-center gap-1" style={{ justifyContent: 'flex-start' }}>ROI <SortIcon columnKey="roi" /></div>
                </th>
                <th style={{ padding: '1rem', cursor: 'pointer' }} onClick={() => handleSort('status')}>
                  <div className="flex-center gap-1" style={{ justifyContent: 'flex-start' }}>Status <SortIcon columnKey="status" /></div>
                </th>
                <th style={{ padding: '1rem', cursor: 'pointer' }} onClick={() => handleSort('nextRev')}>
                  <div className="flex-center gap-1" style={{ justifyContent: 'flex-start' }}>Next Revision <SortIcon columnKey="nextRev" /></div>
                </th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const renderProblemRow = (p) => {
                  const nextRev = getNextRev(p);
                  return (
                <tr key={p.id} style={{ 
                  borderBottom: '1px solid var(--border-light)',
                  backgroundColor: p.roi === '★★★★★' ? 'var(--roi-5-bg)' : (p.roi === '★★★★☆' ? 'var(--roi-4-bg)' : 'transparent')
                }}>
                  {isSelectionMode && (
                    <td data-label="Select" style={{ padding: '1rem' }}>
                      <input 
                        type="checkbox" 
                        checked={selectedIds.has(p.id)}
                        onChange={(e) => {
                          const newIds = new Set(selectedIds);
                          if (e.target.checked) newIds.add(p.id);
                          else newIds.delete(p.id);
                          setSelectedIds(newIds);
                        }}
                      />
                    </td>
                  )}
                  <td data-label="Problem" style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        {!p.problem.includes('Practice') ? (
                          <>
                            <a 
                              href={p.url || `https://leetcode.com/problems/${p.slug}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              style={{ color: 'var(--text-main)', textDecoration: 'none', fontWeight: 500 }}
                            >
                              {p.problem}
                            </a>
                            <a href={p.url || `https://leetcode.com/problems/${p.slug}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-muted)' }}>
                              <ExternalLink size={14} />
                            </a>
                            <button 
                              className="btn-icon" 
                              style={{ padding: '0.2rem' }}
                              onClick={() => setSelectedEditorial({ id: p.id, tab: 'suggested' })}
                              title="View/Edit Editorial"
                            >
                              <BookOpen size={14} color={p.suggestedSolution ? 'var(--status-solved)' : 'var(--text-muted)'} />
                            </button>
                            <button 
                              className="btn-icon" 
                              style={{ padding: '0.2rem' }}
                              onClick={() => setSelectedEditorial({ id: p.id, tab: 'notes' })}
                              title="My Notes"
                            >
                              <FileText size={14} color={p.editorial ? 'var(--status-solved)' : 'var(--text-muted)'} />
                            </button>
                          </>
                        ) : (
                          <>
                            <span className="text-main" style={{ fontWeight: 500 }}>
                              {p.problem}
                            </span>
                            <button 
                              className="btn-icon" 
                              style={{ padding: '0.2rem' }}
                              onClick={() => setSelectedEditorial({ id: p.id, tab: 'suggested' })}
                              title="View/Edit Editorial"
                            >
                              <BookOpen size={14} color={p.suggestedSolution ? 'var(--status-solved)' : 'var(--text-muted)'} />
                            </button>
                            <button 
                              className="btn-icon" 
                              style={{ padding: '0.2rem' }}
                              onClick={() => setSelectedEditorial({ id: p.id, tab: 'notes' })}
                              title="My Notes"
                            >
                              <FileText size={14} color={p.editorial ? 'var(--status-solved)' : 'var(--text-muted)'} />
                            </button>
                          </>
                        )}
                      </div>
                      <div className="text-xs text-muted mt-1" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        <span>{p.topic}</span>
                        {p.company && p.company !== 'General' && (() => {
                          const companies = p.company.split(',').map(c => c.trim()).filter(Boolean);
                          const displayCompanies = companies.slice(0, 3);
                          const extraCount = companies.length - displayCompanies.length;
                          return (
                            <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                              {displayCompanies.map(c => (
                                <span key={c} style={{ background: 'rgba(128,128,128,0.15)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.65rem', display: 'inline-flex', alignItems: 'center', gap: '4px', lineHeight: '1.2' }}>
                                  {c}
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      removeTag(p.id, c);
                                    }}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', lineHeight: 1 }}
                                    title={`Remove tag "${c}"`}
                                  >
                                    <X size={10} />
                                  </button>
                                </span>
                              ))}
                              {extraCount > 0 && (
                                <span className="custom-tooltip-container" style={{ background: 'rgba(128,128,128,0.15)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.65rem', cursor: 'pointer' }}>
                                  +{extraCount}
                                  <span className="custom-tooltip-text">{companies.slice(3).join(', ')}</span>
                                </span>
                              )}
                            </div>
                          );
                        })()}
                        <button 
                          onClick={() => {
                            const tag = window.prompt('Enter a new tag:');
                            if (tag && tag.trim()) {
                              const existing = p.company && p.company !== 'General' ? p.company.split(',').map(x => x.trim()) : [];
                              if (!existing.map(x => x.toLowerCase()).includes(tag.trim().toLowerCase())) {
                                const newCompany = existing.length ? `${existing.join(', ')}, ${tag.trim()}` : tag.trim();
                                updateProblem(p.id, { company: newCompany });
                              }
                            }
                          }}
                          style={{ background: 'transparent', border: '1px dashed var(--border-strong)', borderRadius: '4px', fontSize: '0.65rem', padding: '2px 8px', cursor: 'pointer', color: 'var(--text-muted)', marginLeft: '4px', display: 'inline-flex', alignItems: 'center', lineHeight: '1.2' }}
                          title="Add Tag"
                        >
                          + Tag
                        </button>
                      </div>
                    </div>
                  </td>
                  <td data-label="Difficulty" style={{ padding: '1rem' }}>
                    <span style={{ color: p.difficulty === 'Easy' ? '#009A44' : (p.difficulty === 'Medium' ? '#C18F00' : '#E3000F'), fontWeight: 600 }}>{p.difficulty}</span>
                  </td>
                  <td data-label="ROI" style={{ padding: '1rem', ...getRoiStyle(p.roi) }}>{p.roi}</td>
                  <td data-label="Status" style={{ padding: '1rem' }}>
                    <select 
                      className={getStatusClass(p.status)}
                      style={{ border: 'none', outline: 'none', cursor: 'pointer', appearance: 'none', minWidth: '115px' }}
                      value={p.status}
                      onChange={(e) => handleStatusChange(p.id, e.target.value)}
                    >
                      <option value="Not Started">Not Started</option>
                      <option value="Solved">Solved</option>
                      <option value="Hint">Hint</option>
                      <option value="Editorial">Editorial</option>
                      <option value="Re-solved">Re-solved</option>
                    </select>
                  </td>
                  <td data-label="Next Revision" style={{ padding: '1rem' }}>
                    {nextRev ? (
                      <div className="flex-center gap-2" style={{ justifyContent: 'flex-start' }}>
                        <span className="text-sm">{format(nextRev, 'MMM dd, yyyy')}</span>
                        <a 
                          href={generateGoogleCalendarLink(p, nextRev)} 
                          onClick={(e) => handleSingleCalendarPopup(e, generateGoogleCalendarLink(p, nextRev))}
                          className="btn-icon"
                          title="Add to Google Calendar"
                        >
                          <CalendarPlus size={16} />
                        </a>
                      </div>
                    ) : (
                      <span className="text-muted text-sm">-</span>
                    )}
                  </td>
                </tr>
                );
              };

              const customProblems = sorted.filter(p => p.id && p.id.toString().startsWith('custom-'));
              const theoryProblems = sorted.filter(p => p.problem.startsWith('Theory:') && (!p.id || !p.id.toString().startsWith('custom-')));
              const practiceProblems = sorted.filter(p => !p.problem.startsWith('Theory:') && (!p.id || !p.id.toString().startsWith('custom-')));

              return (
                <>
                  {theoryProblems.length > 0 && (
                    <>
                      <tr style={{ background: 'rgba(0,0,0,0.05)', borderBottom: '2px solid var(--border-light)' }}>
                        <td colSpan="7" style={{ padding: '0.75rem 1rem', fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase' }}>Theory Mastery</td>
                      </tr>
                      {theoryProblems.map(renderProblemRow)}
                    </>
                  )}
                  {practiceProblems.length > 0 && (
                    <>
                      <tr style={{ background: 'rgba(0,0,0,0.05)', borderBottom: '2px solid var(--border-light)' }}>
                        <td colSpan="7" style={{ padding: '0.75rem 1rem', fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase', marginTop: theoryProblems.length ? '1rem' : 0 }}>Practical Problems</td>
                      </tr>
                      {practiceProblems.map(renderProblemRow)}
                    </>
                  )}
                  {customProblems.length > 0 && (
                    <>
                      <tr style={{ background: 'rgba(0,0,0,0.05)', borderBottom: '2px solid var(--border-light)' }}>
                        <td colSpan="7" style={{ padding: '0.75rem 1rem', fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase', marginTop: (theoryProblems.length || practiceProblems.length) ? '1rem' : 0 }}>Other Questions</td>
                      </tr>
                      {customProblems.map(renderProblemRow)}
                    </>
                  )}
                </>
              );
            })()}
            </tbody>
          </table>
        </div>
      </div>

      {selectedEditorial && (
        <EditorialModal 
          problem={problems.find(p => p.id === selectedEditorial.id)} 
          initialTab={selectedEditorial.tab}
          onClose={() => setSelectedEditorial(null)} 
        />
      )}

      <AddCustomProblemModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
      />
    </div>
  );
}
