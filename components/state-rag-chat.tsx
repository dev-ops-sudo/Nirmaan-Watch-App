'use client';

import React, { useState } from 'react';
import { Bot, Send, Sparkles, ChevronDown, ChevronUp, RefreshCw, ExternalLink, ArrowRight, CornerDownLeft } from 'lucide-react';

interface StateRagChatProps {
  currentState: string;
  onSelectWork?: (workId: string) => void;
}

export default function StateRagChat({ currentState, onSelectWork }: StateRagChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; text: string; citations?: any[]; summary?: any }[]>([]);

  const stateTitle = currentState !== 'All states' ? currentState : 'All India';

  const quickQuestions = [
    `Who are the MPs representing ${stateTitle}?`,
    `Total MPLADS fund allocation in ${stateTitle}`,
    `Which MP has the highest allocation in ${stateTitle}?`,
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
      const res = await fetch('/api/rag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: q,
          state: currentState
        })
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as any;
      setMessages(prev => [
        ...prev,
        {
          role: 'ai',
          text: data.answer,
          citations: data.citations,
          summary: data.summary
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
    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs overflow-hidden mb-6 transition-all duration-200">
      {/* Header Bar */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="px-4 py-3 bg-zinc-50/70 hover:bg-zinc-100/70 dark:bg-zinc-800/40 dark:hover:bg-zinc-800/70 flex items-center justify-between cursor-pointer transition select-none"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 flex items-center justify-center shrink-0 shadow-2xs">
            <Sparkles size={15} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-xs text-zinc-900 dark:text-zinc-100 tracking-tight">
                {stateTitle} Development Intelligence
              </h3>
              <span className="text-[10px] bg-zinc-200/70 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-medium px-2 py-0.5 rounded">
                Grounded RAG
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
              Query MP allocations, village initiatives, and sanction records
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100">
          <span>{isOpen ? 'Collapse' : 'Ask Question'}</span>
          {isOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </div>
      </div>

      {/* Expandable Chat Area */}
      {isOpen && (
        <div className="p-4 sm:p-5 space-y-4 border-t border-zinc-200 dark:border-zinc-800">
          {/* Quick Query Pills */}
          <div className="space-y-2">
            <span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">
              Suggested Inquiries
            </span>
            <div className="flex flex-wrap gap-1.5">
              {quickQuestions.map((qq, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(qq)}
                  disabled={loading}
                  className="px-2.5 py-1 text-xs rounded-lg bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600 transition text-left"
                >
                  {qq}
                </button>
              ))}
            </div>
          </div>

          {/* Messages History */}
          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            {messages.length === 0 && !loading && (
              <div className="py-6 text-center text-xs text-zinc-400 dark:text-zinc-500">
                <Bot size={22} className="mx-auto mb-2 opacity-50" />
                <p>Type any inquiry to inspect {stateTitle}&rsquo;s records, budgets, or MP recommendations.</p>
              </div>
            )}

            {messages.map((m, idx) => (
              <div 
                key={idx} 
                className={`p-3.5 rounded-xl text-xs leading-relaxed ${
                  m.role === 'user' 
                    ? 'bg-zinc-900 text-white ml-8 font-medium' 
                    : 'bg-zinc-50 dark:bg-zinc-800/70 text-zinc-800 dark:text-zinc-200 mr-8 border border-zinc-200 dark:border-zinc-700/60 whitespace-pre-wrap'
                }`}
              >
                {m.text}

                {/* Citation Records */}
                {m.citations && m.citations.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-zinc-200 dark:border-zinc-700/60 space-y-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block">
                      Referenced Records ({m.citations.length})
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {m.citations.slice(0, 6).map(c => (
                        <button
                          key={c.id}
                          onClick={() => onSelectWork && onSelectWork(c.id)}
                          className="px-2 py-0.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded text-[10px] font-mono hover:border-zinc-400 dark:hover:border-zinc-500 text-zinc-700 dark:text-zinc-300 transition inline-flex items-center gap-1"
                        >
                          <span>{c.id}</span>
                          <ExternalLink size={9} />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl text-xs text-zinc-600 dark:text-zinc-400 flex items-center gap-2 mr-8 border border-zinc-200 dark:border-zinc-700">
                <RefreshCw size={13} className="animate-spin text-zinc-600 dark:text-zinc-400" />
                <span>Synthesizing records for {stateTitle}...</span>
              </div>
            )}
          </div>

          {/* Input Bar */}
          <div className="flex items-center gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <input
              type="text"
              placeholder={`Ask about ${stateTitle}'s MPs, village projects, or fund allocations...`}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleSend();
              }}
              disabled={loading}
              className="flex-1 px-3.5 py-2 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-600"
            />
            <button
              onClick={() => handleSend()}
              disabled={loading || !query.trim()}
              className="px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <span>Submit</span>
              <Send size={12} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
