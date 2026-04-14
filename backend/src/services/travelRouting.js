const { haversineKm, normalizeOrigin } = require('./geocoding');
const { getTransitHub } = require('./transitCatalog');
const { computeRoadLeg, buildDirectionsLink } = require('./googleMaps');

let amadeusTokenCache = {
  token: '',
  expiresAt: 0,
};

function formatDuration(hours = 0) {
  if (hours < 24) {
    return `${Math.max(1, Math.round(hours))} hrs`;
  }

  const days = Math.floor(hours / 24);
  const remainder = Math.round(hours % 24);
  return remainder ? `${days}d ${remainder}h` : `${days}d`;
}

function parseIsoDurationHours(value = '') {
  const normalized = String(value || '');
  const match = normalized.match(/PT(?:(\d+)H)?(?:(\d+)M)?/i);
  if (!match) return 0;

  const hours = Number(match[1] || 0);
  const minutes = Number(match[2] || 0);
  return hours + minutes / 60;
}

function parseRailTravelHours(value = '') {
  const normalized = String(value || '').replace(/H$/i, '');
  const [hours, minutes] = normalized.split(':');

  if (!hours) return 0;
  return Number(hours || 0) + Number(minutes || 0) / 60;
}

function calcTaxiFare(distanceKm = 0) {
  return Math.max(180, Math.round((Number(distanceKm) || 0) * 20));
}

function calcRailFare(distanceKm = 0) {
  return Math.max(450, Math.round((Number(distanceKm) || 0) * 0.8));
}

function buildPoint(label, location, kind) {
  return {
    label,
    kind,
    latitude: Number(location.latitude),
    longitude: Number(location.longitude),
  };
}

function buildMapData(points = [], mainMode = 'Road') {
  const safePoints = points.filter(Boolean);

  return {
    points: safePoints,
    segments: safePoints.slice(0, -1).map((point, index) => ({
      fromIndex: index,
      toIndex: index + 1,
      mode:
        index === 1 && safePoints.length === 4
          ? mainMode
          : safePoints.length === 2
            ? mainMode
            : 'Road',
    })),
  };
}

