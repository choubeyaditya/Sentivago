const express = require('express');
const { generateDestinationGuide } = require('../services/ai');
const { defaultOrigin, normalizeOrigin } = require('../services/geocoding');
const { computeRoadDistance, computeRoadLeg, getDestinationDetails, searchNearbyPlaces } = require('../services/googleMaps');
const { calculateStayEstimate, classifyAbsoluteBudget } = require('../services/pricing');
const { getCurrentWeather } = require('../services/weather');
const { createReview, getReviewStats, listReviews } = require('../services/reviews');
const { buildTravelOptions } = require('../services/travelRouting');

const router = express.Router();

function getOrigin(req) {
  return normalizeOrigin({
    city: req.query.fromCity || req.query.city || defaultOrigin.city,
    state: req.query.fromState || defaultOrigin.state,
    latitude: Number(req.query.fromLat) || defaultOrigin.latitude,
    longitude: Number(req.query.fromLng) || defaultOrigin.longitude,
    sourceType: req.query.fromLat ? 'browser' : 'default',
  });
}

function getPlaceContext(req) {
  return {
    placeId: req.query.placeId || '',
    fallbackName: String(req.query.name || req.params.slug || '').replace(/-/g, ' '),
    fallbackState: String(req.query.state || '').trim(),
  };
}

router.get('/:slug', async (req, res) => {
  try {
    const origin = getOrigin(req);
    const context = getPlaceContext(req);
    const destination = await getDestinationDetails(context);
    const roadRoute = await computeRoadLeg(origin, destination);
    const stayEstimate = calculateStayEstimate(2, 1000);
    const totalEstimate = roadRoute.distanceKm + stayEstimate.total;
    const reviewStats = await getReviewStats(destination.placeId);
    const weather = await getCurrentWeather(destination.latitude, destination.longitude);
    const tier = classifyAbsoluteBudget(totalEstimate);
    const guide = await generateDestinationGuide({
      destination,
      weatherSummary: weather.summary,
      tier,
    });

    return res.json({
      ...destination,
      origin,
      budgetTier: tier,
      communityRating: Number((reviewStats.communityRating || destination.googleRating || 5).toFixed(1)),
      reviewCount: reviewStats.reviewCount || 0,
      liveWeather: weather,
      tripEstimate: {
        roadDistanceKm: roadRoute.distanceKm,
        travelCost: roadRoute.distanceKm,
        stayCost: stayEstimate.total,
        total: totalEstimate,
        rangeLabel: `₹${Math.max(1000, totalEstimate - 1000).toLocaleString('en-IN')} - ₹${(totalEstimate + 2000).toLocaleString('en-IN')}`,
      },
      guide,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to load destination details.' });
  }
});

router.get('/:slug/travel-plan', async (req, res) => {
  try {
    const origin = getOrigin(req);
    const destination = await getDestinationDetails(getPlaceContext(req));
    const routes = await buildTravelOptions({
      origin,
      destination,
    });
    const guide = await generateDestinationGuide({
      destination,
      weatherSummary: '',
      tier: classifyAbsoluteBudget((routes[0]?.distanceKm || computeRoadDistance(origin, destination).distanceKm) + 2000),
    });

    return res.json({
      destination: {
        placeId: destination.placeId,
        slug: destination.slug,
        name: destination.name,
        state: destination.state,
      },
      origin,
      routes,
      activities: guide.thingsToDo,
      tips: guide.travelTips,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to load travel plan.' });
  }
});

router.get('/:slug/hotels', async (req, res) => {
  try {
    const destination = await getDestinationDetails(getPlaceContext(req));
    const hotels = await searchNearbyPlaces({
      destination,
      kind: 'hotels',
      limit: 18,
    });

    return res.json({
      destination: {
        placeId: destination.placeId,
        name: destination.name,
        state: destination.state,
      },
      hotels,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to load hotels.' });
  }
});

router.get('/:slug/restaurants', async (req, res) => {
  try {
    const destination = await getDestinationDetails(getPlaceContext(req));
    const restaurants = await searchNearbyPlaces({
      destination,
      kind: 'restaurants',
      limit: 18,
    });

    return res.json({
      destination: {
        placeId: destination.placeId,
        name: destination.name,
        state: destination.state,
      },
      restaurants,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to load restaurants.' });
  }
});

router.get('/:slug/local-travel', async (req, res) => {
  const destinationName = req.query.name || req.params.slug.replace(/-/g, ' ');

  return res.json({
    destinationName,
    emergencyContacts: [
      { label: 'Tourist helpline', value: '+91 1800-11-1363' },
      { label: 'Local taxi desk', value: '+91 90000-11111' },
      { label: 'Hotel front desk support', value: '+91 90000-22222' },
      { label: 'Emergency travel backup', value: '+91 90000-33333' },
      { label: 'Night transfer support', value: '+91 90000-44444' },
    ],
    agencies: [
      {
        name: `${destinationName} Easy Cab`,
        type: 'Cab & local transfers',
        note: 'Good for hotel pickup, station drop, and short city hops.',
      },
      {
        name: `${destinationName} Travel Hub`,
        type: 'Day tours & custom trips',
        note: 'Useful if you want a simple one-day sightseeing plan.',
      },
      {
        name: `${destinationName} Ride Point`,
        type: 'Airport and outstation rides',
        note: 'Useful when you need longer transfer support beyond the city center.',
      },
    ],
  });
});

router.get('/:slug/reviews', async (req, res) => {
  try {
    const placeId = req.query.placeId || '';
    const reviews = await listReviews(placeId);
    const stats = await getReviewStats(placeId);

    return res.json({
      communityRating: Number((stats.communityRating || 5).toFixed(1)),
      reviewCount: stats.reviewCount || 0,
      reviews,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to load reviews.' });
  }
});

router.post('/:slug/reviews', async (req, res) => {
  const { reviewerName, rating, content, placeId, placeSlug, destinationName, destinationState } = req.body || {};

  if (!placeId || !reviewerName || !content || !rating) {
    return res.status(400).json({ error: 'placeId, reviewerName, rating, and content are required.' });
  }

  if (Number(rating) < 1 || Number(rating) > 5) {
    return res.status(400).json({ error: 'rating must be between 1 and 5.' });
  }

  try {
    const review = await createReview({
      placeId,
      placeSlug: placeSlug || req.params.slug,
      destinationName: destinationName || req.params.slug.replace(/-/g, ' '),
      destinationState: destinationState || '',
      reviewerName,
      rating: Number(rating),
      content,
    });
    const stats = await getReviewStats(placeId);

    return res.status(201).json({
      review,
      communityRating: Number((stats.communityRating || 5).toFixed(1)),
      reviewCount: stats.reviewCount || 0,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Failed to submit review.' });
  }
});

module.exports = router;
