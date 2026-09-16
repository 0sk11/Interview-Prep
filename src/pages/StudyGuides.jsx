import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, ExternalLink } from 'lucide-react';
import mermaid from 'mermaid';
import { useTracker } from '../context/TrackerContext';
import { studyGuides } from '../data/initialData';

const primerTopics = {
  pacelc: { 
    title: "CAP & PACELC Theorem", 
    coverage: "Know what they stand for. Understand that you always have to trade off consistency vs availability when a partition occurs, and latency vs consistency during normal operation.", 
    url: "https://github.com/donnemartin/system-design-primer#cap-theorem",
    altResources: [
      { label: "ByteByteGo: CAP Theorem", url: "https://www.youtube.com/results?search_query=ByteByteGo+CAP+Theorem" },
      { label: "IBM: CAP Theorem Explained", url: "https://www.ibm.com/topics/cap-theorem" }
    ]
  },
  perf: { 
    title: "Performance vs Scalability", 
    coverage: "Understand the difference. Performance = doing the same work faster. Scalability = doing more work with more resources. Know vertical vs horizontal scaling.", 
    url: "https://github.com/donnemartin/system-design-primer#performance-vs-scalability",
    altResources: [
      { label: "Hussein Nasser: Scaling up vs Scaling out", url: "https://www.youtube.com/results?search_query=Hussein+Nasser+Scaling+up+vs+Scaling+out" }
    ]
  },
  dns: { 
    title: "Domain Name System (DNS)", 
    coverage: "High-level understanding. Know A records (IP) and CNAME records (alias). Understand that DNS introduces latency and why caching helps. Don't deep dive into DNS zone transfers.", 
    url: "https://github.com/donnemartin/system-design-primer#domain-name-system",
    altResources: [
      { label: "ByteByteGo: How does DNS work?", url: "https://www.youtube.com/results?search_query=ByteByteGo+How+does+DNS+work" },
      { label: "Cloudflare: What is DNS?", url: "https://www.cloudflare.com/learning/dns/what-is-dns/" }
    ]
  },
  cdn: { 
    title: "Content Delivery Network (CDN)", 
    coverage: "Essential. Understand Push vs Pull CDNs. Know they cache static media close to the user to reduce latency and origin server load.", 
    url: "https://github.com/donnemartin/system-design-primer#content-delivery-network",
    altResources: [
      { label: "ByteByteGo: What is a CDN?", url: "https://www.youtube.com/results?search_query=ByteByteGo+What+is+a+CDN" },
      { label: "Cloudflare: What is a CDN?", url: "https://www.cloudflare.com/learning/cdn/what-is-a-cdn/" }
    ]
  },
  lb: { 
    title: "Load Balancers", 
    coverage: "Crucial. Know Layer 4 vs Layer 7 load balancing. Understand Round Robin, Least Connections, and IP Hash. Know how they prevent single points of failure.", 
    url: "https://github.com/donnemartin/system-design-primer#load-balancer",
    altResources: [
      { label: "Hussein Nasser: L4 vs L7 Load Balancing", url: "https://www.youtube.com/results?search_query=Hussein+Nasser+L4+vs+L7+Load+Balancing" },
      { label: "ByteByteGo: Load Balancer Crash Course", url: "https://www.youtube.com/results?search_query=ByteByteGo+Load+Balancer+Crash+Course" }
    ]
  },
  proxy: { 
    title: "Reverse Proxy", 
    coverage: "Understand how it differs from a load balancer (though they often overlap). Know it handles SSL termination, compression, and caching.", 
    url: "https://github.com/donnemartin/system-design-primer#reverse-proxy-web-server",
    altResources: [
      { label: "Hussein Nasser: Reverse Proxy Explained", url: "https://www.youtube.com/results?search_query=Hussein+Nasser+Reverse+Proxy+Explained" }
    ]
  },
  rdbms: { 
    title: "SQL / RDBMS", 
    coverage: "ACID properties. Understand the limits of scaling RDBMS. Know Master-Slave replication, Federation, and Sharding tradeoffs.", 
    url: "https://github.com/donnemartin/system-design-primer#relational-database-management-system-rdbms",
    altResources: [
      { label: "ByteByteGo: Database Sharding", url: "https://www.youtube.com/results?search_query=ByteByteGo+Database+Sharding" },
      { label: "DigitalOcean: Sharding Tutorial", url: "https://www.digitalocean.com/community/tutorials/understanding-database-sharding" }
    ]
  },
  nosql: { 
    title: "NoSQL", 
    coverage: "BASE properties. Know the 4 main types: Key-Value, Document, Wide-Column, Graph. Understand WHEN to use them over SQL.", 
    url: "https://github.com/donnemartin/system-design-primer#nosql",
    altResources: [
      { label: "ByteByteGo: SQL vs NoSQL", url: "https://www.youtube.com/results?search_query=ByteByteGo+SQL+vs+NoSQL" }
    ]
  },
  cache: { 
    title: "Caching", 
    coverage: "Extremely important. Know Cache-Aside, Write-Through, Write-Behind. Understand cache eviction (LRU). Know where to cache (Client, CDN, Web, DB).", 
    url: "https://github.com/donnemartin/system-design-primer#cache",
    altResources: [
      { label: "ByteByteGo: Top 5 Caching Strategies", url: "https://www.youtube.com/results?search_query=ByteByteGo+Top+5+Caching+Strategies" },
      { label: "CodeAhoy: Caching Strategies", url: "https://codeahoy.com/2017/08/11/caching-strategies-and-how-to-choose-the-right-one/" }
    ]
  },
  mq: { 
    title: "Message Queues", 
    coverage: "Vital for decoupling. Understand publisher/subscriber model. Know how it handles back pressure and asynchronous processing.", 
    url: "https://github.com/donnemartin/system-design-primer#asynchronism",
    altResources: [
      { label: "ByteByteGo: Message Queues Explained", url: "https://www.youtube.com/results?search_query=ByteByteGo+Message+Queues+Explained" },
      { label: "Hussein Nasser: RabbitMQ vs Kafka", url: "https://www.youtube.com/results?search_query=Hussein+Nasser+RabbitMQ+vs+Kafka" }
    ]
  },
  comm: { 
    title: "Communication", 
    coverage: "Understand TCP vs UDP at a high level. Know REST vs RPC. Don't deep dive into the OSI model.", 
    url: "https://github.com/donnemartin/system-design-primer#communication",
    altResources: [
      { label: "ByteByteGo: REST vs gRPC vs GraphQL", url: "https://www.youtube.com/results?search_query=ByteByteGo+REST+vs+gRPC+vs+GraphQL" }
    ]
  }
};

