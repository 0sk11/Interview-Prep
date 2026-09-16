import React, { useState } from 'react';
import { useTracker } from '../context/TrackerContext';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function ContestLog() {
  const { contestLog, addContest } = useTracker();
  
  const [date, setDate] = useState('');
  const [name, setName] = useState('');
  const [before, setBefore] = useState('');
  const [after, setAfter] = useState('');
  const [penalty, setPenalty] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!date || !name || !before || !after) return;
    
    addContest({
      date,
      name,
      before: parseInt(before),
      after: parseInt(after),
      penalty: parseInt(penalty) || 0
    });
    
    setDate(''); setName(''); setBefore(''); setAfter(''); setPenalty('');
  };

  return (
    <div>
      <div className="flex-between mb-6">
        <div>
          <h2 style={{ fontSize: '2rem', fontWeight: 600 }}>Contest Log</h2>
          <p className="text-muted">Track your performance and rating changes.</p>
        </div>
      </div>

      <div className="grid-cards mb-6">
        <div className="card glass-panel" style={{ gridColumn: 'span 2' }}>
          <h3 className="card-header">Rating Progress</h3>
          <div style={{ height: '300px', width: '100%', marginTop: '2rem' }}>
            {/* Minimal line chart using recharts */}
            {contestLog.length > 0 ? (
               <div style={{display: 'flex', alignItems: 'flex-end', height: '100%', gap: '4px'}}>
                  {contestLog.map((c, i) => {
                     const height = Math.max(10, ((c.after - 1200) / 1000) * 100);
                     return (
                        <div key={c.id} style={{flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', group: 'hover'}}>
                           <div className="text-xs text-muted mb-1" style={{transform: 'rotate(-45deg)', transformOrigin: 'left bottom'}}>{c.after}</div>
                           <div style={{width: '100%', height: `${height}%`, background: '#000000', opacity: 0.8, borderTopLeftRadius: '0', borderTopRightRadius: '0'}}></div>
                        </div>
                     )
                  })}
               </div>
            ) : (
               <div className="flex-center text-muted h-full">No data yet</div>
            )}
          </div>
        </div>

        <div className="card glass-panel">
          <h3 className="card-header">Log New Contest</h3>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <input type="date" className="btn btn-outline" style={{ width: '100%', textAlign: 'left' }} value={date} onChange={e => setDate(e.target.value)} required />
            <input type="text" placeholder="Contest Name" className="btn btn-outline" style={{ width: '100%', textAlign: 'left' }} value={name} onChange={e => setName(e.target.value)} required />
            <div className="flex-between gap-2">
               <input type="number" placeholder="Rating Before" className="btn btn-outline" style={{ width: '100%', textAlign: 'left' }} value={before} onChange={e => setBefore(e.target.value)} required />
               <input type="number" placeholder="Rating After" className="btn btn-outline" style={{ width: '100%', textAlign: 'left' }} value={after} onChange={e => setAfter(e.target.value)} required />
            </div>
            <input type="number" placeholder="Penalty (mins)" className="btn btn-outline" style={{ width: '100%', textAlign: 'left' }} value={penalty} onChange={e => setPenalty(e.target.value)} />
            <button type="submit" className="btn btn-primary mt-2">Save Contest</button>
          </form>
        </div>
      </div>
      
      <div className="card glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto', width: '100%' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'var(--table-header-bg)', borderBottom: '2px solid var(--border-light)' }}>
                  <th style={{ padding: '1rem' }}>Date</th>
                  <th style={{ padding: '1rem' }}>Contest</th>
                  <th style={{ padding: '1rem' }}>Before</th>
                  <th style={{ padding: '1rem' }}>After</th>
                  <th style={{ padding: '1rem' }}>Change</th>
                </tr>
              </thead>
              <tbody>
                {contestLog.map(c => {
                  const diff = c.after - c.before;
                  return (
                    <tr key={c.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <td style={{ padding: '1rem' }}>{c.date}</td>
                      <td style={{ padding: '1rem', fontWeight: 600 }}>{c.name}</td>
                      <td style={{ padding: '1rem' }}>{c.before}</td>
                      <td style={{ padding: '1rem', fontWeight: 600 }}>{c.after}</td>
                      <td style={{ padding: '1rem', color: diff >= 0 ? 'var(--status-solved)' : 'var(--status-editorial)' }}>
                        {diff > 0 ? '+' : ''}{diff}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
