'use client';

import { useEffect, useState } from 'react';
import DestinationShell from '@/components/DestinationShell';
import { api } from '@/lib/api';

const priceOptions = ['All', 'Budget', 'Mid-range', 'Premium', 'Luxury'];
const ratingOptions = ['All', '3', '4', '4.5'];

function normalizePriceLevel(value) {
  return value || 'Unknown';
}

function HotelsContent({ destination }) {
  const [priceFilter, setPriceFilter] = useState('All');
  const [ratingFilter, setRatingFilter] = useState('All');
  const [state, setState] = useState({
    loading: true,
    error: '',
    places: [],
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setState({
        loading: true,
        error: '',
        places: [],
      });

      try {
        const data = await api.getHotels(destination.slug, {
          placeId: destination.placeId,
          name: destination.name,
          state: destination.state,
        });

        if (!cancelled) {
          setState({
            loading: false,
            error: '',
            places: data.places || [],
          });
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            loading: false,
            error: error.message,
            places: [],
          });
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [destination.name, destination.placeId, destination.slug, destination.state]);

  const filtered = state.places.filter((place) => {
    const priceLevel = normalizePriceLevel(place.priceLevel);
    const rating = Number(place.googleRating || 0);

    const matchesPrice = priceFilter === 'All' || priceLevel === priceFilter;
    const matchesRating = ratingFilter === 'All' || rating >= Number(ratingFilter);

    return matchesPrice && matchesRating;
  });

  if (state.loading) {
    return <div className="empty-panel">Loading hotel options...</div>;
  }

  return (
    <section className="page-stack">
      <article className="panel">
        <span className="section-kicker">Hotels</span>
        <h2 className="section-title">Stay options near {destination.name}</h2>
        <p className="section-subcopy">Browse nearby stays and narrow them down by budget and rating.</p>

        <div className="filter-bar">
          <label>
            Price
            <select
              className="select-field"
              value={priceFilter}
              onChange={(event) => setPriceFilter(event.target.value)}
            >
              {priceOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label>
            Rating
            <select
              className="select-field"
              value={ratingFilter}
              onChange={(event) => setRatingFilter(event.target.value)}
            >
              {ratingOptions.map((item) => (
                <option key={item} value={item}>
                  {item === 'All' ? 'All ratings' : `${item}+`}
                </option>
              ))}
            </select>
          </label>
        </div>

        {state.error ? <div className="error-box">{state.error}</div> : null}
      </article>

      <div className="media-list">
        {filtered.map((place) => (
          <article className="media-card" key={place.placeId}>
            <div className="media-thumb">
              {place.imageUrl ? (
                <img src={place.imageUrl} alt={place.name} className="media-thumb-image" />
              ) : (
                <div className="media-fallback">Photo unavailable</div>
              )}
            </div>

            <div className="media-body">
              <div className="media-header">
                <h3 className="media-title">{place.name}</h3>
                <strong>⭐ {Number(place.googleRating || 5).toFixed(1)}</strong>
              </div>
              <p className="panel-copy">{place.formattedAddress}</p>
              <div className="tag-row">
                <span className="tag">{normalizePriceLevel(place.priceLevel)}</span>
                <span className="tag">{(place.googleReviewCount || 0).toLocaleString('en-IN')} reviews</span>
              </div>
              <a href={place.mapsUrl} target="_blank" rel="noreferrer" className="detail-link">
                View on map
              </a>
            </div>
          </article>
        ))}

        {!filtered.length ? <div className="empty-panel">No hotel matches the current filters.</div> : null}
      </div>
    </section>
  );
}

export default function HotelsPage() {
  return (
    <DestinationShell activeSection="hotels">
      {({ destination }) => <HotelsContent destination={destination} />}
    </DestinationShell>
  );
}
