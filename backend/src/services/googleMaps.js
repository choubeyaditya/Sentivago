const { estimateRoadKm, haversineKm, normalizeOrigin } = require('./geocoding');
const {
  buildGeneratedDestinationRecord,
  findDestination,
  rememberGeneratedDestinations,
} = require('./catalog');
const { generateIndianDestinationProfile } = require('./ai');

function formatDuration(hours = 0) {
  if (hours < 24) {
    return `${Math.max(1, Math.round(hours))} hrs`;
  }

  const days = Math.floor(hours / 24);
  const remainder = Math.round(hours % 24);
  return remainder ? `${days}d ${remainder}h` : `${days}d`;
}

function buildMapUrl(query) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function buildDirectionsLink({ origin, destination, waypoints = [] } = {}) {
  const path = [origin, ...waypoints, destination].filter(Boolean);
  if (path.length < 2) return '';

  const toPoint = (item) => `${item.latitude},${item.longitude}`;
  const url = new URL('https://www.google.com/maps/dir/');
  url.searchParams.set('api', '1');
  url.searchParams.set('origin', toPoint(path[0]));
  url.searchParams.set('destination', toPoint(path[path.length - 1]));

  if (path.length > 2) {
    url.searchParams.set(
      'waypoints',
      path
        .slice(1, -1)
        .map((item) => toPoint(item))
        .join('|')
    );
  }

  return url.toString();
}

function buildPlaceImage(name, destinationName, palette) {
  const colors = Array.isArray(palette) && palette.length >= 2 ? palette : ['#315b72', '#d1a55d'];
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 640">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${colors[0]}"/>
          <stop offset="100%" stop-color="${colors[1]}"/>
        </linearGradient>
      </defs>
      <rect width="900" height="640" fill="url(#bg)"/>
      <rect x="58" y="58" width="784" height="524" rx="34" fill="rgba(255,255,255,0.14)" stroke="rgba(255,255,255,0.18)"/>
      <text x="98" y="276" font-size="54" font-family="Georgia, serif" fill="#ffffff">${name}</text>
      <text x="100" y="332" font-size="28" font-family="Segoe UI, Arial, sans-serif" fill="rgba(255,255,255,0.84)">${destinationName}</text>
    </svg>
  `.trim();

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

async function getDestinationDetails(context = {}) {
  const destination = findDestination({
    placeId: context.placeId,
    slug: context.slug,
    name: context.fallbackName || context.name,
    state: context.fallbackState || context.state,
  });

  if (!destination?.isFallback) {
    return destination;
  }

  const aiProfile = await generateIndianDestinationProfile({
    name: context.fallbackName || context.name || context.slug,
    state: context.fallbackState || context.state,
  });

  if (!aiProfile) {
    return destination;
  }

  const generatedDestination = buildGeneratedDestinationRecord({
    ...aiProfile,
    placeId:
      context.placeId ||
      `ai-${String(aiProfile.name || context.slug || 'destination')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')}`,
    slug: context.slug || aiProfile.name,
    source: 'ai-profile',
    dynamic: true,
  });

  rememberGeneratedDestinations([generatedDestination]);
  return generatedDestination;
}

function computeRoadDistance(origin, destination) {
  const normalizedOrigin = normalizeOrigin(origin || {});
  const distanceKm = estimateRoadKm(normalizedOrigin, destination);
  const durationHours = Math.max(2, Math.round(distanceKm / 42));

  return {
    distanceKm,
    durationHours,
    durationText: `${durationHours} hrs by road`,
  };
}

function parseGoogleDurationSeconds(value = '') {
  const normalized = String(value || '').trim();
  if (!normalized.endsWith('s')) return 0;
  return Number(normalized.slice(0, -1)) || 0;
}

