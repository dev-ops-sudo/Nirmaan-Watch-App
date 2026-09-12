'use client';

import React, { useState, useMemo } from 'react';
import { X, Sparkles, Building2, IndianRupee, Users, CheckCircle2, Clock, ShieldCheck, MapPin, Search, ArrowDownToLine, ExternalLink, RefreshCw, Star, MessageSquare } from 'lucide-react';
import { compactMoney, money } from '@/lib/domain';
import { sourceCsv, type Work } from '@/lib/mplads';

interface MpDossierModalProps {
  mpName: string | null;
  works: Work[];
  onClose: () => void;
  onSelectWork: (work: Work) => void;
}

export default function MpDossierModal({ mpName, works, onClose, onSelectWork }: MpDossierModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [aiSummary, setAiSummary] = useState('');
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState('');

  // Filter works for this specific MP
  const mpWorks = useMemo(() => {
    if (!mpName) return [];
    return works.filter(w => w.mp.trim().toLowerCase() === mpName.trim().toLowerCase());
  }, [mpName, works]);

  // Derive MP metadata
  const meta = useMemo(() => {
    if (mpWorks.length === 0) return { house: '', state: '', constituency: '' };
    return {
      house: mpWorks[0].house || 'Parliament of India',
      state: mpWorks[0].state || 'India',
      constituency: mpWorks[0].constituency || 'Constituency'
    };
  }, [mpWorks]);

  // Aggregate financial & progress metrics
  const stats = useMemo(() => {
    const totalAlloc = mpWorks.reduce((acc, w) => acc + w.allocation, 0);
    const completed = mpWorks.filter(w => w.status === 'Completed').length;
    const ongoing = mpWorks.filter(w => w.status === 'Ongoing' || w.status === 'Sanctioned').length;
    const pending = mpWorks.filter(w => w.approval === 'Action Pending').length;
    const completionRate = mpWorks.length > 0 ? ((completed / mpWorks.length) * 100).toFixed(1) : '0.0';
    const villages = new Set(mpWorks.map(w => w.village).filter(Boolean)).size;
    const localities = new Set(mpWorks.map(w => w.block || w.city || w.constituency).filter(Boolean)).size;

    // Group by category
    const catMap = new Map<string, { name: string; count: number; allocation: number }>();
    for (const w of mpWorks) {
      const cat = w.category || 'Other';
      const g = catMap.get(cat) || { name: cat, count: 0, allocation: 0 };
      g.count++;
      g.allocation += w.allocation;
      catMap.set(cat, g);
    }
    const categories = [...catMap.values()].sort((a, b) => b.allocation - a.allocation);

    return {
      totalAlloc,
      completed,
      ongoing,
      pending,
      completionRate,
      villages,
      localities,
      categories
    };
  }, [mpWorks]);

  // Filtered works by internal search
  const displayedWorks = useMemo(() => {
    if (!searchQuery.trim()) return mpWorks;
    const q = searchQuery.toLowerCase();
    return mpWorks.filter(w =>
      w.title.toLowerCase().includes(q) ||
      w.id.toLowerCase().includes(q) ||
      w.village.toLowerCase().includes(q) ||
      w.city.toLowerCase().includes(q) ||
      w.block.toLowerCase().includes(q) ||
      w.category.toLowerCase().includes(q)
    );
  }, [mpWorks, searchQuery]);

  const handleGenerateSummary = async () => {
    if (!mpName) return;
    setGeneratingSummary(true);
    setSummaryError('');

    try {
      const prompt = `Synthesize an authoritative parliamentary audit and development summary for Member of Parliament: "${mpName}".
State: ${meta.state}, House: ${meta.house}, Constituency: ${meta.constituency}.
Portfolio Summary: ${mpWorks.length} works recommended, Total Allocation: INR ${stats.totalAlloc}, Completed Works: ${stats.completed} (${stats.completionRate}%), Ongoing: ${stats.ongoing}, Pending IDA Approval: ${stats.pending}.
Top Categories: ${stats.categories.slice(0, 4).map(c => `${c.name} (INR ${c.allocation}, ${c.count} works)`).join(', ')}.
Analyze the MP's priority investment sectors, execution efficiency, and geographic reach across ${stats.villages} villages.`;

      const res = await fetch('/api/rag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: prompt,
          state: meta.state,
          mp: mpName
        })
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as any;
      setAiSummary(data.answer || 'Summary generated successfully.');
    } catch (err) {
      setSummaryError('Failed to generate MP summary with Gemini.');
    } finally {
      setGeneratingSummary(false);
    }
  };

  if (!mpName) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-5 overflow-y-auto animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-6xl max-h-[94vh] bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col overflow-hidden text-zinc-900 dark:text-zinc-100"
        onClick={e => e.stopPropagation()}
      >
        {/* Top MP Dossier Banner */}
        <div className="px-6 py-5 bg-gradient-to-r from-orange-700 via-amber-700 to-zinc-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-orange-500/30">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center font-bold text-2xl text-amber-200 shrink-0">
              {mpName.slice(0, 1).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-orange-500 text-white">
                  Parliamentary Dossier
                </span>
                <span className="text-xs text-orange-200 font-medium">
                  {meta.house}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
                {mpName}
              </h2>
              <p className="text-xs text-orange-100/90 flex items-center gap-1.5 mt-0.5">
                <MapPin size={13} />
                <span>{meta.constituency} · {meta.state}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              onClick={() => {
                const blob = new Blob([sourceCsv(mpWorks)], { type: 'text/csv;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `MPLADS-${mpName.replaceAll(' ', '_')}.csv`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold transition"
            >
              <ArrowDownToLine size={14} />
              <span>Export {mpWorks.length} Works</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-full text-white/90 transition"
              aria-label="Close dossier"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm">
          {/* Cumulative KPI Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div className="p-4 bg-orange-50/70 dark:bg-orange-950/30 rounded-xl border border-orange-200 dark:border-orange-900/50">
              <span className="text-[11px] font-semibold text-orange-800 dark:text-orange-300 uppercase tracking-wider block mb-1">
                Cumulative Allocation
              </span>
              <strong className="text-xl sm:text-2xl font-bold text-orange-600 dark:text-orange-400 block font-mono">
                {compactMoney(stats.totalAlloc)}
              </strong>
              <span className="text-[11px] text-zinc-500 block mt-1">
                Across {mpWorks.length} recommended works
              </span>
            </div>

            <div className="p-4 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-200 dark:border-zinc-700/60">
              <span className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider block mb-1">
                Execution Rate
              </span>
              <strong className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400 block font-mono">
                {stats.completionRate}%
              </strong>
              <span className="text-[11px] text-zinc-500 block mt-1">
                {stats.completed} works marked completed
              </span>
            </div>

            <div className="p-4 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-200 dark:border-zinc-700/60">
              <span className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider block mb-1">
                Ongoing / Sanctioned
              </span>
              <strong className="text-xl sm:text-2xl font-bold text-amber-600 dark:text-amber-400 block font-mono">
                {stats.ongoing}
              </strong>
              <span className="text-[11px] text-zinc-500 block mt-1">
                {stats.pending} pending IDA approval
              </span>
            </div>

            <div className="p-4 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-200 dark:border-zinc-700/60">
              <span className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider block mb-1">
                Geographic Footprint
              </span>
              <strong className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100 block font-mono">
                {stats.villages} Villages
              </strong>
              <span className="text-[11px] text-zinc-500 block mt-1">
                Across {stats.localities} local blocks & wards
              </span>
            </div>
          </div>

          {/* AI MP Development Summary Section */}
          <div className="p-5 rounded-xl bg-gradient-to-r from-orange-50/80 via-amber-50/60 to-orange-50/80 dark:from-orange-950/20 dark:to-zinc-800/40 border border-orange-200 dark:border-orange-900/50">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-orange-600" />
                <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                  AI Parliamentary Performance Synthesis
                </h3>
                <span className="text-[10px] bg-orange-100 dark:bg-orange-900/60 text-orange-800 dark:text-orange-300 font-medium px-2 py-0.5 rounded-full">
                  Gemini Flash RAG
                </span>
              </div>
              <button
                onClick={handleGenerateSummary}
                disabled={generatingSummary}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-xs transition"
              >
                {generatingSummary ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    <span>Analyzing MP Records with Gemini...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={13} />
                    <span>{aiSummary ? 'Regenerate Analysis' : 'Generate MP Portfolio Summary'}</span>
                  </>
                )}
              </button>
            </div>

            {aiSummary ? (
              <div className="text-xs leading-relaxed text-zinc-800 dark:text-zinc-200 bg-white/80 dark:bg-zinc-900/80 p-4 rounded-xl border border-orange-200/80 dark:border-orange-900/40 whitespace-pre-wrap">
                {aiSummary}
              </div>
            ) : (
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                Click <strong>&ldquo;Generate MP Portfolio Summary&rdquo;</strong> to run a Gemini AI synthesis evaluating this MP&rsquo;s overall spending patterns, primary developmental priorities (water, roads, health), and district completion pace.
              </p>
            )}

            {summaryError && (
              <p className="text-xs text-red-600 mt-2">{summaryError}</p>
            )}
          </div>

          {/* Sector Allocation Breakdown */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Priority Sector Allocation Breakdown
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {stats.categories.slice(0, 8).map(c => {
                const max = stats.categories[0]?.allocation || 1;
                const pct = ((c.allocation / max) * 100).toFixed(0);
                return (
                  <div key={c.name} className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700/50 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <strong className="text-zinc-900 dark:text-zinc-100 truncate mr-2">{c.name}</strong>
                      <span className="font-semibold text-orange-600 font-mono">{compactMoney(c.allocation)}</span>
                    </div>
                    <div className="h-2 w-full bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="flex justify-between text-[11px] text-zinc-500">
                      <span>{c.count} works</span>
                      <span>{((c.allocation / (stats.totalAlloc || 1)) * 100).toFixed(1)}% of MP budget</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Filterable Works Table for this MP */}
          <div className="space-y-3 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  Works Recommended by {mpName} ({displayedWorks.length})
                </h3>
                <p className="text-xs text-zinc-500">Click any work to inspect full official details and citizen reviews</p>
              </div>
              <div className="search-field max-w-sm">
                <Search size={15} className="text-orange-600" />
                <input
                  type="text"
                  placeholder="Filter works by village, title, or ID..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>

            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
              <div className="max-h-80 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-50 dark:bg-zinc-800 text-zinc-500 font-semibold border-b border-zinc-200 dark:border-zinc-700 sticky top-0">
                    <tr>
                      <th className="py-2.5 px-3.5">WORK / TITLE</th>
                      <th className="py-2.5 px-3.5">VILLAGE / LOCALITY</th>
                      <th className="py-2.5 px-3.5">STATUS</th>
                      <th className="py-2.5 px-3.5">ALLOCATION</th>
                      <th className="py-2.5 px-3.5 text-right">ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {displayedWorks.map(w => (
                      <tr key={w.id} className="hover:bg-orange-50/30 dark:hover:bg-orange-950/20 transition">
                        <td className="py-2.5 px-3.5">
                          <button
                            onClick={() => onSelectWork(w)}
                            className="font-semibold text-zinc-900 dark:text-zinc-100 hover:text-orange-600 text-left block line-clamp-1"
                          >
                            {w.title || 'Description not reported'}
                          </button>
                          <span className="text-[10px] text-zinc-400 font-mono">{w.id} · {w.category}</span>
                        </td>
                        <td className="py-2.5 px-3.5">
                          <span className="font-medium text-zinc-800 dark:text-zinc-200">{w.village || 'Not reported'}</span>
                          <div className="text-[10px] text-zinc-400">{w.block || w.city}</div>
                        </td>
                        <td className="py-2.5 px-3.5">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            w.status === 'Completed' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' :
                            w.status === 'Ongoing' || w.status === 'Sanctioned' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300' :
                            'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                          }`}>
                            {w.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3.5 font-bold font-mono text-orange-600">
                          {money(w.allocation)}
                        </td>
                        <td className="py-2.5 px-3.5 text-right">
                          <button
                            onClick={() => onSelectWork(w)}
                            className="px-2.5 py-1 bg-zinc-100 hover:bg-orange-100 text-zinc-700 hover:text-orange-700 dark:bg-zinc-800 dark:hover:bg-orange-950/60 rounded text-[11px] font-semibold transition inline-flex items-center gap-1"
                          >
                            <span>Inspect</span>
                            <ExternalLink size={11} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
