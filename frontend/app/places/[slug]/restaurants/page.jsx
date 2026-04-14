'use client';

import { useEffect, useState } from 'react';
import DestinationShell from '@/components/DestinationShell';
import { api } from '@/lib/api';

const ratingOptions = ['All', '4', '4.5'];

function RestaurantsContent({ destination }) {
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
        const data = await api.getRestaurants(destination.slug, {
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
    if (ratingFilter === 'All') return true;
    return Number(place.googleRating || 0) >= Number(ratingFilter);
  });

  if (state.loading) {
    return <div className="empty-panel">Loading restaurant options...</div>;
  }

  return (
    <section className="page-stack">
      <article className="panel">
        <span className="section-kicker">Restaurants</span>
        <h2 className="section-title">Food spots around {destination.name}</h2>
        <p className="section-subcopy">Shortlist good places to eat nearby and filter by rating.</p>

        <div className="filter-bar single">
          <label>
            Minimum rating
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
          <article className="media-card compact" key={place.placeId}>
            <div className="media-thumb compact">
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
                {place.priceLevel ? <span className="tag">{place.priceLevel}</span> : null}
                <span className="tag">{(place.googleReviewCount || 0).toLocaleString('en-IN')} reviews</span>
              </div>
              <a href={place.mapsUrl} target="_blank" rel="noreferrer" className="detail-link">
                View on map
              </a>
            </div>
          </article>
        ))}

        {!filtered.length ? <div className="empty-panel">No restaurant matches the current rating filter.</div> : null}
      </div>
    </section>
  );
}

export default function RestaurantsPage() {
  return (
    <DestinationShell activeSection="restaurants">
      {({ destination }) => <RestaurantsContent destination={destination} />}
    </DestinationShell>
  );
}
