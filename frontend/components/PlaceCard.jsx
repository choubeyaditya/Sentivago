'use client';

import { useEffect, useState } from 'react';
import { fetchDestinationPhotos } from '@/lib/destinationPhotos';

function formatRating(value) {
  const rating = Number(value || 0);
  return Number.isFinite(rating) && rating > 0 ? rating.toFixed(1) : '5.0';
}

function formatDistance(destination) {
  const distanceKm = destination.roadRoute?.distanceKm || destination.tripEstimate?.roadDistanceKm || 0;
  return distanceKm ? `~${distanceKm} km by road` : 'Distance on request';
}

export default function PlaceCard({ destination }) {
  const [liveImage, setLiveImage] = useState('');
  const budgetLabel = destination.tripEstimate?.rangeLabel || 'Budget estimate pending';
  const rating = destination.communityRating || destination.googleRating || destination.rating;
  const summary = destination.reason || destination.summary || 'Curated for your mood.';
  const image = liveImage || destination.imageUrl || destination.gallery?.[0] || null;

  useEffect(() => {
    let cancelled = false;
    setLiveImage('');

    fetchDestinationPhotos(destination).then((photos) => {
      if (!cancelled && photos?.[0]) {
        setLiveImage(photos[0]);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [destination.placeId, destination.slug, destination.name, destination.city, destination.state]);

  return (
    <article className="destination-card">
      <div className="destination-card-media">
        {image ? (
          <img
            src={image}
            alt={destination.name}
            className="destination-card-image"
          />
        ) : (
          <div className="media-fallback">Photo unavailable</div>
        )}

        <div className="destination-card-overlay">
          <span className="rating-pill">{formatRating(rating)} / 5</span>
        </div>
      </div>

      <div className="destination-card-body">
        <h3 className="card-title">{destination.name}</h3>
        <span className="location-copy">
          {destination.city}, {destination.state}
        </span>

        <div className="card-budget-row">
          <strong className="card-budget">{budgetLabel}</strong>
          <span className="card-distance">{formatDistance(destination)}</span>
        </div>

        <p className="card-copy">{summary}</p>
      </div>
    </article>
  );
}
