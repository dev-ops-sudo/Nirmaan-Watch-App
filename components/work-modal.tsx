'use client';

import React, { useState, useEffect } from 'react';
import { X, Sparkles, Star, MessageSquare, Send, ArrowDownToLine, Building2, MapPin, Calendar, ShieldCheck, UserCheck, RefreshCw, ExternalLink, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { money } from '@/lib/domain';
import { columns, sourceCsv, type Work } from '@/lib/mplads';

interface WorkModalProps {
  work: Work | null;
  onClose: () => void;
  onViewMpDossier?: (mpName: string) => void;
}

export default function WorkModal({ work, onClose, onViewMpDossier }: WorkModalProps) {
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
      setSummaryError('Could not generate AI summary at this moment.');
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-4xl max-h-[92vh] bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col overflow-hidden text-zinc-900 dark:text-zinc-100"
        onClick={e => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700 text-white flex items-start justify-between">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 bg-white/20 text-white font-mono text-xs font-bold rounded-full tracking-wider">
                {work.id}
              </span>
              <span className="text-xs text-orange-100 font-medium">
                {work.category}
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold leading-snug">
              {work.title || 'Work Title Not Reported'}
            </h2>
            <p className="text-xs text-orange-100 flex items-center gap-1.5">
              <MapPin size={13} />
              {[work.village, work.ward, work.block, work.city, work.constituency, work.state].filter(Boolean).join(' · ')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-full text-white/90 transition shrink-0 ml-4"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm">
          {/* Key Metrics Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Allocation Card */}
            <div className="p-4 bg-orange-50/70 dark:bg-orange-950/30 rounded-xl border border-orange-200 dark:border-orange-900/50">
              <span className="text-xs font-semibold text-orange-800 dark:text-orange-300 uppercase tracking-wider block mb-1">
                Recorded Allocation
              </span>
              <strong className="text-2xl font-bold text-orange-600 dark:text-orange-400 block font-mono">
                {money(work.allocation)}
              </strong>
              <span className="text-[11px] text-zinc-500 block mt-1">
                Sanctioned allocation from official records
              </span>
            </div>

            {/* Status & Approval Card */}
            <div className="p-4 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-200 dark:border-zinc-700/60">
              <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider block mb-2">
                Implementation Status
              </span>
              <div className="flex flex-wrap gap-2">
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                  work.status === 'Completed' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' :
                  work.status === 'Ongoing' || work.status === 'Sanctioned' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300' :
                  'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                }`}>
                  {work.status === 'Completed' ? <CheckCircle2 size={13} /> : <Clock size={13} />}
                  {work.status}
                </span>
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                  work.approval === 'Approved by IDA' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300' :
                  work.approval === 'Action Pending' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300' :
                  'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                }`}>
                  <ShieldCheck size={13} />
                  {work.approval}
                </span>
              </div>
            </div>

            {/* Recommending MP Action Card */}
            <div className="p-4 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-200 dark:border-zinc-700/60 flex flex-col justify-between">
              <div>
                <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider block mb-1">
                  Recommending MP
                </span>
                <strong className="text-base font-bold text-zinc-900 dark:text-zinc-100 block truncate">
                  {work.mp}
                </strong>
                <span className="text-xs text-zinc-500 block">
                  {work.house} · {work.constituency}
                </span>
              </div>
              {onViewMpDossier && (
                <button
                  onClick={() => {
                    onViewMpDossier(work.mp);
                    onClose();
                  }}
                  className="mt-3 text-xs font-bold text-orange-600 hover:text-orange-700 dark:text-orange-400 flex items-center gap-1 group"
                >
                  <span>Open Full MP Analytical Dossier</span>
                  <ExternalLink size={13} className="group-hover:translate-x-0.5 transition" />
                </button>
              )}
            </div>
          </div>

          {/* AI Summary Banner & Generator */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-orange-50/70 via-amber-50/50 to-orange-50/70 dark:from-orange-950/20 dark:to-zinc-800/40 border border-orange-200 dark:border-orange-800/50">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-orange-600" />
                <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                  Nirmaan AI Project Briefing
                </h3>
                <span className="text-[10px] bg-orange-100 dark:bg-orange-900/60 text-orange-800 dark:text-orange-300 font-medium px-2 py-0.5 rounded-full">
                  Gemini API
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
                    <span>Analyzing with Gemini...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={13} />
                    <span>{aiSummary ? 'Regenerate Summary' : 'Generate AI Summary'}</span>
                  </>
                )}
              </button>
            </div>

            {aiSummary ? (
              <div className="text-xs leading-relaxed text-zinc-800 dark:text-zinc-200 bg-white/80 dark:bg-zinc-900/80 p-3.5 rounded-lg border border-orange-200/80 dark:border-orange-900/40 whitespace-pre-wrap">
                {aiSummary}
              </div>
            ) : (
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                Click <strong>&ldquo;Generate AI Summary&rdquo;</strong> to synthesize an executive audit briefing analyzing this project&rsquo;s scope, implementing agency, and geographical utility using Gemini.
              </p>
            )}

            {summaryError && (
              <p className="text-xs text-red-600 mt-2">{summaryError}</p>
            )}
          </div>

          {/* Clean Administrative & Location Details */}
          <div className="bg-zinc-50/80 dark:bg-zinc-800/40 rounded-xl border border-zinc-200/80 dark:border-zinc-700/60 p-4 space-y-4">
            <h3 className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider flex items-center justify-between">
              <span>Project & Administrative Specifications</span>
              <span className="text-[11px] font-normal text-zinc-400">Official MoSPI Registry</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-zinc-200/50 dark:border-zinc-700/50">
                <span className="text-zinc-500 font-medium">Recommending MP</span>
                <span className="font-semibold text-zinc-900 dark:text-zinc-100">{work.mp} ({work.house})</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-zinc-200/50 dark:border-zinc-700/50">
                <span className="text-zinc-500 font-medium">Constituency & State</span>
                <span className="font-semibold text-zinc-900 dark:text-zinc-100">{work.constituency}, {work.state}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-zinc-200/50 dark:border-zinc-700/50">
                <span className="text-zinc-500 font-medium">Implementing Authority</span>
                <span className="font-semibold text-zinc-900 dark:text-zinc-100">{work.agency || 'District Implementing Agency'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-zinc-200/50 dark:border-zinc-700/50">
                <span className="text-zinc-500 font-medium">Recommended Date</span>
                <span className="font-semibold text-zinc-900 dark:text-zinc-100">{work.recommended || 'Not recorded'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-zinc-200/50 dark:border-zinc-700/50">
                <span className="text-zinc-500 font-medium">Work Category</span>
                <span className="font-semibold text-zinc-900 dark:text-zinc-100">{work.category}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-zinc-200/50 dark:border-zinc-700/50">
                <span className="text-zinc-500 font-medium">Location Scope</span>
                <span className="font-semibold text-orange-600 dark:text-orange-400">
                  {[work.village, work.city, work.block].filter(Boolean).join(' · ') || 'Constituency Wide'}
                </span>
              </div>
            </div>

            {/* Export & Trace Row */}
            <div className="pt-2 flex items-center justify-between text-xs text-zinc-500">
              <span>Registry Source: <strong>{work.file}</strong> (Line {work.line})</span>
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
                className="text-orange-600 hover:text-orange-700 font-bold inline-flex items-center gap-1.5 transition"
              >
                <ArrowDownToLine size={13} />
                <span>Download Official CSV</span>
              </button>
            </div>
          </div>

          {/* Citizen Reviews & Public Feedback Section */}
          <div className="pt-6 border-t border-zinc-200 dark:border-zinc-800 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare size={18} className="text-orange-600" />
                <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
                  Citizen Reviews & Ground Observations
                </h3>
                <span className="text-xs bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full text-zinc-600 dark:text-zinc-400 font-medium">
                  {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}
                </span>
              </div>
              {avgRating && (
                <div className="flex items-center gap-1 text-amber-500 text-xs font-bold">
                  <Star size={14} fill="currentColor" />
                  <span>{avgRating} / 5.0 Average</span>
                </div>
              )}
            </div>

            {/* Leave a Review Form - Open to all users & citizens */}
            <form onSubmit={handleSubmitReview} className="p-4 bg-orange-50/40 dark:bg-orange-950/20 rounded-xl border border-orange-200 dark:border-orange-900/40 space-y-3">
              <h4 className="text-xs font-bold text-orange-950 dark:text-orange-200 uppercase tracking-wider">
                Leave a Public Review
              </h4>

              {/* Star Rating Picker */}
              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Rating
                </label>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className={`p-1 transition ${rating >= star ? 'text-amber-500' : 'text-zinc-300 dark:text-zinc-600 hover:text-amber-300'}`}
                      title={`${star} star`}
                    >
                      <Star size={22} fill={rating >= star ? 'currentColor' : 'none'} />
                    </button>
                  ))}
                  <span className="text-xs text-zinc-500 ml-2 font-medium">
                    ({rating} of 5 stars)
                  </span>
                </div>
              </div>

              {/* Name Input */}
              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Your Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {/* Message Input */}
              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Review Message
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Share your ground observation regarding physical work execution, delay, or completion quality..."
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                />
              </div>

              {reviewError && (
                <p className="text-xs text-red-600">{reviewError}</p>
              )}
              {reviewSuccess && (
                <p className="text-xs text-emerald-600 font-medium">
                  ✓ Review saved to database and published successfully!
                </p>
              )}

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={submittingReview}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-xs transition"
                >
                  {submittingReview ? (
                    <>
                      <RefreshCw size={13} className="animate-spin" />
                      <span>Saving to Database...</span>
                    </>
                  ) : (
                    <>
                      <span>Submit Review</span>
                      <Send size={13} />
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* List of Existing Reviews */}
            <div className="space-y-3 pt-2">
              {loadingReviews ? (
                <div className="text-xs text-zinc-500 flex items-center gap-2 py-4">
                  <RefreshCw size={14} className="animate-spin text-orange-600" />
                  <span>Loading reviews from database...</span>
                </div>
              ) : reviews.length === 0 ? (
                <p className="text-xs text-zinc-500 italic py-3">
                  No public reviews recorded yet for this work. Be the first citizen to leave a review above!
                </p>
              ) : (
                reviews.map(r => (
                  <div key={r.id} className="p-4 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-200 dark:border-zinc-700/60 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div>
                        <strong className="font-semibold text-xs text-zinc-900 dark:text-zinc-100 block">
                          {r.name}
                        </strong>
                        <span className="text-[10px] text-zinc-400">
                          {new Date(r.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                      <div className="flex text-amber-400">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            size={13}
                            fill={i < (r.rating || 5) ? 'currentColor' : 'none'}
                            className={i < (r.rating || 5) ? 'text-amber-400' : 'text-zinc-300 dark:text-zinc-600'}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
                      {r.message}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
