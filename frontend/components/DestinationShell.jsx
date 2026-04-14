'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import ImageCarousel from '@/components/ImageCarousel';
import WeatherBadge from '@/components/WeatherBadge';
import { api } from '@/lib/api';
import { fetchDestinationPhotos } from '@/lib/destinationPhotos';
import { defaultOrigin, loadOrigin } from '@/lib/origin';
import { buildPlaceHref, readPlaceSearchParams } from '@/lib/place';

const navItems = [
  { key: 'travel-plan', label: 'Travel Plan', section: 'travel-plan' },
  { key: 'hotels', label: 'Hotels', section: 'hotels' },
  { key: 'restaurants', label: 'Restaurants', section: 'restaurants' },
  { key: 'local-travel', label: 'Transport', section: 'local-travel' },
  { key: 'reviews', label: 'Reviews', section: 'reviews' },
];

const seasonMap = {
  Goa: 'Nov - Feb',
  Kerala: 'Oct - Mar',
  Meghalaya: 'Oct - Apr',
  Rajasthan: 'Oct - Mar',
  'Uttarakhand': 'Sep - Mar',
  'West Bengal': 'Oct - Apr',
  'Himachal Pradesh': 'Mar - Jun',
};

function formatRating(value) {
  const rating = Number(value || 0);
  return Number.isFinite(rating) && rating > 0 ? rating.toFixed(1) : '5.0';
}

function getBestWindow(destination) {
  return seasonMap[destination.state] || 'Oct - Mar';
}

export default function DestinationShell({ activeSection = '', children }) {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;
  const placeContext = readPlaceSearchParams(searchParams);

  const [origin, setOrigin] = useState(defaultOrigin);
  const [destination, setDestination] = useState(null);
  const [liveGallery, setLiveGallery] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setOrigin(loadOrigin());
  }, []);

  useEffect(() => {
    if (!slug) return undefined;

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError('');

      try {
        const data = await api.getDestination(slug, {
          ...placeContext,
          origin,
        });

        if (!cancelled) {
          setDestination(data);
          setLiveGallery([]);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError.message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [
    origin.city,
    origin.latitude,
    origin.longitude,
    placeContext.name,
    placeContext.placeId,
    placeContext.state,
    slug,
  ]);

  useEffect(() => {
    if (!destination) return undefined;

    let cancelled = false;
    setLiveGallery([]);

    fetchDestinationPhotos(destination).then((photos) => {
      if (!cancelled) {
        setLiveGallery(photos || []);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [destination?.placeId, destination?.slug, destination?.name, destination?.city, destination?.state]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    function handleReviewUpdate(event) {
      const detail = event.detail || {};

      setDestination((current) => {
        if (!current || current.placeId !== detail.placeId) return current;

        return {
          ...current,
          communityRating: detail.communityRating,
          reviewCount: detail.reviewCount,
        };
      });
    }

    window.addEventListener('destination-review-updated', handleReviewUpdate);
    return () => window.removeEventListener('destination-review-updated', handleReviewUpdate);
  }, []);

  if (loading) {
    return (
      <main className="page-shell destination-page-shell">
        <div className="empty-panel">Loading destination details...</div>
      </main>
    );
  }

  if (error || !destination) {
    return (
      <main className="page-shell destination-page-shell">
        <div className="error-box">{error || 'Destination not found.'}</div>
      </main>
    );
  }

  const gallery = [...liveGallery, ...(destination.gallery?.length ? destination.gallery : [destination.imageUrl].filter(Boolean))]
    .filter(Boolean)
    .slice(0, 4);
  const content = typeof children === 'function' ? children({ destination, origin }) : children;
  const budgetLabel = destination.tripEstimate?.rangeLabel || 'Budget estimate unavailable';
  const activeLabel = navItems.find((item) => item.key === activeSection)?.label || 'Overview';
  const ratingLabel = formatRating(destination.communityRating || destination.googleRating);
  const themePills = [...(destination.themes || []), ...(destination.tags || [])].slice(0, 2);

  return (
    <main className="page-shell destination-page-shell">
      <header className="shell-topbar">
        <div className="breadcrumb-trail">
          <Link href="/" className="back-link breadcrumb-link">
            Back
          </Link>
          <span className="shell-divider">/</span>
          <span className="breadcrumb-muted">Explore</span>
          <span className="shell-divider">/</span>
          <span className="breadcrumb-muted">{destination.state}</span>
          <span className="shell-divider">/</span>
          <span className="breadcrumb-current">{destination.name}</span>
          {activeLabel !== 'Overview' ? (
            <>
              <span className="shell-divider">/</span>
              <span className="breadcrumb-accent">{activeLabel}</span>
            </>
          ) : null}
        </div>

        <Link href="/" className="brand-mark compact">
          Sentivago
        </Link>
      </header>

      <ImageCarousel
        images={gallery}
        title={destination.name}
      />

      <section className="destination-header">
        <div className="destination-header-shell">
          <div className="destination-heading">
            <h1 className="destination-title">
              {destination.name}, {destination.state}
            </h1>

            <div className="destination-meta-row">
              <span className="destination-score">{ratingLabel} / 5</span>
              <span className="destination-meta-copy">{destination.reviewCount || 0} reviews</span>
              <span className="destination-meta-copy">Best: {getBestWindow(destination)}</span>
              <span className="destination-meta-copy">{destination.city}, India</span>
            </div>

            <div className="destination-pill-row">
              {themePills.map((pill) => (
                <span className="tag destination-tag" key={pill}>
                  {pill}
                </span>
              ))}
              <WeatherBadge weather={destination.liveWeather} variant="chip" />
            </div>
          </div>
        </div>
      </section>

      <section className="destination-layout">
        <aside className="destination-sidebar">
          <article className="sidebar-card destination-sidebar-card">
            <span className="summary-label">Destination</span>
            <h2 className="sidebar-place-name">{destination.name}</h2>
            <p className="sidebar-location">
              {destination.city}, {destination.state}
            </p>

            <div className="sidebar-meta-strip">
              <span>{ratingLabel} / 5</span>
              <span>{destination.reviewCount || 0} reviews</span>
            </div>

            <div className="sidebar-stats">
              <div className="sidebar-stat">
                <span className="stat-label">Budget</span>
                <strong>{budgetLabel}</strong>
              </div>
              <WeatherBadge weather={destination.liveWeather} variant="panel" />
            </div>
          </article>

          <nav className="side-nav">
            <span className="summary-label">Sections</span>
            <Link
              href={buildPlaceHref(destination.slug, destination)}
              className={`nav-link${activeSection === '' ? ' active' : ''}`}
            >
              Overview
            </Link>
            {navItems.map((item) => (
              <Link
                key={item.key}
                href={buildPlaceHref(destination.slug, destination, item.section)}
                className={`nav-link${activeSection === item.key ? ' active' : ''}`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="nav-note">
            <span className="summary-label">Origin</span>
            <strong>
              {origin.city}, {origin.state}
            </strong>
            <p>Starting point for this journey.</p>
          </div>
        </aside>

        <div className="primary-column">{content}</div>
      </section>
    </main>
  );
}
