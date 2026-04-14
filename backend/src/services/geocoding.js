const knownCities = [
  { city: 'Delhi', state: 'Delhi', latitude: 28.6139, longitude: 77.2090 },
  { city: 'Mumbai', state: 'Maharashtra', latitude: 19.0760, longitude: 72.8777 },
  { city: 'Kolkata', state: 'West Bengal', latitude: 22.5726, longitude: 88.3639 },
  { city: 'Bengaluru', state: 'Karnataka', latitude: 12.9716, longitude: 77.5946 },
  { city: 'Chennai', state: 'Tamil Nadu', latitude: 13.0827, longitude: 80.2707 },
  { city: 'Hyderabad', state: 'Telangana', latitude: 17.3850, longitude: 78.4867 },
  { city: 'Shillong', state: 'Meghalaya', latitude: 25.5788, longitude: 91.8933 },
  { city: 'Darjeeling', state: 'West Bengal', latitude: 27.0410, longitude: 88.2663 },
  { city: 'Gangtok', state: 'Sikkim', latitude: 27.3389, longitude: 88.6065 },
  { city: 'Shimla', state: 'Himachal Pradesh', latitude: 31.1048, longitude: 77.1734 },
  { city: 'Aizawl', state: 'Mizoram', latitude: 23.7271, longitude: 92.7176 },
  { city: 'Panaji', state: 'Goa', latitude: 15.4909, longitude: 73.8278 },
  { city: 'Rishikesh', state: 'Uttarakhand', latitude: 30.0869, longitude: 78.2676 },
  { city: 'Manali', state: 'Himachal Pradesh', latitude: 32.2432, longitude: 77.1892 },
  { city: 'Jaipur', state: 'Rajasthan', latitude: 26.9124, longitude: 75.7873 },
  { city: 'Varanasi', state: 'Uttar Pradesh', latitude: 25.3176, longitude: 82.9739 },
  { city: 'Udaipur', state: 'Rajasthan', latitude: 24.5854, longitude: 73.7125 },
  { city: 'Kochi', state: 'Kerala', latitude: 9.9312, longitude: 76.2673 },
  { city: 'Puducherry', state: 'Puducherry', latitude: 11.9416, longitude: 79.8083 },
  { city: 'Leh', state: 'Ladakh', latitude: 34.1526, longitude: 77.5771 },
];

const defaultOrigin = {
  city: 'Kolkata',
  state: 'West Bengal',
  latitude: 22.5726,
  longitude: 88.3639,
  sourceType: 'default',
};

function haversineKm(a, b) {
  const toRad = (value) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(Number(b.latitude) - Number(a.latitude));
  const dLng = toRad(Number(b.longitude) - Number(a.longitude));
  const lat1 = toRad(Number(a.latitude));
  const lat2 = toRad(Number(b.latitude));

  const inner =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(inner), Math.sqrt(1 - inner));
}

function estimateRoadKm(a, b) {
  const direct = haversineKm(a, b);
  return Math.max(60, Math.round(direct * 1.18 + 24));
}

function findCityByName(name = '') {
  const normalized = String(name).trim().toLowerCase();

  return knownCities.find(
    (city) =>
      city.city.toLowerCase() === normalized ||
      `${city.city}, ${city.state}`.toLowerCase() === normalized ||
      normalized.includes(city.city.toLowerCase())
  );
}

function nearestKnownCity(latitude, longitude) {
  const point = { latitude: Number(latitude), longitude: Number(longitude) };

  return knownCities
    .map((city) => ({
      ...city,
      distanceKm: haversineKm(point, city),
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm)[0];
}

function normalizeOrigin(origin = {}) {
  const cityLookup = findCityByName(origin.city || '');

  return {
    city: origin.city || cityLookup?.city || defaultOrigin.city,
    state: origin.state || cityLookup?.state || defaultOrigin.state,
    latitude: Number(origin.latitude) || cityLookup?.latitude || defaultOrigin.latitude,
    longitude: Number(origin.longitude) || cityLookup?.longitude || defaultOrigin.longitude,
    sourceType: origin.sourceType || cityLookup?.sourceType || defaultOrigin.sourceType,
  };
}

async function reverseGeocode(latitude, longitude) {
  const key = process.env.GOOGLE_MAPS_API_KEY;

  if (key) {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${key}`
      );
      const data = await response.json();
      const first = data.results?.[0];

      if (first) {
        const components = first.address_components || [];
        const cityComponent =
          components.find((item) => item.types.includes('locality')) ||
          components.find((item) => item.types.includes('administrative_area_level_2'));
        const stateComponent = components.find((item) =>
          item.types.includes('administrative_area_level_1')
        );

        return {
          city: cityComponent?.long_name || 'Unknown city',
          state: stateComponent?.long_name || 'Unknown state',
          latitude: Number(latitude),
          longitude: Number(longitude),
          sourceType: 'google-geocoding',
        };
      }
    } catch (error) {
      console.warn(`Reverse geocoding fallback used. ${error.message}`);
    }
  }

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'Sentivago/1.0 (reverse geocoding)',
          Accept: 'application/json',
        },
      }
    );

    if (response.ok) {
      const data = await response.json();
      const address = data.address || {};
      const city =
        address.city ||
        address.town ||
        address.village ||
        address.municipality ||
        address.county;
      const state = address.state || address.region || address.state_district;

      if (city || state) {
        return {
          city: city || state || 'Unknown city',
          state: state || city || 'Unknown state',
          latitude: Number(latitude),
          longitude: Number(longitude),
          sourceType: 'openstreetmap-nominatim',
        };
      }
    }
  } catch (error) {
    console.warn(`OpenStreetMap reverse geocoding fallback used. ${error.message}`);
  }

  const fallback = nearestKnownCity(latitude, longitude);

  return {
    city: fallback.city,
    state: fallback.state,
    latitude: Number(latitude),
    longitude: Number(longitude),
    sourceType: 'nearest-city-fallback',
  };
}

module.exports = {
  defaultOrigin,
  estimateRoadKm,
  findCityByName,
  haversineKm,
  knownCities,
  normalizeOrigin,
  reverseGeocode,
};
