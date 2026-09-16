import React, { useState, useMemo } from 'react';
import { useTracker } from '../context/TrackerContext';
import { 
  format, addMonths, subMonths, startOfMonth, endOfMonth, 
  startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, 
  isToday, isBefore, startOfDay
} from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, AlertCircle, CheckCircle, Trash2, Edit2, X, Save, Plus } from 'lucide-react';

export default function ScheduleCalendar() {
  const { problems, updateProblem, completeRevision, addCustomProblem, topics } = useTracker();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('month'); // 'month' | 'year'

  // Interactive Features State
  const [draggedEvent, setDraggedEvent] = useState(null);
  const [dragOverDate, setDragOverDate] = useState(null);
  const [editingEventId, setEditingEventId] = useState(null);
  const [editDateValue, setEditDateValue] = useState('');
  
  // Custom Event State
  const [isAddingEvent, setIsAddingEvent] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: '', topic: 'Graphs', url: '', date: format(new Date(), 'yyyy-MM-dd') });

  const handleAddSubmit = (e) => {
    e.preventDefault();
    if (newEvent.title.trim()) {
      addCustomProblem(newEvent.title, newEvent.topic || (topics && topics[0]) || 'Graphs', newEvent.url, newEvent.date);
      setIsAddingEvent(false);
      setNewEvent({ title: '', topic: (topics && topics[0]) || 'Graphs', url: '', date: format(selectedDate, 'yyyy-MM-dd') });
    }
  };

  const handleDragStart = (e, p) => {
    setDraggedEvent({ id: p.id, intervalKey: p.intervalKey });
    e.dataTransfer.setData('text/plain', p.id);
  };

  const handleDragOver = (e, date) => {
    e.preventDefault();
    setDragOverDate(format(date, 'yyyy-MM-dd'));
  };

  const handleDragLeave = () => {
    setDragOverDate(null);
  };

  const handleDrop = (e, dropDate) => {
    e.preventDefault();
    setDragOverDate(null);
    if (draggedEvent) {
       updateProblem(draggedEvent.id, { [draggedEvent.intervalKey]: format(dropDate, "yyyy-MM-dd'T'12:00:00.000'Z'") });
       setDraggedEvent(null);
    }
  };

  // Build a lookup map: 'YYYY-MM-DD' -> array of problems scheduled for that day
  const scheduleMap = useMemo(() => {
    const map = {};
    problems.forEach(p => {
      // Check all 4 intervals
      [p.r1, p.r3, p.r7, p.r14].forEach((dateStr, index) => {
        if (!dateStr) return;
        const d = new Date(dateStr);
        const key = format(d, 'yyyy-MM-dd');
        
        if (!map[key]) map[key] = [];
        
        // Interval label
        const intervals = ['R1 (+1d)', 'R3 (+3d)', 'R7 (+7d)', 'R14 (+14d)'];
        const intervalKeys = ['r1', 'r3', 'r7', 'r14'];
        
        map[key].push({
          ...p,
          interval: intervals[index],
          intervalKey: intervalKeys[index]
        });
      });
    });
    return map;
  }, [problems]);

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const jumpToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  const renderHeader = () => (
    <div className="flex-between mb-4">
      <h2 style={{ fontSize: '1.5rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <CalendarIcon size={24} style={{ color: 'var(--text-main)' }} />
        <select 
          value={currentDate.getMonth()}
          onChange={(e) => {
            const newDate = new Date(currentDate);
            newDate.setMonth(parseInt(e.target.value));
            setCurrentDate(newDate);
          }}
          className="calendar-select"
          style={{ background: 'transparent', border: 'none', color: 'inherit', fontSize: 'inherit', fontWeight: 'inherit', outline: 'none', cursor: 'pointer', appearance: 'none' }}
        >
          {Array.from({length: 12}).map((_, i) => (
            <option key={i} value={i} style={{ color: '#000' }}>
              {format(new Date(2000, i, 1), 'MMMM')}
            </option>
          ))}
        </select>
        <select 
          value={currentDate.getFullYear()}
          onChange={(e) => {
            const newDate = new Date(currentDate);
            newDate.setFullYear(parseInt(e.target.value));
            setCurrentDate(newDate);
          }}
          className="calendar-select"
          style={{ background: 'transparent', border: 'none', color: 'inherit', fontSize: 'inherit', fontWeight: 'inherit', outline: 'none', cursor: 'pointer', appearance: 'none' }}
        >
          {Array.from({length: 10}).map((_, i) => {
            const year = new Date().getFullYear() - 2 + i;
            return <option key={year} value={year} style={{ color: '#000' }}>{year}</option>;
          })}
        </select>
      </h2>
      <div className="flex-center gap-2">
        <select 
          className="btn btn-outline" 
          value={viewMode} 
          onChange={(e) => setViewMode(e.target.value)}
        >
          <option value="month">Month View</option>
          <option value="year">Year View</option>
        </select>
        <button className="btn btn-outline" onClick={jumpToToday}>Today</button>
        <button className="btn btn-outline" onClick={prevMonth} style={{ padding: '0.5rem' }}><ChevronLeft size={20} /></button>
        <button className="btn btn-outline" onClick={nextMonth} style={{ padding: '0.5rem' }}><ChevronRight size={20} /></button>
      </div>
    </div>
  );

  const renderDays = () => {
    const days = [];
    const startDate = startOfWeek(startOfMonth(currentDate));
    for (let i = 0; i < 7; i++) {
      days.push(
        <div key={i} style={{ textAlign: 'center', fontWeight: 600, padding: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          {format(addDays(startDate, i), 'EEE')}
        </div>
      );
    }
    return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '4px' }}>{days}</div>;
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);
    const today = startOfDay(new Date());

    const rows = [];
    let days = [];
    let day = startDate;

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        const cloneDay = day;
        const dateKey = format(cloneDay, 'yyyy-MM-dd');
        const daySchedule = scheduleMap[dateKey] || [];
        
        const isCurrentMonth = isSameMonth(cloneDay, monthStart);
        const isSelected = isSameDay(cloneDay, selectedDate);
        const isDayToday = isToday(cloneDay);
        const isPastDay = isBefore(cloneDay, today);
        
        const hasItems = daySchedule.length > 0;
        // In a real app we'd track exact completion of an interval, but here we assume if it's past and not "Re-solved" today, it might be missed
        const hasUnsolvedPast = isPastDay && hasItems; 

        days.push(
          <div
            key={cloneDay}
            onClick={() => setSelectedDate(cloneDay)}
            onDragOver={(e) => handleDragOver(e, cloneDay)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, cloneDay)}
            style={{
              minHeight: '80px',
              padding: '0.5rem',
              background: dragOverDate === dateKey 
                 ? 'rgba(0, 90, 156, 0.1)' 
                 : (isSelected ? 'rgba(128,128,128,0.1)' : 'var(--bg-card)'),
              border: `2px solid ${isDayToday ? 'var(--text-main)' : isSelected ? 'var(--border-light)' : 'transparent'}`,
              borderRadius: '4px',
              cursor: 'pointer',
              opacity: isCurrentMonth ? 1 : 0.4,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              transition: 'all 0.2s'
            }}
            className="calendar-cell"
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <span style={{ fontWeight: isDayToday ? 700 : 500 }}>
                {format(cloneDay, 'd')}
              </span>
              {hasUnsolvedPast && (
                <AlertCircle size={14} style={{ color: 'var(--status-editorial)' }} title="Past due items" />
              )}
            </div>
            
            {hasItems && (
              <div style={{ marginTop: 'auto' }}>
                <div style={{ 
                  background: isPastDay ? 'var(--status-editorial)' : 'var(--text-main)', 
                  color: isPastDay ? '#fff' : 'var(--bg-card)', 
                  fontSize: '0.7rem', 
                  fontWeight: 600,
                  padding: '2px 4px', 
                  borderRadius: '4px', 
                  textAlign: 'center'
                }}>
                  {daySchedule.length} task{daySchedule.length > 1 ? 's' : ''}
                </div>
              </div>
            )}
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(<div key={day} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '4px' }}>{days}</div>);
      days = [];
    }
    return (
      <div style={{ paddingBottom: '0.5rem', width: '100%' }}>
        <div style={{ minWidth: '700px' }}>
          {rows}
        </div>
      </div>
    );
  };

  const renderMiniGrid = (monthStart) => {
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(endOfMonth(monthStart));
    let day = startDate;
    const days = [];
    
    for (let i=0; i<7; i++) {
       days.push(<div key={`h-${i}`} style={{ fontSize: '0.6rem', textAlign: 'center', color: 'var(--text-muted)', marginBottom: '4px' }}>{format(addDays(startDate, i), 'EE').charAt(0)}</div>);
    }

    while (day <= endDate) {
      const cloneDay = day;
      const dateKey = format(cloneDay, 'yyyy-MM-dd');
      const daySchedule = scheduleMap[dateKey] || [];
      const isCurrentMonth = isSameMonth(cloneDay, monthStart);
      const hasItems = daySchedule.length > 0;
      
      days.push(
        <div 
          key={cloneDay} 
          onClick={() => {
             setSelectedDate(cloneDay);
             setCurrentDate(cloneDay);
             setViewMode('month');
          }}
          onDragOver={(e) => handleDragOver(e, cloneDay)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, cloneDay)}
          style={{
            aspectRatio: '1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.75rem',
            cursor: 'pointer',
            background: dragOverDate === dateKey 
               ? 'var(--status-editorial)' 
               : (hasItems ? 'var(--text-main)' : 'transparent'),
            color: dragOverDate === dateKey 
               ? '#fff' 
               : (hasItems ? 'var(--bg-card)' : (isCurrentMonth ? 'var(--text-main)' : 'var(--text-muted)')),
            opacity: isCurrentMonth ? 1 : 0.2,
            borderRadius: '4px',
            fontWeight: hasItems ? 700 : 400
          }}
          title={hasItems ? `${daySchedule.length} revisions` : ''}
        >
          {format(cloneDay, 'd')}
        </div>
      );
      day = addDays(day, 1);
    }
    return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>{days}</div>;
  };

  const renderYearView = () => {
    const months = [];
    for (let i = 0; i < 12; i++) {
      const monthStart = new Date(currentDate.getFullYear(), i, 1);
      months.push(
        <div key={i} style={{ padding: '0.75rem', background: 'rgba(128,128,128,0.05)', borderRadius: '8px' }}>
          <h4 style={{ textAlign: 'center', marginBottom: '0.75rem', fontWeight: 600, fontSize: '0.9rem' }}>{format(monthStart, 'MMMM')}</h4>
          {renderMiniGrid(monthStart)}
        </div>
      );
    }
    return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1.5rem', overflowY: 'auto' }}>{months}</div>;
  };

  const renderSelectedDayDetails = () => {
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    const daySchedule = scheduleMap[dateKey] || [];
    
    return (
      <div className="card glass-panel" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: '1rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 className="card-header" style={{ margin: 0 }}>
            {format(selectedDate, 'EEEE, MMMM do')}
          </h3>
          <button className="btn btn-primary" onClick={() => {
            setNewEvent(prev => ({ ...prev, date: format(selectedDate, 'yyyy-MM-dd') }));
            setIsAddingEvent(true);
          }} style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
            <Plus size={14} /> Add External Problem
          </button>
        </div>
        
        {isAddingEvent && (
          <form onSubmit={handleAddSubmit} style={{ padding: '1rem', background: 'var(--code-bg)', borderRadius: '8px', marginBottom: '1rem' }}>
             <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.9rem' }}>Track an external problem</h4>
             <input required placeholder="Problem Title (e.g. Dijkstra Shortest Path)" value={newEvent.title} onChange={e => setNewEvent({...newEvent, title: e.target.value})} className="form-input" style={{width: '100%', marginBottom: '0.5rem'}}/>
             <div style={{ marginBottom: '0.5rem' }}>
               <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>Topic / Category:</label>
               <select 
                 value={newEvent.topic} 
                 onChange={e => setNewEvent({...newEvent, topic: e.target.value})} 
                 className="form-input" 
                 style={{width: '100%'}}
               >
                 {topics && topics.map(t => (
                   <option key={t} value={t}>{t}</option>
                 ))}
                 <option value="Other">Other</option>
               </select>
             </div>
             <input placeholder="URL (optional)" type="url" value={newEvent.url} onChange={e => setNewEvent({...newEvent, url: e.target.value})} className="form-input" style={{width: '100%', marginBottom: '0.5rem'}}/>
             <div className="flex-between" style={{ marginBottom: '1rem' }}>
               <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Date Solved:</label>
               <input type="date" required value={newEvent.date} onChange={e => setNewEvent({...newEvent, date: e.target.value})} className="form-input" style={{ padding: '0.25rem' }}/>
             </div>
             <div className="flex-between">
               <button type="button" className="btn btn-outline" onClick={() => setIsAddingEvent(false)}>Cancel</button>
               <button type="submit" className="btn btn-primary">Track Problem</button>
             </div>
          </form>
        )}
        
        {daySchedule.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
            <p>No revisions scheduled for this day.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', overflowY: 'auto', paddingRight: '0.5rem' }}>
            {daySchedule.map((p, idx) => {
              const eventId = `${p.id}-${p.intervalKey}`;
              const isEditing = editingEventId === eventId;

              return (
              <div key={eventId} draggable onDragStart={(e) => handleDragStart(e, p)} style={{ 
                padding: '1rem', 
                background: 'rgba(128,128,128,0.05)', 
                borderRadius: '8px',
                borderLeft: `4px solid ${isBefore(selectedDate, startOfDay(new Date())) ? 'var(--status-editorial)' : 'var(--text-main)'}`,
                cursor: 'grab'
              }}>
                <div className="flex-between mb-2">
                  <span style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.5px' }}>
                    {p.interval} • {p.topic}
                  </span>
                  <span className={`badge badge-${p.status.toLowerCase().replace(/[- ]/g, '')}`}>{p.status}</span>
                </div>
                
                {isEditing ? (
                  <div className="flex-between" style={{ alignItems: 'center', marginTop: '0.5rem' }}>
                    <input 
                      type="date" 
                      value={editDateValue}
                      onChange={e => setEditDateValue(e.target.value)}
                      className="form-input" 
                      style={{ padding: '0.25rem', fontSize: '0.9rem' }}
                    />
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      <button className="btn btn-outline" onClick={() => {
                        if(editDateValue) {
                           updateProblem(p.id, { [p.intervalKey]: editDateValue + 'T12:00:00.000Z' });
                        }
                        setEditingEventId(null);
                      }} title="Save"><Save size={14}/></button>
                      <button className="btn btn-outline" onClick={() => setEditingEventId(null)} title="Cancel"><X size={14}/></button>
                    </div>
                  </div>
                ) : (
                  <div className="flex-between" style={{ alignItems: 'center' }}>
                    <a 
                      href={p.url || `https://leetcode.com/problems/${p.slug}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-main)', textDecoration: 'none', flex: 1 }}
                    >
                      {p.problem}
                    </a>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button 
                        className="btn btn-outline" 
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                        onClick={() => completeRevision(p.id, p.intervalKey)}
                        title="Mark this revision cycle as completed"
                      >
                        <CheckCircle size={14} /> Revised
                      </button>
                      <button 
                        className="btn btn-outline" 
                        style={{ padding: '0.25rem' }}
                        onClick={() => {
                          setEditDateValue(format(selectedDate, 'yyyy-MM-dd'));
                          setEditingEventId(eventId);
                        }}
                        title="Edit date"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button 
                        className="btn btn-outline" 
                        style={{ padding: '0.25rem', color: 'var(--status-editorial)' }}
                        onClick={() => updateProblem(p.id, { r1: null, r3: null, r7: null, r14: null })}
                        title="Remove entirely from spaced repetition"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )})}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="animate-fade-in" style={{ height: 'calc(100vh - 4rem)' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700 }}>Revision Calendar</h1>
        <p className="text-muted">Stay on top of your 1, 3, 7, and 14-day spaced repetitions.</p>
      </div>

      <div className="calendar-layout" style={{ height: 'calc(100% - 6rem)' }}>
        <div className="card glass-panel" style={{ display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          {renderHeader()}
          {viewMode === 'month' ? (
            <div style={{ overflowX: 'auto', width: '100%' }}>
              <div style={{ minWidth: '700px' }}>
                {renderDays()}
                <div style={{ flex: 1 }}>
                  {renderCells()}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ flex: 1 }}>
              {renderYearView()}
            </div>
          )}
        </div>
        
        <div style={{ overflowY: 'auto' }}>
          {renderSelectedDayDetails()}
        </div>
      </div>
    </div>
  );
}
