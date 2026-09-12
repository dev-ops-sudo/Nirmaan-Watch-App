import { useEffect, useState } from 'react';
import { Star, MessageSquare, Send } from 'lucide-react';

export default function ProjectReviews({ projectId, role }: { projectId: string, role: string }) {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  // Form state
  const [rating, setRating] = useState(5);
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');

  const fetchReviews = async () => {
    try {
      const res = await fetch(`/api/reviews?projectId=${projectId}`);
      if (res.ok) {
        const data = (await res.json()) as any;
        setReviews(data.reviews || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchReviews();
  }, [projectId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, name, rating, message }),
      });
      
      const data = (await res.json()) as any;
      if (res.ok) {
        // Reset form
        setName('');
        setMessage('');
        setRating(5);
        // Refresh reviews
        fetchReviews();
      } else {
        setError(data.error || 'Failed to submit review');
      }
    } catch (e) {
      setError('Network error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-8 border-t pt-6">
      <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
        <MessageSquare size={18} /> Citizen Reviews
      </h3>
      
      {role === 'citizen' && (
        <form onSubmit={handleSubmit} className="mb-8 bg-orange-50/50 p-4 rounded-lg border border-orange-200">
          <h4 className="font-medium text-orange-950 mb-3">Leave a Review</h4>
          
          <div className="mb-3">
            <label className="block text-sm text-gray-700 mb-1">Rating</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className={`p-1 ${rating >= star ? 'text-orange-500' : 'text-gray-300'}`}
                >
                  <Star size={24} fill={rating >= star ? 'currentColor' : 'none'} />
                </button>
              ))}
            </div>
          </div>
          
          <div className="mb-3">
            <label className="block text-sm text-gray-700 mb-1">Your Name</label>
            <input 
              type="text" 
              required
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full border-gray-300 rounded-md py-2 px-3 border text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
              placeholder="e.g. Ramesh Kumar"
            />
          </div>
          
          <div className="mb-3">
            <label className="block text-sm text-gray-700 mb-1">Review Message</label>
            <textarea 
              required
              value={message}
              onChange={e => setMessage(e.target.value)}
              className="w-full border-gray-300 rounded-md py-2 px-3 border text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
              rows={3}
              placeholder="Describe your observations about this project..."
            />
          </div>
          
          {error && <div className="text-red-600 text-sm mb-3">{error}</div>}
          
          <button 
            type="submit" 
            disabled={submitting}
            className="flex items-center gap-2 bg-orange-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-orange-700 disabled:opacity-70"
          >
            {submitting ? 'Submitting...' : 'Submit Review'} <Send size={14} />
          </button>
        </form>
      )}

      {role !== 'citizen' && (
        <div className="bg-gray-50 p-3 rounded-md mb-6 text-sm text-gray-600">
          You are viewing as a Government Official. Only citizens can leave new public reviews here.
        </div>
      )}

      <div className="space-y-4">
        {loading ? (
          <div className="text-gray-500 text-sm">Loading reviews...</div>
        ) : reviews.length === 0 ? (
          <div className="text-gray-500 text-sm italic">No reviews yet for this project.</div>
        ) : (
          reviews.map(review => (
            <div key={review.id} className="border border-gray-100 rounded-md p-4 bg-white shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <strong className="block text-gray-900">{review.name}</strong>
                  <span className="text-xs text-gray-500">{new Date(review.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex text-amber-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={14} fill={i < review.rating ? 'currentColor' : 'none'} className={i < review.rating ? 'text-amber-400' : 'text-gray-300'} />
                  ))}
                </div>
              </div>
              <p className="text-gray-700 text-sm mt-2 whitespace-pre-wrap">{review.message}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
