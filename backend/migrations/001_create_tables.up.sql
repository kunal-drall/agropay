-- Circle metadata: off-chain names for circles whose IDs are on-chain.
-- First-write wins enforced at application layer via ON CONFLICT DO NOTHING.
CREATE TABLE IF NOT EXISTS circle_meta (
    circle_id   TEXT        PRIMARY KEY,
    name        TEXT        NOT NULL CHECK (length(name) BETWEEN 1 AND 120),
    description TEXT        NOT NULL DEFAULT '',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
