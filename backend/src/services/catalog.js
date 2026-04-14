const { defaultOrigin, findCityByName } = require('./geocoding');

const paletteBank = [
  ['#214765', '#d28b3f', '#90b9c8'],
  ['#18465d', '#5ea8bf', '#cddf8f'],
  ['#0e4d78', '#ef9f43', '#f6d8a0'],
  ['#0e5d70', '#f2b351', '#95d1d3'],
  ['#a4492f', '#e2a85a', '#f6d9ab'],
  ['#335c76', '#d8a55d', '#eed9b0'],
  ['#1d5668', '#b2792e', '#d7d1aa'],
  ['#23485b', '#a2c4d4', '#f0c26f'],
  ['#315b72', '#d1a55d', '#9dc0cf'],
  ['#23423f', '#d89a4f', '#8cc9aa'],
];

function slugify(value = '') {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function titleCase(value = '') {
  return String(value || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function uniqueStrings(values = []) {
  return [...new Set(values.map((value) => String(value || '').trim()).filter(Boolean))];
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function hashSeed(seed = '') {
  return String(seed || '').split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
}

function pickPalette(seed = '') {
  return paletteBank[hashSeed(seed) % paletteBank.length];
}

function escapeXml(value = '') {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function pickArtDirection(themes = []) {
  const normalized = normalizeThemes(themes);

  if (normalized.includes('beach') || normalized.includes('coastal')) return 'beach';
  if (normalized.includes('mountain') || normalized.includes('cool') || normalized.includes('adventure')) return 'mountain';
  if (normalized.includes('heritage') || normalized.includes('luxury') || normalized.includes('romantic')) return 'heritage';
  if (normalized.includes('spiritual') || normalized.includes('peaceful')) return 'spiritual';
  if (normalized.includes('food') || normalized.includes('social')) return 'city';
  return 'scenic';
}

function buildThemeMotif(direction, palette, variant = 0) {
  const [primary, secondary, accent = primary] = palette;
  const variantShift = variant * 34;

  switch (direction) {
    case 'beach':
      return `
        <circle cx="${968 - variantShift}" cy="${162 + variant * 10}" r="82" fill="rgba(255,255,255,0.22)"/>
        <path d="M0 496 C160 458 280 486 420 534 C560 582 726 576 890 522 C1016 480 1110 478 1200 514 L1200 800 L0 800 Z" fill="${secondary}" opacity="0.48"/>
        <path d="M0 572 C170 548 332 566 470 612 C622 662 798 666 964 620 C1064 592 1148 586 1200 594 L1200 800 L0 800 Z" fill="${primary}" opacity="0.58"/>
        <path d="M70 586 C178 564 286 596 384 628" stroke="rgba(255,255,255,0.42)" stroke-width="10" stroke-linecap="round" fill="none"/>
        <path d="M140 318 C176 238 196 188 216 144" stroke="${accent}" stroke-width="12" stroke-linecap="round"/>
        <path d="M214 146 C246 140 272 156 296 188" stroke="${accent}" stroke-width="10" stroke-linecap="round" fill="none"/>
      `;
    case 'mountain':
      return `
        <circle cx="${978 - variantShift}" cy="${166 + variant * 12}" r="74" fill="rgba(255,255,255,0.18)"/>
        <path d="M0 566 L212 282 L386 560 Z" fill="rgba(255,255,255,0.18)"/>
        <path d="M258 596 L470 244 L706 596 Z" fill="${secondary}" opacity="0.56"/>
        <path d="M566 608 L798 296 L1040 608 Z" fill="${primary}" opacity="0.64"/>
        <path d="M424 320 L470 244 L522 320" fill="rgba(255,255,255,0.6)"/>
        <path d="M744 370 L798 296 L852 370" fill="rgba(255,255,255,0.54)"/>
      `;
    case 'heritage':
      return `
        <circle cx="${984 - variantShift}" cy="${156 + variant * 8}" r="76" fill="rgba(255,255,255,0.16)"/>
        <rect x="318" y="318" width="564" height="278" rx="28" fill="rgba(7,18,23,0.16)" stroke="rgba(255,255,255,0.18)"/>
        <rect x="402" y="360" width="398" height="188" rx="18" fill="${secondary}" opacity="0.54"/>
        <rect x="462" y="290" width="102" height="104" rx="24" fill="${accent}" opacity="0.56"/>
        <rect x="642" y="290" width="102" height="104" rx="24" fill="${accent}" opacity="0.56"/>
        <rect x="562" y="258" width="118" height="138" rx="26" fill="rgba(255,255,255,0.24)"/>
        <rect x="538" y="500" width="166" height="96" rx="26" fill="rgba(7,18,23,0.22)"/>
      `;
    case 'spiritual':
      return `
        <circle cx="${974 - variantShift}" cy="${158 + variant * 10}" r="76" fill="rgba(255,255,255,0.18)"/>
        <path d="M360 596 L450 412 L542 596 Z" fill="${secondary}" opacity="0.52"/>
        <path d="M520 596 L622 332 L724 596 Z" fill="${primary}" opacity="0.62"/>
        <path d="M612 332 L622 254 L632 332" stroke="rgba(255,255,255,0.6)" stroke-width="10" stroke-linecap="round"/>
        <path d="M742 596 L826 432 L912 596 Z" fill="${accent}" opacity="0.46"/>
        <rect x="560" y="596" width="124" height="22" rx="11" fill="rgba(255,255,255,0.24)"/>
      `;
    case 'city':
      return `
        <circle cx="${972 - variantShift}" cy="${162 + variant * 10}" r="76" fill="rgba(255,255,255,0.16)"/>
        <rect x="260" y="396" width="122" height="210" rx="20" fill="${secondary}" opacity="0.52"/>
        <rect x="410" y="316" width="146" height="290" rx="22" fill="${primary}" opacity="0.62"/>
        <rect x="590" y="364" width="118" height="242" rx="18" fill="${accent}" opacity="0.48"/>
        <rect x="736" y="438" width="112" height="168" rx="18" fill="rgba(255,255,255,0.22)"/>
        <path d="M300 650 C412 624 508 626 624 644 C730 662 846 662 964 632" stroke="rgba(255,255,255,0.28)" stroke-width="9" stroke-linecap="round" fill="none"/>
      `;
    default:
      return `
        <circle cx="${980 - variantShift}" cy="${162 + variant * 10}" r="78" fill="rgba(255,255,255,0.18)"/>
        <path d="M0 558 C168 500 306 502 448 550 C588 598 734 592 890 542 C1018 500 1112 500 1200 530 L1200 800 L0 800 Z" fill="${secondary}" opacity="0.48"/>
        <path d="M0 632 C172 586 318 604 470 654 C612 700 766 692 936 632 C1038 598 1120 600 1200 626 L1200 800 L0 800 Z" fill="${primary}" opacity="0.58"/>
        <path d="M274 480 C338 430 420 430 494 478" stroke="rgba(255,255,255,0.28)" stroke-width="12" stroke-linecap="round" fill="none"/>
      `;
  }
}

function buildSvgDataUri(title, subtitle, palette, themes = [], variant = 0) {
  const colors = Array.isArray(palette) && palette.length >= 2 ? palette : ['#0f5d63', '#d99c3c'];
  const safeTitle = escapeXml(title);
  const safeSubtitle = escapeXml(subtitle);
  const direction = pickArtDirection(themes);
  const motifLabel = direction === 'city' ? 'Urban' : direction[0].toUpperCase() + direction.slice(1);
  const motif = buildThemeMotif(direction, colors, variant);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800" role="img" aria-label="${safeTitle}">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${colors[0]}"/>
          <stop offset="100%" stop-color="${colors[1]}"/>
        </linearGradient>
        <linearGradient id="mist" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="rgba(255,255,255,0.42)"/>
          <stop offset="100%" stop-color="rgba(255,255,255,0.08)"/>
        </linearGradient>
      </defs>
      <rect width="1200" height="800" fill="url(#bg)"/>
      ${motif}
      <path d="M0 664 C176 604 334 626 502 686 C674 748 828 730 998 668 C1084 636 1148 634 1200 652 L1200 800 L0 800 Z" fill="rgba(7,18,23,0.3)"/>
      <rect x="74" y="92" width="450" height="144" rx="28" fill="rgba(255,255,255,0.14)" stroke="rgba(255,255,255,0.22)"/>
      <text x="104" y="154" font-size="58" font-family="Georgia, Palatino, serif" fill="#ffffff">${safeTitle}</text>
      <text x="106" y="205" font-size="28" font-family="Segoe UI, Arial, sans-serif" fill="rgba(255,255,255,0.86)">${safeSubtitle}</text>
      <rect x="78" y="690" width="188" height="40" rx="20" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.16)"/>
      <text x="110" y="716" font-size="23" font-family="Segoe UI, Arial, sans-serif" fill="#ffffff">${escapeXml(motifLabel)} mood</text>
      <rect x="78" y="742" width="238" height="18" rx="9" fill="url(#mist)"/>
    </svg>
  `.trim();

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function buildGallery(name, state, palette, themes = []) {
  return [
    buildSvgDataUri(name, `${state} escape`, palette, themes, 0),
    buildSvgDataUri(`${name} afterglow`, 'Trip preview', [palette[1], palette[2] || palette[0]], themes, 1),
    buildSvgDataUri(`${name} stay`, 'Sentivago selection', [palette[2] || palette[0], palette[0]], themes, 2),
  ];
}

function normalizeThemes(themes = []) {
  return uniqueStrings(themes.map((theme) => String(theme || '').trim().toLowerCase())).slice(0, 8);
}

function cloneDestination(destination) {
  return {
    ...destination,
    tags: [...(destination.tags || [])],
    themes: [...(destination.themes || [])],
    specialityFoods: [...(destination.specialityFoods || [])],
    thingsToDo: [...(destination.thingsToDo || [])],
    travelTips: [...(destination.travelTips || [])],
    gallery: [...(destination.gallery || [])],
    palette: [...(destination.palette || [])],
  };
}

function buildGeneratedDestinationRecord(input = {}) {
  const rawName = titleCase(input.name || input.city || input.fallbackName || input.slug || 'Destination');
  const rawState = titleCase(input.state || input.destinationState || '');
  const cityLookup =
    findCityByName(input.city || rawName) ||
    findCityByName(`${rawName}, ${rawState}`) ||
    findCityByName(`${input.city || ''}, ${rawState}`);
  const city = titleCase(input.city || cityLookup?.city || rawName);
  const state = rawState || cityLookup?.state || defaultOrigin.state;
  const slug = slugify(input.slug || rawName || 'destination');
  const placeId = String(input.placeId || `ai-${slug}`).trim().toLowerCase();
  const palette = Array.isArray(input.palette) && input.palette.length >= 2
    ? input.palette
    : pickPalette(`${slug}:${state}`);
  const gallery = Array.isArray(input.gallery) && input.gallery.length
    ? input.gallery
    : buildGallery(rawName, state, palette, input.themes || []);

  return {
    placeId,
    slug,
    name: rawName,
    city,
    state,
    country: 'India',
    latitude: Number(input.latitude) || cityLookup?.latitude || defaultOrigin.latitude,
    longitude: Number(input.longitude) || cityLookup?.longitude || defaultOrigin.longitude,
    googleRating: clamp(Number(input.googleRating || input.ratingHint || 4.5) || 4.5, 4.1, 4.9),
    googleReviewCount: Math.max(0, Math.round(Number(input.googleReviewCount || input.reviewCountHint || 2400) || 2400)),
    tags: uniqueStrings(input.tags || ['Curated', 'India only', 'Sentivago AI']).slice(0, 6),
    themes: normalizeThemes(input.themes || ['culture', 'peaceful']),
    summary:
      String(input.summary || '').trim() ||
      `${rawName} is a polished India-first recommendation shaped for flexible trip planning.`,
    specialityFoods: uniqueStrings(input.specialityFoods || []).slice(0, 5),
    thingsToDo: uniqueStrings(input.thingsToDo || []).slice(0, 6),
    travelTips: uniqueStrings(input.travelTips || []).slice(0, 6),
    palette,
    imageUrl: gallery[0],
    gallery,
    source: input.source || 'generated',
    dynamic: Boolean(input.dynamic),
    isFallback: Boolean(input.isFallback),
  };
}

const generatedDestinations = new Map();

function rememberGeneratedDestinations(destinations = []) {
  destinations
    .filter(Boolean)
    .map((destination) => buildGeneratedDestinationRecord(destination))
    .forEach((destination) => {
      generatedDestinations.set(destination.placeId, destination);
    });
}

function findGeneratedDestination(context = {}) {
  const normalizedSlug = slugify(context.slug || '');
  const normalizedPlaceId = String(context.placeId || '').trim().toLowerCase();
  const normalizedName = titleCase(context.name || context.fallbackName || '');

  const match = [...generatedDestinations.values()].find((item) => {
    if (normalizedPlaceId && item.placeId === normalizedPlaceId) return true;
    if (normalizedSlug && item.slug === normalizedSlug) return true;
    if (normalizedName && item.name === normalizedName) return true;
    return false;
  });

  return match ? cloneDestination(match) : null;
}

const featuredDestinations = [
  {
    placeId: 'demo-darjeeling',
    slug: 'darjeeling',
    name: 'Darjeeling',
    city: 'Darjeeling',
    state: 'West Bengal',
    latitude: 27.041,
    longitude: 88.2663,
    googleRating: 4.6,
    googleReviewCount: 18400,
    tags: ['Tea estates', 'Cool weather', 'Toy train'],
    themes: ['mountain', 'peaceful', 'cool', 'food', 'nature', 'scenic', 'weekend'],
    summary: 'Classic hill escape with tea gardens, crisp mornings, and easy scenic pacing.',
    specialityFoods: ['Darjeeling tea tasting', 'Momos and thukpa', 'Bakery cafes on the Mall Road'],
    thingsToDo: ['Watch sunrise from Tiger Hill', 'Ride the Darjeeling Himalayan Railway', 'Spend a slow afternoon in tea estates'],
    travelTips: ['Carry light layers because mornings turn cool quickly.', 'Book sunrise transport early during busy weekends.', 'Keep one flexible slot for misty-weather delays.'],
    palette: ['#214765', '#d28b3f', '#90b9c8'],
  },
  {
    placeId: 'demo-shillong',
    slug: 'shillong',
    name: 'Shillong',
    city: 'Shillong',
    state: 'Meghalaya',
    latitude: 25.5788,
    longitude: 91.8933,
    googleRating: 4.5,
    googleReviewCount: 12600,
    tags: ['Waterfalls', 'Music cafes', 'Cool air'],
    themes: ['mountain', 'peaceful', 'cool', 'nature', 'adventure', 'scenic'],
    summary: 'Refreshing plateau city with pine-lined drives, waterfalls, and relaxed cafe culture.',
    specialityFoods: ['Jadoh rice plates', 'Smoked meat specials', 'Cafe desserts and coffee'],
    thingsToDo: ['Take a waterfall circuit drive', 'Explore music cafes in the evening', 'Plan a day trip toward Umiam Lake'],
    travelTips: ['Rain can arrive quickly, so keep a light waterproof layer.', 'Road transfers are better earlier in the day.', 'Pair Shillong with one scenic lake stop for a fuller short trip.'],
    palette: ['#18465d', '#5ea8bf', '#cddf8f'],
  },
  {
    placeId: 'demo-panaji',
    slug: 'panaji',
    name: 'Panaji',
    city: 'Panaji',
    state: 'Goa',
    latitude: 15.4909,
    longitude: 73.8278,
    googleRating: 4.5,
    googleReviewCount: 20900,
    tags: ['Coastal walks', 'Seafood', 'Easy nightlife'],
    themes: ['beach', 'food', 'social', 'romantic', 'culture', 'premium'],
    summary: 'Easy coastal base for beaches, Portuguese quarter walks, and lively dinners.',
    specialityFoods: ['Goan fish curry', 'Prawn balchao', 'Bebinca dessert'],
    thingsToDo: ['Spend sunset time on nearby beaches', 'Walk Fontainhas for color and cafes', 'Keep one flexible night for riverside dining'],
    travelTips: ['Late afternoons are best for waterfront plans.', 'Use one central stay to reduce transfer time.', 'Sea-facing stays get booked first on long weekends.'],
    palette: ['#0e4d78', '#ef9f43', '#f6d8a0'],
  },
  {
    placeId: 'demo-rishikesh',
    slug: 'rishikesh',
    name: 'Rishikesh',
    city: 'Rishikesh',
    state: 'Uttarakhand',
    latitude: 30.0869,
    longitude: 78.2676,
    googleRating: 4.6,
    googleReviewCount: 22100,
    tags: ['Riverfront', 'Yoga', 'Adventure'],
    themes: ['spiritual', 'adventure', 'budget', 'peaceful', 'nature', 'weekend'],
    summary: 'Balanced mix of river calm, spiritual atmosphere, and light adventure options.',
    specialityFoods: ['Sattvic cafe meals', 'Chaat and street snacks', 'Riverside breakfast cafes'],
    thingsToDo: ['Catch the evening Ganga aarti', 'Plan a rafting or riverside walk session', 'Spend a slow morning at yoga cafes and bookshops'],
    travelTips: ['Keep footwear easy for temple and ghat visits.', 'Adventure slots fill faster on weekends.', 'Stay closer to the river if you want a mostly walkable plan.'],
    palette: ['#0e5d70', '#f2b351', '#95d1d3'],
  },
  {
    placeId: 'demo-jaipur',
    slug: 'jaipur',
    name: 'Jaipur',
    city: 'Jaipur',
    state: 'Rajasthan',
    latitude: 26.9124,
    longitude: 75.7873,
    googleRating: 4.6,
    googleReviewCount: 28700,
    tags: ['Fort views', 'Bazaar shopping', 'Royal stays'],
    themes: ['heritage', 'food', 'culture', 'premium', 'romantic'],
    summary: 'Strong heritage city with palaces, colorful bazaars, and polished stay options.',
    specialityFoods: ['Dal baati churma', 'Laal maas', 'Makhaniya lassi'],
    thingsToDo: ['Visit one fort and one city palace block', 'Plan a bazaar walk for textiles and crafts', 'Reserve a rooftop dinner for the evening'],
    travelTips: ['Early starts work best for fort visits.', 'Keep cash or UPI handy for older markets.', 'Split heavy sightseeing with a slower cafe break in the old city.'],
    palette: ['#a4492f', '#e2a85a', '#f6d9ab'],
  },
  {
    placeId: 'demo-udaipur',
    slug: 'udaipur',
    name: 'Udaipur',
    city: 'Udaipur',
    state: 'Rajasthan',
    latitude: 24.5854,
    longitude: 73.7125,
    googleRating: 4.7,
    googleReviewCount: 15400,
    tags: ['Lake views', 'Romantic stay', 'Heritage walks'],
    themes: ['romantic', 'luxury', 'heritage', 'culture', 'premium', 'peaceful'],
    summary: 'Lakeside city that fits romantic, premium, and slower culture-focused travel moods.',
    specialityFoods: ['Rajasthani thali', 'Gatte ki sabzi', 'Lakeside continental dining'],
    thingsToDo: ['Take a sunset boat ride', 'Spend time in the old city lanes', 'Book one rooftop dinner with lake views'],
    travelTips: ['Lake-view rooms are worth booking early if romance matters.', 'Sunset slots are the busiest around the water.', 'Keep one half-day open for an unplanned slow city wander.'],
    palette: ['#335c76', '#d8a55d', '#eed9b0'],
  },
  {
    placeId: 'demo-kochi',
    slug: 'kochi',
    name: 'Kochi',
    city: 'Kochi',
    state: 'Kerala',
    latitude: 9.9312,
    longitude: 76.2673,
    googleRating: 4.5,
    googleReviewCount: 17800,
    tags: ['Backwaters', 'Seafood', 'Culture district'],
    themes: ['food', 'culture', 'coastal', 'peaceful', 'premium'],
    summary: 'Culture-heavy coastal city with seafood, heritage lanes, and a slower waterside feel.',
    specialityFoods: ['Kerala seafood meals', 'Appam with stew', 'Banana chips and local snacks'],
    thingsToDo: ['Walk Fort Kochi and art spaces', 'Plan a backwater or harbor-side outing', 'Reserve one seafood meal near the waterfront'],
    travelTips: ['Humidity rises quickly, so keep daytime plans light.', 'Auto and cab hops are easier than packing every stop into one walk.', 'Pair culture spots with one waterside sunset block.'],
    palette: ['#1d5668', '#b2792e', '#d7d1aa'],
  },
  {
    placeId: 'demo-manali',
    slug: 'manali',
    name: 'Manali',
    city: 'Manali',
    state: 'Himachal Pradesh',
    latitude: 32.2432,
    longitude: 77.1892,
    googleRating: 4.6,
    googleReviewCount: 24800,
    tags: ['Snow trails', 'Adventure', 'Valley stays'],
    themes: ['mountain', 'adventure', 'romantic', 'premium', 'cool', 'scenic'],
    summary: 'High-energy hill destination for mountain views, cozy stays, and active outdoor plans.',
    specialityFoods: ['Himachali dham plates', 'Cafe breakfasts', 'Hot chocolate and bakery stops'],
    thingsToDo: ['Keep one full day for valley viewpoints', 'Use a second day for cafes and short hikes', 'Book one adventure activity if weather is clear'],
    travelTips: ['Mountain travel buffers matter, so keep margins in the plan.', 'Layers and sturdy shoes improve the experience immediately.', 'Choose a stay near your main activity cluster to cut local travel time.'],
    palette: ['#23485b', '#a2c4d4', '#f0c26f'],
  },
];

function buildManualDestination(input = {}) {
  const name = titleCase(input.name || input.city || 'Destination');
  const state = titleCase(input.state || defaultOrigin.state);
  const city = titleCase(input.city || name);
  const themes = normalizeThemes(input.themes || ['culture', 'peaceful']);
  const tags = uniqueStrings(input.tags || [state, 'India only', 'Sentivago']).slice(0, 6);
  const summary =
    String(input.summary || '').trim() ||
    `${name} works well for ${themes.slice(0, 2).join(' and ')} trips with ${tags.slice(0, 2).join(' and ').toLowerCase()}.`;
  const bestSeason = input.bestSeason ? `Best season: ${input.bestSeason}.` : 'Best season varies with weather and crowd preference.';

  return {
    placeId: String(input.placeId || `manual-${slugify(name)}`).trim().toLowerCase(),
    slug: slugify(input.slug || name),
    name,
    city,
    state,
    latitude: Number(input.latitude) || defaultOrigin.latitude,
    longitude: Number(input.longitude) || defaultOrigin.longitude,
    googleRating: clamp(Number(input.googleRating || input.ratingHint || 4.5) || 4.5, 4.1, 4.9),
    googleReviewCount: Math.max(0, Math.round(Number(input.googleReviewCount || input.reviewCountHint || 11800) || 11800)),
    tags,
    themes,
    summary,
    specialityFoods: uniqueStrings(
      input.specialityFoods || ['Regional comfort meals', 'A signature local sweet or snack', 'One strong cafe or market stop']
    ).slice(0, 5),
    thingsToDo: uniqueStrings(
      input.thingsToDo || ['See the main highlight', 'Keep one slow block for food and walking', 'Plan one sunset or scenic stop']
    ).slice(0, 6),
    travelTips: uniqueStrings(
      input.travelTips || [
        bestSeason,
        input.tip || 'Keep one flexible block for local exploration.',
        'Stay near your main activity zone to reduce local transfers.',
      ]
    ).slice(0, 6),
    palette: Array.isArray(input.palette) && input.palette.length >= 2 ? input.palette : pickPalette(`${name}:${state}`),
  };
}

const manualDestinationSeeds = [
  { name: 'Shimla', state: 'Himachal Pradesh', latitude: 31.1048, longitude: 77.1734, tags: ['Mall Road', 'Colonial views', 'Cool weather'], themes: ['mountain', 'cool', 'peaceful', 'weekend'], bestSeason: 'March to June and October to December', specialityFoods: ['Siddu breads', 'Cafe brunches', 'Hot gulab jamun'], thingsToDo: ['Walk the Ridge and Mall Road', 'Visit Kufri or nearby viewpoints', 'Keep one evening for cozy cafes'] },
  { name: 'McLeodganj', city: 'Mcleodganj', state: 'Himachal Pradesh', latitude: 32.2426, longitude: 76.3219, tags: ['Monasteries', 'Cafes', 'Tibetan culture'], themes: ['mountain', 'spiritual', 'peaceful', 'cool'], bestSeason: 'March to June and September to November', specialityFoods: ['Tibetan momos', 'Thenthuk bowls', 'Bakery cafe treats'], thingsToDo: ['Visit Tsuglagkhang complex', 'Walk to Bhagsu or Dharamkot', 'Spend a slow evening in Tibetan cafes'] },
  { name: 'Kasol', state: 'Himachal Pradesh', latitude: 32.0094, longitude: 77.3142, tags: ['Parvati Valley', 'Cafe stays', 'Pine views'], themes: ['mountain', 'peaceful', 'food', 'budget'], bestSeason: 'April to June and September to November', specialityFoods: ['Israeli cafe plates', 'Wood-fired pizzas', 'Riverside breakfast stops'], thingsToDo: ['Walk beside the Parvati river', 'Take a short village trail', 'Keep one slow cafe-heavy day'] },
  { name: 'Spiti Valley', city: 'Kaza', state: 'Himachal Pradesh', latitude: 32.223, longitude: 78.0618, tags: ['High-altitude views', 'Monasteries', 'Road-trip escape'], themes: ['mountain', 'adventure', 'cool', 'scenic'], bestSeason: 'May to October', specialityFoods: ['Butter tea', 'Thukpa bowls', 'Simple mountain meals'], thingsToDo: ['Drive to key monasteries and villages', 'Watch the night sky in clear weather', 'Plan one scenic stop-heavy day'] },
  { name: 'Nainital', state: 'Uttarakhand', latitude: 29.3803, longitude: 79.4636, tags: ['Lake town', 'Boat rides', 'Weekend hill stay'], themes: ['mountain', 'romantic', 'peaceful', 'weekend'], bestSeason: 'March to June and October to December', specialityFoods: ['Bal mithai', 'North Indian hill meals', 'Lakeside cafe snacks'], thingsToDo: ['Take a lake boat ride', 'Use the ropeway or viewpoint stops', 'Keep one market walk in the evening'] },
  { name: 'Mussoorie', state: 'Uttarakhand', latitude: 30.4598, longitude: 78.0644, tags: ['Hillside promenade', 'Viewpoints', 'Easy escape'], themes: ['mountain', 'cool', 'peaceful', 'weekend'], bestSeason: 'March to June and September to November', specialityFoods: ['Bakery treats', 'Cafe breakfasts', 'Street-side corn and snacks'], thingsToDo: ['Walk Camel’s Back Road', 'Visit one high viewpoint', 'Spend an evening near Mall Road'] },
  { name: 'Auli', state: 'Uttarakhand', latitude: 30.5285, longitude: 79.5644, tags: ['Snow slopes', 'Cable car', 'Peak views'], themes: ['mountain', 'adventure', 'cool', 'scenic'], bestSeason: 'December to March and April', specialityFoods: ['Simple Garhwali meals', 'Mountain tea breaks', 'Warm comfort food'], thingsToDo: ['Ride the ropeway if available', 'Keep a morning for snow views', 'Pair Auli with Joshimath transfers'] },
  { name: 'Leh', state: 'Ladakh', latitude: 34.1526, longitude: 77.5771, tags: ['Monasteries', 'High-altitude roads', 'Desert mountains'], themes: ['mountain', 'adventure', 'cool', 'scenic'], bestSeason: 'May to September', specialityFoods: ['Skyu and thukpa', 'Apricot snacks', 'Cafe breakfasts'], thingsToDo: ['Visit monasteries and palace viewpoints', 'Use one day for acclimatized local exploration', 'Plan a scenic drive outside Leh'] },
  { name: 'Srinagar', state: 'Jammu and Kashmir', latitude: 34.0837, longitude: 74.7973, tags: ['Dal Lake', 'Houseboats', 'Garden views'], themes: ['romantic', 'peaceful', 'cool', 'scenic'], bestSeason: 'April to October', specialityFoods: ['Kahwa tea', 'Wazwan dishes', 'Bakery breads'], thingsToDo: ['Take a shikara ride', 'Visit Mughal gardens', 'Keep one market and lakeside evening'] },
  { name: 'Gulmarg', state: 'Jammu and Kashmir', latitude: 34.0484, longitude: 74.3805, tags: ['Snow meadows', 'Cable car', 'Winter views'], themes: ['mountain', 'adventure', 'cool', 'romantic'], bestSeason: 'December to March and May to July', specialityFoods: ['Kahwa tea', 'Kashmiri pulao', 'Warm mountain meals'], thingsToDo: ['Ride the gondola', 'Keep one snow or meadow block', 'Book scenic stays early in season'] },
  { name: 'Pahalgam', state: 'Jammu and Kashmir', latitude: 34.0159, longitude: 75.318, tags: ['River valley', 'Meadows', 'Slow stay'], themes: ['mountain', 'peaceful', 'romantic', 'scenic'], bestSeason: 'April to October', specialityFoods: ['Kashmiri rogan dishes', 'Tea-house snacks', 'Local breads'], thingsToDo: ['Spend a slow day near the river', 'Take one meadow or valley outing', 'Keep the plan light and scenic'] },
  { name: 'Gangtok', state: 'Sikkim', latitude: 27.3389, longitude: 88.6065, tags: ['Monasteries', 'Mountain town', 'Cafe stops'], themes: ['mountain', 'cool', 'peaceful', 'food'], bestSeason: 'March to June and October to December', specialityFoods: ['Momos and thukpa', 'Sikkimese rice dishes', 'Cafe desserts'], thingsToDo: ['Visit Rumtek or town monasteries', 'Take a slow MG Marg evening', 'Plan one scenic road trip'] },
  { name: 'Pelling', state: 'Sikkim', latitude: 27.3013, longitude: 88.2359, tags: ['Kanchenjunga views', 'Quiet stay', 'Monastery circuit'], themes: ['mountain', 'peaceful', 'cool', 'scenic'], bestSeason: 'March to May and October to December', specialityFoods: ['Momos and noodle bowls', 'Simple hill meals', 'Warm tea stops'], thingsToDo: ['Watch sunrise mountain views', 'Visit monasteries and skywalks', 'Keep the pace intentionally slow'] },
  { name: 'Tawang', state: 'Arunachal Pradesh', latitude: 27.5866, longitude: 91.8639, tags: ['Monastery town', 'High-altitude roads', 'Prayer flags'], themes: ['mountain', 'spiritual', 'cool', 'scenic'], bestSeason: 'March to May and September to November', specialityFoods: ['Thukpa bowls', 'Butter tea', 'Momo platters'], thingsToDo: ['Visit Tawang Monastery', 'Use one day for lakes or passes', 'Keep transfer buffers wide'] },
  { name: 'Kaziranga', state: 'Assam', latitude: 26.5775, longitude: 93.1711, tags: ['Safari', 'Rhino reserve', 'Wildlife stay'], themes: ['adventure', 'nature', 'weekend', 'scenic'], bestSeason: 'November to April', specialityFoods: ['Assamese thali', 'Tea garden snacks', 'Fish curry plates'], thingsToDo: ['Book a safari slot early', 'Keep one slow lodge afternoon', 'Add a tea-garden stop if practical'] },
  { name: 'Ziro Valley', city: 'Ziro', state: 'Arunachal Pradesh', latitude: 27.5883, longitude: 93.8286, tags: ['Valley farms', 'Pine ridges', 'Slow travel'], themes: ['mountain', 'peaceful', 'cool', 'nature'], bestSeason: 'March to May and September to November', specialityFoods: ['Local rice meals', 'Smoked meats', 'Warm tea breaks'], thingsToDo: ['Walk through village clusters', 'Keep time for valley viewpoints', 'Stay for a slower nature-led plan'] },
  { name: 'Varanasi', state: 'Uttar Pradesh', latitude: 25.3176, longitude: 82.9739, tags: ['Ghats', 'Temple city', 'Spiritual rituals'], themes: ['spiritual', 'heritage', 'food', 'culture'], bestSeason: 'October to March', specialityFoods: ['Kachori sabzi', 'Banarasi paan', 'Malaiyyo in season'], thingsToDo: ['Watch the evening aarti', 'Take a sunrise boat ride', 'Walk narrow lanes for food and temples'] },
  { name: 'Amritsar', state: 'Punjab', latitude: 31.634, longitude: 74.8723, tags: ['Golden Temple', 'Punjabi food', 'Heritage city'], themes: ['heritage', 'food', 'spiritual', 'culture'], bestSeason: 'October to March', specialityFoods: ['Amritsari kulcha', 'Lassi stops', 'Langar meal'], thingsToDo: ['Visit the Golden Temple at different hours', 'Plan one food-heavy market walk', 'Pair the day with Jallianwala Bagh and old city lanes'] },
  { name: 'Jodhpur', state: 'Rajasthan', latitude: 26.2389, longitude: 73.0243, tags: ['Blue lanes', 'Fort views', 'Desert city'], themes: ['heritage', 'food', 'culture', 'romantic'], bestSeason: 'October to March', specialityFoods: ['Mirchi vada', 'Makhaniya lassi', 'Rajasthani thali'], thingsToDo: ['Spend time at Mehrangarh Fort', 'Walk the blue city lanes', 'Keep one rooftop dinner for the evening'] },
  { name: 'Jaisalmer', state: 'Rajasthan', latitude: 26.9157, longitude: 70.9083, tags: ['Golden fort', 'Desert camp', 'Sunset dunes'], themes: ['heritage', 'adventure', 'romantic', 'scenic'], bestSeason: 'October to February', specialityFoods: ['Ker sangri dishes', 'Rajasthani sweets', 'Camp dinner spreads'], thingsToDo: ['Explore the fort and old lanes', 'Plan a desert sunset experience', 'Keep one evening for folk-performance ambiance'] },
  { name: 'Pushkar', state: 'Rajasthan', latitude: 26.4898, longitude: 74.5511, tags: ['Lake ghats', 'Boho cafes', 'Temple town'], themes: ['spiritual', 'food', 'peaceful', 'budget'], bestSeason: 'October to March', specialityFoods: ['Falafel cafe plates', 'Rajasthani snacks', 'Lassi and sweets'], thingsToDo: ['Walk the ghats slowly', 'Use one cafe-hopping evening', 'Visit the temple and market lanes'] },
  { name: 'Mount Abu', state: 'Rajasthan', latitude: 24.5926, longitude: 72.7156, tags: ['Hill station', 'Lake promenade', 'Temple stop'], themes: ['mountain', 'peaceful', 'romantic', 'weekend'], bestSeason: 'October to March and July to September', specialityFoods: ['Rajasthani meals', 'Street-side corn', 'Cafe snacks'], thingsToDo: ['Visit Nakki Lake', 'Plan one scenic viewpoint block', 'Keep the pace easy and walkable'] },
  { name: 'Ranthambore', city: 'Sawai Madhopur', state: 'Rajasthan', latitude: 26.0173, longitude: 76.5026, tags: ['Tiger reserve', 'Safari stay', 'Wildlife trip'], themes: ['adventure', 'nature', 'weekend', 'scenic'], bestSeason: 'October to April', specialityFoods: ['Rajasthani thali', 'Resort breakfasts', 'Simple local snacks'], thingsToDo: ['Book safari windows in advance', 'Leave midday for a slower lodge break', 'Use one fort viewpoint if time allows'] },
  { name: 'Ahmedabad', state: 'Gujarat', latitude: 23.0225, longitude: 72.5714, tags: ['Pol houses', 'Street food', 'Riverfront'], themes: ['heritage', 'food', 'culture', 'social'], bestSeason: 'November to February', specialityFoods: ['Gujarati thali', 'Khaman and fafda', 'Kulfi and snacks'], thingsToDo: ['Walk the old pol districts', 'Spend an evening at the riverfront', 'Keep one food-focused market stop'] },
  { name: 'Great Rann of Kutch', city: 'Kutch', state: 'Gujarat', latitude: 23.7337, longitude: 69.8597, tags: ['White desert', 'Craft villages', 'Festival vibe'], themes: ['adventure', 'scenic', 'culture', 'weekend'], bestSeason: 'November to February', specialityFoods: ['Kutchi dabeli', 'Gujarati thali', 'Festival food stalls'], thingsToDo: ['Visit the white desert at sunset', 'Plan one artisan village stop', 'Book stays early during festival dates'] },
  { name: 'Lonavala', state: 'Maharashtra', latitude: 18.7546, longitude: 73.4062, tags: ['Monsoon hills', 'Quick getaway', 'Viewpoint drives'], themes: ['mountain', 'weekend', 'peaceful', 'budget'], bestSeason: 'June to September and October', specialityFoods: ['Chikki sweets', 'Vada pav', 'Roadside chai stops'], thingsToDo: ['Drive to top viewpoints', 'Keep one rainy cafe break', 'Stay close to the main ridge roads'] },
  { name: 'Alibaug', state: 'Maharashtra', latitude: 18.6414, longitude: 72.8722, tags: ['Beach weekend', 'Sea breeze', 'Mumbai escape'], themes: ['beach', 'weekend', 'peaceful', 'romantic'], bestSeason: 'November to March', specialityFoods: ['Seafood thali', 'Konkani curries', 'Beachside snacks'], thingsToDo: ['Use one day for beach hopping', 'Keep one sunset waterfront dinner', 'Choose a stay close to your preferred beach cluster'] },
  { name: 'Hampi', state: 'Karnataka', latitude: 15.335, longitude: 76.46, tags: ['Ruins', 'Boulder landscape', 'Sunrise points'], themes: ['heritage', 'adventure', 'culture', 'scenic'], bestSeason: 'October to February', specialityFoods: ['South Indian breakfasts', 'Cafe bowls', 'Fresh juice stops'], thingsToDo: ['See the main temple and ruin clusters', 'Plan one sunrise or sunset point', 'Use a coracle or river-side slow block'] },
  { name: 'Mysuru', city: 'Mysore', state: 'Karnataka', latitude: 12.2958, longitude: 76.6394, tags: ['Palace city', 'Silk and sweets', 'Clean boulevards'], themes: ['heritage', 'food', 'culture', 'family'], bestSeason: 'October to March', specialityFoods: ['Mysore pak', 'Dosa breakfasts', 'South Indian thali'], thingsToDo: ['Visit Mysore Palace', 'Add Chamundi or museum time', 'Keep one evening for markets and sweets'] },
  { name: 'Coorg', city: 'Madikeri', state: 'Karnataka', latitude: 12.4244, longitude: 75.7382, tags: ['Coffee estates', 'Mist mornings', 'Plantation stays'], themes: ['mountain', 'peaceful', 'romantic', 'nature'], bestSeason: 'October to March and monsoon for greenery', specialityFoods: ['Kodava meals', 'Coffee tastings', 'Pepper-rich local dishes'], thingsToDo: ['Visit coffee estates and viewpoints', 'Keep one slow plantation morning', 'Pair scenic drives with shorter local stops'] },
  { name: 'Munnar', state: 'Kerala', latitude: 10.0889, longitude: 77.0595, tags: ['Tea slopes', 'Cool weather', 'Scenic roads'], themes: ['mountain', 'romantic', 'cool', 'scenic'], bestSeason: 'September to March', specialityFoods: ['Kerala curries', 'Tea estate snacks', 'Fresh bakery stops'], thingsToDo: ['See tea estate viewpoints', 'Use one morning for a scenic drive', 'Keep the second half slow and mist-friendly'] },
  { name: 'Alleppey', city: 'Alappuzha', state: 'Kerala', latitude: 9.4981, longitude: 76.3388, tags: ['Backwaters', 'Houseboats', 'Slow water escape'], themes: ['beach', 'peaceful', 'romantic', 'scenic'], bestSeason: 'October to March', specialityFoods: ['Kerala seafood meals', 'Appam with stew', 'Toddy-shop style dishes'], thingsToDo: ['Plan a backwater cruise or stay', 'Keep one canal-side slow block', 'Pair sunsets with waterside dining'] },
  { name: 'Varkala', state: 'Kerala', latitude: 8.7379, longitude: 76.7163, tags: ['Cliff beach', 'Cafe views', 'Sunset walks'], themes: ['beach', 'romantic', 'food', 'peaceful'], bestSeason: 'November to March', specialityFoods: ['Seafood grills', 'Cafe breakfasts', 'Kerala thali'], thingsToDo: ['Walk the cliffside stretch', 'Keep one beach-and-cafe day', 'Watch sunset from the main promenade'] },
  { name: 'Kovalam', state: 'Kerala', latitude: 8.4004, longitude: 76.9784, tags: ['Beach cove', 'Wellness stay', 'Sea-facing resorts'], themes: ['beach', 'wellness', 'romantic', 'premium'], bestSeason: 'November to March', specialityFoods: ['Seafood platters', 'Coconut-rich curries', 'Fresh fruit breakfasts'], thingsToDo: ['Spend a full day across the beaches', 'Keep one spa or wellness block', 'Choose a stay near your preferred beach cove'] },
  { name: 'Kodaikanal', state: 'Tamil Nadu', latitude: 10.2381, longitude: 77.4892, tags: ['Lake town', 'Pine forests', 'Cool retreat'], themes: ['mountain', 'romantic', 'cool', 'peaceful'], bestSeason: 'September to June', specialityFoods: ['Homestyle Tamil meals', 'Bakery snacks', 'Hot chocolate stops'], thingsToDo: ['Take a lake walk or boat ride', 'Visit pine or viewpoint stops', 'Keep one slow cafe-heavy afternoon'] },
  { name: 'Ooty', state: 'Tamil Nadu', latitude: 11.4064, longitude: 76.6932, tags: ['Toy train', 'Tea gardens', 'Colonial hill stay'], themes: ['mountain', 'cool', 'romantic', 'family'], bestSeason: 'October to June', specialityFoods: ['Tea and chocolates', 'South Indian breakfasts', 'Warm bakery treats'], thingsToDo: ['Ride the toy train if practical', 'Visit tea or garden viewpoints', 'Spend one evening around the central market area'] },
  { name: 'Puducherry', city: 'Puducherry', state: 'Puducherry', latitude: 11.9416, longitude: 79.8083, tags: ['French quarter', 'Sea promenade', 'Cafe culture'], themes: ['beach', 'food', 'romantic', 'culture'], bestSeason: 'October to March', specialityFoods: ['French-Tamil cafe dishes', 'Seafood plates', 'Desserts and coffee'], thingsToDo: ['Walk the French quarter', 'Use one sunrise or sunset promenade block', 'Keep one cafe-focused slow afternoon'] },
  { name: 'Mahabalipuram', state: 'Tamil Nadu', latitude: 12.6269, longitude: 80.192, tags: ['Shore temple', 'Stone heritage', 'Coastal stop'], themes: ['heritage', 'beach', 'culture', 'weekend'], bestSeason: 'November to February', specialityFoods: ['Seafood curries', 'South Indian breakfasts', 'Coconut snacks'], thingsToDo: ['See the Shore Temple and carvings', 'Keep one beachside meal stop', 'Pair heritage with an easy coastal evening'] },
  { name: 'Madurai', state: 'Tamil Nadu', latitude: 9.9252, longitude: 78.1198, tags: ['Temple city', 'Night food', 'Heritage core'], themes: ['heritage', 'food', 'spiritual', 'culture'], bestSeason: 'October to March', specialityFoods: ['Jigarthanda', 'Parotta and curries', 'Temple-street snacks'], thingsToDo: ['Visit Meenakshi Temple at varied hours', 'Keep one food crawl in the evening', 'Use the old city lanes for slower exploration'] },
  { name: 'Rameswaram', state: 'Tamil Nadu', latitude: 9.2876, longitude: 79.3129, tags: ['Island temples', 'Sea bridges', 'Pilgrimage route'], themes: ['spiritual', 'beach', 'peaceful', 'heritage'], bestSeason: 'October to April', specialityFoods: ['South Indian meals', 'Seafood plates', 'Simple tiffin stops'], thingsToDo: ['Visit Ramanathaswamy Temple', 'See Pamban Bridge views', 'Keep the plan slow and climate-aware'] },
  { name: 'Gokarna', state: 'Karnataka', latitude: 14.5479, longitude: 74.3188, tags: ['Beach trek', 'Temple town', 'Calm coast'], themes: ['beach', 'peaceful', 'budget', 'romantic'], bestSeason: 'November to March', specialityFoods: ['Seafood curries', 'Cafe breakfasts', 'South Indian thali'], thingsToDo: ['Do a short beach-hopping route', 'Use one sunset cafe block', 'Stay light and mostly walkable if possible'] },
  { name: 'Havelock Island', city: 'Swaraj Dweep', state: 'Andaman and Nicobar Islands', latitude: 11.9675, longitude: 92.9956, tags: ['Blue water', 'Island stay', 'Tropical beaches'], themes: ['beach', 'romantic', 'premium', 'scenic'], bestSeason: 'November to April', specialityFoods: ['Fresh seafood grills', 'Island cafe meals', 'Tropical fruit breakfasts'], thingsToDo: ['Plan a full beach day', 'Keep one sunrise or snorkel block', 'Stay near your main beach to cut transfers'] },
  { name: 'Khajuraho', state: 'Madhya Pradesh', latitude: 24.8318, longitude: 79.9199, tags: ['Temple art', 'Heritage circuit', 'Stone carvings'], themes: ['heritage', 'culture', 'romantic', 'weekend'], bestSeason: 'October to March', specialityFoods: ['Bundelkhand meals', 'Simple local sweets', 'Comfort thalis'], thingsToDo: ['See the main temple clusters', 'Keep one light evening sound-and-light plan', 'Pair heritage walks with a slower meal stop'] },
  { name: 'Orchha', state: 'Madhya Pradesh', latitude: 25.351, longitude: 78.6403, tags: ['Palaces', 'Riverfront cenotaphs', 'Quiet heritage'], themes: ['heritage', 'peaceful', 'romantic', 'culture'], bestSeason: 'October to March', specialityFoods: ['Bundeli meals', 'Local sweets', 'Street-side tea stops'], thingsToDo: ['Walk the fort-palace complex', 'Keep one riverfront sunset block', 'Enjoy the slower heritage pace'] },
  { name: 'Pachmarhi', state: 'Madhya Pradesh', latitude: 22.4674, longitude: 78.4347, tags: ['Satpura hills', 'Waterfalls', 'Forest retreat'], themes: ['mountain', 'peaceful', 'nature', 'weekend'], bestSeason: 'October to March and monsoon for greenery', specialityFoods: ['Simple hill meals', 'Tea and snacks', 'Local thali'], thingsToDo: ['See the main viewpoints and falls', 'Keep one easy forest-heavy day', 'Avoid overpacking the daily route'] },
];

const baseDestinations = [
  ...featuredDestinations,
  ...manualDestinationSeeds.map((seed) => buildManualDestination(seed)),
];

const destinations = baseDestinations.map((destination) =>
  buildGeneratedDestinationRecord({
    ...destination,
    source: 'catalog',
  })
);

function listDestinations() {
  return destinations.map(cloneDestination);
}

function buildFallbackDestination(context = {}) {
  const fallbackName = String(context.name || context.fallbackName || context.slug || 'Destination')
    .replace(/-/g, ' ')
    .trim();

  return buildGeneratedDestinationRecord({
    placeId: context.placeId || `fallback-${slugify(fallbackName || 'destination')}`,
    slug: context.slug || slugify(fallbackName || 'destination'),
    name: fallbackName,
    city: context.city || fallbackName,
    state: context.state || context.fallbackState || defaultOrigin.state,
    latitude: context.latitude,
    longitude: context.longitude,
    tags: context.tags || ['Custom destination', 'Fallback data', 'Demo mode'],
    themes: context.themes || ['culture', 'peaceful'],
    summary:
      context.summary ||
      `${titleCase(fallbackName || 'This destination')} is shown using generated fallback data so Sentivago still stays usable without live enrichment.`,
    specialityFoods: context.specialityFoods || ['Regional snacks', 'Popular local meals', 'A central market food stop'],
    thingsToDo: context.thingsToDo || ['Explore the main local landmark', 'Keep time for one scenic walk', 'Try a locally popular food spot'],
    travelTips:
      context.travelTips || ['This page is using generated fallback content.', 'Replace this destination with a real place ID for live enrichment later.', 'Core navigation still works without third-party APIs.'],
    source: 'fallback',
    isFallback: true,
    dynamic: true,
  });
}

function findDestination(context = {}) {
  const normalizedSlug = slugify(context.slug || '');
  const normalizedPlaceId = String(context.placeId || '').trim().toLowerCase();
  const normalizedName = titleCase(
    String(context.name || context.fallbackName || '')
      .replace(/-/g, ' ')
      .trim()
  );

  const destination = destinations.find((item) => {
    if (normalizedPlaceId && item.placeId === normalizedPlaceId) return true;
    if (normalizedSlug && item.slug === normalizedSlug) return true;
    if (normalizedName && item.name === normalizedName) return true;
    return false;
  });

  if (destination) {
    return cloneDestination(destination);
  }

  const generated = findGeneratedDestination(context);
  if (generated) {
    return generated;
  }

  return buildFallbackDestination(context);
}

module.exports = {
  buildGeneratedDestinationRecord,
  findDestination,
  listDestinations,
  rememberGeneratedDestinations,
};
