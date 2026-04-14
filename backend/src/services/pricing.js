function calculateStayEstimate(nights = 2, nightlyRate = 1000) {
  const safeNights = Math.max(1, Number(nights) || 1);
  const safeNightlyRate = Math.max(800, Number(nightlyRate) || 1000);

  return {
    nights: safeNights,
    nightlyRate: safeNightlyRate,
    total: safeNights * safeNightlyRate,
  };
}

function classifyAbsoluteBudget(totalEstimate = 0) {
  const total = Number(totalEstimate) || 0;

  if (total <= 3500) return 'Budget';
  if (total <= 5500) return 'Recommended';
  return 'Premium';
}

function formatDuration(hours) {
  if (hours < 24) {
    return `${hours} hrs`;
  }

  const days = Math.floor(hours / 24);
  const remainder = hours % 24;
  return remainder ? `${days}d ${remainder}h` : `${days}d`;
}

function buildTravelRoutes({ roadDistanceKm = 0, airDistanceKm = 0 } = {}) {
  const roadKm = Math.max(60, Math.round(roadDistanceKm || 0));
  const airKm = Math.max(80, Math.round(airDistanceKm || roadKm * 0.74));

  const trainTravelFare = roadKm;
  const trainCabFare = Math.max(180, Math.round(roadKm * 0.08));

  const roadTravelFare = Math.max(roadKm, Math.round(roadKm * 1.4));
  const roadCabFare = 0;

  const flightTravelFare = airKm * 8;
  const flightCabFare = Math.max(280, Math.round(roadKm * 0.12));

  return [
    {
      mode: 'Train',
      headline: 'Balanced intercity option',
      distanceKm: roadKm,
      durationText: formatDuration(Math.max(4, Math.round(roadKm / 55))),
      travelFare: trainTravelFare,
      cabTransferFare: trainCabFare,
      totalEstimate: trainTravelFare + trainCabFare,
      summary: 'Best when you want manageable spend with a straightforward station-to-stay handoff.',
    },
    {
      mode: 'Road',
      headline: 'Direct road trip flow',
      distanceKm: roadKm,
      durationText: formatDuration(Math.max(3, Math.round(roadKm / 42))),
      travelFare: roadTravelFare,
      cabTransferFare: roadCabFare,
      totalEstimate: roadTravelFare + roadCabFare,
      summary: 'Good for flexible stops and simpler luggage handling if the route is part of the experience.',
    },
    {
      mode: 'Flight',
      headline: 'Fastest long-distance option',
      distanceKm: airKm,
      durationText: formatDuration(Math.max(3, Math.round(airKm / 520) + 2)),
      travelFare: flightTravelFare,
      cabTransferFare: flightCabFare,
      totalEstimate: flightTravelFare + flightCabFare,
      summary: 'Most useful on longer routes where saving time matters more than lowest possible spend.',
    },
  ];
}

module.exports = {
  buildTravelRoutes,
  calculateStayEstimate,
  classifyAbsoluteBudget,
};
