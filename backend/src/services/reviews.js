const { hasDatabaseConfig, optionalQuery, query } = require('./db');

let nextReviewId = 1000;

const inMemoryReviews = [
  {
    id: 1,
    place_id: 'demo-darjeeling',
    place_slug: 'darjeeling',
    destination_name: 'Darjeeling',
    destination_state: 'West Bengal',
    reviewer_name: 'Aarav Mehta',
    rating: 5,
    content:
      'Beautiful mountain weather, easy to enjoy over a short trip, and definitely worth recommending for a calm scenic break.',
    created_at: '2026-03-20T09:00:00.000Z',
  },
  {
    id: 2,
    place_id: 'demo-shillong',
    place_slug: 'shillong',
    destination_name: 'Shillong',
    destination_state: 'Meghalaya',
    reviewer_name: 'Sara Thomas',
    rating: 4,
    content:
      'Very refreshing and photogenic, especially if you want a cooler destination with a softer travel pace.',
    created_at: '2026-03-22T11:30:00.000Z',
  },
  {
    id: 3,
    place_id: 'demo-panaji',
    place_slug: 'panaji',
    destination_name: 'Panaji',
    destination_state: 'Goa',
    reviewer_name: 'Ritvik Sinha',
    rating: 5,
    content:
      'Flexible, social, and easy for a demo-style trip because food, views, and movement all come together well.',
    created_at: '2026-03-24T16:45:00.000Z',
  },
];

function filterMemoryReviews(placeId) {
  return inMemoryReviews
    .filter((review) => review.place_id === placeId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

function calculateStats(reviews = []) {
  if (!reviews.length) {
    return {
      reviewCount: 0,
      communityRating: 0,
    };
  }

  const total = reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0);

  return {
    reviewCount: reviews.length,
    communityRating: total / reviews.length,
  };
}

async function listReviews(placeId) {
  if (!placeId) {
    return [];
  }

  if (hasDatabaseConfig()) {
    const result = await optionalQuery(
      `
        select
          id,
          place_id,
          place_slug,
          destination_name,
          destination_state,
          reviewer_name,
          rating,
          content,
          created_at
        from reviews
        where place_id = $1
        order by created_at desc
      `,
      [placeId]
    );

    if (result) {
      return result.rows;
    }
  }

  return filterMemoryReviews(placeId);
}

async function getReviewStats(placeId) {
  if (!placeId) {
    return {
      reviewCount: 0,
      communityRating: 0,
    };
  }

  if (hasDatabaseConfig()) {
    const result = await optionalQuery(
      `
        select
          count(*)::int as review_count,
          coalesce(avg(rating), 0)::float as community_rating
        from reviews
        where place_id = $1
      `,
      [placeId]
    );

    if (result?.rows?.[0]) {
      return {
        reviewCount: Number(result.rows[0].review_count || 0),
        communityRating: Number(result.rows[0].community_rating || 0),
      };
    }
  }

  return calculateStats(filterMemoryReviews(placeId));
}

async function createReview(input = {}) {
  const payload = {
    place_id: input.placeId,
    place_slug: input.placeSlug,
    destination_name: input.destinationName,
    destination_state: input.destinationState,
    reviewer_name: input.reviewerName,
    rating: Number(input.rating),
    content: input.content,
  };

  if (hasDatabaseConfig()) {
    try {
      const result = await query(
        `
          insert into reviews (
            place_id,
            place_slug,
            destination_name,
            destination_state,
            reviewer_name,
            rating,
            content
          )
          values ($1, $2, $3, $4, $5, $6, $7)
          returning
            id,
            place_id,
            place_slug,
            destination_name,
            destination_state,
            reviewer_name,
            rating,
            content,
            created_at
        `,
        [
          payload.place_id,
          payload.place_slug,
          payload.destination_name,
          payload.destination_state,
          payload.reviewer_name,
          payload.rating,
          payload.content,
        ]
      );

      if (result?.rows?.[0]) {
        return result.rows[0];
      }
    } catch (error) {
      console.warn(`DB review insert failed, falling back to memory. ${error.message}`);
    }
  }

  const review = {
    id: nextReviewId++,
    ...payload,
    created_at: new Date().toISOString(),
  };

  inMemoryReviews.unshift(review);
  return review;
}

module.exports = {
  createReview,
  getReviewStats,
  listReviews,
};
