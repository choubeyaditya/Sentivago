'use client';

import { useEffect, useRef, useState } from 'react';

let googleMapsLoader = null;

function loadGoogleMaps(apiKey) {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Google Maps is only available in the browser.'));
  }

  if (window.google?.maps) {
    return Promise.resolve(window.google.maps);
  }

  if (googleMapsLoader) {
    return googleMapsLoader;
  }

  googleMapsLoader = new Promise((resolve, reject) => {
    const callbackName = `__sentivagoMapInit${Date.now()}`;
    const script = document.createElement('script');

    window[callbackName] = () => {
      delete window[callbackName];
      resolve(window.google.maps);
    };

    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&v=weekly&callback=${callbackName}`;
    script.async = true;
    script.onerror = () => {
      delete window[callbackName];
      googleMapsLoader = null;
      reject(new Error('Failed to load Google Maps.'));
    };

    document.head.appendChild(script);
  });

  return googleMapsLoader;
}

function getSegmentColor(mode = '') {
  if (mode === 'Flight') return '#f0bc62';
  if (mode === 'Train') return '#8cb4ff';
  return '#67d296';
}

export default function TravelRouteMap({ mapData, className = '' }) {
  const containerRef = useRef(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!mapData?.points?.length) return undefined;

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey || apiKey.startsWith('REPLACE_')) {
      setError('Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to enable the live map.');
      return undefined;
    }

    let mapInstance;
    let markers = [];
    let polylines = [];
    let cancelled = false;

    loadGoogleMaps(apiKey)
      .then((maps) => {
        if (cancelled || !containerRef.current) return;

        mapInstance = new maps.Map(containerRef.current, {
          center: {
            lat: Number(mapData.points[0].latitude),
            lng: Number(mapData.points[0].longitude),
          },
          zoom: 5,
          mapTypeControl: false,
          fullscreenControl: false,
          streetViewControl: false,
          zoomControl: true,
          gestureHandling: 'cooperative',
        });

        const bounds = new maps.LatLngBounds();

        markers = mapData.points.map((point, index) => {
          const position = {
            lat: Number(point.latitude),
            lng: Number(point.longitude),
          };

          bounds.extend(position);

          return new maps.Marker({
            map: mapInstance,
            position,
            title: point.label,
            label: String(index + 1),
          });
        });

        polylines = (mapData.segments || []).map((segment) => {
          const from = mapData.points[segment.fromIndex];
          const to = mapData.points[segment.toIndex];

          return new maps.Polyline({
            map: mapInstance,
            path: [
              { lat: Number(from.latitude), lng: Number(from.longitude) },
              { lat: Number(to.latitude), lng: Number(to.longitude) },
            ],
            geodesic: true,
            strokeColor: getSegmentColor(segment.mode),
            strokeOpacity: 0.95,
            strokeWeight: segment.mode === 'Flight' ? 3 : 5,
            icons:
              segment.mode === 'Flight'
                ? [
                    {
                      icon: {
                        path: 'M 0,-1 0,1',
                        strokeOpacity: 1,
                        scale: 4,
                      },
                      offset: '0',
                      repeat: '16px',
                    },
                  ]
                : null,
          });
        });

        if (mapData.points.length > 1) {
          mapInstance.fitBounds(bounds, 72);
        }
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(loadError.message);
        }
      });

    return () => {
      cancelled = true;
      markers.forEach((marker) => marker.setMap(null));
      polylines.forEach((line) => line.setMap(null));
    };
  }, [mapData]);

  return (
    <div className={`travel-map-shell${className ? ` ${className}` : ''}`}>
      <div ref={containerRef} className="travel-google-map" />
      {error ? <div className="map-overlay-note">{error}</div> : null}
    </div>
  );
}
