function unique(values = []) {
  return [...new Set(values.map((value) => String(value || '').trim()).filter(Boolean))];
}

const SUPPORTED_SEARCH_THEMES = [
  'mountain',
  'beach',
  'spiritual',
  'food',
  'luxury',
  'budget',
  'adventure',
  'heritage',
  'peaceful',
  'cool',
  'weekend',
  'social',
  'romantic',
];

function hasLiveValue(value) {
  const normalized = String(value || '').trim();
  if (!normalized) return false;
  if (normalized.startsWith('REPLACE_')) return false;
  if (normalized.startsWith('YOUR_')) return false;
  return true;
}

function getOllamaBaseUrl() {
  return String(process.env.OLLAMA_BASE_URL || 'http://localhost:11434').trim();
}

function getOllamaModel() {
  return String(process.env.OLLAMA_MODEL || 'gemma3:4b').trim();
}

function prefersOllama() {
  return Boolean(process.env.OLLAMA_BASE_URL || process.env.OLLAMA_MODEL);
}

function extractTextContent(content) {
  if (typeof content === 'string') return content.trim();

  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === 'string') return item;
        if (item?.type === 'text') return item.text || '';
        return '';
      })
      .join('\n')
      .trim();
  }

  return '';
}

function parseJsonFromText(raw = '') {
  const text = String(raw || '').trim();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {}

  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;

  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

async function checkOllamaStatus() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1500);
  const baseUrl = getOllamaBaseUrl();
  const model = getOllamaModel();

  try {
    const response = await fetch(`${baseUrl}/api/tags`, {
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Ollama responded with ${response.status}`);
    }

    const data = await response.json();
    const installedModels = Array.isArray(data.models) ? data.models.map((item) => item?.name).filter(Boolean) : [];

    return {
      reachable: true,
      model,
      installed: installedModels.includes(model),
      installedModels,
    };
  } catch (error) {
    return {
      reachable: false,
      model,
      installed: false,
      installedModels: [],
      error: error.message,
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function requestOllamaJson({ system, user, maxTokens = 1400 }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);
  const baseUrl = getOllamaBaseUrl();
  const model = getOllamaModel();

  try {
    const response = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        system,
        prompt: user,
        format: 'json',
        stream: false,
        options: {
          temperature: 0.8,
          num_predict: maxTokens,
        },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Ollama responded with ${response.status}: ${body}`);
    }

    const data = await response.json();
    return parseJsonFromText(data.response);
  } catch (error) {
    console.warn(`Ollama fallback used. ${error.message}`);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function requestOpenAIJson({ system, user, maxTokens = 1400 }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!hasLiveValue(apiKey)) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
        temperature: 0.8,
        max_tokens: maxTokens,
        response_format: {
          type: 'json_object',
        },
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`OpenAI responded with ${response.status}`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content;
    return parseJsonFromText(text);
  } catch (error) {
    console.warn(`OpenAI fallback used. ${error.message}`);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function requestAnthropicJson({ system, user, maxTokens = 1400 }) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!hasLiveValue(apiKey)) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-latest',
        max_tokens: maxTokens,
        system,
        messages: [
          {
            role: 'user',
            content: `${user}\n\nReturn only valid JSON.`,
          },
        ],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Anthropic responded with ${response.status}`);
    }

    const data = await response.json();
    return parseJsonFromText(extractTextContent(data.content));
  } catch (error) {
    console.warn(`Anthropic fallback used. ${error.message}`);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function requestStructuredJson({ system, user, maxTokens }) {
  if (prefersOllama()) {
    return requestOllamaJson({ system, user, maxTokens });
  }

  const ollamaResult = await requestOllamaJson({ system, user, maxTokens });
  if (ollamaResult) return ollamaResult;

  const openAIResult = await requestOpenAIJson({ system, user, maxTokens });
  if (openAIResult) return openAIResult;

  return requestAnthropicJson({ system, user, maxTokens });
}

function buildGuideFallback({ destination, weatherSummary = '', tier = 'Recommended' } = {}) {
  const description = [
    `${destination.name} works well as a ${destination.summary.toLowerCase()}`,
    weatherSummary ? weatherSummary : null,
    `From the current origin, it currently sits in the ${String(tier).toLowerCase()} spend band for this demo.`,
  ]
    .filter(Boolean)
    .join(' ');

  return {
    description,
    specialityFoods: unique(destination.specialityFoods || [
      'Regional comfort meals',
      'One signature local snack',
      'A strong cafe or market stop',
    ]),
    thingsToDo: unique(destination.thingsToDo || [
      `Explore the main highlights around ${destination.name}`,
      'Reserve one slow block for food and walking',
      'Keep a weather-safe fallback indoor stop ready',
    ]),
    travelTips: unique([
      ...(destination.travelTips || []),
      weatherSummary ? `Weather note: ${weatherSummary}` : null,
      `Budget band: ${tier}. Use it as a quick planning signal, not a fixed booking quote.`,
    ]),
  };
}

function sanitizeGuidePayload(payload = {}, fallback = {}) {
  return {
    description: String(payload.description || fallback.description || '').trim() || fallback.description,
    specialityFoods: unique(payload.specialityFoods || fallback.specialityFoods || []).slice(0, 5),
    thingsToDo: unique(payload.thingsToDo || fallback.thingsToDo || []).slice(0, 6),
    travelTips: unique(payload.travelTips || fallback.travelTips || []).slice(0, 6),
  };
}

function sanitizeDestinationSuggestion(item = {}, index = 0) {
  return {
    name: String(item.name || '').trim(),
    city: String(item.city || item.name || '').trim(),
    state: String(item.state || '').trim(),
    latitude: Number(item.latitude),
    longitude: Number(item.longitude),
    summary: String(item.summary || '').trim(),
    reason: String(item.reason || item.whyItFits || '').trim(),
    tags: unique(item.tags || []).slice(0, 5),
    themes: unique(item.themes || []).map((theme) => String(theme).toLowerCase()).slice(0, 8),
    nightlyRateHint: Math.max(900, Math.round(Number(item.nightlyRateHint || 1800) || 1800)),
    ratingHint: Number(item.ratingHint || 4.4) || 4.4,
    reviewCountHint: Math.max(300, Math.round(Number(item.reviewCountHint || (1400 + index * 320)) || (1400 + index * 320))),
  };
}

function sanitizeRecommendationPayload(payload = {}) {
  const destinations = Array.isArray(payload.destinations)
    ? payload.destinations
        .map((item, index) => sanitizeDestinationSuggestion(item, index))
        .filter((item) => item.name && item.state)
    : [];

  return {
    summary: String(payload.summary || '').trim(),
    interpretation: String(payload.interpretation || '').trim(),
    destinations,
  };
}

function sanitizeIntentPayload(payload = {}) {
  return {
    summary: String(payload.summary || '').trim(),
    interpretation: String(payload.interpretation || '').trim(),
    searchPrompt: String(payload.searchPrompt || payload.searchLine || '').trim(),
    themes: unique(payload.themes || [])
      .map((theme) => String(theme || '').trim().toLowerCase())
      .filter((theme) => SUPPORTED_SEARCH_THEMES.includes(theme))
      .slice(0, 8),
  };
}

async function interpretIndianTripIntent({ mood, origin } = {}) {
  const request = String(mood || '').trim();
  if (!request) return null;

  const system = [
    'You interpret free-text travel requests for Sentivago.',
    'Sentivago only recommends destinations inside India.',
    'Return concise JSON only.',
  ].join(' ');

  const user = `
