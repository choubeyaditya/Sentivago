'use client';

import { useEffect, useState } from 'react';
import DestinationShell from '@/components/DestinationShell';
import { api } from '@/lib/api';

function LocalTravelContent({ destination }) {
  const [state, setState] = useState({
    loading: true,
    error: '',
    emergencyContacts: [],
    agencies: [],
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setState({
        loading: true,
        error: '',
        emergencyContacts: [],
        agencies: [],
      });

      try {
        const data = await api.getLocalTravel(destination.slug, {
          placeId: destination.placeId,
          name: destination.name,
          state: destination.state,
        });

        if (!cancelled) {
          setState({
            loading: false,
            error: '',
            emergencyContacts: data.emergencyContacts || [],
            agencies: data.agencies || [],
          });
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            loading: false,
            error: error.message,
            emergencyContacts: [],
            agencies: [],
          });
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [destination.name, destination.placeId, destination.slug, destination.state]);

  if (state.loading) {
    return <div className="empty-panel">Loading local travel info...</div>;
  }

  return (
    <section className="page-stack">
      <article className="panel">
        <span className="section-kicker">Local travel</span>
        <h2 className="section-title">Getting around {destination.name}</h2>
        <p className="section-subcopy">Quick contacts and local transport help for the city.</p>
        {state.error ? <div className="error-box">{state.error}</div> : null}
      </article>

      <section className="list-grid two-up">
        <article className="soft-panel">
          <span className="section-kicker">Contact numbers</span>
          <h3 className="subsection-title">Useful quick contacts</h3>
          <ul className="info-list">
            {state.emergencyContacts.map((item) => (
              <li key={item.label}>
                <strong>{item.label}:</strong> {item.value}
              </li>
            ))}
          </ul>
        </article>

        <article className="soft-panel">
          <span className="section-kicker">Agencies</span>
          <h3 className="subsection-title">Useful local partners</h3>
          <div className="info-stack">
            {state.agencies.map((agency) => (
              <div className="simple-card" key={agency.name}>
                <strong>{agency.name}</strong>
                <p>{agency.type}</p>
                <span>{agency.note}</span>
              </div>
            ))}
          </div>
        </article>
      </section>
    </section>
  );
}

export default function LocalTravelPage() {
  return (
    <DestinationShell activeSection="local-travel">
      {({ destination }) => <LocalTravelContent destination={destination} />}
    </DestinationShell>
  );
}
