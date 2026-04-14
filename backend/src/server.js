const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { testConnection } = require('./services/db');
const { checkOllamaStatus } = require('./services/ai');
const searchRouter = require('./routes/search');
const destinationsRouter = require('./routes/destinations');
const locationRouter = require('./routes/location');

const app = express();

function hasLiveKey(value) {
  const normalized = String(value || '').trim();

  if (!normalized) return false;
  if (normalized.startsWith('REPLACE_')) return false;
  if (normalized.startsWith('YOUR_')) return false;
  if (normalized.startsWith('http://') || normalized.startsWith('https://')) return false;

  return true;
}

const allowedOrigins = (process.env.FRONTEND_ORIGIN || 'http://localhost:3000')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error('CORS blocked this origin.'));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '1mb' }));

async function sendHealth(_req, res) {
  const db = await testConnection();
  const ollama = await checkOllamaStatus();
  const openAiConfigured = hasLiveKey(process.env.OPENAI_API_KEY);
  const anthropicConfigured = hasLiveKey(process.env.ANTHROPIC_API_KEY);
  const ollamaPreferred = Boolean(process.env.OLLAMA_BASE_URL || process.env.OLLAMA_MODEL);

  res.json({
    ok: true,
    databaseConfigured: db.configured,
    databaseConnected: db.connected,
    databaseError: db.error || null,
    googleConfigured: hasLiveKey(process.env.GOOGLE_MAPS_API_KEY),
    aiConfigured: ollamaPreferred || ollama.reachable || openAiConfigured || anthropicConfigured,
    aiProvider: ollamaPreferred ? 'ollama' : openAiConfigured ? 'openai' : anthropicConfigured ? 'anthropic' : 'none',
    ollamaReachable: ollama.reachable,
    ollamaModel: ollama.model,
    ollamaModelInstalled: ollama.installed,
    weatherConfigured: hasLiveKey(process.env.OPENWEATHER_API_KEY),
    flightConfigured: hasLiveKey(process.env.AMADEUS_CLIENT_ID) && hasLiveKey(process.env.AMADEUS_CLIENT_SECRET),
    railConfigured: hasLiveKey(process.env.INDIAN_RAIL_API_KEY),
    timestamp: new Date().toISOString(),
  });
}

app.get('/api/health', sendHealth);
app.get('/health', sendHealth);

app.use('/api/search', searchRouter);
app.use('/api/recommendations', searchRouter);
app.use('/api/destinations', destinationsRouter);
app.use('/api/location', locationRouter);

const port = Number(process.env.PORT || 5001);

app.listen(port, () => {
  console.log(`Smart Tourism API running on http://localhost:${port}`);
  console.log(`Allowed frontend origins: ${allowedOrigins.join(', ')}`);
});
