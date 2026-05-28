-- code/src/database/migrations/007_makoto.sql
-- Makoto pillar: Transparency & Knowledge Sharing tables

CREATE TABLE makoto_posts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(tenant_id),
  author_user_id  TEXT NOT NULL,
  title           TEXT NOT NULL,
  body            TEXT NOT NULL,
  post_type       TEXT NOT NULL CHECK (post_type IN ('official', 'article')),
  metric_refs     JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_makoto_posts_tenant_created ON makoto_posts (tenant_id, created_at DESC);
CREATE INDEX idx_makoto_posts_tenant_type    ON makoto_posts (tenant_id, post_type, created_at DESC);

CREATE TRIGGER trg_makoto_posts_updated_at
  BEFORE UPDATE ON makoto_posts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE makoto_comments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  post_id         UUID NOT NULL REFERENCES makoto_posts(id) ON DELETE CASCADE,
  parent_id       UUID REFERENCES makoto_comments(id) ON DELETE CASCADE,
  author_user_id  TEXT NOT NULL,
  body            TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_makoto_comments_post ON makoto_comments (post_id, created_at);

CREATE TABLE makoto_reactions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID NOT NULL,
  post_id        UUID NOT NULL REFERENCES makoto_posts(id) ON DELETE CASCADE,
  user_id        TEXT NOT NULL,
  reaction_type  TEXT NOT NULL DEFAULT 'like' CHECK (reaction_type IN ('like')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, post_id, user_id, reaction_type)
);
