# Tâm — Social Impact Module Design

**Date:** 2026-05-26
**Pillar:** III — Tâm (Dignity of People)
**Status:** Approved for implementation

---

## Overview

Tâm is the social impact pillar of the Kokoro dashboard. It gives every employee a place to discover and share causes they care about — climate change, poverty, disasters, and anything that calls for human attention and empathy. Employees can take action (donate, volunteer, pledge), log what they gave, and earn recognition for their contributions. The organisation sees collective impact in real time.

---

## Platform

Tâm lives in the existing React web dashboard as a new pillar tab, integrated alongside the other four pillars (Kokoro, Inochi, En, Makoto) in a unified navigation. It does not require a separate app or service.

---

## Architecture

Tâm is a new NestJS module (`tam`) inside `api-gateway`, following the identical structure as `nominication` and other existing modules. It shares the existing PostgreSQL database with its own `tam_`-prefixed tables.

```
api-gateway/src/modules/tam/
  tam.module.ts
  tam.controller.ts
  tam.service.ts

dashboard/src/pages/
  TamFeed.tsx        — main feed + sidebar
  TamPost.tsx        — post detail / create form
  TamLeaderboard.tsx — full leaderboard view
```

**Future cron job:** A content aggregator that pulls from the internet will POST to the same API endpoints using a service account token. Posts created this way carry `source: 'system'`. No special API is needed — the field is set server-side based on the auth token.

---

## Data Model

### `tam_posts`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| tenant_id | uuid NOT NULL | |
| author_user_id | text NOT NULL | Slack user ID or system |
| title | text NOT NULL | |
| description | text NOT NULL | |
| cover_image_url | text | S3 URL |
| external_url | text | Link to charity/action page |
| source | text NOT NULL | `'user'` or `'system'` |
| category | text NOT NULL | `'climate'`, `'poverty'`, `'disaster'`, `'other'` |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### `tam_actions`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| tenant_id | uuid NOT NULL | |
| post_id | uuid FK → tam_posts | |
| user_id | text NOT NULL | |
| action_type | text NOT NULL | `'donation'`, `'volunteer'`, `'pledge'` |
| external_url_clicked | boolean | |
| amount_logged | numeric | Nullable — donation amount in USD |
| hours_logged | numeric | Nullable — volunteer hours |
| note | text | Optional free-text |
| created_at | timestamptz | |

### `tam_points`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| tenant_id | uuid NOT NULL | |
| user_id | text NOT NULL | |
| points | integer NOT NULL | |
| reason | text NOT NULL | Human-readable description |
| created_at | timestamptz | |

### `tam_badges`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| name | text NOT NULL | e.g. "Climate Champion" |
| description | text NOT NULL | |
| icon_url | text | |
| threshold_points | integer NOT NULL | Points needed to unlock |
| category_filter | text | Nullable — if set, only points from this category count toward this badge |

### `tam_user_badges`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| tenant_id | uuid NOT NULL | |
| user_id | text NOT NULL | |
| badge_id | uuid FK → tam_badges | |
| awarded_at | timestamptz | |

### Seed data — badges
| Badge | Threshold |
|---|---|
| First Step | 25 pts |
| Community Helper | 100 pts |
| Climate Champion | 250 pts from climate-category posts only (`category_filter: 'climate'`) |
| Impact Leader | 500 pts total |

---

## Points System

| Event | Points |
|---|---|
| External link clicked (once per user per post) | +5 |
| Action logged (donation / volunteer / pledge) | +20 |
| First action on a post (bonus) | +10 |

Badge evaluation runs synchronously after every point award. If a threshold is crossed, a row is inserted into `tam_user_badges`. At pilot scale, no async queue is needed.

---

## API Endpoints

```
# Posts
GET    /api/tam/posts?tenantId=&category=&page=&limit=   paginated feed
POST   /api/tam/posts?tenantId=&userId=                  create post
GET    /api/tam/posts/:id?tenantId=                      single post detail

# Actions
POST   /api/tam/posts/:id/actions?tenantId=&userId=      log an action
GET    /api/tam/posts/:id/actions?tenantId=              list actions on a post

# Recognition
GET    /api/tam/leaderboard?tenantId=&limit=             points leaderboard
GET    /api/tam/users/:userId/badges?tenantId=           user's earned badges
GET    /api/tam/users/:userId/points?tenantId=           user's total points

# Health
GET    /api/tam/health                                   liveness check
```

All endpoints use the `tenantId` query-param pattern consistent with the rest of api-gateway. All return 400 if `tenantId` is missing.

---

## UI — Layout B (List + Sidebar)

**Main feed (`TamFeed.tsx`):**
- Left: scrollable list of posts, each as a horizontal card (thumbnail + title + description + action counts + points + Take Action button)
- Right sidebar: leaderboard (top 10 by points) + logged-in user's own points and badges
- Top bar: search input + category filter dropdown + "New Post" button

**Post creation (`TamPost.tsx`):**
- Fields: title, description (rich text), cover image upload, external URL, category selector
- Image uploaded to S3 on submit; if upload fails, post creation fails (no partial posts)

**Leaderboard page (`TamLeaderboard.tsx`):**
- Full ranked list with points, badge count, and most recent action per user

---

## Error Handling & Edge Cases

- **Duplicate link clicks:** External link click awards points once per user per post. Subsequent clicks are tracked but award no additional points.
- **Multiple actions on same post:** Allowed — a user can donate then volunteer on the same cause. Each action awards 20 pts independently.
- **Image upload failure:** Post creation fails atomically. No post is saved if the image upload fails.
- **Missing tenantId:** All endpoints return HTTP 400.
- **System posts:** `source: 'system'` is set server-side for cron-job-created posts. The create endpoint accepts the same payload; the source field is inferred from the auth token.

---

## Testing

**Unit tests (Jest):**
- Point calculation: correct amounts per action type
- Link-click deduplication: second click on same post awards 0 pts
- Badge threshold evaluation: correct badge awarded at each threshold
- First-action bonus: awarded only once per post per user

**Smoke script:** `tests/smoke/tam.sh`
- `GET /api/tam/health` → 200
- `POST /api/tam/posts` → 201, parse post ID
- `GET /api/tam/posts/:id` → 200
- `POST /api/tam/posts/:id/actions` → 201
- `GET /api/tam/leaderboard` → 200
- `GET /api/tam/users/:userId/badges` → 200

---

## Out of Scope (this iteration)

- In-app payment processing — external links only
- Content moderation / admin approval workflow — any employee can post freely
- Automated content aggregation cron job — designed for extensibility, not built now
- Push notifications for new posts — future enhancement
- Mobile app — web dashboard only
