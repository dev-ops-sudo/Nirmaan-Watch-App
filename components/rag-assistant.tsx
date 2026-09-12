'use client';

import React, { useState } from 'react';
import { Sparkles, Send, Bot, Database, ShieldCheck, ArrowRight, ExternalLink, X, RefreshCw } from 'lucide-react';
import { compactMoney, money } from '@/lib/domain';

interface RagCitation {
  id: string;
  title: string;
  mp: string;
  state: string;
  village: string;
  allocation: number;
  status: string;
  approval: string;
}

interface RagResponse {
  answer: string;
  citations: RagCitation[];
  summary: {
    totalWorks: number;
    totalAllocation: number;
    completedCount: number;
    pendingApprovalCount: number;
  };
  retrievalSource: 'supabase_vector' | 'hybrid_local';
  confidence: number;
}

export default function RagAssistant({
  selectedState = 'All states',
  selectedLocal = 'All localities',
  selectedVillage = 'All villages',
  selectedMp = 'All MPs',
  onSelectWork
}: {
  selectedState?: string;
  selectedLocal?: string;
  selectedVillage?: string;
  selectedMp?: string;
  onSelectWork?: (id: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<RagResponse | null>(null);

  const handleAsk = async (userQuery?: string) => {
    const q = userQuery || query;
    if (!q.trim()) return;

    setLoading(true);
    try {
      const res = await fetch('/api/rag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: q,
          state: selectedState,
          local: selectedLocal,
          village: selectedVillage,
          mp: selectedMp
        })
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      const data: RagResponse = await res.json();
      setResponse(data);
      setQuery('');
    } catch (err: any) {
      console.error('RAG request error:', err);
    } finally {
      setLoading(false);
    }
  };

  const sampleQueries = [
    `Analyze development works in ${selectedState !== 'All states' ? selectedState : 'Uttar Pradesh'}`,
    `Find drinking water and road connectivity works`,
    `List projects with pending IDA administrative approval`,
    `Audit allocation breakdown for ${selectedMp !== 'All MPs' ? selectedMp : 'top MPs'}`
  ];

  return (
    <>
      {/* Floating Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 font-medium text-xs border border-zinc-700/60"
      >
        <Sparkles size={15} className="text-amber-400" />
        <span>Development Intelligence</span>
        <span className="bg-zinc-800 text-[10px] text-zinc-300 px-2 py-0.5 rounded-full border border-zinc-700">
          RAG
        </span>
      </button>

      {/* Slide-over / Modal Panel */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-end bg-black/40 backdrop-blur-xs p-0 sm:p-4">
          <div className="w-full sm:max-w-xl h-[88vh] bg-white dark:bg-zinc-900 rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-zinc-200 dark:border-zinc-800">
            {/* Header */}
            <div className="px-5 py-4 bg-zinc-950 text-white flex items-center justify-between border-b border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-zinc-900 border border-zinc-800 rounded-xl">
                  <Bot size={18} className="text-orange-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-white">
                    MPLADS Development Intelligence
                  </h3>
                  <p className="text-[11px] text-zinc-400">
                    Grounded in official records - {selectedState}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
              {/* Context Notice */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400">
                <div className="flex items-center gap-1.5">
                  <Database size={13} className="text-zinc-500" />
                  <span>Scope: <strong>{selectedState}</strong> {selectedLocal !== 'All localities' ? `> ${selectedLocal}` : ''}</span>
                </div>
                <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                  <ShieldCheck size={13} />
                  <span>Verified Dataset</span>
                </div>
              </div>

              {/* Sample Queries */}
              {!response && !loading && (
                <div className="space-y-2.5 pt-1">
                  <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block">
                    Suggested Inquiries
                  </span>
                  <div className="space-y-1.5">
                    {sampleQueries.map((sq, i) => (
                      <button
                        key={i}
                        onClick={() => handleAsk(sq)}
                        className="w-full text-left p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition flex items-center justify-between group"
                      >
                        <span>{sq}</span>
                        <ArrowRight size={13} className="text-zinc-400 group-hover:text-zinc-700 dark:group-hover:text-zinc-200 transition shrink-0 ml-2" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Loading State */}
              {loading && (
                <div className="flex flex-col items-center justify-center py-12 space-y-2 text-center">
                  <RefreshCw size={22} className="text-orange-600 animate-spin" />
                  <p className="font-medium text-zinc-700 dark:text-zinc-300">
                    Querying records and synthesizing response...
                  </p>
                </div>
              )}

              {/* Active Response Display */}
              {response && !loading && (
                <div className="space-y-3.5">
                  {/* Summary Strip */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div className="p-2.5 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-800">
                      <span className="text-[10px] text-zinc-400 block uppercase">Matching Works</span>
                      <strong className="text-sm text-zinc-900 dark:text-zinc-100">{response.summary.totalWorks}</strong>
                    </div>
                    <div className="p-2.5 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-800">
                      <span className="text-[10px] text-zinc-400 block uppercase">Total Allocation</span>
                      <strong className="text-sm text-zinc-900 dark:text-zinc-100">{compactMoney(response.summary.totalAllocation)}</strong>
                    </div>
                    <div className="p-2.5 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-800">
                      <span className="text-[10px] text-zinc-400 block uppercase">Completed</span>
                      <strong className="text-sm text-emerald-600 dark:text-emerald-400">{response.summary.completedCount}</strong>
                    </div>
                    <div className="p-2.5 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-800">
                      <span className="text-[10px] text-zinc-400 block uppercase">Pending Approval</span>
                      <strong className="text-sm text-amber-600 dark:text-amber-400">{response.summary.pendingApprovalCount}</strong>
                    </div>
                  </div>

                  {/* AI Narrative */}
                  <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 leading-relaxed whitespace-pre-wrap">
                    {response.answer}
                  </div>

                  {/* Citations List */}
                  {response.citations && response.citations.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block">
                        Referenced Records ({response.citations.length})
                      </span>
                      <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                        {response.citations.map((c, i) => (
                          <div
                            key={c.id || i}
                            className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-between"
                          >
                            <div className="mr-2 truncate">
                              <span className="font-medium text-zinc-900 dark:text-zinc-100">{c.title || 'Work'}</span>
                              <span className="text-zinc-400 block text-[10px]">{c.id} - {c.mp} ({c.village})</span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="font-mono text-zinc-800 dark:text-zinc-200 font-semibold">{money(c.allocation)}</span>
                              {onSelectWork && (
                                <button
                                  onClick={() => {
                                    onSelectWork(c.id);
                                    setIsOpen(false);
                                  }}
                                  className="p-1 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 rounded"
                                  title="Inspect"
                                >
                                  <ExternalLink size={12} />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Input Bar */}
            <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 border-t border-zinc-200 dark:border-zinc-800 flex items-center gap-2">
              <input
                type="text"
                placeholder="Ask about allocations, MPs, villages, or works..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleAsk();
                }}
                disabled={loading}
                className="flex-1 px-3 py-2 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-600"
              />
              <button
                onClick={() => handleAsk()}
                disabled={loading || !query.trim()}
                className="px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition"
              >
                <span>Submit</span>
                <Send size={12} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
