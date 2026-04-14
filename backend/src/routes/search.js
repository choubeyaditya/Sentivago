const express = require('express');

const { normalizeOrigin } = require('../services/geocoding');
const {
  buildGeneratedDestinationRecord,
  listDestinations,
  rememberGeneratedDestinations,
} = require('../services/catalog');
const { interpretIndianTripIntent, recommendIndianDestinations } = require('../services/ai');
const { computeRoadDistance } = require('../services/googleMaps');
const { calculateStayEstimate } = require('../services/pricing');
const { getReviewStats } = require('../services/reviews');

const router = express.Router();
const SEARCH_BUDGET_THRESHOLD = 5000;
const MAX_PER_SECTION = 30;

const themeMatchers = {
  mountain: ['mountain', 'hill', 'hills', 'snow', 'cloud', 'tea'],
  beach: ['beach', 'coast', 'coastal', 'sea', 'island'],
  spiritual: ['spiritual', 'temple', 'sacred', 'meditation', 'yoga'],
  food: ['food', 'cafe', 'cafes', 'street food', 'seafood', 'culinary'],
  luxury: ['luxury', 'premium', 'resort', 'romantic', 'honeymoon'],
  budget: ['budget', 'cheap', 'low-cost', 'low cost', 'affordable', 'manageable'],
  adventure: ['adventure', 'rafting', 'trek', 'hike', 'active'],
  heritage: ['heritage', 'culture', 'historic', 'palace', 'fort', 'museum'],
  peaceful: ['peaceful', 'quiet', 'calm', 'slow', 'cozy', 'relaxed'],
  cool: ['cool', 'cold', 'pleasant weather', 'cool weather', 'fresh air'],
  weekend: ['weekend', 'short trip', '2-night', '2 night', 'manageable'],
  social: ['social', 'nightlife', 'friends', 'lively'],
  romantic: ['romantic', 'couple', 'view', 'lakeside', 'sunset'],
};

function extractThemes(mood = '') {
  const text = String(mood).trim().toLowerCase();

  return Object.entries(themeMatchers)
    .filter(([, matches]) => matches.some((item) => text.includes(item)))
    .map(([theme]) => theme);
}

function mergeThemes(...themeGroups) {
  return [...new Set(themeGroups.flat().filter(Boolean))];
}

function buildReason(destination, matchedThemes) {
  if (matchedThemes.length) {
    return `${destination.name} fits the ${matchedThemes.slice(0, 2).join(' + ')} vibe with ${destination.summary.toLowerCase()}`;
  }

  return `${destination.name} is a strong all-round fit when you want a polished India-first fallback recommendation.`;
}

function scoreDestination(destination, matchedThemes, roadDistanceKm) {
  let score = 50;

  matchedThemes.forEach((theme) => {
    if (destination.themes.includes(theme)) {
      score += 18;
    }
  });

  if (matchedThemes.includes('budget')) {
    score += Math.max(0, 18 - roadDistanceKm / 180);
  }

  if (matchedThemes.includes('luxury') && destination.themes.includes('premium')) {
    score += 12;
  }

  if (matchedThemes.includes('weekend')) {
    score += Math.max(-6, 14 - roadDistanceKm / 260);
  }

  score += Math.max(-8, 16 - roadDistanceKm / 220);

  return score;
}

function sectionKeyForEstimate(totalEstimate = 0) {
  return Number(totalEstimate || 0) <= SEARCH_BUDGET_THRESHOLD ? 'budget' : 'recommended';
}

function estimateNightlyRate(destination = {}, fallbackNightlyRate = 1000) {
  const themes = destination.themes || [];
  let nightlyRate = Math.max(900, Number(fallbackNightlyRate) || 1000);

  if (themes.includes('luxury') || themes.includes('premium')) {
    nightlyRate = Math.max(nightlyRate, 2500);
  } else if (themes.includes('romantic') || themes.includes('heritage')) {
    nightlyRate = Math.max(nightlyRate, 1800);
  } else if (themes.includes('coastal') || themes.includes('social')) {
    nightlyRate = Math.max(nightlyRate, 1200);
  }

  if (themes.includes('budget')) {
    nightlyRate = Math.min(nightlyRate, 800);
  }

  return nightlyRate;
}

function buildSearchCard(destination, tier, reviewStats, roadRoute, stayEstimate, reason, searchScore) {
  const totalEstimate = roadRoute.distanceKm + stayEstimate.total;

  return {
    placeId: destination.placeId,
    slug: destination.slug,
    name: destination.name,
    city: destination.city,
    state: destination.state,
    imageUrl: destination.imageUrl,
    tags: destination.tags,
    themes: destination.themes,
    summary: destination.summary,
    tier,
    rating: destination.googleRating,
    reviewCount: reviewStats.reviewCount || 0,
    reason,
    roadRoute,
    tripEstimate: {
      roadDistanceKm: roadRoute.distanceKm,
      travelCost: roadRoute.distanceKm,
      stayCost: stayEstimate.total,
      total: totalEstimate,
      rangeLabel: `₹${Math.max(1000, totalEstimate - 1000).toLocaleString('en-IN')} - ₹${(totalEstimate + 2000).toLocaleString('en-IN')}`,
    },
    searchScore,
  };
}

