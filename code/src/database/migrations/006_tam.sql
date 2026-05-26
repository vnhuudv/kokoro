-- code/src/database/migrations/006_tam.sql
-- Tâm pillar: Social Impact module tables

-- Badges definition table (seeded below)
CREATE TABLE tam_badges (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT NOT NULL,
  description      TEXT NOT NULL,
  icon_url         TEXT,
  threshold_points INTEGER NOT NULL,
  category_filter  TEXT CHECK (category_filter IN ('climate', 'poverty', 'disaster', 'other'))  -- NULL = any category; specific value = category-specific
);

-- Social impact posts
CREATE TABLE tam_posts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(tenant_id),
  author_user_id  TEXT NOT NULL,
  title           TEXT NOT NULL,
  description     TEXT NOT NULL,
  cover_image_url TEXT,
  external_url    TEXT,
  source          TEXT NOT NULL DEFAULT 'user'
                  CHECK (source IN ('user', 'system')),
  category        TEXT NOT NULL
                  CHECK (category IN ('climate', 'poverty', 'disaster', 'other')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tam_posts_tenant_created  ON tam_posts (tenant_id, created_at DESC);
CREATE INDEX idx_tam_posts_tenant_category ON tam_posts (tenant_id, category, created_at DESC);

CREATE TRIGGER trg_tam_posts_updated_at
  BEFORE UPDATE ON tam_posts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Actions employees take on a post (donate, volunteer, pledge)
CREATE TABLE tam_actions (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            UUID NOT NULL REFERENCES tenants(tenant_id),
  post_id              UUID NOT NULL REFERENCES tam_posts(id),
  user_id              TEXT NOT NULL,
  action_type          TEXT NOT NULL
                       CHECK (action_type IN ('donation', 'volunteer', 'pledge')),
  external_url_clicked BOOLEAN NOT NULL DEFAULT false,
  amount_logged        NUMERIC(10,2),
  hours_logged         NUMERIC(6,2),
  note                 TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tam_actions_post ON tam_actions (post_id);
CREATE INDEX idx_tam_actions_user ON tam_actions (tenant_id, user_id);

-- Tracks link clicks; UNIQUE enforces once-per-user-per-post points award
CREATE TABLE tam_link_clicks (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID NOT NULL REFERENCES tenants(tenant_id),
  post_id    UUID NOT NULL REFERENCES tam_posts(id),
  user_id    TEXT NOT NULL,
  clicked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, post_id, user_id)
);

-- Points ledger; category mirrors the post category for badge evaluation
CREATE TABLE tam_points (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID NOT NULL REFERENCES tenants(tenant_id),
  user_id    TEXT NOT NULL,
  points     INTEGER NOT NULL,
  reason     TEXT NOT NULL,
  category   TEXT CHECK (category IN ('climate', 'poverty', 'disaster', 'other')),  -- mirrors post category; NULL for non-post-related points
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tam_points_user     ON tam_points (tenant_id, user_id);
CREATE INDEX idx_tam_points_category ON tam_points (tenant_id, user_id, category);

-- Badges earned by employees
CREATE TABLE tam_user_badges (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID NOT NULL REFERENCES tenants(tenant_id),
  user_id    TEXT NOT NULL,
  badge_id   UUID NOT NULL REFERENCES tam_badges(id),
  awarded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, user_id, badge_id)
);

CREATE INDEX idx_tam_user_badges_user ON tam_user_badges (tenant_id, user_id);

-- Seed badges
INSERT INTO tam_badges (name, description, threshold_points, category_filter) VALUES
  ('First Step',       'Awarded for earning your first 25 points',               25,  NULL),
  ('Community Helper', 'Awarded for reaching 100 points',                        100, NULL),
  ('Climate Champion', 'Awarded for 250 points from climate-category posts',     250, 'climate'),
  ('Impact Leader',    'Awarded for reaching 500 total points',                  500, NULL);
