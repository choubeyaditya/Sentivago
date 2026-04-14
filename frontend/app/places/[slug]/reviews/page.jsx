'use client';

import { useEffect, useState } from 'react';
import DestinationShell from '@/components/DestinationShell';
import { api } from '@/lib/api';

function formatDate(value) {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return 'Recently';
  }

  return parsed.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function ReviewsContent({ destination }) {
  const [form, setForm] = useState({
    reviewerName: '',
    rating: '5',
    content: '',
  });
  const [state, setState] = useState({
    loading: true,
    submitting: false,
    error: '',
    reviews: [],
    communityRating: 5,
    reviewCount: 0,
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setState((current) => ({
        ...current,
        loading: true,
        error: '',
      }));

      try {
        const data = await api.getReviews(destination.slug, {
          placeId: destination.placeId,
          name: destination.name,
          state: destination.state,
        });

        if (!cancelled) {
          setState((current) => ({
            ...current,
            loading: false,
            error: '',
            reviews: data.reviews || [],
            communityRating: data.communityRating || 5,
            reviewCount: data.reviewCount || 0,
          }));
        }
      } catch (error) {
        if (!cancelled) {
          setState((current) => ({
            ...current,
            loading: false,
            error: error.message,
            reviews: [],
            communityRating: 5,
            reviewCount: 0,
          }));
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [destination.name, destination.placeId, destination.slug, destination.state]);

  function updateForm(key, value) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setState((current) => ({
      ...current,
      submitting: true,
      error: '',
    }));

    try {
      const data = await api.submitReview(destination.slug, {
        placeId: destination.placeId,
        placeSlug: destination.slug,
        destinationName: destination.name,
        destinationState: destination.state,
        reviewerName: form.reviewerName.trim(),
        rating: Number(form.rating),
        content: form.content.trim(),
      });

      setState((current) => ({
        ...current,
        submitting: false,
        reviews: [data.review, ...current.reviews],
        communityRating: data.communityRating,
        reviewCount: data.reviewCount,
      }));

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('destination-review-updated', {
            detail: {
              placeId: destination.placeId,
              communityRating: data.communityRating,
              reviewCount: data.reviewCount,
            },
          })
        );
      }

      setForm({
        reviewerName: '',
        rating: '5',
        content: '',
      });
    } catch (error) {
      setState((current) => ({
        ...current,
        submitting: false,
        error: error.message,
      }));
    }
  }

  return (
    <section className="page-stack">
      <article className="panel">
        <span className="section-kicker">Reviews</span>
        <h2 className="section-title">Community feedback for {destination.name}</h2>
        <p className="section-subcopy">Read what travellers are saying and leave your own quick note.</p>

        <div className="tag-row">
          <span className="tag">⭐ {Number(state.communityRating || 5).toFixed(1)} community rating</span>
          <span className="tag">{state.reviewCount || 0} reviews</span>
        </div>

        {state.error ? <div className="error-box">{state.error}</div> : null}
      </article>

      <article className="panel">
        <span className="section-kicker">Add your review</span>
        <h3 className="subsection-title">Share your take</h3>

        <form className="review-form" onSubmit={handleSubmit}>
          <div className="field-grid">
            <label>
              Your name
              <input
                className="input-field"
                value={form.reviewerName}
                onChange={(event) => updateForm('reviewerName', event.target.value)}
                placeholder="Traveller name"
                required
              />
            </label>

            <label>
              Rating
              <select
                className="select-field"
                value={form.rating}
                onChange={(event) => updateForm('rating', event.target.value)}
              >
                {[5, 4, 3, 2, 1].map((value) => (
                  <option key={value} value={value}>
                    {value} star{value === 1 ? '' : 's'}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label>
            Review
            <textarea
              className="textarea-field"
              value={form.content}
              onChange={(event) => updateForm('content', event.target.value)}
              placeholder="What did you like, and who is this destination best for?"
              required
            />
          </label>

          <button type="submit" className="button-primary" disabled={state.submitting}>
            {state.submitting ? 'Saving review...' : 'Save review'}
          </button>
        </form>
      </article>

      <article className="panel">
        <span className="section-kicker">Existing reviews</span>
        <h3 className="subsection-title">What people are saying</h3>

        {state.loading ? (
          <div className="empty-panel">Loading reviews...</div>
        ) : state.reviews.length ? (
          <div className="review-list">
            {state.reviews.map((review) => (
              <article className="review-card" key={review.id}>
                <div className="review-head">
                  <div>
                    <strong>{review.reviewer_name}</strong>
                    <p>{formatDate(review.created_at)}</p>
                  </div>
                  <span className="tag">⭐ {Number(review.rating || 5).toFixed(1)}</span>
                </div>
                <p className="panel-copy">{review.content}</p>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-panel">No reviews yet. Add the first one for this destination.</div>
        )}
      </article>
    </section>
  );
}

export default function ReviewsPage() {
  return (
    <DestinationShell activeSection="reviews">
      {({ destination }) => <ReviewsContent destination={destination} />}
    </DestinationShell>
  );
}
