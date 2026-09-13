'use client';

import React, { useState, useMemo } from 'react';
import { 
  X, 
  Sparkles, 
  Building2, 
  IndianRupee, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  Search, 
  ArrowDownToLine, 
  ExternalLink, 
  RefreshCw,
  Layers,
  ChevronRight,
  TrendingUp,
  Filter
} from 'lucide-react';
import { compactMoney, money } from '@/lib/domain';
import { sourceCsv, type Work } from '@/lib/mplads';
import { queryRagIntelligence } from '@/lib/rag-service';

interface MpDossierModalProps {
  mpName: string | null;
  works: Work[];
  onClose: () => void;
  onSelectWork: (work: Work) => void;
}

export default function MpDossierModal({ mpName, works, onClose, onSelectWork }: MpDossierModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'ongoing' | 'pending'>('all');
  const [activeTab, setActiveTab] = useState<'works' | 'sectors' | 'ai'>('works');
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
    const pending = mpWorks.filter(w => w.approval === 'Action Pending' || w.status === 'Unsanctioned').length;
    const completionRate = mpWorks.length > 0 ? ((completed / mpWorks.length) * 100).toFixed(1) : '0.0';
    const villages = new Set(mpWorks.map(w => w.village).filter(Boolean)).size;
    const localities = new Set(mpWorks.map(w => w.block || w.city || w.constituency).filter(Boolean)).size;

    // Group by category
    const catMap = new Map<string, { name: string; count: number; allocation: number }>();
    for (const w of mpWorks) {
      const cat = w.category || 'Normal/Others';
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

  // Filtered works by status & search
  const displayedWorks = useMemo(() => {
    let list = mpWorks;
    if (statusFilter === 'completed') {
      list = list.filter(w => w.status === 'Completed');
    } else if (statusFilter === 'ongoing') {
      list = list.filter(w => w.status === 'Ongoing' || w.status === 'Sanctioned');
    } else if (statusFilter === 'pending') {
      list = list.filter(w => w.approval === 'Action Pending' || w.status === 'Unsanctioned');
    }

    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(w =>
      w.title.toLowerCase().includes(q) ||
      w.id.toLowerCase().includes(q) ||
      w.village.toLowerCase().includes(q) ||
      w.city.toLowerCase().includes(q) ||
      w.block.toLowerCase().includes(q) ||
      w.category.toLowerCase().includes(q)
    );
  }, [mpWorks, searchQuery, statusFilter]);

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

      const data = await queryRagIntelligence({
        query: prompt,
        state: meta.state,
        mp: mpName,
        works: mpWorks
      });

      setAiSummary(data.answer || 'Summary generated successfully.');
    } catch (err) {
      setSummaryError('Failed to generate MP summary. Please verify your connection or try again.');
    } finally {
      setGeneratingSummary(false);
    }
  };

  if (!mpName) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-5xl max-h-[92vh] bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col overflow-hidden text-zinc-900 dark:text-zinc-100"
        onClick={e => e.stopPropagation()}
      >
        {/* Spacious Top MP Banner */}
        <div className="px-6 py-6 sm:px-8 sm:py-7 bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-5 border-b border-orange-400/30">
          <div className="flex items-center gap-4 sm:gap-5">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/15 backdrop-blur-md border border-white/25 flex items-center justify-center font-bold text-2xl sm:text-3xl text-white shrink-0 shadow-sm">
              {mpName.slice(0, 1).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-black/25 text-white/95 border border-white/20">
                  Parliamentary Dossier
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white/20 text-white">
                  {meta.house}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                {mpName}
              </h2>
              <p className="text-xs sm:text-sm text-orange-100/90 flex items-center gap-1.5 mt-1 font-medium">
                <MapPin size={14} className="text-orange-200 shrink-0" />
                <span>{meta.constituency} · {meta.state}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-center">
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
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-white/15 hover:bg-white/25 border border-white/25 text-white rounded-xl text-xs font-semibold backdrop-blur-sm transition-all"
              title="Download full dataset as CSV"
            >
              <ArrowDownToLine size={14} />
              <span>Export {mpWorks.length} Works</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 bg-white/10 hover:bg-white/25 rounded-xl text-white transition-all"
              aria-label="Close dossier"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Spacious Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
          {/* Key Metrics Cards Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
            <div className="p-4 sm:p-5 bg-orange-50/60 dark:bg-orange-950/20 rounded-2xl border border-orange-200/80 dark:border-orange-900/40">
              <span className="text-[11px] font-semibold text-orange-900/80 dark:text-orange-300 uppercase tracking-wider block mb-1">
                Cumulative Allocation
              </span>
              <strong className="text-2xl sm:text-3xl font-bold text-orange-600 dark:text-orange-400 block font-mono">
                {compactMoney(stats.totalAlloc)}
              </strong>
              <span className="text-xs text-zinc-500 dark:text-zinc-400 block mt-1">
                Across {mpWorks.length} recommended works
              </span>
            </div>

            <div className="p-4 sm:p-5 bg-emerald-50/60 dark:bg-emerald-950/20 rounded-2xl border border-emerald-200/80 dark:border-emerald-900/40">
              <span className="text-[11px] font-semibold text-emerald-900/80 dark:text-emerald-300 uppercase tracking-wider block mb-1">
                Execution Rate
              </span>
              <strong className="text-2xl sm:text-3xl font-bold text-emerald-600 dark:text-emerald-400 block font-mono">
                {stats.completionRate}%
              </strong>
              <span className="text-xs text-zinc-500 dark:text-zinc-400 block mt-1">
                {stats.completed} of {mpWorks.length} works completed
              </span>
            </div>

            <div className="p-4 sm:p-5 bg-amber-50/60 dark:bg-amber-950/20 rounded-2xl border border-amber-200/80 dark:border-amber-900/40">
              <span className="text-[11px] font-semibold text-amber-900/80 dark:text-amber-300 uppercase tracking-wider block mb-1">
                Ongoing / Sanctioned
              </span>
              <strong className="text-2xl sm:text-3xl font-bold text-amber-600 dark:text-amber-400 block font-mono">
                {stats.ongoing}
              </strong>
              <span className="text-xs text-zinc-500 dark:text-zinc-400 block mt-1">
                {stats.pending} pending IDA approval
              </span>
            </div>

            <div className="p-4 sm:p-5 bg-zinc-50 dark:bg-zinc-800/40 rounded-2xl border border-zinc-200 dark:border-zinc-700/60">
              <span className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider block mb-1">
                Geographic Footprint
              </span>
              <strong className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-100 block font-mono">
                {stats.villages} {stats.villages === 1 ? 'Village' : 'Villages'}
              </strong>
              <span className="text-xs text-zinc-500 dark:text-zinc-400 block mt-1">
                Across {stats.localities} local blocks & wards
              </span>
            </div>
          </div>

          {/* Navigation Tabs Bar */}
          <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3 gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('works')}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'works'
                    ? 'bg-orange-600 text-white shadow-sm'
                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }`}
              >
                <Building2 size={15} />
                <span>Recommended Works ({mpWorks.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('sectors')}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'sectors'
                    ? 'bg-orange-600 text-white shadow-sm'
                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }`}
              >
                <Layers size={15} />
                <span>Sector Breakdown ({stats.categories.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('ai')}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'ai'
                    ? 'bg-orange-600 text-white shadow-sm'
                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }`}
              >
                <Sparkles size={15} />
                <span>AI Performance Synthesis</span>
                {aiSummary && <span className="w-2 h-2 rounded-full bg-emerald-500" />}
              </button>
            </div>
          </div>

          {/* TAB 1: Recommended Works */}
          {activeTab === 'works' && (
            <div className="space-y-4">
              {/* Filter and Search Bar */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                {/* Status Pills */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs text-zinc-400 font-medium mr-1 hidden sm:inline">Filter:</span>
                  <button
                    onClick={() => setStatusFilter('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      statusFilter === 'all'
                        ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 font-semibold'
                        : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400'
                    }`}
                  >
                    All ({mpWorks.length})
                  </button>
                  <button
                    onClick={() => setStatusFilter('completed')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      statusFilter === 'completed'
                        ? 'bg-emerald-600 text-white font-semibold'
                        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300'
                    }`}
                  >
                    Completed ({stats.completed})
                  </button>
                  <button
                    onClick={() => setStatusFilter('ongoing')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      statusFilter === 'ongoing'
                        ? 'bg-amber-600 text-white font-semibold'
                        : 'bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300'
                    }`}
                  >
                    Ongoing ({stats.ongoing})
                  </button>
                  <button
                    onClick={() => setStatusFilter('pending')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      statusFilter === 'pending'
                        ? 'bg-zinc-600 text-white font-semibold'
                        : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400'
                    }`}
                  >
                    Pending ({stats.pending})
                  </button>
                </div>

                {/* Search Box */}
                <div className="relative w-full md:w-80">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="Search by title, village, or ID..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-zinc-400 hover:text-zinc-600"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>
              </div>

              {/* Works Table */}
              <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-xs bg-white dark:bg-zinc-900">
                <div className="max-h-[460px] overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-zinc-50/80 dark:bg-zinc-800/80 backdrop-blur-xs text-zinc-500 dark:text-zinc-400 font-semibold border-b border-zinc-200 dark:border-zinc-700 sticky top-0 z-10">
                      <tr>
                        <th className="py-3.5 px-5">WORK / TITLE</th>
                        <th className="py-3.5 px-4">VILLAGE / LOCALITY</th>
                        <th className="py-3.5 px-4">STATUS</th>
                        <th className="py-3.5 px-4">ALLOCATION</th>
                        <th className="py-3.5 px-5 text-right">ACTION</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
                      {displayedWorks.length > 0 ? (
                        displayedWorks.map(w => (
                          <tr key={w.id} className="hover:bg-orange-50/30 dark:hover:bg-orange-950/20 transition-colors">
                            <td className="py-3.5 px-5">
                              <button
                                onClick={() => onSelectWork(w)}
                                className="font-semibold text-zinc-900 dark:text-zinc-100 hover:text-orange-600 dark:hover:text-orange-400 text-left block line-clamp-2 leading-relaxed"
                              >
                                {w.title || 'Description not reported'}
                              </button>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <span className="text-[10px] text-zinc-400 font-mono">{w.id}</span>
                                <span className="text-[10px] text-zinc-300 dark:text-zinc-600">•</span>
                                <span className="text-[10px] px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-medium">
                                  {w.category || 'Normal/Others'}
                                </span>
                              </div>
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="font-semibold text-zinc-800 dark:text-zinc-200 block">
                                {w.village || 'Not reported'}
                              </span>
                              <span className="text-[11px] text-zinc-400 block mt-0.5">
                                {w.block || w.city || 'District Area'}
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                                w.status === 'Completed'
                                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50'
                                  : w.status === 'Ongoing' || w.status === 'Sanctioned'
                                  ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50'
                                  : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700'
                              }`}>
                                {w.status}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 font-bold font-mono text-zinc-900 dark:text-zinc-100 text-sm">
                              {money(w.allocation)}
                            </td>
                            <td className="py-3.5 px-5 text-right">
                              <button
                                onClick={() => onSelectWork(w)}
                                className="px-3 py-1.5 bg-zinc-100 hover:bg-orange-50 hover:text-orange-700 hover:border-orange-200 dark:bg-zinc-800 dark:hover:bg-orange-950/60 dark:text-zinc-200 border border-transparent rounded-lg text-xs font-semibold transition-all inline-flex items-center gap-1"
                              >
                                <span>Inspect</span>
                                <ExternalLink size={12} />
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="py-12 text-center text-zinc-500 dark:text-zinc-400">
                            <Building2 size={32} className="mx-auto mb-2 opacity-40 text-zinc-400" />
                            <p className="font-semibold text-sm">No works found</p>
                            <p className="text-xs text-zinc-400 mt-1">Try changing your search term or status filter.</p>
                            {(searchQuery || statusFilter !== 'all') && (
                              <button
                                onClick={() => { setSearchQuery(''); setStatusFilter('all'); }}
                                className="mt-3 px-3 py-1 text-xs font-semibold text-orange-600 hover:underline"
                              >
                                Clear all filters
                              </button>
                            )}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Sector Allocation */}
          {activeTab === 'sectors' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  Priority Sector Allocation Breakdown
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Distribution of {money(stats.totalAlloc)} across developmental categories
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {stats.categories.map(c => {
                  const max = stats.categories[0]?.allocation || 1;
                  const pct = ((c.allocation / max) * 100).toFixed(0);
                  const shareOfBudget = ((c.allocation / (stats.totalAlloc || 1)) * 100).toFixed(1);
                  return (
                    <div key={c.name} className="p-5 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-200 dark:border-zinc-700/60 space-y-3">
                      <div className="flex items-center justify-between">
                        <strong className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate mr-2">
                          {c.name}
                        </strong>
                        <span className="font-bold text-orange-600 dark:text-orange-400 font-mono text-sm">
                          {compactMoney(c.allocation)}
                        </span>
                      </div>
                      
                      <div className="h-2.5 w-full bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full transition-all duration-500" 
                          style={{ width: `${pct}%` }} 
                        />
                      </div>

                      <div className="flex justify-between items-center text-xs text-zinc-500 dark:text-zinc-400 pt-1">
                        <span className="font-medium">{c.count} {c.count === 1 ? 'work' : 'works'}</span>
                        <span className="font-semibold text-zinc-700 dark:text-zinc-300">{shareOfBudget}% of MP budget</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: AI Performance Synthesis */}
          {activeTab === 'ai' && (
            <div className="space-y-4">
              <div className="p-6 rounded-2xl bg-gradient-to-br from-orange-50/70 via-amber-50/40 to-white dark:from-orange-950/20 dark:via-zinc-800/40 dark:to-zinc-900 border border-orange-200 dark:border-orange-900/50 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-orange-100 dark:bg-orange-900/50 text-orange-600 flex items-center justify-center">
                      <Sparkles size={18} />
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
                        AI Parliamentary Performance Synthesis
                      </h3>
                      <span className="text-[11px] text-orange-800 dark:text-orange-300 font-medium">
                        Powered by Google Gemini RAG
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={handleGenerateSummary}
                    disabled={generatingSummary}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-sm transition-all"
                  >
                    {generatingSummary ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        <span>Analyzing with Gemini...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={14} />
                        <span>{aiSummary ? 'Regenerate Analysis' : 'Generate MP Portfolio Summary'}</span>
                      </>
                    )}
                  </button>
                </div>

                {aiSummary ? (
                  <div className="text-xs sm:text-sm leading-relaxed text-zinc-800 dark:text-zinc-200 bg-white dark:bg-zinc-900/90 p-5 rounded-2xl border border-orange-200 dark:border-orange-900/40 whitespace-pre-wrap shadow-xs">
                    {aiSummary}
                  </div>
                ) : (
                  <div className="py-8 text-center text-zinc-600 dark:text-zinc-400 max-w-lg mx-auto">
                    <Sparkles size={36} className="mx-auto text-orange-500 mb-3 opacity-80" />
                    <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                      Generate an In-Depth Parliamentary Evaluation
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5 leading-relaxed">
                      Run an AI synthesis evaluating Shri {mpName}&rsquo;s spending velocity, developmental priorities across {stats.villages} villages, and execution rate comparison.
                    </p>
                  </div>
                )}

                {summaryError && (
                  <p className="text-xs text-red-600 bg-red-50 dark:bg-red-950/40 p-3 rounded-xl border border-red-200 dark:border-red-900/50">
                    {summaryError}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
