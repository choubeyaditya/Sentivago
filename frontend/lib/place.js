function buildQuery(destination = {}) {
  const search = new URLSearchParams();

  if (destination.placeId) search.set('placeId', destination.placeId);
  if (destination.name) search.set('name', destination.name);
  if (destination.state) search.set('state', destination.state);

  const query = search.toString();
  return query ? `?${query}` : '';
}

export function buildPlaceHref(slug, destination = {}, section = '') {
  const safeSlug = encodeURIComponent(String(slug || destination.slug || '').trim());
  const basePath = section ? `/places/${safeSlug}/${section}` : `/places/${safeSlug}`;
  return `${basePath}${buildQuery(destination)}`;
}

export function readPlaceSearchParams(searchParams) {
  return {
    placeId: searchParams?.get?.('placeId') || '',
    name: searchParams?.get?.('name') || '',
    state: searchParams?.get?.('state') || '',
  };
}