async function requestGoogleRoadRoute(origin, destination) {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key || key.startsWith('REPLACE_')) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);

  try {
    const response = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': key,
        'X-Goog-FieldMask': 'routes.distanceMeters,routes.duration',
      },
      body: JSON.stringify({
        origin: {
          location: {
            latLng: {
              latitude: Number(origin.latitude),
              longitude: Number(origin.longitude),
            },
          },
        },
        destination: {
          location: {
            latLng: {
              latitude: Number(destination.latitude),
              longitude: Number(destination.longitude),
            },
          },
        },
        travelMode: 'DRIVE',
        routingPreference: 'TRAFFIC_UNAWARE',
        units: 'METRIC',
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Google Routes responded with ${response.status}`);
    }

    const data = await response.json();
    const route = data.routes?.[0];
    if (!route?.distanceMeters) return null;

    const distanceKm = Math.max(1, Math.round(route.distanceMeters / 1000));
    const durationSeconds = parseGoogleDurationSeconds(route.duration);
    const durationHours = Math.max(1, Math.round(durationSeconds / 3600));

    return {
      distanceKm,
      durationHours,
      durationText: formatDuration(durationHours),
      source: 'google-routes',
    };
  } catch (error) {
    console.warn(`Road routing fallback used. ${error.message}`);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function computeRoadLeg(origin, destination) {
  const normalizedOrigin = normalizeOrigin(origin || {});
  const googleRoute = await requestGoogleRoadRoute(normalizedOrigin, destination);

  if (googleRoute) {
    return googleRoute;
  }

  return {
    ...computeRoadDistance(normalizedOrigin, destination),
    source: 'deterministic-road',
  };
}

function buildAirDistance(origin, destination) {
  const normalizedOrigin = normalizeOrigin(origin || {});
  return Math.max(50, Math.round(haversineKm(normalizedOrigin, destination)));
}

function buildNearbyPlace(destination, kind, index) {
  const hotelNames = ['Grand View Stay', 'Valley House', 'Town Square Suites', 'Heritage Nest', 'Skyline Residency', 'Cedar Rooms'];
  const restaurantNames = ['Spice Table', 'Local Spoon', 'Sunset Kitchen', 'Town Oven', 'Courtyard Bites', 'Harbor Plate'];
  const neighborhoods = ['Central Market', 'Lake Road', 'Mall Road', 'Old Town', 'Hill View Lane', 'Station Approach'];
  const priceLevels = kind === 'hotels'
    ? ['Budget', 'Mid-range', 'Premium', 'Luxury']
    : ['Budget', 'Mid-range', 'Premium'];
  const ratings = [4.2, 4.3, 4.4, 4.5, 4.6, 4.7];
  const names = kind === 'hotels' ? hotelNames : restaurantNames;
  const baseName = names[index % names.length];
  const priceLevel = priceLevels[index % priceLevels.length];
  const rating = ratings[index % ratings.length];
  const reviewCount = 180 + index * 63;
  const name = `${destination.name} ${baseName}`;

  return {
    placeId: `${destination.slug}-${kind}-${index + 1}`,
    name,
    googleRating: rating,
    googleReviewCount: reviewCount,
    priceLevel,
    formattedAddress: `${neighborhoods[index % neighborhoods.length]}, ${destination.name}, ${destination.state}`,
    mapsUrl: buildMapUrl(`${name} ${destination.name} ${destination.state}`),
    imageUrl: buildPlaceImage(name, destination.name, destination.palette || [destination.imageUrl, '#d1a55d']),
  };
}

async function searchNearbyPlaces({ destination, kind = 'hotels', limit = 18 } = {}) {
  const safeLimit = Math.max(1, Math.min(24, Number(limit) || 18));
  return Array.from({ length: safeLimit }, (_, index) => buildNearbyPlace(destination, kind, index));
}

module.exports = {
  buildAirDistance,
  buildDirectionsLink,
  computeRoadDistance,
  computeRoadLeg,
  getDestinationDetails,
  searchNearbyPlaces,
};
