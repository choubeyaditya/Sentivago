'use client';

const WIKIPEDIA_API = 'https://en.wikipedia.org/w/api.php';
const photoCache = new Map();

const blockedFilePatterns = [
  /commons-logo/i,
  /wikipedia-logo/i,
  /wikimedia/i,
  /flag of/i,
  /locator map/i,
  /location map/i,
  /\bmap\b/i,
  /district map/i,
  /route map/i,
  /\blogo\b/i,
  /\bemblem\b/i,
  /\bseal\b/i,
  /\bicon\b/i,
  /coat of arms/i,
  /railway/i,
  /airport/i,
  /svg$/i,
  /webm$/i,
  /pdf$/i,
];

function unique(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function isUsefulFileTitle(title = '') {
  const normalized = String(title || '').trim();
  if (!normalized) return false;

  return !blockedFilePatterns.some((pattern) => pattern.test(normalized));
}

function buildUrl(params = {}) {
  const url = new URL(WIKIPEDIA_API);

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    url.searchParams.set(key, String(value));
  });

  return url.toString();
}

async function request(params) {
  const response = await fetch(buildUrl(params), {
    cache: 'force-cache',
  });

  if (!response.ok) {
    throw new Error(`Wikipedia request failed with ${response.status}`);
  }

  return response.json();
}

function buildTitleCandidates(destination = {}) {
  return unique([
    destination.wikipediaTitle,
    destination.name,
    destination.city,
    destination.name && destination.state ? `${destination.name}, ${destination.state}` : null,
    destination.city && destination.state ? `${destination.city}, ${destination.state}` : null,
  ]);
}

async function getArticleMedia(title) {
  const data = await request({
    action: 'query',
    format: 'json',
    formatversion: 2,
    origin: '*',
    redirects: 1,
    titles: title,
    prop: 'images|pageimages',
    imlimit: 20,
    piprop: 'original|thumbnail',
    pithumbsize: 1600,
  });

  const page = data?.query?.pages?.[0];
  if (!page || page.missing) {
    return null;
  }

  return page;
}

async function searchArticleTitle(destination = {}) {
  const searchLine = unique([
    destination.name,
    destination.city !== destination.name ? destination.city : null,
    destination.state,
    'India',
  ]).join(' ');

  const data = await request({
    action: 'query',
    format: 'json',
    formatversion: 2,
    origin: '*',
    list: 'search',
    srnamespace: 0,
    srlimit: 1,
    srsearch: searchLine,
  });

  return data?.query?.search?.[0]?.title || null;
}

async function getImageInfos(fileTitles = []) {
  if (!fileTitles.length) return [];

  const data = await request({
    action: 'query',
    format: 'json',
    formatversion: 2,
    origin: '*',
    titles: fileTitles.join('|'),
    prop: 'imageinfo',
    iiprop: 'url|mime|size',
    iiurlwidth: 1600,
  });

  return (data?.query?.pages || [])
    .map((page) => {
      const info = page?.imageinfo?.[0];
      const imageUrl = info?.thumburl || info?.url;

      if (!page?.title || !imageUrl) return null;
      if (!info?.mime || !info.mime.startsWith('image/')) return null;
      if (info.mime === 'image/svg+xml') return null;
      if ((info.width || 0) < 720 || (info.height || 0) < 420) return null;

      return imageUrl;
    })
    .filter(Boolean);
}

async function loadDestinationPhotos(destination = {}) {
  const titleCandidates = buildTitleCandidates(destination);
  let article = null;

  for (const title of titleCandidates) {
    article = await getArticleMedia(title);
    if (article) break;
  }

  if (!article) {
    const searchedTitle = await searchArticleTitle(destination);
    if (searchedTitle) {
      article = await getArticleMedia(searchedTitle);
    }
  }

  if (!article) {
    return [];
  }

  const leadingImage = article.original?.source || article.thumbnail?.source || null;
  const fileTitles = (article.images || [])
    .map((item) => item?.title)
    .filter(isUsefulFileTitle)
    .slice(0, 12);

  const imageUrls = await getImageInfos(fileTitles);
  return unique([leadingImage, ...imageUrls]).slice(0, 4);
}

export async function fetchDestinationPhotos(destination = {}) {
  const cacheKey = String(destination.placeId || destination.slug || destination.name || '')
    .trim()
    .toLowerCase();

  if (!cacheKey) return [];

  if (!photoCache.has(cacheKey)) {
    photoCache.set(
      cacheKey,
      loadDestinationPhotos(destination).catch(() => [])
    );
  }

  return photoCache.get(cacheKey);
}
