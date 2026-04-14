'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import ResultSlider from '@/components/ResultSlider';
import { api } from '@/lib/api';
import { defaultOrigin, loadOrigin, saveOrigin } from '@/lib/origin';

const moodPresets = [
  { label: 'Relaxed', prompt: 'peaceful coastal trip with sunsets and easy food options' },
  { label: 'Adventurous', prompt: 'adventure destination with cool weather and scenic views' },
  { label: 'Romantic', prompt: 'premium romantic stay with heritage views and lakeside evenings' },
  { label: 'Family', prompt: 'family-friendly cultural destination with light travel and easy stays' },
  { label: 'Party', prompt: 'social trip with nightlife, food, and a lively evening scene' },
  { label: 'Wellness', prompt: 'slow wellness escape with nature, calm mornings, and mindful experiences' },
  { label: 'Solo', prompt: 'safe solo trip with cozy cafes, scenic walks, and manageable spending' },
];

export default function HomePage() {
  const [mood, setMood] = useState('');
  const [location, setLocation] = useState(defaultOrigin);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setLocation(loadOrigin());
  }, []);

  useEffect(() => {
    detectLocation();
  }, []);

  function detectLocation() {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      return;
    }

    setLoadingLocation(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const data = await api.reverseLocation(
            position.coords.latitude,
            position.coords.longitude
          );
          setLocation(data);
          saveOrigin(data);
        } catch {
          const fallbackFromCoords = {
            ...location,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            sourceType: 'browser-geolocation',
          };
          setLocation(fallbackFromCoords);
          saveOrigin(fallbackFromCoords);
        } finally {
          setLoadingLocation(false);
        }
      },
      () => {
        setLoadingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 300000,
      }
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!mood.trim()) {
      setError('Describe the kind of trip you want first.');
      return;
    }

    setLoadingSearch(true);
    setError('');

    try {
      const data = await api.searchDestinations({
        mood: mood.trim(),
        origin: location,
      });
      setResults(data);
    } catch (submitError) {
      setError(submitError.message);
      setResults(null);
    } finally {
      setLoadingSearch(false);
    }
  }

  function applyPrompt(prompt) {
    setMood((current) => {
      const normalizedCurrent = current.trim();
      if (!normalizedCurrent) return prompt;
      if (normalizedCurrent.toLowerCase().includes(prompt.toLowerCase())) {
        return normalizedCurrent;
      }

      return `${normalizedCurrent}; ${prompt}`;
    });
  }

  const originLabel = loadingLocation
    ? 'Detecting your location...'
    : `${location.city}, ${location.state}`;
  const resultSections = results
    ? [
        { key: 'budget', label: 'Budget', items: results.sections?.budget || [] },
        { key: 'recommended', label: 'Recommended', items: results.sections?.recommended || [] },
      ]
    : [];

  return (
    <main className="page-shell">
      <nav className="home-nav">
        <Link href="/" className="brand-mark">
          Sentivago
        </Link>
        <div className="home-nav-links">
          <a href="#discover">Explore</a>
          <a href="#discover">Trips</a>
          <a href="#discover">Bookings</a>
        </div>
      </nav>

      <section className="home-hero">
        <div className="hero-orbit" />
        <div className="hero-copy">
          <h1 className="hero-title">
            Travel starts with a <span className="hero-accent">feeling</span>
          </h1>
          <p className="hero-tagline">
            Pick a feeling, type any travel line, and Sentivago will decode it into places that match your pace, budget, and vibe.
          </p>

          <div className="mood-cloud">
            {moodPresets.map((preset) => (
              <button
                key={preset.label}
                type="button"
                className={`mood-chip${mood === preset.prompt ? ' active' : ''}`}
                onClick={() => applyPrompt(preset.prompt)}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <form className="hero-form" onSubmit={handleSubmit}>
            <label className="sr-only" htmlFor="mood-search">
              Mood description
            </label>
            <input
              id="mood-search"
              className="mood-input"
              value={mood}
              onChange={(event) => setMood(event.target.value)}
              placeholder='I want a calm 3-day mountain break with cafes, green views, and not too much spending'
            />

            <div className="hero-form-actions">
              <button type="submit" className="button-primary search-button" disabled={loadingSearch}>
                {loadingSearch ? 'Exploring...' : 'Explore'}
              </button>
            </div>
          </form>

      

          <div className="hero-origin-row">
            <span className="hero-origin-chip">Origin: {originLabel}</span>
            <button type="button" className="hero-origin-action" onClick={detectLocation}>
              Refresh
            </button>
          </div>

          {error ? <div className="error-box">{error}</div> : null}
        </div>
      </section>

      {results ? (
        <section className="discover-results" id="discover">
          <div className="status-banner">
            <div>
              <span className="section-kicker">AI picks for your mood</span>
              <h2 className="section-title">{results.summary}</h2>
            </div>
          </div>

          <section className="trip-groups">
            {resultSections.map((section) => (
              <section className="result-section" key={section.key}>
                <div className="section-heading-row">
                  <div>
                    <span className="section-kicker">{section.label}</span>
                    <h2 className="section-title">{section.label}</h2>
                  </div>
                  <span className="section-count">
                    {section.items.length ? `${section.items.length} places` : 'No matches yet'}
                  </span>
                </div>

                <ResultSlider section={section} />
              </section>
            ))}
          </section>
        </section>
      ) : null}
    </main>
  );
}
