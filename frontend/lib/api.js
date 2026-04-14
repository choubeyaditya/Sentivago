const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

function buildQuery(params = {}) {
  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    search.set(key, String(value));
  });

  const query = search.toString();
  return query ? `?${query}` : '';
}

async function request(path, options = {}) {
  const headers = new Headers(options.headers || {});

  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    cache: 'no-store',
  });

  if (!response.ok) {
    let message = `Request failed for ${path}`;

    try {
      const body = await response.json();
      message = body.error || message;
    } catch {}

    throw new Error(message);
  }

  return response.json();
}

function buildPlaceParams({ placeId, name, state, origin } = {}) {
  return {
    placeId,
    name,
    state,
    fromCity: origin?.city,
    fromState: origin?.state,
    fromLat: origin?.latitude,
    fromLng: origin?.longitude,
  };
}

export const api = {
  health() {
    return request('/api/health');
  },
  reverseLocation(lat, lng) {
    return request(`/api/location/reverse${buildQuery({ lat, lng })}`);
  },
  searchDestinations(payload) {
    return request('/api/search', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  getDestination(slug, params) {
    return request(`/api/destinations/${slug}${buildQuery(buildPlaceParams(params))}`);
  },
  getTravelPlan(slug, params) {
    return request(`/api/destinations/${slug}/travel-plan${buildQuery(buildPlaceParams(params))}`);
  },
  getHotels(slug, params) {
    return request(`/api/destinations/${slug}/hotels${buildQuery(buildPlaceParams(params))}`).then((data) => ({
      ...data,
      places: data.hotels || data.places || [],
    }));
  },
  getRestaurants(slug, params) {
    return request(`/api/destinations/${slug}/restaurants${buildQuery(buildPlaceParams(params))}`).then((data) => ({
      ...data,
      places: data.restaurants || data.places || [],
    }));
  },
  getLocalTravel(slug, params) {
    return request(`/api/destinations/${slug}/local-travel${buildQuery(buildPlaceParams(params))}`);
  },
  getReviews(slug, params) {
    return request(`/api/destinations/${slug}/reviews${buildQuery(buildPlaceParams(params))}`);
  },
  submitReview(slug, payload) {
    return request(`/api/destinations/${slug}/reviews`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};
