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
  AlertTriangle
} from 'lucide-react';
import { queryRagIntelligence } from '@/lib/rag-service';
import { money } from '@/lib/domain';
import { sourceCsv, type Work } from '@/lib/mplads';

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

      const data = await queryRagIntelligence({
        query: prompt,
        state: work.state,
        mp: work.mp,
        local: work.block || work.city || work.constituency || 'All localities'
      });

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

  const locationParts = [work.village, work.ward, work.block, work.city, work.constituency, work.state].filter(Boolean);
  const locationText = locationParts.join(' · ');

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 backdrop-blur-md p-3 sm:p-6 md:p-8 overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-6xl max-h-[94vh] bg-white rounded-3xl shadow-2xl border border-zinc-200/90 flex flex-col overflow-hidden text-zinc-900"
        onClick={e => e.stopPropagation()}
      >
        {/* Large, Airy White Header */}
        <div className="px-8 py-7 sm:px-10 sm:py-8 bg-white border-b border-zinc-100 flex items-start justify-between gap-6">
          <div className="space-y-3 flex-1 min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="px-3 py-1 bg-orange-50 text-orange-700 font-mono text-xs font-bold rounded-xl border border-orange-200/70">
                {work.id}
              </span>
              <span className="px-3 py-1 bg-zinc-100 text-zinc-600 text-xs font-semibold rounded-xl">
                {work.category || 'Normal/Others'}
              </span>
              {work.approval && (
                <span className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200/70 text-xs font-semibold rounded-xl inline-flex items-center gap-1.5">
                  <ShieldCheck size={13} />
                  <span>{work.approval}</span>
                </span>
              )}
            </div>

            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 leading-snug">
              {work.title || 'Work Title Not Reported'}
            </h2>

            <p className="text-sm text-zinc-500 flex items-center gap-2 font-medium">
              <MapPin size={16} className="text-orange-500 shrink-0" />
              <span>{locationText || 'Constituency Location'}</span>
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-3 bg-zinc-50 hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 rounded-full transition-all shrink-0 ml-4 shadow-xs"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Big Spacious Modal Body */}
        <div className="flex-1 overflow-y-auto p-8 sm:p-10 space-y-10 bg-white">
          
          {/* SECTION 1: Key Metrics (Large, Spacious White Cards with Wide Gaps) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Box 1: Allocation */}
            <div className="p-7 sm:p-8 bg-white rounded-3xl border border-zinc-200/80 shadow-xs flex flex-col justify-between space-y-4 hover:border-orange-200 transition-colors">
              <div>
                <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-2">
                  Recorded Allocation
                </span>
                <strong className="text-3xl sm:text-4xl font-bold text-zinc-900 font-mono tracking-tight block">
                  {money(work.allocation)}
                </strong>
              </div>
              <span className="text-xs text-zinc-400 font-medium block">
                Official sanctioned financial limit
              </span>
            </div>

            {/* Box 2: Implementation Status */}
            <div className="p-7 sm:p-8 bg-white rounded-3xl border border-zinc-200/80 shadow-xs flex flex-col justify-between space-y-4 hover:border-zinc-300 transition-colors">
              <div>
                <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-3">
                  Implementation Status
                </span>
                <div className="flex flex-wrap gap-2.5 items-center">
                  <span className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold ${
                    work.status === 'Completed'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : work.status === 'Ongoing' || work.status === 'Sanctioned'
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : 'bg-zinc-100 text-zinc-700 border border-zinc-200'
                  }`}>
                    {work.status === 'Completed' ? <CheckCircle2 size={14} /> : <Clock size={14} />}
                    <span>{work.status}</span>
                  </span>

                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-zinc-100 text-zinc-600 border border-zinc-200">
                    <ShieldCheck size={14} />
                    <span>{work.approval || 'Action Pending'}</span>
                  </span>
                </div>
              </div>
              <span className="text-xs text-zinc-400 font-medium block">
                Tracked via district planning portal
              </span>
            </div>

            {/* Box 3: Recommending MP */}
            <div className="p-7 sm:p-8 bg-white rounded-3xl border border-zinc-200/80 shadow-xs flex flex-col justify-between space-y-4 hover:border-orange-200 transition-colors">
              <div>
                <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-2">
                  Recommending MP
                </span>
                <strong className="text-lg sm:text-xl font-bold text-zinc-900 block truncate">
                  {work.mp}
                </strong>
                <span className="text-xs text-zinc-500 block mt-1 font-medium">
                  {work.house} · {work.constituency}
                </span>
              </div>

              {onViewMpDossier && (
                <button
                  onClick={() => {
                    onViewMpDossier(work.mp);
                    onClose();
                  }}
                  className="pt-2 text-xs font-semibold text-orange-600 hover:text-orange-700 inline-flex items-center gap-1.5 group self-start"
                >
                  <span>Open Full MP Analytical Dossier</span>
                  <ExternalLink size={13} className="group-hover:translate-x-0.5 transition-transform" />
                </button>
              )}
            </div>
          </div>

          {/* SECTION 2: Project Specifications (Spacious Individual Tiles - "put every detail far from each other") */}
          <div className="bg-white rounded-3xl border border-zinc-200/80 p-8 sm:p-10 shadow-xs space-y-7">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-100">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-zinc-900">
                  Project & Administrative Specifications
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Official MoSPI National Registry Records & Public Details
                </p>
              </div>

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
                className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-orange-50 hover:text-orange-700 hover:border-orange-200 border border-zinc-200 text-zinc-700 rounded-xl text-xs font-semibold transition-all self-start sm:self-auto shadow-2xs"
              >
                <ArrowDownToLine size={14} className="text-zinc-500" />
                <span>Download Official CSV</span>
              </button>
            </div>

            {/* Generous Grid of Individual Specification Tiles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
              {/* Tile 1: Recommending MP */}
              <div className="p-6 bg-zinc-50/70 rounded-2xl border border-zinc-200/70 hover:border-zinc-300 transition-colors flex flex-col justify-between space-y-3">
                <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">
                  Recommending MP
                </span>
                <strong className="text-sm sm:text-base font-bold text-zinc-900 block leading-snug">
                  {work.mp} ({work.house})
                </strong>
                <span className="text-xs text-zinc-400 font-medium block">
                  Member of Parliament
                </span>
              </div>

              {/* Tile 2: Constituency & State */}
              <div className="p-6 bg-zinc-50/70 rounded-2xl border border-zinc-200/70 hover:border-zinc-300 transition-colors flex flex-col justify-between space-y-3">
                <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">
                  Constituency & State
                </span>
                <strong className="text-sm sm:text-base font-bold text-zinc-900 block leading-snug">
                  {work.constituency}, {work.state}
                </strong>
                <span className="text-xs text-zinc-400 font-medium block">
                  Electoral jurisdiction
                </span>
              </div>

              {/* Tile 3: Implementing Authority */}
              <div className="p-6 bg-zinc-50/70 rounded-2xl border border-zinc-200/70 hover:border-zinc-300 transition-colors flex flex-col justify-between space-y-3">
                <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">
                  Implementing Authority
                </span>
                <strong className="text-sm sm:text-base font-bold text-zinc-900 block leading-snug break-words">
                  {work.agency || 'District Implementing Agency'}
                </strong>
                <span className="text-xs text-zinc-400 font-medium block">
                  Designated nodal department
                </span>
              </div>

              {/* Tile 4: Recommended Date */}
              <div className="p-6 bg-zinc-50/70 rounded-2xl border border-zinc-200/70 hover:border-zinc-300 transition-colors flex flex-col justify-between space-y-3">
                <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">
                  Recommended Date
                </span>
                <strong className="text-sm sm:text-base font-bold text-zinc-900 block leading-snug">
                  {work.recommended || 'Date not recorded'}
                </strong>
                <span className="text-xs text-zinc-400 font-medium block">
                  Formal proposal submission
                </span>
              </div>

              {/* Tile 5: Work Category */}
              <div className="p-6 bg-zinc-50/70 rounded-2xl border border-zinc-200/70 hover:border-zinc-300 transition-colors flex flex-col justify-between space-y-3">
                <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">
                  Work Category
                </span>
                <strong className="text-sm sm:text-base font-bold text-zinc-900 block leading-snug">
                  {work.category || 'Normal/Others'}
                </strong>
                <span className="text-xs text-zinc-400 font-medium block">
                  Developmental sector classification
                </span>
              </div>

              {/* Tile 6: Location Scope */}
              <div className="p-6 bg-zinc-50/70 rounded-2xl border border-zinc-200/70 hover:border-zinc-300 transition-colors flex flex-col justify-between space-y-3">
                <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">
                  Location Scope
                </span>
                <strong className="text-sm sm:text-base font-bold text-orange-600 block leading-snug break-words">
                  {[work.village, work.city, work.block].filter(Boolean).join(' · ') || 'Constituency Wide'}
                </strong>
                <span className="text-xs text-zinc-400 font-medium block">
                  Gram Panchayat / Ward scope
                </span>
              </div>

              {/* Tile 7: Registry Source */}
              <div className="p-6 bg-zinc-50/70 rounded-2xl border border-zinc-200/70 hover:border-zinc-300 transition-colors flex flex-col justify-between space-y-3 sm:col-span-2 lg:col-span-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
                      National Dataset Verification
                    </span>
                    <strong className="text-sm sm:text-base font-bold text-zinc-800 block">
                      {work.file} (Record Row #{work.line})
                    </strong>
                    <span className="text-xs text-zinc-400 mt-0.5 block">
                      Audited from official Central MPLADS Government of India repository
                    </span>
                  </div>
                  <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200/80 rounded-full text-xs font-semibold self-start sm:self-center">
                    Verified MoSPI Entry
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 3: AI Briefing (Spacious Dedicated White Card) */}
          <div className="bg-white rounded-3xl border border-zinc-200/80 p-8 sm:p-10 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0 border border-orange-200/60">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-base sm:text-lg text-zinc-900">
                    Nirmaan AI Project Briefing
                  </h3>
                  <span className="text-xs text-zinc-400 font-medium">
                    Automated synthesis powered by Google Gemini RAG API
                  </span>
                </div>
              </div>

              <button
                onClick={handleGenerateSummary}
                disabled={generatingSummary}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-xs transition-all self-start sm:self-auto"
              >
                {generatingSummary ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Analyzing with Gemini...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={14} />
                    <span>{aiSummary ? 'Regenerate Briefing' : 'Generate AI Summary'}</span>
                  </>
                )}
              </button>
            </div>

            {aiSummary ? (
              <div className="text-sm leading-relaxed text-zinc-800 bg-zinc-50/70 p-6 sm:p-7 rounded-2xl border border-zinc-200/70 whitespace-pre-wrap">
                {aiSummary}
              </div>
            ) : (
              <div className="py-8 text-center text-zinc-500 max-w-lg mx-auto space-y-2.5">
                <Sparkles size={36} className="mx-auto text-orange-500 opacity-70" />
                <p className="font-semibold text-base text-zinc-800">
                  Generate an Executive Project Briefing
                </p>
                <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                  Synthesize an executive audit briefing analyzing this project&rsquo;s scope, implementing agency, and geographical utility using Gemini.
                </p>
              </div>
            )}

            {summaryError && (
              <p className="text-xs text-red-600 bg-red-50 p-3.5 rounded-xl border border-red-200 font-medium">
                {summaryError}
              </p>
            )}
          </div>

          {/* SECTION 4: Citizen Reviews & Public Feedback (Spacious Layout) */}
          <div className="bg-white rounded-3xl border border-zinc-200/80 p-8 sm:p-10 shadow-xs space-y-7">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-zinc-100 text-zinc-700 flex items-center justify-center shrink-0">
                  <MessageSquare size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-base sm:text-lg text-zinc-900">
                    Citizen Reviews & Ground Observations
                  </h3>
                  <span className="text-xs text-zinc-400 font-medium">
                    {reviews.length} {reviews.length === 1 ? 'public review' : 'public reviews'} registered
                  </span>
                </div>
              </div>

              {avgRating && (
                <div className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-50 border border-amber-200/80 rounded-full text-amber-800 text-xs font-bold self-start sm:self-auto">
                  <Star size={14} fill="currentColor" className="text-amber-500" />
                  <span>{avgRating} / 5.0 Rating</span>
                </div>
              )}
            </div>

            {/* Leave a Review Form */}
            <form onSubmit={handleSubmitReview} className="p-6 sm:p-8 bg-zinc-50/60 rounded-2xl border border-zinc-200/80 space-y-5">
              <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                Leave a Public Review
              </h4>

              {/* Star Rating Picker */}
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-2">
                  Your Rating
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className={`p-1 transition-transform hover:scale-110 ${rating >= star ? 'text-amber-400' : 'text-zinc-200 hover:text-amber-300'}`}
                      title={`${star} star`}
                    >
                      <Star size={26} fill={rating >= star ? 'currentColor' : 'none'} />
                    </button>
                  ))}
                  <span className="text-xs text-zinc-500 ml-3 font-semibold">
                    ({rating} of 5 stars)
                  </span>
                </div>
              </div>

              {/* Name Input */}
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1.5">
                  Your Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full h-11 px-4 text-xs rounded-xl border border-zinc-200 bg-white text-zinc-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition shadow-2xs"
                />
              </div>

              {/* Message Input */}
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1.5">
                  Review Message & Ground Observation
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Share your ground observation regarding physical work execution, delay, or completion quality..."
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  className="w-full p-4 text-xs rounded-xl border border-zinc-200 bg-white text-zinc-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition resize-none shadow-2xs"
                />
              </div>

              {reviewError && (
                <p className="text-xs text-red-600 bg-red-50 p-3 rounded-xl border border-red-200 font-medium">{reviewError}</p>
              )}
              {reviewSuccess && (
                <p className="text-xs text-emerald-700 bg-emerald-50 p-3 rounded-xl border border-emerald-200 font-medium">
                  ✓ Review saved to database and published successfully!
                </p>
              )}

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={submittingReview}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-xs transition-all"
                >
                  {submittingReview ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Saving to Database...</span>
                    </>
                  ) : (
                    <>
                      <span>Submit Review</span>
                      <Send size={14} />
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* List of Existing Reviews */}
            <div className="space-y-4 pt-2">
              {loadingReviews ? (
                <div className="text-xs text-zinc-400 flex items-center gap-2 py-4">
                  <RefreshCw size={14} className="animate-spin text-orange-600" />
                  <span>Loading reviews from database...</span>
                </div>
              ) : reviews.length === 0 ? (
                <p className="text-xs text-zinc-400 italic py-3 text-center">
                  No public reviews recorded yet for this work. Be the first citizen to leave a review above!
                </p>
              ) : (
                reviews.map(r => (
                  <div key={r.id} className="p-6 bg-zinc-50/70 rounded-2xl border border-zinc-200/80 shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center font-bold text-xs">
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
                            size={14}
                            fill={i < (r.rating || 5) ? 'currentColor' : 'none'}
                            className={i < (r.rating || 5) ? 'text-amber-400' : 'text-zinc-200'}
                          />
                        ))}
                      </div>
                    </div>

                    <p className="text-xs text-zinc-700 leading-relaxed whitespace-pre-wrap pl-11">
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
