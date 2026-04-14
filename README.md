<<<<<<< HEAD
# Smart Tourism AI

Clean MVP starter for an India-first tourism discovery website.

## Stack

- `frontend/`: Next.js App Router UI
- `backend/`: Express API
- `database/`: PostgreSQL schema and seed data

## What This Project Already Solves

- Mood-based destination search
- Destination detail page
- Route-based destination subpages for hotels, restaurants, travel plan, local travel, and reviews
- Browser geolocation
- Clean separation between curated DB data, Google APIs, and optional AI-written destination enrichment

## What You Need To Add Before Running Fully

- PostgreSQL or Supabase database URL
- Optional `GOOGLE_MAPS_API_KEY` for live hotels, restaurants, local travel points, reverse geocoding, and route enrichment
- Optional `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` for AI-written destination descriptions and extra insights

## Folder Map

```text
smart-tourism-ai/
├── frontend/
├── backend/
└── database/
```

## Suggested Order

1. Create a Postgres database.
2. Run `database/schema.sql`.
3. Run `database/seed.sql`.
4. Fill `backend/.env.example` values into `backend/.env`.
5. Fill `frontend/.env.example` values into `frontend/.env.local`.
6. Install backend dependencies and run the API.
7. Install frontend dependencies and run the Next app.

## Minimum Database Strategy

- Keep `destinations` as the core source of truth.
- Keep `destination_facts` only for short curated notes or hard business-approved content.
- Keep `reviews` if you want user feedback on the site.
- `hotels_cache`, `restaurants_cache`, and `route_cache` are there only to reduce repeated Google API calls.
- You do not need to permanently store live hotel, restaurant, or local travel data if you prefer API-first behavior.
- AI destination descriptions are generated on demand and cached in memory by the backend, so no extra AI table is required for the MVP.

## Data Split

- Google data:
  - reverse geocoding for browser latitude/longitude to city/state
  - hotel discovery
  - restaurant discovery
  - road route enrichment
  - local travel hubs such as taxi stands, stations, or rentals
- AI data:
  - medium destination description
  - famous foods explanations
  - must-visit place descriptions
  - must-try activities
  - safety notes
  - interesting destination facts
  - a short narrative around the calculated trip budget
- Backend-calculated data:
  - recommendation ranking
  - average trip expense bands
  - budget breakdowns for travel, stay, food, and local movement

## Local Hosting

- Hosting locally does not block Google or AI APIs.
- Your site can still call those APIs as long as:
  - your laptop has internet access
  - the backend is running
  - your API keys are valid
  - Google Maps billing is enabled for the key
- Keep the keys on the backend only. The frontend should talk to `http://localhost:5001`, and the backend should call Google or AI services.

## Notes

- The app works without Google or AI keys because it includes fallback content.
- Recommendation ranking and numeric budget estimates stay deterministic so the core flow is not blocked by AI variability.
- AI is used for richer destination writing, not as the only source of truth for travel numbers.
=======
# Sentivago
AI-powered travel discovery platform for India
>>>>>>> 8987dd09df7da3a66f1617918b08f5cb0868eb9b
