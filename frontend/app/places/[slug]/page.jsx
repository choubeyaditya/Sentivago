'use client';

import Link from 'next/link';
import DestinationShell from '@/components/DestinationShell';
import { buildPlaceHref } from '@/lib/place';

const seasonMap = {
  Goa: 'Nov - Feb',
  Kerala: 'Oct - Mar',
  Meghalaya: 'Oct - Apr',
  Rajasthan: 'Oct - Mar',
  'Uttarakhand': 'Sep - Mar',
  'West Bengal': 'Oct - Apr',
  'Himachal Pradesh': 'Mar - Jun',
};

function getTripDuration(distanceKm = 0) {
  if (distanceKm >= 1200) return '4 - 6 Days';
  if (distanceKm >= 650) return '3 - 5 Days';
  return '2 - 3 Days';
}

function getSeason(destination) {
  return seasonMap[destination.state] || 'Oct - Mar';
}

export default function DestinationPage() {
  return (
    <DestinationShell>
      {({ destination }) => {
        const foods = destination.guide?.specialityFoods || [];
        const travelTips = destination.guide?.travelTips || [];
        const highlights = [...(destination.guide?.thingsToDo || []), ...(destination.tags || [])].slice(0, 5);
        const summary = destination.guide?.description || destination.summary;

        return (
          <section className="page-stack">
            <article className="panel overview-panel">
              <span className="section-kicker">Trip overview</span>
              <div className="overview-callout">
                <p className="panel-copy lead-copy">{summary}</p>
              </div>
            </article>

            <section className="fact-grid">
              <article className="fact-card">
                <span className="fact-label">Best season</span>
                <strong>{getSeason(destination)}</strong>
                <span className="fact-caption">Cool, dry weather</span>
              </article>

              <article className="fact-card">
                <span className="fact-label">Trip duration</span>
                <strong>{getTripDuration(destination.tripEstimate?.roadDistanceKm || 0)}</strong>
                <span className="fact-caption">Ideal for a short stay</span>
              </article>

              <article className="fact-card">
                <span className="fact-label">Est budget</span>
                <strong>{destination.tripEstimate?.rangeLabel}</strong>
                <span className="fact-caption">Per person estimate</span>
              </article>
            </section>

            <article className="panel">
              <span className="section-kicker">Must-visit highlights</span>
              <div className="tag-row highlight-row">
                {highlights.map((item) => (
                  <span className="tag" key={item}>
                    {item}
                  </span>
                ))}
              </div>
            </article>

            <div className="action-row">
              <Link
                href={buildPlaceHref(destination.slug, destination, 'travel-plan')}
                className="button-primary"
              >
                Plan & book this trip
              </Link>
              <Link
                href={buildPlaceHref(destination.slug, destination, 'hotels')}
                className="button-secondary"
              >
                See stay options
              </Link>
            </div>

            {foods.length || travelTips.length ? (
              <section className="list-grid two-up">
                {foods.length ? (
                  <article className="soft-panel">
                    <span className="section-kicker">Speciality</span>
                    <h3 className="subsection-title">Foods to look for</h3>
                    <ul className="info-list">
                      {foods.map((food) => (
                        <li key={food}>{food}</li>
                      ))}
                    </ul>
                  </article>
                ) : null}

                {travelTips.length ? (
                  <article className="soft-panel">
                    <span className="section-kicker">Travel notes</span>
                    <h3 className="subsection-title">Tips before you go</h3>
                    <ul className="info-list">
                      {travelTips.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </article>
                ) : null}
              </section>
            ) : null}
          </section>
        );
      }}
    </DestinationShell>
  );
}
