'use client';

import React, { useState } from 'react';
import { Bot, Send, Sparkles, ChevronDown, ChevronUp, RefreshCw, ExternalLink, Landmark } from 'lucide-react';

interface StateRagChatProps {
  currentState: string;
  works?: any[];
  onSelectWork?: (workId: string) => void;
}
import { queryRagIntelligence } from '@/lib/rag-service';

function FormattedAiMessage({ text }: { text: string }) {
  if (!text) return null;

  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const elements: React.ReactNode[] = [];
  let currentKvItems: { label: string; value: string }[] = [];

  const flushKv = (keyPrefix: number) => {
    if (currentKvItems.length > 0) {
      const items = [...currentKvItems];
      elements.push(
        <div key={`kv-card-${keyPrefix}`} className="rag-kv-card">
          {items.map((item, i) => (
            <div key={i} className="rag-kv-row">
              <span className="rag-kv-label">{item.label}:</span>
              <span className={`rag-kv-value ${/₹|Crore|Cr/i.test(item.value) ? 'font-mono font-bold text-orange-600 dark:text-orange-400' : ''}`}>
                {item.value}
              </span>
            </div>
          ))}
        </div>
      );
      currentKvItems = [];
    }
  };

  lines.forEach((line, idx) => {
    // 1. Key-Value line: e.g.
    // * **Hon'ble MP:** EATALA RAJENDER
    // - **Constituency:** MALKAJGIRI, Telangana
    // - Hon'ble MP: EATALA RAJENDER
    // **Official Allocated Limit:** ₹32,74,77,390.86
    const kvMatch = line.match(/^[\*\-•]?\s*(?:\*\*)?([^*:]+?)(?:\*\*)?:\s*(.*)$/);
    if (kvMatch && kvMatch[2].trim()) {
      currentKvItems.push({
        label: kvMatch[1].replace(/[\*\-•]/g, '').trim(),
        value: kvMatch[2].replace(/\*\*/g, '').trim()
      });
      return;
    }

    flushKv(idx);

    // 2. Heading line: e.g.
    // **Cross-Reference with Project Works:**
    // ### Summary
    const headingMatch = line.match(/^(?:###\s*|\*\*)([^*#]+?)(?:\*\*|:)?$/);
    if (headingMatch && !line.startsWith('* ') && !line.startsWith('- ')) {
      const hText = headingMatch[1].replace(/[:*#]/g, '').trim();
      elements.push(
        <h4 key={`h-${idx}`} className="rag-section-heading">
          {hText}
        </h4>
      );
      return;
    }

    // 3. Bullet line:
    if (line.startsWith('* ') || line.startsWith('- ') || line.startsWith('• ')) {
      const cleanBullet = line.replace(/^[\*\-•]\s+/, '').replace(/\*\*/g, '').trim();
      elements.push(
        <div key={`bullet-${idx}`} className="rag-bullet-item">
          <span className="rag-bullet-dot" />
          <span>{cleanBullet}</span>
        </div>
      );
      return;
    }

    // 4. Regular paragraph
    elements.push(
      <p key={`p-${idx}`} className="rag-paragraph">
        {line.replace(/\*\*/g, '').trim()}
      </p>
    );
  });

  flushKv(lines.length);

  return <div className="rag-formatted-content">{elements}</div>;
}

export default function StateRagChat({ currentState, works, onSelectWork }: StateRagChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; text: string; citations?: any[]; summary?: any; mpAllocations?: any[] }[]>([]);

  const stateTitle = currentState !== 'All states' ? currentState : 'All India';

  const quickQuestions = [
    `Which MP has the highest allocated limit in ${stateTitle}?`,
    `Total MPLADS fund allocation in ${stateTitle}`,
    `Allocated budget limit for MPs in ${stateTitle}`,
    `Drinking water and road connectivity works in ${stateTitle}`,
    `Projects pending IDA administrative approval`
  ];

  const handleSend = async (questionText?: string) => {
    const q = questionText || query;
    if (!q.trim() || loading) return;

    const userMsg = { role: 'user' as const, text: q };
    setMessages(prev => [...prev, userMsg]);
    setQuery('');
    setLoading(true);

    try {
      const data = await queryRagIntelligence({
        query: q,
        state: currentState,
        works
      });

      setMessages(prev => [
        ...prev,
        {
          role: 'ai',
          text: data.answer,
          citations: data.citations,
          summary: data.summary,
          mpAllocations: data.mpAllocations
        }
      ]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          role: 'ai',
          text: `Unable to retrieve records at this moment. Please verify your connection or try again.`
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rag-container">
      {/* Header Bar */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="rag-header"
      >
        <div className="rag-header-left">
          <div className="rag-icon-wrapper">
            <Sparkles size={18} />
          </div>
          <div>
            <div className="rag-title-row">
              <h3>
                {stateTitle} Development Intelligence
              </h3>
            </div>
            <p className="rag-subtitle">
              Query MP allocations, village initiatives, and sanction records
            </p>
          </div>
        </div>

        <div className="rag-toggle">
          <span>{isOpen ? 'Collapse' : 'Ask Question'}</span>
          {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </div>

      {/* Expandable Chat Area */}
      {isOpen && (
        <div className="rag-body">
          {/* Quick Query Pills */}
          <div>
            <span className="rag-suggestions-title">
              Suggested Inquiries
            </span>
            <div className="rag-suggestions-list">
              {quickQuestions.map((qq, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(qq)}
                  disabled={loading}
                  className="rag-suggestion-btn"
                >
                  {qq}
                </button>
              ))}
            </div>
          </div>

          {/* Messages History */}
          <div className="rag-messages-area">
            {messages.length === 0 && !loading && (
              <div className="rag-empty-state">
                <Bot size={32} opacity={0.3} />
                <p>Type any inquiry to inspect {stateTitle}&rsquo;s records, budgets, or MP recommendations.</p>
              </div>
            )}

            {messages.map((m, idx) => (
              <div 
                key={idx} 
                className={`rag-message ${m.role}`}
              >
                {m.role === 'ai' ? (
                  <FormattedAiMessage text={m.text} />
                ) : (
                  <div>{m.text}</div>
                )}

                {/* Citation Records - Only shown when matching records exist */}
                {m.citations && m.citations.length > 0 && (
                  <div className="rag-citations-area">
                    <span className="rag-citations-title">
                      Referenced Works ({m.citations.length})
                    </span>
                    <div className="rag-citation-list">
                      {m.citations.slice(0, 4).map(c => (
                        <button
                          key={c.id}
                          onClick={() => onSelectWork && onSelectWork(c.id)}
                          className="rag-citation-btn"
                          title={`${c.title} (${c.status})`}
                        >
                          <span>{c.id}</span>
                          <ExternalLink size={10} />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* MP Official Allocated Limit Mini-Badge */}
                {m.mpAllocations && m.mpAllocations.length > 0 && (
                  <div className="rag-mp-allocations-area" style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                    <span className="rag-citations-title" style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '6px' }}>
                      <Landmark size={11} />
                      MP Official Entitlement Quota
                    </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {m.mpAllocations.slice(0, 2).map((mpItem, mpIdx) => (
                        <div
                          key={mpIdx}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '5px 10px',
                            borderRadius: '6px',
                            border: '1px solid rgba(234, 88, 12, 0.25)',
                            background: 'rgba(255, 237, 213, 0.45)',
                            fontSize: '11px'
                          }}
                        >
                          <strong style={{ color: '#0f172a' }}>
                            {mpItem.mp_name}
                          </strong>
                          <span style={{ fontSize: '10px', color: '#64748b' }}>
                            ({mpItem.constituency})
                          </span>
                          <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#ea580c' }}>
                            ₹{mpItem.allocated_crores} Cr
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="rag-loading">
                <RefreshCw size={14} className="rag-loading-spin" />
                <span>Synthesizing records for {stateTitle}...</span>
              </div>
            )}
          </div>

          {/* Input Bar */}
          <div className="rag-input-bar">
            <input
              type="text"
              placeholder={`Ask about ${stateTitle}'s MPs, village projects, or fund allocations...`}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleSend();
              }}
              disabled={loading}
              className="rag-input"
            />
            <button
              onClick={() => handleSend()}
              disabled={loading || !query.trim()}
              className="rag-submit-btn"
            >
              <span>Submit</span>
              <Send size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