async function buildFallbackRanked(origin, matchedThemes) {
  const ranked = await Promise.all(
    listDestinations()
      .filter((destination) => String(destination.country || 'India').toLowerCase() === 'india')
      .map(async (destination) => {
        const roadRoute = computeRoadDistance(origin, destination);
        const stayEstimate = calculateStayEstimate(2, estimateNightlyRate(destination, 1000));
        const totalEstimate = roadRoute.distanceKm + stayEstimate.total;
        const tier = sectionKeyForEstimate(totalEstimate) === 'budget' ? 'Budget' : 'Recommended';
        const reviewStats = await getReviewStats(destination.placeId);
        const matched = matchedThemes.filter((theme) => destination.themes.includes(theme));
        const searchScore = scoreDestination(destination, matchedThemes, roadRoute.distanceKm);

        return buildSearchCard(
          destination,
          tier,
          reviewStats,
          roadRoute,
          stayEstimate,
          buildReason(destination, matched),
          searchScore
        );
      })
  );

  ranked.sort((a, b) => {
    if (b.searchScore !== a.searchScore) return b.searchScore - a.searchScore;
    return a.tripEstimate.total - b.tripEstimate.total;
  });

  return ranked;
}

async function buildAiRanked(origin, mood, matchedThemes, intent = null) {
  const aiPayload = await recommendIndianDestinations({
    mood: intent?.searchPrompt || mood,
    origin,
    count: MAX_PER_SECTION * 2,
    themes: matchedThemes,
    interpretation: intent?.interpretation || '',
  });

  if (!aiPayload?.destinations?.length) {
    return null;
  }

  const generatedDestinations = aiPayload.destinations.map((item, index) =>
    buildGeneratedDestinationRecord({
      ...item,
      placeId: `ai-search-${String(item.name || item.city || 'destination')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')}-${index + 1}`,
      source: 'ai-search',
      dynamic: true,
    })
  );

  rememberGeneratedDestinations(generatedDestinations);

  const ranked = await Promise.all(
    generatedDestinations.map(async (destination, index) => {
      const suggestion = aiPayload.destinations[index];
      const roadRoute = computeRoadDistance(origin, destination);
      const stayEstimate = calculateStayEstimate(
        2,
        suggestion.nightlyRateHint || estimateNightlyRate(destination, 1800)
      );
      const totalEstimate = roadRoute.distanceKm + stayEstimate.total;
      const tier = sectionKeyForEstimate(totalEstimate) === 'budget' ? 'Budget' : 'Recommended';
      const reviewStats = await getReviewStats(destination.placeId);
      const matched = matchedThemes.filter((theme) => destination.themes.includes(theme));
      const searchScore = 220 - index * 8 + scoreDestination(destination, matchedThemes, roadRoute.distanceKm);

      return buildSearchCard(
        destination,
        tier,
        reviewStats,
        roadRoute,
        stayEstimate,
        suggestion.reason || buildReason(destination, matched),
        searchScore
      );
    })
  );

  ranked.sort((a, b) => {
    if (b.searchScore !== a.searchScore) return b.searchScore - a.searchScore;
    return a.tripEstimate.total - b.tripEstimate.total;
  });

  return {
    summary: aiPayload.summary,
    interpretation: aiPayload.interpretation,
    ranked,
  };
}

function buildSections(primary = [], secondary = []) {
  const sections = {
    budget: [],
    recommended: [],
  };
  const seen = new Set();

  [...primary, ...secondary].forEach((item) => {
    if (!item?.placeId || seen.has(item.placeId)) return;

    const sectionKey = sectionKeyForEstimate(item.tripEstimate.total);
    if (sections[sectionKey].length >= MAX_PER_SECTION) return;

    sections[sectionKey].push(item);
    seen.add(item.placeId);
  });

  return sections;
}

router.post('/', async (req, res) => {
  const mood = String(req.body?.mood || '').trim();

  if (!mood) {
    return res.status(400).json({ error: 'mood is required.' });
  }

  try {
    const origin = normalizeOrigin(req.body?.origin || {});
    const intent = await interpretIndianTripIntent({ mood, origin });
    const matchedThemes = mergeThemes(extractThemes(mood), intent?.themes || []);
    const fallbackRanked = await buildFallbackRanked(origin, matchedThemes);
    const aiRanked = await buildAiRanked(origin, mood, matchedThemes, intent);
    const primaryRanked = aiRanked?.ranked?.length ? aiRanked.ranked : fallbackRanked;
    const sections = buildSections(primaryRanked, fallbackRanked);

    return res.json({
      summary: aiRanked?.summary || intent?.summary || `India picks from ${origin.city}`,
      interpretation:
        aiRanked?.interpretation ||
        intent?.interpretation ||
        `Only destinations inside India are shown. Budget picks stay at or below ₹5,000 per person for this 2-day estimate.`,
      origin,
      sections,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to build destination recommendations.' });
  }
});

module.exports = router;
