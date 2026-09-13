'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Sparkles, 
  Star, 
  MessageSquare, 
  Send, 
  ArrowDownToLine, 
  Building2, 
  MapPin, 
  Calendar, 
  ShieldCheck, 
  RefreshCw, 
  ExternalLink, 
  CheckCircle2, 
  Clock, 
  FileText,
  User,
  Check
} from 'lucide-react';
import { money } from '@/lib/domain';
import { sourceCsv, type Work } from '@/lib/mplads';

interface WorkModalProps {
  work: Work | null;
  onClose: () => void;
  onViewMpDossier?: (mpName: string) => void;
}

export default function WorkModal({ work, onClose, onViewMpDossier }: WorkModalProps) {
  const [activeTab, setActiveTab] = useState<'specs' | 'ai' | 'reviews'>('specs');
  const [aiSummary, setAiSummary] = useState('');
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState('');

  // Reviews state
  const [reviews, setReviews] = useState<any[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [rating, setRating] = useState(5);
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const [reviewSuccess, setReviewSuccess] = useState(false);

  useEffect(() => {
    if (!work) return;
    setAiSummary('');
    setSummaryError('');
    setReviewSuccess(false);
    setReviewError('');
    setActiveTab('specs');
    fetchReviews(work.id);
  }, [work?.id]);

  const fetchReviews = async (projectId: string) => {
    setLoadingReviews(true);
    try {
      const res = await fetch(`/api/reviews?projectId=${encodeURIComponent(projectId)}`);
      if (res.ok) {
        const data = (await res.json()) as any;
        setReviews(data.reviews || []);
      }
    } catch (err) {
      console.error('Error fetching reviews:', err);
    } finally {
      setLoadingReviews(false);
    }
  };

  const handleGenerateSummary = async () => {
    if (!work) return;
    setGeneratingSummary(true);
    setSummaryError('');

    try {
      const prompt = `Provide an executive development summary for MPLADS project ${work.id}: "${work.title}". Location: ${work.village || work.city || work.block || 'Local Area'}, ${work.constituency}, ${work.state}. Recommending MP: ${work.mp} (${work.house}). Allocation: INR ${work.allocation}. Status: ${work.status}. Implementing Authority: ${work.agency}. Highlight the public utility, approval status, and execution implications.`;

      const res = await fetch('/api/rag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: prompt,
          state: work.state,
          mp: work.mp,
          local: work.block || work.city || work.constituency || 'All localities'
        })
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as any;
      setAiSummary(data.answer || 'Summary generated successfully.');
    } catch (err: any) {
      setSummaryError('Could not generate AI summary at this moment. Please try again.');
      console.error(err);
    } finally {
      setGeneratingSummary(false);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!work) return;
    setSubmittingReview(true);
    setReviewError('');
    setReviewSuccess(false);

    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: work.id,
          name: name.trim() || 'Citizen',
          rating,
          message: message.trim()
        })
      });

      const data = (await res.json()) as any;
      if (res.ok) {
        setReviewSuccess(true);
        setName('');
        setMessage('');
        setRating(5);
        fetchReviews(work.id);
      } else {
        setReviewError(data.error || 'Failed to submit review');
      }
    } catch (err) {
      setReviewError('Network error while saving review');
    } finally {
      setSubmittingReview(false);
    }
  };

  if (!work) return null;

  const avgRating = reviews.length > 0
    ? (reviews.reduce((acc, r) => acc + (r.rating || 5), 0) / reviews.length).toFixed(1)
    : null;

  const locationText = [work.village, work.ward, work.block, work.city, work.constituency, work.state].filter(Boolean).join(', ');

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-md p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-4xl max-h-[92vh] bg-white rounded-3xl shadow-2xl border border-zinc-200/90 flex flex-col overflow-hidden text-zinc-900"
        onClick={e => e.stopPropagation()}
      >
        {/* Simple & Clean White Header */}
        <div className="px-6 py-6 sm:px-8 sm:py-7 bg-white border-b border-zinc-100 flex items-start justify-between gap-5">
          <div className="space-y-2 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-1 bg-orange-50 text-orange-700 font-mono text-xs font-bold rounded-lg border border-orange-200/60">
                {work.id}
              </span>
              <span className="px-2.5 py-1 bg-zinc-100 text-zinc-600 text-xs font-medium rounded-lg">
                {work.category || 'Normal/Others'}
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 leading-snug">
              {work.title || 'Work Title Not Reported'}
            </h2>

            <p className="text-xs sm:text-sm text-zinc-500 flex items-center gap-1.5 font-medium">
              <MapPin size={14} className="text-orange-500 shrink-0" />
              <span className="truncate">{locationText || 'Constituency Location'}</span>
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2.5 bg-zinc-50 hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 rounded-full transition-all shrink-0 ml-2"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Spacious Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 bg-white">
          {/* Simple Minimalistic Stat Boxes (White Theme with Generous Spacing) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Box 1: Allocation */}
            <div className="p-5 bg-white rounded-2xl border border-zinc-200/80 shadow-xs flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
                  Recorded Allocation
                </span>
                <strong className="text-2xl sm:text-3xl font-bold text-zinc-900 font-mono block">
                  {money(work.allocation)}
                </strong>
              </div>
              <span className="text-xs text-zinc-400 mt-2 block">
                Official sanctioned amount
              </span>
            </div>

            {/* Box 2: Implementation Status */}
            <div className="p-5 bg-white rounded-2xl border border-zinc-200/80 shadow-xs flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-2">
                  Implementation Status
                </span>
                <div className="flex flex-wrap gap-2 items-center">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                    work.status === 'Completed'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : work.status === 'Ongoing' || work.status === 'Sanctioned'
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : 'bg-zinc-100 text-zinc-700 border border-zinc-200'
                  }`}>
                    {work.status === 'Completed' ? <CheckCircle2 size={13} /> : <Clock size={13} />}
                    <span>{work.status}</span>
                  </span>

                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                    work.approval === 'Approved by IDA'
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'bg-zinc-100 text-zinc-600 border border-zinc-200'
                  }`}>
                    <ShieldCheck size={13} />
                    <span>{work.approval || 'Action Pending'}</span>
                  </span>
                </div>
              </div>
              <span className="text-xs text-zinc-400 mt-2 block">
                Tracked via district authority
              </span>
            </div>

            {/* Box 3: Recommending MP */}
            <div className="p-5 bg-white rounded-2xl border border-zinc-200/80 shadow-xs flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
                  Recommending MP
                </span>
                <strong className="text-base font-bold text-zinc-900 block truncate">
                  {work.mp}
                </strong>
                <span className="text-xs text-zinc-500 block mt-0.5">
                  {work.house} · {work.constituency}
                </span>
              </div>

              {onViewMpDossier && (
                <button
                  onClick={() => {
                    onViewMpDossier(work.mp);
                    onClose();
                  }}
                  className="mt-3 text-xs font-semibold text-orange-600 hover:text-orange-700 inline-flex items-center gap-1.5 group"
                >
                  <span>Open Full MP Analytical Dossier</span>
                  <ExternalLink size={12} className="group-hover:translate-x-0.5 transition-transform" />
                </button>
              )}
            </div>
          </div>

          {/* Clean Segmented Navigation Tabs */}
          <div className="flex items-center gap-2 border-b border-zinc-100 pb-3">
            <button
              onClick={() => setActiveTab('specs')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'specs'
                  ? 'bg-zinc-900 text-white shadow-xs'
                  : 'text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              <FileText size={14} />
              <span>Project Specifications</span>
            </button>

            <button
              onClick={() => setActiveTab('ai')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'ai'
                  ? 'bg-zinc-900 text-white shadow-xs'
                  : 'text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              <Sparkles size={14} className={activeTab === 'ai' ? 'text-amber-300' : 'text-orange-500'} />
              <span>AI Briefing</span>
              {aiSummary && <span className="w-2 h-2 rounded-full bg-emerald-500" />}
            </button>

            <button
              onClick={() => setActiveTab('reviews')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'reviews'
                  ? 'bg-zinc-900 text-white shadow-xs'
                  : 'text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              <MessageSquare size={14} />
              <span>Citizen Reviews ({reviews.length})</span>
            </button>
          </div>

          {/* TAB 1: Specifications (Clean White Card with Generous Spacing) */}
          {activeTab === 'specs' && (
            <div className="bg-white rounded-2xl border border-zinc-200/80 p-6 sm:p-7 shadow-xs space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
                <h3 className="text-sm font-bold text-zinc-900">
                  Administrative Specifications
                </h3>
                <span className="text-xs text-zinc-400 font-medium">Official MoSPI Registry</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-xs">
                <div className="flex justify-between py-2 border-b border-zinc-100">
                  <span className="text-zinc-400 font-medium">Recommending MP</span>
                  <span className="font-semibold text-zinc-800 text-right">{work.mp} ({work.house})</span>
                </div>

                <div className="flex justify-between py-2 border-b border-zinc-100">
                  <span className="text-zinc-400 font-medium">Constituency & State</span>
                  <span className="font-semibold text-zinc-800 text-right">{work.constituency}, {work.state}</span>
                </div>

                <div className="flex justify-between py-2 border-b border-zinc-100">
                  <span className="text-zinc-400 font-medium">Implementing Agency</span>
                  <span className="font-semibold text-zinc-800 text-right truncate max-w-[220px]" title={work.agency}>
                    {work.agency || 'District Implementing Agency'}
                  </span>
                </div>

                <div className="flex justify-between py-2 border-b border-zinc-100">
                  <span className="text-zinc-400 font-medium">Recommended Date</span>
                  <span className="font-semibold text-zinc-800 text-right">{work.recommended || 'Not recorded'}</span>
                </div>

                <div className="flex justify-between py-2 border-b border-zinc-100">
                  <span className="text-zinc-400 font-medium">Work Category</span>
                  <span className="font-semibold text-zinc-800 text-right">{work.category || 'Normal/Others'}</span>
                </div>

                <div className="flex justify-between py-2 border-b border-zinc-100">
                  <span className="text-zinc-400 font-medium">Location Scope</span>
                  <span className="font-semibold text-orange-600 text-right truncate max-w-[220px]">
                    {[work.village, work.city, work.block].filter(Boolean).join(' · ') || 'Constituency Wide'}
                  </span>
                </div>
              </div>

              {/* Download & Source Footer */}
              <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-zinc-500">
                <span className="text-zinc-400">
                  Dataset Source: <strong className="text-zinc-700">{work.file}</strong> (Record #{work.line})
                </span>

                <button 
                  onClick={() => {
                    const blob = new Blob([sourceCsv([work])], { type: 'text/csv;charset=utf-8' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${work.id}.csv`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 text-zinc-700 rounded-lg font-medium transition self-start sm:self-auto"
                >
                  <ArrowDownToLine size={13} className="text-zinc-500" />
                  <span>Download Work Record CSV</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: AI Briefing (Clean Minimalist White Container) */}
          {activeTab === 'ai' && (
            <div className="bg-white rounded-2xl border border-zinc-200/80 p-6 sm:p-7 shadow-xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-100">
                <div className="flex items-center gap-2">
                  <Sparkles size={18} className="text-orange-600" />
                  <div>
                    <h3 className="font-bold text-sm text-zinc-900">
                      Nirmaan AI Project Briefing
                    </h3>
                    <span className="text-[11px] text-zinc-400">
                      Synthesis powered by Google Gemini API
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleGenerateSummary}
                  disabled={generatingSummary}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-xs transition"
                >
                  {generatingSummary ? (
                    <>
                      <RefreshCw size={13} className="animate-spin" />
                      <span>Analyzing with Gemini...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={13} />
                      <span>{aiSummary ? 'Regenerate Briefing' : 'Generate AI Briefing'}</span>
                    </>
                  )}
                </button>
              </div>

              {aiSummary ? (
                <div className="text-xs sm:text-sm leading-relaxed text-zinc-700 bg-zinc-50/60 p-5 rounded-xl border border-zinc-200/60 whitespace-pre-wrap">
                  {aiSummary}
                </div>
              ) : (
                <div className="py-8 text-center text-zinc-500 max-w-md mx-auto space-y-2">
                  <Sparkles size={32} className="mx-auto text-orange-500 opacity-70" />
                  <p className="font-semibold text-sm text-zinc-800">
                    Generate an Instant Executive Summary
                  </p>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Synthesize the work&rsquo;s scope, implementing authority, community utility, and execution timeline with Gemini AI.
                  </p>
                </div>
              )}

              {summaryError && (
                <p className="text-xs text-red-600 bg-red-50 p-3 rounded-xl border border-red-200">
                  {summaryError}
                </p>
              )}
            </div>
          )}

          {/* TAB 3: Citizen Reviews (Clean, Spacious Feedback Section) */}
          {activeTab === 'reviews' && (
            <div className="space-y-6">
              {/* Review Input Box */}
              <div className="bg-white rounded-2xl border border-zinc-200/80 p-6 sm:p-7 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
                  <h3 className="font-bold text-sm text-zinc-900">
                    Leave a Public Review
                  </h3>
                  {avgRating && (
                    <div className="flex items-center gap-1 text-amber-500 text-xs font-bold">
                      <Star size={14} fill="currentColor" />
                      <span>{avgRating} / 5.0 Average ({reviews.length})</span>
                    </div>
                  )}
                </div>

                <form onSubmit={handleSubmitReview} className="space-y-4">
                  {/* Rating Selector */}
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1.5">
                      Your Rating
                    </label>
                    <div className="flex items-center gap-1.5">
                      {[1, 2, 3, 4, 5].map(star => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRating(star)}
                          className={`p-1 transition-transform hover:scale-110 ${rating >= star ? 'text-amber-400' : 'text-zinc-200 hover:text-amber-300'}`}
                          title={`${star} star`}
                        >
                          <Star size={22} fill={rating >= star ? 'currentColor' : 'none'} />
                        </button>
                      ))}
                      <span className="text-xs text-zinc-500 ml-2 font-medium">
                        {rating} out of 5 stars
                      </span>
                    </div>
                  </div>

                  {/* Name Input */}
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">
                      Your Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ramesh Kumar"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-zinc-200 bg-white text-zinc-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition"
                    />
                  </div>

                  {/* Review Textarea */}
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">
                      Your Observation / Message
                    </label>
                    <textarea
                      required
                      rows={3}
                      placeholder="Share your ground observation regarding work execution, delay, or completion quality..."
                      value={message}
                      onChange={e => setMessage(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-zinc-200 bg-white text-zinc-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition resize-none"
                    />
                  </div>

                  {reviewError && (
                    <p className="text-xs text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200">{reviewError}</p>
                  )}
                  {reviewSuccess && (
                    <p className="text-xs text-emerald-700 bg-emerald-50 p-2.5 rounded-lg border border-emerald-200 font-medium">
                      ✓ Review recorded and saved to public registry!
                    </p>
                  )}

                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      disabled={submittingReview}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-xs transition"
                    >
                      {submittingReview ? (
                        <>
                          <RefreshCw size={13} className="animate-spin" />
                          <span>Submitting...</span>
                        </>
                      ) : (
                        <>
                          <span>Submit Citizen Review</span>
                          <Send size={13} />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>

              {/* List of Previous Reviews */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                  Community Feedback ({reviews.length})
                </h4>

                {loadingReviews ? (
                  <div className="text-xs text-zinc-400 flex items-center gap-2 py-4">
                    <RefreshCw size={14} className="animate-spin text-orange-600" />
                    <span>Loading reviews...</span>
                  </div>
                ) : reviews.length === 0 ? (
                  <div className="p-6 bg-zinc-50 rounded-2xl border border-zinc-200/60 text-center text-zinc-400 text-xs">
                    No community reviews recorded yet. Be the first citizen to leave a review above!
                  </div>
                ) : (
                  reviews.map(r => (
                    <div key={r.id} className="p-5 bg-white rounded-2xl border border-zinc-200/80 shadow-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-zinc-100 flex items-center justify-center font-bold text-xs text-zinc-600">
                            {r.name?.slice(0, 1).toUpperCase() || 'C'}
                          </div>
                          <div>
                            <strong className="font-semibold text-xs text-zinc-900 block">
                              {r.name}
                            </strong>
                            <span className="text-[10px] text-zinc-400 block">
                              {new Date(r.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                        </div>

                        <div className="flex text-amber-400">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              size={13}
                              fill={i < (r.rating || 5) ? 'currentColor' : 'none'}
                              className={i < (r.rating || 5) ? 'text-amber-400' : 'text-zinc-200'}
                            />
                          ))}
                        </div>
                      </div>

                      <p className="text-xs text-zinc-700 leading-relaxed whitespace-pre-wrap pl-9">
                        {r.message}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