Interpret this travel request and normalize it for an India-only destination search.

Traveller request: "${request}"
Origin city: ${origin?.city || 'Unknown'}
Origin state: ${origin?.state || 'Unknown'}

Return a JSON object with:
{
  "summary": "short heading under 7 words",
  "interpretation": "one short sentence explaining the travel mood",
  "searchPrompt": "a rewritten one-line request for destination search",
  "themes": ["choose from: ${SUPPORTED_SEARCH_THEMES.join(', ')}"]
}

Rules:
- Keep the interpretation useful for travel planning inside India.
- Use 2 to 5 themes from the allowed list only.
- Understand long free-text input naturally.
- Keep the searchPrompt short, specific, and polished.
`.trim();

  const payload = await requestStructuredJson({
    system,
    user,
    maxTokens: 800,
  });

  const normalized = sanitizeIntentPayload(payload || {});
  return normalized.searchPrompt || normalized.themes.length ? normalized : null;
}

async function requestRecommendationBatch({
  mood,
  origin,
  count = 10,
  themes = [],
  interpretation = '',
  excludedNames = [],
} = {}) {
  const safeCount = Math.max(4, Math.min(12, Number(count) || 10));
  const system = [
    'You are the travel recommendation engine for Sentivago.',
    'Recommend only real travel destinations inside India.',
    'Return concise JSON only.',
    'Balance fit, variety, and realistic spend.',
    'Never recommend international destinations.',
  ].join(' ');

  const user = `
Create destination recommendations for a traveller in India.

Mood request: "${String(mood || '').trim()}"
Origin city: ${origin?.city || 'Unknown'}
Origin state: ${origin?.state || 'Unknown'}
Interpreted travel brief: ${interpretation || 'Not provided'}
Preferred themes: ${themes.length ? themes.join(', ') : 'No strict theme list'}
Avoid repeating these destinations: ${excludedNames.length ? excludedNames.join(', ') : 'None'}

Return a JSON object with this shape:
{
  "summary": "short title",
  "interpretation": "one short explanation",
  "destinations": [
    {
      "name": "destination name",
      "city": "city",
      "state": "state",
      "latitude": 0,
      "longitude": 0,
      "summary": "short destination summary under 24 words",
      "reason": "why it matches the mood under 28 words",
      "tags": ["3 to 5 short tags"],
      "themes": ["3 to 6 lowercase themes"],
      "nightlyRateHint": 1800,
      "ratingHint": 4.4,
      "reviewCountHint": 1800
    }
  ]
}