async function getAmadeusAccessToken() {
  const clientId = process.env.AMADEUS_CLIENT_ID;
  const clientSecret = process.env.AMADEUS_CLIENT_SECRET;

  if (!clientId || !clientSecret || clientId.startsWith('REPLACE_') || clientSecret.startsWith('REPLACE_')) {
    return null;
  }

  if (amadeusTokenCache.token && Date.now() < amadeusTokenCache.expiresAt) {
    return amadeusTokenCache.token;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);

  try {
    const response = await fetch('https://test.api.amadeus.com/v1/security/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Amadeus auth responded with ${response.status}`);
    }

    const data = await response.json();
    const expiresIn = Number(data.expires_in || 900);
    amadeusTokenCache = {
      token: data.access_token,
      expiresAt: Date.now() + Math.max(300, expiresIn - 60) * 1000,
    };

    return amadeusTokenCache.token;
  } catch (error) {
    console.warn(`Amadeus flight pricing fallback used. ${error.message}`);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function getFlightOffer(originAirport, destinationAirport) {
  const token = await getAmadeusAccessToken();
  if (!token) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);

  try {
    const departureDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    const url = new URL('https://test.api.amadeus.com/v2/shopping/flight-offers');
    url.searchParams.set('originLocationCode', originAirport.code);
    url.searchParams.set('destinationLocationCode', destinationAirport.code);
    url.searchParams.set('departureDate', departureDate);
    url.searchParams.set('adults', '1');
    url.searchParams.set('max', '1');
    url.searchParams.set('currencyCode', 'INR');

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Amadeus flight offers responded with ${response.status}`);
    }

    const data = await response.json();
    const firstOffer = data.data?.[0];
    if (!firstOffer) return null;

    return {
      priceInr: Math.round(Number(firstOffer.price?.grandTotal || 0)),
      durationHours: parseIsoDurationHours(firstOffer.itineraries?.[0]?.duration),
      carrierCode: firstOffer.validatingAirlineCodes?.[0] || '',
    };
  } catch (error) {
    console.warn(`Amadeus flight pricing fallback used. ${error.message}`);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function getTrainSchedule(trainNumber) {
  const apiKey = process.env.INDIAN_RAIL_API_KEY;
  if (!apiKey || apiKey.startsWith('REPLACE_') || !trainNumber) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);

  try {
    const response = await fetch(
      `https://indianrailapi.com/api/v2/TrainSchedule/apikey/${apiKey}/TrainNumber/${encodeURIComponent(trainNumber)}/`,
      {
        signal: controller.signal,
      }
    );

    if (!response.ok) {
      throw new Error(`Indian Rail schedule responded with ${response.status}`);
    }

    const data = await response.json();
    return data.Route || [];
  } catch (error) {
    console.warn(`Indian Rail schedule fallback used. ${error.message}`);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function extractRailDistanceKm(route = [], originCode = '', destinationCode = '') {
  const originStop = route.find((item) => item.StationCode === originCode);
  const destinationStop = route.find((item) => item.StationCode === destinationCode);

  if (!originStop || !destinationStop) {
    return null;
  }

  return Math.max(0, Number(destinationStop.Distance || 0) - Number(originStop.Distance || 0));
}

async function getTrainJourney(originStation, destinationStation) {
  const apiKey = process.env.INDIAN_RAIL_API_KEY;
  if (!apiKey || apiKey.startsWith('REPLACE_') || !originStation?.code || !destinationStation?.code) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);

  try {
    const response = await fetch(
      `https://indianrailapi.com/api/v2/TrainBetweenStation/apikey/${apiKey}/From/${originStation.code}/To/${destinationStation.code}/`,
      {
        signal: controller.signal,
      }
    );

    if (!response.ok) {
      throw new Error(`Indian Rail route responded with ${response.status}`);
    }

    const data = await response.json();
    const firstTrain = data.Trains?.[0];
    if (!firstTrain) return null;

    const schedule = await getTrainSchedule(firstTrain.TrainNo);
    const distanceKm = extractRailDistanceKm(schedule, originStation.code, destinationStation.code);

    return {
      trainNumber: firstTrain.TrainNo,
      trainName: firstTrain.TrainName,
      durationHours: parseRailTravelHours(firstTrain.TravelTime),
      distanceKm: distanceKm || null,
      departureTime: firstTrain.DepartureTime || '',
      arrivalTime: firstTrain.ArrivalTime || '',
    };
  } catch (error) {
    console.warn(`Indian Rail route fallback used. ${error.message}`);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function buildRoadRoute({ origin, destination }) {
  const roadLeg = await computeRoadLeg(origin, destination);
  const travelFare = Math.max(roadLeg.distanceKm, Math.round(roadLeg.distanceKm * 1.4));

  return {
    mode: 'Road',
    headline: 'Direct road trip',
    distanceKm: roadLeg.distanceKm,
    durationText: roadLeg.durationText,
    travelFare,
    cabTransferFare: 0,
    totalEstimate: travelFare,
    summary: `Drive straight from ${origin.city} to ${destination.name} with one clean door-to-door route.`,
    mapData: buildMapData([
      buildPoint(origin.city, origin, 'origin'),
      buildPoint(destination.name, destination, 'destination'),
    ], 'Road'),
    journey: [
      {
        phase: 'Departure',
        title: `Leave ${origin.city}`,
        note: `Start directly from ${origin.city} and follow the main road route toward ${destination.name}.`,
        costLabel: `${roadLeg.distanceKm} km by road`,
      },
      {
        phase: 'Arrival',
        title: `Reach ${destination.name}`,
        note: `Arrive by road and head straight into the city or your stay.`,
        costLabel: `Est. ${Math.max(roadLeg.distanceKm, Math.round(roadLeg.distanceKm * 1.4))} INR for the drive`,
      },
    ],
    mapsUrl: buildDirectionsLink({ origin, destination }),
  };
}

async function buildFlightRoute({ origin, destination }) {
  const normalizedOrigin = normalizeOrigin(origin || {});
  const originAirport = getTransitHub(normalizedOrigin.city, 'airport');
  const destinationAirport = getTransitHub(destination.city || destination.name, 'airport');

  const airDistanceKm = Math.max(80, Math.round(haversineKm(originAirport || normalizedOrigin, destinationAirport || destination)));

  if (!originAirport || !destinationAirport) {
    const travelFare = airDistanceKm * 8;

    return {
      mode: 'Flight',
      headline: 'Fast air option',
      distanceKm: airDistanceKm,
      durationText: formatDuration(Math.max(2, Math.round(airDistanceKm / 520) + 2)),
      travelFare,
      cabTransferFare: 0,
      totalEstimate: travelFare,
      summary: `Fly toward ${destination.name} when you want the quickest long-distance option.`,
      mapData: buildMapData([
        buildPoint(normalizedOrigin.city, normalizedOrigin, 'origin'),
        buildPoint(destination.name, destination, 'destination'),
      ], 'Flight'),
      journey: [],
      mapsUrl: '',
    };
  }

  const taxiToAirport = await computeRoadLeg(normalizedOrigin, originAirport);
  const taxiFromAirport = await computeRoadLeg(destinationAirport, destination);
  const flightOffer = await getFlightOffer(originAirport, destinationAirport);
  const travelFare = flightOffer?.priceInr || airDistanceKm * 8;
  const cabTransferFare = calcTaxiFare(taxiToAirport.distanceKm) + calcTaxiFare(taxiFromAirport.distanceKm);
  const totalDistanceKm = taxiToAirport.distanceKm + airDistanceKm + taxiFromAirport.distanceKm;
  const flightHours = flightOffer?.durationHours || Math.max(1.5, airDistanceKm / 650);
  const totalHours = taxiToAirport.durationHours + flightHours + taxiFromAirport.durationHours;

  return {
    mode: 'Flight',
    headline: 'Fast air option',
    distanceKm: totalDistanceKm,
    durationText: formatDuration(totalHours),
    travelFare,
    cabTransferFare,
    totalEstimate: travelFare + cabTransferFare,
    summary: `Ride to ${originAirport.code}, fly to ${destinationAirport.code}, then finish the trip with a short road transfer into ${destination.name}.`,
    mapData: buildMapData([
      buildPoint(normalizedOrigin.city, normalizedOrigin, 'origin'),
      buildPoint(originAirport.code, originAirport, 'airport'),
      buildPoint(destinationAirport.code, destinationAirport, 'airport'),
      buildPoint(destination.name, destination, 'destination'),
    ], 'Flight'),
    journey: [
      {
        phase: 'Road transfer',
        title: `Go to ${originAirport.name}`,
        note: `Taxi from ${normalizedOrigin.city} to ${originAirport.code}.`,
        costLabel: `${calcTaxiFare(taxiToAirport.distanceKm)} INR est.`,
      },
      {
        phase: 'Flight',
        title: `${originAirport.code} to ${destinationAirport.code}`,
        note: flightOffer?.carrierCode
          ? `Live fare pulled for ${flightOffer.carrierCode}.`
          : `Flight estimate based on the ${originAirport.code} to ${destinationAirport.code} air leg.`,
        costLabel: `${travelFare} INR est.`,
      },
      {
        phase: 'Arrival transfer',
        title: `Continue to ${destination.name}`,
        note: `Road transfer from ${destinationAirport.code} into ${destination.name}.`,
        costLabel: `${calcTaxiFare(taxiFromAirport.distanceKm)} INR est.`,
      },
    ],
    mapsUrl: buildDirectionsLink({
      origin: normalizedOrigin,
      destination,
      waypoints: [originAirport, destinationAirport],
    }),
  };
}

async function buildRailRoute({ origin, destination }) {
  const normalizedOrigin = normalizeOrigin(origin || {});
  const originStation = getTransitHub(normalizedOrigin.city, 'rail');
  const destinationStation = getTransitHub(destination.city || destination.name, 'rail');

  const fallbackRailDistance = Math.max(120, Math.round(haversineKm(originStation || normalizedOrigin, destinationStation || destination) * 1.2));

  if (!originStation || !destinationStation) {
    const travelFare = calcRailFare(fallbackRailDistance);

    return {
      mode: 'Train',
      headline: 'Comfortable rail option',
      distanceKm: fallbackRailDistance,
      durationText: formatDuration(Math.max(6, Math.round(fallbackRailDistance / 55))),
      travelFare,
      cabTransferFare: 0,
      totalEstimate: travelFare,
      summary: `Take a longer but steadier rail-style route toward ${destination.name}.`,
      mapData: buildMapData([
        buildPoint(normalizedOrigin.city, normalizedOrigin, 'origin'),
        buildPoint(destination.name, destination, 'destination'),
      ], 'Train'),
      journey: [],
      mapsUrl: '',
    };
  }

  const taxiToStation = await computeRoadLeg(normalizedOrigin, originStation);
  const taxiFromStation = await computeRoadLeg(destinationStation, destination);
  const trainJourney = await getTrainJourney(originStation, destinationStation);
  const railDistanceKm = trainJourney?.distanceKm || fallbackRailDistance;
  const travelFare = calcRailFare(railDistanceKm);
  const cabTransferFare = calcTaxiFare(taxiToStation.distanceKm) + calcTaxiFare(taxiFromStation.distanceKm);
  const totalHours =
    taxiToStation.durationHours +
    (trainJourney?.durationHours || Math.max(6, Math.round(railDistanceKm / 55))) +
    taxiFromStation.durationHours;

  return {
    mode: 'Train',
    headline: 'Comfortable rail option',
    distanceKm: taxiToStation.distanceKm + railDistanceKm + taxiFromStation.distanceKm,
    durationText: formatDuration(totalHours),
    travelFare,
    cabTransferFare,
    totalEstimate: travelFare + cabTransferFare,
    summary: `Head to ${originStation.code}, ride toward ${destinationStation.code}, then continue by road into ${destination.name}.`,
    mapData: buildMapData([
      buildPoint(normalizedOrigin.city, normalizedOrigin, 'origin'),
      buildPoint(originStation.code, originStation, 'station'),
      buildPoint(destinationStation.code, destinationStation, 'station'),
      buildPoint(destination.name, destination, 'destination'),
    ], 'Train'),
    journey: [
      {
        phase: 'Station transfer',
        title: `Go to ${originStation.name}`,
        note: `Road transfer from ${normalizedOrigin.city} to ${originStation.code}.`,
        costLabel: `${calcTaxiFare(taxiToStation.distanceKm)} INR est.`,
      },
      {
        phase: 'Rail leg',
        title: `${originStation.code} to ${destinationStation.code}`,
        note: trainJourney?.trainName
          ? `Using live availability from ${trainJourney.trainName}.`
          : `Rail estimate between ${originStation.code} and ${destinationStation.code}.`,
        costLabel: `${travelFare} INR est.`,
      },
      {
        phase: 'Last mile',
        title: `Continue to ${destination.name}`,
        note: `Road transfer from ${destinationStation.code} into ${destination.name}.`,
        costLabel: `${calcTaxiFare(taxiFromStation.distanceKm)} INR est.`,
      },
    ],
    mapsUrl: buildDirectionsLink({
      origin: normalizedOrigin,
      destination,
      waypoints: [originStation, destinationStation],
    }),
  };
}

async function buildTravelOptions({ origin, destination }) {
  const normalizedOrigin = normalizeOrigin(origin || {});

  const [road, train, flight] = await Promise.all([
    buildRoadRoute({ origin: normalizedOrigin, destination }),
    buildRailRoute({ origin: normalizedOrigin, destination }),
    buildFlightRoute({ origin: normalizedOrigin, destination }),
  ]);

  return [road, train, flight];
}

module.exports = {
  buildTravelOptions,
};
