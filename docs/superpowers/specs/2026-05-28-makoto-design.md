# Makoto — Transparency & Knowledge Sharing Module Design

**Date:** 2026-05-28
**Pillar:** V — Makoto (Transparency & Accountability)
**Status:** Approved for implementation

---

## Overview

Makoto is the transparency and knowledge-sharing pillar of the Kokoro dashboard. It gives every employee a place to read official company announcements (with live pillar metric embeds) and share knowledge articles with colleagues. Employees can react and comment on all content. The organisation fulfils the Makoto transparency mandate — sincerity made checkable — through a unified feed that keeps company communications and community knowledge in one place.

---

## Platform

Makoto lives in the existing React web dashboard as a new pillar tab, integrated alongside the other four pillars in unified navigation. It does not require a separate app or service.

---

## Architecture

Makoto is a new NestJS module (`makoto`) inside `api-gateway`, following the identical structure as `tam` and `nominication`. It shares the existing PostgreSQL database with its own `makoto_`-prefixed tables.

```
api-gateway/src/modules/makoto/
  makoto.module.ts
  makoto.controller.ts
  makoto.service.ts
  makoto.types.ts

dashboard/src/pages/
  MakotoFeed.tsx     — main feed (pinned official top, articles scrolling below)
  MakotoPost.tsx     — create post form (article or official)
  MakotoArticle.tsx  — article detail view with comments + reactions
```

**Routes:** `/makoto`, `/makoto/new`, `/makoto/:id`

**Nav link:** `Makoto 誠` added to `Nav.tsx` after the Tâm link.

**Authorship:** Any authenticated employee can create either post type (`official` or `article`). In practice, leadership uses the `official` type. Role-based restrictions are out of scope for this iteration.

---

## Data Model

### `makoto_posts`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| tenant_id | uuid NOT NULL | |
| author_user_id | text NOT NULL | |
| title | text NOT NULL | |
| body | text NOT NULL | |
| post_type | text NOT NULL | `'official'` or `'article'`; CHECK constraint |
| metric_refs | jsonb | Nullable — e.g. `["en_score","carbon"]` for official posts |
| created_at | timestamptz | |
| updated_at | timestamptz | set by trigger |

### `makoto_comments`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| tenant_id | uuid NOT NULL | |
| post_id | uuid FK → makoto_posts | |
| parent_id | uuid FK → makoto_comments | Nullable — `NULL` = top-level, set = reply |
| author_user_id | text NOT NULL | |
| body | text NOT NULL | |
| created_at | timestamptz | |

### `makoto_reactions`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| tenant_id | uuid NOT NULL | |
| post_id | uuid FK → makoto_posts | |
| user_id | text NOT NULL | |
| reaction_type | text NOT NULL | `'like'` for now; CHECK constraint |
| created_at | timestamptz | |
| — | UNIQUE | `(tenant_id, post_id, user_id, reaction_type)` |

**Metric embedding:** `metric_refs` stores an array of string keys referencing existing pillar APIs (e.g. `["en_score", "carbon"]`). The frontend fetches live values from the existing dashboard APIs when rendering official posts — no metric values are stored in Makoto's tables.

---

## API Endpoints

```
# Posts
GET    /api/makoto/posts?tenantId=&type=&page=&limit=     paginated feed (type filter: 'official' | 'article')
POST   /api/makoto/posts?tenantId=&userId=                create post
GET    /api/makoto/posts/:id?tenantId=                    single post with reaction count

# Comments
GET    /api/makoto/posts/:id/comments?tenantId=           list comments (top-level with replies nested)
POST   /api/makoto/posts/:id/comments?tenantId=&userId=   add comment (body + optional parentId)
DELETE /api/makoto/comments/:commentId?tenantId=&userId=  delete own comment

# Reactions
POST   /api/makoto/posts/:id/reactions?tenantId=&userId=  toggle like (add if absent, remove if present)

# Health
GET    /api/makoto/health                                 liveness check
```

All endpoints return 400 if `tenantId` is missing.

The toggle reaction endpoint returns `{ liked: boolean, count: number }` so the UI can update without a refetch.

---

## UI Layout

**Main feed (`MakotoFeed.tsx`):**
- Top bar: search input + type filter (All / Official / Articles) + "New Article" button
- Pinned section: official announcements rendered with amber styling and a 📌 label; each official post shows embedded live metric widgets (fetched from existing pillar APIs using `metric_refs`)
- Divider between official and community sections
- Scrollable articles feed below: employee articles with teal styling and an 📝 label
- Each card shows: type badge, title, author, date, body preview, like count, comment count, "Read more" link

**Article detail (`MakotoArticle.tsx`):**
- Back link to `/makoto`
- Full article body
- Reactions bar: like button (toggles, shows count) + comment count
- Comments section: top-level comments with avatar initials, threaded one level deep; reply button on top-level comments only
- Add comment textarea + Post button at the bottom

**Create post (`MakotoPost.tsx`):**
- Fields: post type selector (Official / Article), title, body (textarea), metric refs input (comma-separated keys, shown only when post type is Official)
- Submits to `POST /api/makoto/posts`; navigates to `/makoto` on 201

---

## Error Handling & Edge Cases

- **Missing `tenantId`:** All endpoints return HTTP 400.
- **Post not found:** `GET /posts/:id` returns 404 if post doesn't exist for that tenant.
- **Reaction toggle:** `POST /posts/:id/reactions` uses `ON CONFLICT DO NOTHING` + rowCount check. If the row existed, deletes instead (toggle off). Returns `{ liked, count }`.
- **Reply depth:** Only one level of threading. The API returns 400 if `parentId` points to a comment that already has a `parent_id` set.
- **Delete own comment only:** `DELETE /comments/:commentId` returns 403 if `userId` doesn't match `author_user_id`.
- **Invalid `metric_refs`:** The API stores any string array; validation of which keys are valid is a frontend concern.
- **Invalid `post_type`:** Returns 400 if value is not `'official'` or `'article'`.

---

## Testing

**Unit tests (Jest):**
- Reaction toggle: add → count increases, remove → count decreases
- Comment depth validation: reject `parentId` pointing to an existing reply (depth > 1)
- Delete authorisation: own comment succeeds, other user's comment returns 403

**Smoke script:** `tests/smoke/makoto.sh`
- `GET /api/makoto/health` → 200
- `POST /api/makoto/posts` (article) → 201, parse post ID
- `POST /api/makoto/posts` (official with metric_refs) → 201
- `GET /api/makoto/posts/:id` → 200
- `POST /api/makoto/posts/:id/comments` → 201, parse comment ID
- `POST /api/makoto/posts/:id/comments` (with parentId) → 201
- `POST /api/makoto/posts/:id/reactions` → 200, `liked: true`
- `POST /api/makoto/posts/:id/reactions` (again) → 200, `liked: false` (toggle off)
- `DELETE /api/makoto/comments/:commentId` → 204
- `GET /api/makoto/posts?tenantId=` → 200

---

## Out of Scope (this iteration)

- Role-based authorship restrictions (official posts limited to leadership roles)
- Rich text / WYSIWYG editor — plain textarea only
- Image attachments on articles
- Article categories / tags
- Featured / pinned articles
- Comment reactions (reactions on posts only)
- Notifications for replies
- Content moderation / admin approval workflow
