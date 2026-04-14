export const defaultOrigin = {
  city: 'Kolkata',
  state: 'West Bengal',
  latitude: 22.5726,
  longitude: 88.3639,
  sourceType: 'default',
};

const STORAGE_KEY = 'smart-tourism-origin';

export function saveOrigin(origin) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(origin));
}

export function loadOrigin() {
  if (typeof window === 'undefined') {
    return defaultOrigin;
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return defaultOrigin;

  try {
    return {
      ...defaultOrigin,
      ...JSON.parse(raw),
    };
  } catch {
    return defaultOrigin;
  }
}
