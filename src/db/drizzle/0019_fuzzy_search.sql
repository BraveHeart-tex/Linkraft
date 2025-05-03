CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Full-text index
CREATE INDEX bookmarks_fts_idx ON bookmarks
USING gin (to_tsvector('english', title || ' ' || coalesce(description, '')));

-- Trigram fuzzy indexes
CREATE INDEX bookmarks_title_trgm_idx ON bookmarks
USING gin (title gin_trgm_ops);

CREATE INDEX bookmarks_description_trgm_idx ON bookmarks
USING gin (description gin_trgm_ops);