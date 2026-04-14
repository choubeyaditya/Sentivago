function pickSeason(monthIndex) {
  if ([2, 3, 4].includes(monthIndex)) return 'spring';
  if ([5, 6, 7].includes(monthIndex)) return 'monsoon';
  if ([8, 9].includes(monthIndex)) return 'post-monsoon';
  if ([10, 11, 0].includes(monthIndex)) return 'winter';
  return 'summer';
}

function buildFallbackWeather(latitude, longitude) {
  const monthIndex = new Date().getMonth();
  const season = pickSeason(monthIndex);
  const lat = Number(latitude) || 0;
  const lng = Number(longitude) || 0;

  let condition = 'Pleasant';
  let summary = 'Comfortable sightseeing weather.';
  let temperatureC = 24;

  if (lat >= 28) {
    condition = season === 'winter' ? 'Cold and clear' : 'Cool mountain weather';
    summary =
      season === 'winter'
        ? 'Crisp air with cold mornings, so layers are helpful.'
        : 'Cooler temperatures with a mountain feel through most of the day.';
    temperatureC = season === 'winter' ? 11 : 18;
  } else if (lat <= 16 && lng <= 77) {
    condition = season === 'monsoon' ? 'Humid with showers' : 'Warm coastal weather';
    summary =
      season === 'monsoon'
        ? 'Expect humidity and passing showers, especially later in the day.'
        : 'Warm, breezy coastal conditions that suit morning and sunset plans best.';
    temperatureC = season === 'monsoon' ? 28 : 30;
  } else if (season === 'monsoon') {
    condition = 'Cloudy with passing showers';
    summary = 'Rain windows can shift outdoor timing, so flexible plans work better.';
    temperatureC = 26;
  } else if (season === 'winter') {
    condition = 'Mild and sunny';
    summary = 'Good sightseeing weather with comfortable daytime conditions.';
    temperatureC = 22;
  }

  return {
    condition,
    summary,
    temperatureC,
    source: 'deterministic-fallback',
    updatedAt: new Date().toISOString(),
  };
}

async function getOpenWeather(latitude, longitude) {
  const key = process.env.OPENWEATHER_API_KEY;
  if (!key || key.startsWith('REPLACE_')) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);

  try {
    const url = new URL('https://api.openweathermap.org/data/2.5/weather');
    url.searchParams.set('lat', String(latitude));
    url.searchParams.set('lon', String(longitude));
    url.searchParams.set('appid', key);
    url.searchParams.set('units', 'metric');

    const response = await fetch(url, {
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`OpenWeather responded with ${response.status}`);
    }

    const data = await response.json();
    const condition = data.weather?.[0]?.main || 'Weather unavailable';
    const description = data.weather?.[0]?.description || condition;
    const temperatureC = Number(data.main?.temp);
    const feelsLike = Number(data.main?.feels_like);

    return {
      condition,
      summary: `${description} around ${Math.round(temperatureC || 0)}C${Number.isFinite(feelsLike) ? `, feels like ${Math.round(feelsLike)}C` : ''}.`,
      temperatureC: Number.isFinite(temperatureC) ? temperatureC : null,
      humidity: Number.isFinite(Number(data.main?.humidity)) ? Number(data.main.humidity) : null,
      windSpeedMs: Number.isFinite(Number(data.wind?.speed)) ? Number(data.wind.speed) : null,
      source: 'openweather',
      updatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.warn(`Weather fallback used. ${error.message}`);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function getCurrentWeather(latitude, longitude) {
  const liveWeather = await getOpenWeather(latitude, longitude);
  return liveWeather || buildFallbackWeather(latitude, longitude);
}

module.exports = {
  getCurrentWeather,
};
