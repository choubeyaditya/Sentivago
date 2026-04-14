'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import DestinationShell from '@/components/DestinationShell';
import TravelRouteMap from '@/components/TravelRouteMap';
import { api } from '@/lib/api';
import { buildPlaceHref } from '@/lib/place';

function formatCurrency(value) {
  return `₹${Math.round(value || 0).toLocaleString('en-IN')}`;
}

function buildJourneySteps(route, destination, origin, activities = []) {
  const firstActivity = activities[0] || `Begin your ${destination.name} adventure`;
  const arrivalTitle =
    route.mode === 'Flight'
      ? `Land in ${destination.name}`
      : route.mode === 'Train'
        ? `Reach ${destination.name} by train`
        : `Drive into ${destination.name}`;
  const arrivalNote =
    route.mode === 'Flight'
      ? 'Pre-book an airport transfer or short cab ride into the city.'
      : route.mode === 'Train'
        ? 'Keep a short station-to-hotel transfer buffer after arrival.'
        : 'Plan one rest stop and keep luggage handling simple on arrival.';

  return [
    {
      phase: 'Day 1 - Morning',
      title: `Depart from ${origin.city}`,
      note: `Start from ${origin.city}, ${origin.state}. Keep a comfortable buffer before the main ${route.mode.toLowerCase()} leg begins.`,
      cost: route.cabTransferFare ? `${formatCurrency(route.cabTransferFare)} local transfer buffer` : 'No extra transfer required',
    },
    {
      phase: `${route.mode} leg`,
      title: `${origin.city} to ${destination.name}`,
      note: route.summary,
      cost: `${formatCurrency(route.travelFare)} for the main travel leg`,
    },
    {
      phase: 'Arrival',
      title: arrivalTitle,
      note: arrivalNote,
      cost: route.cabTransferFare ? `${formatCurrency(route.cabTransferFare)} last-mile estimate` : null,
    },
    {
      phase: 'After arrival',
      title: 'Hotel check-in',
      note: 'Most stays are easiest after you reach the city. Refresh, settle in, and keep the first block easy.',
    },
    {
      phase: 'Evening - Day 1',
      title: `Begin your ${destination.name} stay`,
      note: firstActivity,
    },
  ];
}