const mapCategories = [
  {
    id: 'core',
    title: 'Core Principles',
    color: 'var(--accent-secondary)',
    items: ['pacelc', 'perf']
  },
  {
    id: 'network',
    title: 'Networking & Web',
    color: 'var(--accent-primary)',
    items: ['dns', 'cdn', 'lb', 'proxy', 'comm']
  },
  {
    id: 'data',
    title: 'Data & Storage',
    color: '#8B5CF6',
    items: ['rdbms', 'nosql', 'cache']
  },
  {
    id: 'async',
    title: 'Asynchronism',
    color: '#F59E0B',
    items: ['mq']
  }
];

export default function StudyGuides() {
  const { activeCurriculum, problems } = useTracker();
  const [activeTab, setActiveTab] = useState(activeCurriculum === 'hld' ? 'primer' : 'patterns');
  const [expandedTemplates, setExpandedTemplates] = useState({});
  const [selectedTopic, setSelectedTopic] = useState(null);
  
  const toggleTemplate = (name) => {
    setExpandedTemplates(prev => ({
      ...prev,
      [name]: !prev[name]
    }));
  };
  
  const currentGuides = studyGuides[activeCurriculum] || studyGuides.dsa;

  const tabs = [
    { id: 'patterns', label: 'Pattern Bible' },
    { id: 'companies', label: 'Company Focus' },
    { id: 'roadmap', label: '180-Day Roadmap' }
  ];

  if (activeCurriculum === 'hld') {
    tabs.unshift({ id: 'primer', label: 'System Design Primer Map' });
  }

  if (currentGuides.templates) {
    tabs.push({ id: 'templates', label: 'Code Templates' });
  }

  if (currentGuides.commonPatterns) {
    tabs.splice(1, 0, { id: 'commonPatterns', label: 'Common Architectures' });
  }

  if (currentGuides.lastMinute) {
    tabs.push({ id: 'lastMinute', label: 'Last Minute Revision' });
  }

  return (
    <div>
      <div className="flex-between mb-6">
        <div>
          <h2 style={{ fontSize: '2rem', fontWeight: 600 }}>Study Guides</h2>
          <p className="text-muted">Reference materials to guide your preparation.</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        {tabs.map(t => (
          <button 
            key={t.id}
            className={`btn ${activeTab === t.id ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="card glass-panel animate-fade-in" style={{ padding: 0, overflow: 'hidden' }}>
        {activeTab === 'patterns' && (
          <div style={{ overflowX: 'auto', width: '100%' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'var(--table-header-bg)', borderBottom: '2px solid var(--border-light)' }}>
                  <th style={{ padding: '1rem' }}>{activeCurriculum === 'hld' ? 'Architecture Concept' : 'Pattern'}</th>
                  <th style={{ padding: '1rem' }}>Recognition Cue</th>
                  <th style={{ padding: '1rem' }}>Template / Solution</th>
                  <th style={{ padding: '1rem' }}>Practice / Examples</th>
                </tr>
              </thead>
              <tbody>
                {currentGuides.patternBible.map(p => (
                  <tr key={p.pattern} style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <td style={{ padding: '1rem', fontWeight: 600, color: 'var(--accent-secondary)' }}>
                      {p.pattern}
                      <div style={{ fontSize: '0.75rem', color: '#E3000F', marginTop: '4px', fontWeight: 400 }}>Mistake: {p.mistake}</div>
                    </td>
                    <td style={{ padding: '1rem' }}>{p.cue}</td>
                    <td style={{ padding: '1rem', fontFamily: 'monospace', color: '#009A44' }}>{p.template}</td>
                    <td style={{ padding: '1rem' }}>
                      {p.guideUrl && (
                        <div style={{ marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px dashed rgba(255,255,255,0.1)' }}>
                          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>Theory Guide:</div>
                          <a href={p.guideUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-main)', fontSize: '0.85rem' }}>
                            📖 {p.guideTitle || "Read Article"}
                          </a>
                        </div>
                      )}
                      {p.slugs && p.slugs.length > 0 && (
                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-primary)', textTransform: 'uppercase', marginBottom: '4px' }}>Practice:</div>
                      )}
                      {p.slugs && p.slugs.map(slug => {
                        const matched = problems.find(prob => prob.slug === slug);
                        const displayTitle = matched ? matched.problem.replace('Theory: ', '') : slug;
                        const link = matched && matched.url ? matched.url : `https://leetcode.com/problems/${slug}`;
                        return (
                          <div key={slug} style={{ marginBottom: '4px' }}>
                            <a href={link} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                              • {displayTitle}
                            </a>
                          </div>
                        );
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'primer' && (
          <div style={{ padding: '2rem' }}>
            <p className="text-muted" style={{ textAlign: 'center', maxWidth: '600px', margin: '0 auto 3rem auto' }}>
              Click any topic below to see exactly what you need to cover and a direct link to the System Design Primer repo.
            </p>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem' }}>
              {mapCategories.map(cat => (
                <div key={cat.id} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{
                    background: `linear-gradient(90deg, ${cat.color}20, transparent)`,
                    borderLeft: `4px solid ${cat.color}`,
                    padding: '1rem',
                    borderRadius: '0 8px 8px 0',
                    fontWeight: 600,
                    fontSize: '1.2rem',
                    color: 'var(--text-main)'
                  }}>
                    {cat.title}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingLeft: '1rem', borderLeft: '2px dashed var(--border-light)' }}>
                    {cat.items.map(itemId => {
                      const topic = primerTopics[itemId];
                      return (
                        <button
                          key={itemId}
                          onClick={() => setSelectedTopic(topic)}
                          style={{
                            background: 'var(--bg-secondary)',
                            border: '1px solid var(--border-light)',
                            padding: '1rem',
                            borderRadius: '8px',
                            color: 'var(--text-main)',
                            textAlign: 'left',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            position: 'relative',
                            overflow: 'hidden'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateX(5px)';
                            e.currentTarget.style.borderColor = cat.color;
                            e.currentTarget.style.background = 'var(--bg-hover)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateX(0)';
                            e.currentTarget.style.borderColor = 'var(--border-light)';
                            e.currentTarget.style.background = 'var(--bg-secondary)';
                          }}
                        >
                          <div style={{
                            position: 'absolute',
                            left: 0,
                            top: 0,
                            bottom: 0,
                            width: '4px',
                            background: cat.color,
                            opacity: 0.5
                          }} />
                          <div style={{ fontWeight: 500 }}>{topic.title}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'companies' && (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--table-header-bg)', borderBottom: '2px solid var(--border-light)' }}>
                <th style={{ padding: '1rem' }}>Company</th>
                <th style={{ padding: '1rem' }}>Priority Topics</th>
                <th style={{ padding: '1rem' }}>Must-do Problems</th>
              </tr>
            </thead>
            <tbody>
              {currentGuides.companyFocus.map(c => (
                <tr key={c.company} style={{ borderBottom: '1px solid var(--border-light)' }}>
                  <td style={{ padding: '1rem', fontWeight: 600, fontSize: '1.1rem' }}>{c.company}</td>
                  <td style={{ padding: '1rem', color: 'var(--accent-primary)' }}>{c.topics}</td>
                  <td style={{ padding: '1rem' }}>{c.problems}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {activeTab === 'roadmap' && (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--table-header-bg)', borderBottom: '2px solid var(--border-light)' }}>
                <th style={{ padding: '1rem' }}>Month</th>
                <th style={{ padding: '1rem' }}>Focus Area</th>
                <th style={{ padding: '1rem' }}>Goal</th>
              </tr>
            </thead>
            <tbody>
              {currentGuides.roadmap.map(r => (
                <tr key={r.month} style={{ borderBottom: '1px solid var(--border-light)' }}>
                  <td style={{ padding: '1rem', fontWeight: 600, fontSize: '1.2rem', color: 'var(--accent-secondary)' }}>{r.month}</td>
                  <td style={{ padding: '1rem', fontWeight: 500 }}>{r.focus}</td>
                  <td style={{ padding: '1rem', color: '#FFD100' }}>{r.goal}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {activeTab === 'commonPatterns' && currentGuides.commonPatterns && (
          <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {currentGuides.commonPatterns.map(pattern => (
              <div key={pattern.name} style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--border-strong)' }}>
                <h3 style={{ margin: '0 0 1rem 0', color: 'var(--accent-secondary)', fontSize: '1.4rem' }}>{pattern.name}</h3>
                
                {pattern.imageUrl && (
                  <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
                    <img 
                      src={pattern.imageUrl} 
                      alt={`${pattern.name} Architecture Diagram`} 
                      style={{ maxWidth: '100%', height: 'auto', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }} 
                    />
                  </div>
                )}
                
                {pattern.challenge && (
                  <div style={{ marginBottom: '1rem', color: 'var(--text-main)', fontSize: '1rem', lineHeight: '1.6' }}>
                    <strong style={{ color: '#E3000F' }}>The Challenge:</strong> {pattern.challenge}
                  </div>
                )}
                
                {pattern.analogy && (
                  <div style={{ marginBottom: '1.5rem', color: 'var(--text-main)', fontSize: '0.95rem', lineHeight: '1.6', fontStyle: 'italic', background: 'rgba(255,255,255,0.03)', padding: '1rem', borderLeft: '3px solid var(--accent-primary)', borderRadius: '4px' }}>
                    <strong style={{ fontStyle: 'normal', color: 'var(--accent-primary)' }}>Think of it like:</strong> {pattern.analogy}
                  </div>
                )}

                {pattern.strategies && pattern.strategies.length > 0 && (
                  <>
                    <h4 style={{ margin: '0 0 0.75rem 0', color: 'var(--text-muted)' }}>Key Strategies:</h4>
                    <ul style={{ margin: 0, paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
                      {pattern.strategies.map((strategy, idx) => {
                        const colonIndex = strategy.indexOf(': ');
                        if (colonIndex !== -1) {
                          const boldPart = strategy.substring(0, colonIndex);
                          const rest = strategy.substring(colonIndex + 2);
                          return (
                            <li key={idx} style={{ color: 'var(--text-main)', fontSize: '1rem', lineHeight: '1.5' }}>
                              <strong style={{ color: '#fff' }}>{boldPart}:</strong> {rest}
                            </li>
                          );
                        }
                        return (
                          <li key={idx} style={{ color: 'var(--text-main)', fontSize: '1rem', lineHeight: '1.5' }}>
                            {strategy}
                          </li>
                        );
                      })}
                    </ul>
                  </>
                )}

                {pattern.exampleFlow && (
                  <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '6px', border: '1px dashed var(--border-light)' }}>
                    <strong style={{ color: 'var(--accent-secondary)' }}>Example Flow:</strong>
                    <div style={{ marginTop: '0.5rem', color: 'var(--text-main)', fontSize: '0.95rem', lineHeight: '1.6' }}>{pattern.exampleFlow}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        
        {activeTab === 'lastMinute' && currentGuides.lastMinute && (
          <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {currentGuides.lastMinute.map(section => (
              <div key={section.topic} style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--border-strong)' }}>
                <h3 style={{ margin: '0 0 1rem 0', color: 'var(--accent-primary)', fontSize: '1.3rem' }}>{section.topic}</h3>
                <ul style={{ margin: 0, paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {section.points.map((point, idx) => (
                    <li key={idx} style={{ color: 'var(--text-main)', fontSize: '1rem', lineHeight: '1.5' }}>
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
        {activeTab === 'templates' && currentGuides.templates && (
          <div style={{ padding: 'clamp(1rem, 3vw, 2rem)', display: 'flex', flexDirection: 'column', gap: 'clamp(1rem, 3vw, 2rem)', maxWidth: '100%' }}>
            {currentGuides.templates.map(function renderTemplate(template, idx, arr, isSub = false) {
              const isExpanded = expandedTemplates[template.name];
              return (
              <div key={template.name} style={{ background: isSub === true ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.02)', padding: 'clamp(1rem, 3vw, 1.5rem)', borderRadius: '8px', border: '1px solid var(--border-strong)', transition: 'all 0.3s ease', maxWidth: '100%' }}>
                <div 
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                  onClick={() => toggleTemplate(template.name)}
                >
                  <h3 style={{ margin: 0, color: isSub === true ? 'var(--accent-primary)' : 'var(--accent-secondary)', fontSize: isSub === true ? 'clamp(1.1rem, 3vw, 1.2rem)' : 'clamp(1.2rem, 4vw, 1.4rem)' }}>{template.name}</h3>
                  <span style={{ color: 'var(--text-muted)', fontSize: '1.5rem', fontWeight: 'bold' }}>
                    {isExpanded ? '−' : '+'}
                  </span>
                </div>
                
                {isExpanded && (
                  <div style={{ marginTop: '1.5rem', animation: 'fadeIn 0.3s ease', maxWidth: '100%' }}>
                    {template.referenceUrl && (
                      <div style={{ marginBottom: '1.5rem' }}>
                        <a 
                          href={template.referenceUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            color: 'var(--accent-primary)',
                            textDecoration: 'none',
                            fontSize: '0.9rem',
                            padding: '0.4rem 0.8rem',
                            background: 'rgba(56, 189, 248, 0.1)',
                            borderRadius: '4px',
                            border: '1px solid rgba(56, 189, 248, 0.2)',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(56, 189, 248, 0.2)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(56, 189, 248, 0.1)';
                          }}
                        >
                          📖 Read the Full Pattern Article
                        </a>
                      </div>
                    )}
                    
                    {template.description && (
                      <div style={{ marginBottom: '1.5rem', color: 'var(--text-main)', fontSize: '1rem', lineHeight: '1.6', fontStyle: 'italic' }}>
                        {template.description}
                      </div>
                    )}
                    
                    {template.challenge && (
                      <div style={{ marginBottom: '1rem', color: 'var(--text-main)', fontSize: '1rem', lineHeight: '1.6' }}>
                        <strong style={{ color: '#E3000F' }}>The Challenge:</strong> {template.challenge}
                      </div>
                    )}
                    
                    {template.analogy && (
                      <div style={{ marginBottom: '1.5rem', color: 'var(--text-main)', fontSize: '0.95rem', lineHeight: '1.6', fontStyle: 'italic', background: 'rgba(255,255,255,0.03)', padding: '1rem', borderLeft: '3px solid var(--accent-primary)', borderRadius: '4px' }}>
                        <strong style={{ fontStyle: 'normal', color: 'var(--accent-primary)' }}>Think of it like:</strong> {template.analogy}
                      </div>
                    )}

                    {template.strategies && template.strategies.length > 0 && (
                      <>
                        <h4 style={{ margin: '0 0 0.75rem 0', color: 'var(--text-muted)' }}>Key Strategies:</h4>
                        <ul style={{ margin: 0, paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
                          {template.strategies.map((strategy, i) => {
                            const colonIndex = strategy.indexOf(': ');
                            if (colonIndex !== -1) {
                              const boldPart = strategy.substring(0, colonIndex);
                              const rest = strategy.substring(colonIndex + 2);
                              return (
                                <li key={i} style={{ color: 'var(--text-main)', fontSize: '1rem', lineHeight: '1.5' }}>
                                  <strong style={{ color: '#fff' }}>{boldPart}:</strong> {rest}
                                </li>
                              );
                            }
                            return (
                              <li key={i} style={{ color: 'var(--text-main)', fontSize: '1rem', lineHeight: '1.5' }}>
                                {strategy}
                              </li>
                            );
                          })}
                        </ul>
                      </>
                    )}

                    {template.problems && (
                      <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(56, 189, 248, 0.05)', border: '1px solid rgba(56, 189, 248, 0.2)', borderRadius: '6px' }}>
                        <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--accent-primary)' }}>Practice Now:</h4>
                        <div style={{ color: 'var(--text-main)', fontSize: '0.95rem', lineHeight: '1.5', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                          {Array.isArray(template.problems) ? (
                            template.problems.map((prob, i) => (
                              <a 
                                key={i} 
                                href={prob.url} 
                                target="_blank" 
                                rel="noreferrer" 
                                style={{ color: 'var(--accent-secondary)', textDecoration: 'none', background: 'rgba(0,0,0,0.2)', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.85rem' }}
                                onMouseEnter={(e) => e.target.style.background = 'rgba(14, 165, 233, 0.2)'}
                                onMouseLeave={(e) => e.target.style.background = 'rgba(0,0,0,0.2)'}
                              >
                                {prob.name}
                              </a>
                            ))
                          ) : (
                            template.problems
                          )}
                        </div>
                      </div>
                    )}

                    {template.exampleFlow && (
                      <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '100%' }}>
                        <strong style={{ color: 'var(--accent-secondary)' }}>Code Templates:</strong>
                        {template.exampleFlow.split(/(?=\/\/ \d\.)/).map((block, i) => (
                          <div key={i} style={{ padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '6px', border: '1px dashed var(--border-light)', overflowX: 'auto', maxWidth: '100%' }}>
                            <pre style={{ margin: 0, color: 'var(--text-main)', fontSize: '0.9rem', lineHeight: '1.6', whiteSpace: 'pre', fontFamily: 'monospace' }}>
                              {block.trim()}
                            </pre>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {template.subTemplates && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.5rem' }}>
                        {template.subTemplates.map(sub => renderTemplate(sub, 0, [], true))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )})}
          </div>
        )}
      </div>

      {selectedTopic && createPortal(
        <div className="modal-overlay" onClick={() => setSelectedTopic(null)}>
          <div className="modal-content animate-scale-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2>{selectedTopic.title}</h2>
              <button className="btn-icon" onClick={() => setSelectedTopic(null)}>
                <X size={20} />
              </button>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <div style={{ marginBottom: '1.5rem', color: 'var(--text-main)', lineHeight: '1.6' }}>
                <strong style={{ color: 'var(--accent-secondary)' }}>How much to cover:</strong>
                <p style={{ marginTop: '0.5rem' }}>{selectedTopic.coverage}</p>
              </div>

              {selectedTopic.altResources && (
                <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(128,128,128,0.05)', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
                  <strong style={{ color: 'var(--text-main)', display: 'block', marginBottom: '0.75rem' }}>Alternate Resources:</strong>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {selectedTopic.altResources.map((res, i) => (
                      <a key={i} href={res.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem', textDecoration: 'none' }} onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'} onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}>
                        • {res.label} <ExternalLink size={14} />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <a 
                href={selectedTopic.url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center' }}
              >
                Read in System Design Primer <ExternalLink size={16} />
              </a>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
