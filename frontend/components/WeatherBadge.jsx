function pickWeatherVisual(condition = '') {
  const text = String(condition || '').toLowerCase();

  if (text.includes('rain') || text.includes('shower') || text.includes('storm')) {
    return { icon: '☔', tone: 'rain' };
  }

  if (text.includes('cloud') || text.includes('mist') || text.includes('fog') || text.includes('haze')) {
    return { icon: '☁', tone: 'cloud' };
  }

  if (text.includes('snow') || text.includes('cold')) {
    return { icon: '❄', tone: 'snow' };
  }

  if (text.includes('wind')) {
    return { icon: '🌀', tone: 'wind' };
  }

  return { icon: '☀', tone: 'sun' };
}

export default function WeatherBadge({ weather, variant = 'chip' }) {
  const temperatureC = Number(weather?.temperatureC);
  const condition = weather?.condition || 'Weather unavailable';
  const summary = weather?.summary || 'Live weather is unavailable right now.';
  const displayTemp = Number.isFinite(temperatureC) ? `${Math.round(temperatureC)}C` : '--';
  const visual = pickWeatherVisual(condition);

  return (
    <div
      className={`weather-badge weather-badge-${variant} weather-tone-${visual.tone}`}
      title={summary}
    >
      <div className="weather-badge-icon-shell" aria-hidden="true">
        <span className="weather-badge-orbit" />
        <span className="weather-badge-icon">{visual.icon}</span>
      </div>

      <div className="weather-badge-copy">
        <strong>{displayTemp}</strong>
        <span>{condition}</span>
        {variant !== 'chip' ? <p>{summary}</p> : null}
      </div>
    </div>
  );
}