function TravelPlanContent({ destination, origin }) {
  const [selectedMode, setSelectedMode] = useState('');
  const [state, setState] = useState({
    loading: true,
    error: '',
    routes: [],
    activities: [],
    tips: [],
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setState({
        loading: true,
        error: '',
        routes: [],
        activities: [],
        tips: [],
      });

      try {
        const data = await api.getTravelPlan(destination.slug, {
          placeId: destination.placeId,
          name: destination.name,
          state: destination.state,
          origin,
        });

        if (!cancelled) {
          setState({
            loading: false,
            error: '',
            routes: data.routes || [],
            activities: data.activities || [],
            tips: data.tips || [],
          });
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            loading: false,
            error: error.message,
            routes: [],
            activities: [],
            tips: [],
          });
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [destination.name, destination.placeId, destination.slug, destination.state, origin.city, origin.latitude, origin.longitude]);

  useEffect(() => {
    if (!state.routes.length) return;

    const defaultRoute = state.routes.find((route) => route.mode === 'Flight') || state.routes[0];
    setSelectedMode((current) => {
      if (state.routes.some((route) => route.mode === current)) {
        return current;
      }

      return defaultRoute.mode;
    });
  }, [state.routes]);

  if (state.loading) {
    return <div className="empty-panel">Loading travel plan...</div>;
  }

  const selectedRoute = state.routes.find((route) => route.mode === selectedMode) || state.routes[0];

  if (!selectedRoute) {
    return <div className="empty-panel">Travel routes are unavailable right now.</div>;
  }

  const journeySteps = selectedRoute.journey?.length
    ? selectedRoute.journey
    : buildJourneySteps(selectedRoute, destination, origin, state.activities);

  return (
    <section className="page-stack">
      <header className="travel-plan-header">
        <div>
          <span className="section-kicker">Travel Plan</span>
          <h2 className="section-title">Travel plan</h2>
          <p className="section-subcopy">From {origin.city} to {destination.name}</p>
        </div>
        <span className="overview-badge">Optimized route suggestions</span>
      </header>

      {state.error ? (
        <article className="panel">
          <div className="error-box">{state.error}</div>
        </article>
      ) : null}

      <section className="travel-plan-layout">
        <div className="travel-plan-main">
          <article className="panel route-overview-panel">
            <div className="section-heading-row section-heading-row-tight">
              <div>
                <span className="section-kicker">Your route</span>
                <h3 className="subsection-title">Route overview</h3>
              </div>
            </div>

            <div className="route-waypoints">
              <div className="route-terminal">
                <span className="stat-label">From</span>
                <strong>{origin.city}</strong>
                <span className="terminal-copy">{origin.state}</span>
              </div>
              <div className="route-arrow">-&gt;</div>
              <div className="route-terminal">
                <span className="stat-label">To</span>
                <strong>{destination.name}</strong>
                <span className="terminal-copy">{destination.state}</span>
              </div>
            </div>
          </article>

          <article className="panel route-map-panel">
            <div className="section-heading-row section-heading-row-tight">
              <div>
                <span className="section-kicker">Route map</span>
                <h3 className="subsection-title">{selectedRoute.mode} route</h3>
              </div>
            </div>
            <TravelRouteMap mapData={selectedRoute.mapData} />
            <div className="route-distance-chip route-distance-chip-inline">
              ~{selectedRoute.distanceKm} km via {selectedRoute.mode}
            </div>
          </article>

          {state.activities.length || state.tips.length ? (
            <section className="list-grid two-up travel-support-grid">
              {state.activities.length ? (
                <article className="soft-panel">
                  <span className="section-kicker">At destination</span>
                  <h3 className="subsection-title">What to do first</h3>
                  <ul className="info-list">
                    {state.activities.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </article>
              ) : null}

              {state.tips.length ? (
                <article className="soft-panel">
                  <span className="section-kicker">Travel tips</span>
                  <h3 className="subsection-title">Before you finalize</h3>
                  <ul className="info-list">
                    {state.tips.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </article>
              ) : null}
            </section>
          ) : null}
        </div>

        <aside className="journey-column">
          <article className="panel journey-breakdown">
            <div className="section-heading-row section-heading-row-tight">
              <div>
                <span className="section-kicker">Journey breakdown</span>
                <h3 className="subsection-title">{selectedRoute.mode} plan</h3>
              </div>
            </div>

            <div className="journey-tabs">
              {state.routes.map((route) => (
                <button
                  key={route.mode}
                  type="button"
                  className={`journey-tab${selectedRoute.mode === route.mode ? ' active' : ''}`}
                  onClick={() => setSelectedMode(route.mode)}
                >
                  {route.mode}
                </button>
              ))}
            </div>

            <div className="timeline-list">
              {journeySteps.map((step, index) => (
                <article className="timeline-item" key={`${step.title}-${index}`}>
                  <div className="timeline-marker">{index + 1}</div>
                  <div className="timeline-content">
                    <span className="timeline-phase">{step.phase}</span>
                    <h4>{step.title}</h4>
                    <p>{step.note}</p>
                    {step.costLabel || step.cost ? (
                      <span className="timeline-cost">{step.costLabel || step.cost}</span>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>

            <div className="journey-metrics">
              <div className="journey-metric">
                <span className="stat-label">Distance</span>
                <strong>~{selectedRoute.distanceKm} km</strong>
              </div>
              <div className="journey-metric">
                <span className="stat-label">Travel time</span>
                <strong>{selectedRoute.durationText}</strong>
              </div>
              <div className="journey-metric">
                <span className="stat-label">Est cost</span>
                <strong>{formatCurrency(selectedRoute.totalEstimate)}</strong>
              </div>
              <div className="journey-metric">
                <span className="stat-label">Transfer</span>
                <strong>{formatCurrency(selectedRoute.cabTransferFare)}</strong>
              </div>
            </div>

            <Link
              href={buildPlaceHref(destination.slug, destination, 'hotels')}
              className="button-primary button-block"
            >
              View stays for this trip
            </Link>
            {selectedRoute.mapsUrl ? (
              <a
                href={selectedRoute.mapsUrl}
                target="_blank"
                rel="noreferrer"
                className="button-secondary button-block"
              >
                Open route points in Google Maps
              </a>
            ) : null}
          </article>
        </aside>
      </section>
    </section>
  );
}

export default function TravelPlanPage() {
  return (
    <DestinationShell activeSection="travel-plan">
      {({ destination, origin }) => <TravelPlanContent destination={destination} origin={origin} />}
    </DestinationShell>
  );
}