Rules:
- Recommend exactly ${safeCount} destinations.
- Keep every destination in India.
- Include a mix of budget and more polished options when possible.
- Give a mix of well-known and slightly less obvious destinations when they fit.
- Prefer real tourist cities, towns, hill stations, beaches, heritage cities, wellness escapes, or scenic regions.
- Use approximate city-centre coordinates in India.
- Use brief, polished travel copy.
- Do not repeat any destination listed in the exclusion list.
`.trim();

  const payload = await requestStructuredJson({
    system,
    user,
    maxTokens: 2200,
  });

  return sanitizeRecommendationPayload(payload || {});
}

async function recommendIndianDestinations({ mood, origin, count = 10, themes = [], interpretation = '' } = {}) {
  const targetCount = Math.max(10, Math.min(60, Number(count) || 10));
  const collected = [];
  const seen = new Set();
  let summary = '';
  let resolvedInterpretation = '';

  for (let attempt = 0; attempt < 6 && collected.length < targetCount; attempt += 1) {
    const remaining = targetCount - collected.length;
    const batchCount = Math.min(12, remaining);
    const batch = await requestRecommendationBatch({
      mood,
      origin,
      count: batchCount,
      themes,
      interpretation,
      excludedNames: [...seen].slice(-18),
    });

    if (!batch?.destinations?.length) {
      break;
    }

    if (!summary && batch.summary) {
      summary = batch.summary;
    }

    if (!resolvedInterpretation && batch.interpretation) {
      resolvedInterpretation = batch.interpretation;
    }

    let addedThisRound = 0;

    batch.destinations.forEach((destination) => {
      if (collected.length >= targetCount) return;

      const key = `${destination.name.toLowerCase()}::${destination.state.toLowerCase()}`;
      if (seen.has(key)) return;

      seen.add(key);
      collected.push(destination);
      addedThisRound += 1;
    });

    if (!addedThisRound) {
      break;
    }
  }

  return collected.length
    ? {
        summary: summary || `${collected.length} India picks for your mood`,
        interpretation:
          resolvedInterpretation || interpretation || 'Curated destination ideas matched to the travel brief you typed.',
        destinations: collected.slice(0, targetCount),
      }
    : null;
}

async function generateIndianDestinationProfile({ name, state = '' } = {}) {
  const safeName = String(name || '').trim();
  if (!safeName) return null;

  const system = [
    'You create structured destination profiles for Sentivago.',
    'Return concise JSON only.',
    'Keep the place inside India and write traveler-facing copy.',
  ].join(' ');

  const user = `
Build a destination profile for "${safeName}"${state ? ` in ${state}` : ''}, India.

Return a JSON object with this shape:
{
  "name": "destination name",
  "city": "city",
  "state": "state",
  "latitude": 0,
  "longitude": 0,
  "summary": "one short overview",
  "tags": ["3 to 5 short tags"],
  "themes": ["3 to 6 lowercase themes"],
  "specialityFoods": ["3 to 4 items"],
  "thingsToDo": ["3 to 4 items"],
  "travelTips": ["3 to 4 items"],
  "ratingHint": 4.4,
  "reviewCountHint": 1800
}

Rules:
- Keep it a real Indian destination.
- Use approximate city-centre coordinates.
- Keep copy compact and useful.
`.trim();

  const payload = await requestStructuredJson({
    system,
    user,
    maxTokens: 1400,
  });

  if (!payload || !payload.name || !payload.state) {
    return null;
  }

  const normalized = sanitizeDestinationSuggestion(payload, 0);

  return {
    ...normalized,
    specialityFoods: unique(payload.specialityFoods || []).slice(0, 5),
    thingsToDo: unique(payload.thingsToDo || []).slice(0, 6),
    travelTips: unique(payload.travelTips || []).slice(0, 6),
  };
}

async function generateDestinationGuide({ destination, weatherSummary = '', tier = 'Recommended' } = {}) {
  const fallback = buildGuideFallback({ destination, weatherSummary, tier });
  const system = [
    'You write compact destination guide copy for Sentivago.',
    'Return valid JSON only.',
    'Sound polished, concise, and useful for a traveller choosing a place in India.',
  ].join(' ');

  const user = `
Create a destination guide for:
- Name: ${destination.name}
- City: ${destination.city}
- State: ${destination.state}
- Summary: ${destination.summary}
- Themes: ${(destination.themes || []).join(', ')}
- Tags: ${(destination.tags || []).join(', ')}
- Weather: ${weatherSummary || 'Not available'}
- Budget tier: ${tier}

Return a JSON object with:
{
  "description": "2 short sentences max",
  "specialityFoods": ["3 to 4 items"],
  "thingsToDo": ["3 to 4 items"],
  "travelTips": ["3 to 4 items"]
}

Keep every item short, practical, and specific to this destination.
`.trim();

  const payload = await requestStructuredJson({
    system,
    user,
    maxTokens: 1200,
  });

  return sanitizeGuidePayload(payload || {}, fallback);
}

module.exports = {
  checkOllamaStatus,
  generateDestinationGuide,
  generateIndianDestinationProfile,
  interpretIndianTripIntent,
  recommendIndianDestinations,
};
