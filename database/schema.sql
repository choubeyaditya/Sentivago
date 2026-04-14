create table if not exists reviews (
  id bigserial primary key,
  place_id text not null,
  place_slug text not null,
  destination_name text not null,
  destination_state text,
  reviewer_name text not null,
  rating integer not null check (rating between 1 and 5),
  content text not null,
  created_at timestamptz default now()
);

create index if not exists idx_reviews_place_id on reviews(place_id);
create index if not exists idx_reviews_place_slug on reviews(place_slug);
