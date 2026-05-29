# Dashboard UI/UX Redesign — Indigo Enterprise Light

**Date:** 2026-05-29
**Status:** Approved for implementation
**Scope:** Full React dashboard — all pages visible during investor live demo

---

## Overview

Redesign the Kokoro web dashboard from its current functional-but-minimal inline-styled UI to a premium enterprise product that reads as credible, serious software in an investor demo setting. The design language is **Indigo Enterprise Light**: deep indigo sidebar, clean white content area, pillar-specific accent colors, and a collapsed/expandable hybrid sidebar navigation.

Target context: Vnext Japan — an innovative consultancy bridging Japanese and international markets. The visual identity must signal "sharp, modern, professional with a human edge" — not a generic SaaS template, not a developer tool. Every page the presenter clicks must look polished.

---

## Design Principles

1. **Data first** — Metrics and scores are the hero. Typography and spacing are chosen to make numbers legible at a glance from across a conference room.
2. **Japanese restraint** — Whitespace is generous. No visual noise. Pillar kanji characters (心 誠 命) are used as deliberate typographic elements, not decoration.
3. **Pillar identity** — Each pillar has its own accent color. Dots in the sidebar and card borders signal which pillar you are in without reading the label.
4. **Enterprise trust signals** — Card shadows, a consistent border radius system (12px cards, 8px buttons/inputs), and a confident typographic hierarchy all communicate "real software."

---

## Design Tokens

### Colors

```
/* Structure */
--sidebar-bg:        #1e1b4b   /* Deep indigo — sidebar background */
--sidebar-active:    #312e81   /* Slightly lighter — active nav item */
--sidebar-icon:      #6366f1   /* Indigo — inactive icons and kanji */
--sidebar-icon-active: #a5b4fc /* Lavender — active icon */
--canvas-bg:         #f8fafc   /* Near-white — page background */
--card-bg:           #ffffff   /* Pure white — cards */
--border:            #e2e8f0   /* Light gray — card and input borders */
--text-heading:      #1e1b4b   /* Deep indigo — page titles */
--text-body:         #1e293b   /* Dark slate — body text */
--text-secondary:    #64748b   /* Slate — labels and metadata */
--text-muted:        #94a3b8   /* Light slate — timestamps, hints */

/* Primary */
--primary:           #6366f1   /* Indigo — buttons, active states, links */
--primary-hover:     #4f46e5
--primary-light:     #e0e7ff   /* Indigo 100 — chart fills, badge backgrounds */
--primary-ring:      #c7d2fe   /* Focus rings */

/* Pillar accents */
--carbon:            #10b981   /* Emerald — Carbon 命 / Inochi */
--carbon-light:      #d1fae5
--tam:               #f59e0b   /* Amber — Tâm 心 */
--tam-light:         #fef3c7
--makoto:            #6366f1   /* Indigo — Makoto 誠 (shares primary) */
--makoto-light:      #e0e7ff
--en:                #8b5cf6   /* Violet — En score */
--en-light:          #ede9fe
--kokoro:            #0ea5e9   /* Sky — Kokoro / Team views */
--kokoro-light:      #e0f2fe

/* Semantic */
--success:           #22c55e
--warning:           #f59e0b
--danger:            #ef4444
```

### Typography

```
font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif
```

| Role | Size | Weight | Color |
|---|---|---|---|
| Page title | 20px | 800 | `--text-heading` |
| Section heading | 14px | 700 | `--text-body` |
| Card metric (hero number) | 28px | 800 | pillar accent |
| Card label | 10px | 600 uppercase | `--text-muted` |
| Body / table | 13px | 400 | `--text-body` |
| Metadata / timestamp | 12px | 400 | `--text-secondary` |
| Pillar kanji | 15–17px | 700 | pillar accent |

### Spacing & Radius

```
Page padding:     24px
Card padding:     16px (body), 12px (compact)
Card radius:      12px
Button radius:    8px
Badge radius:     6px (rectangular tag) / 999px (pill)
Input radius:     8px
Card shadow:      0 1px 4px rgba(99, 102, 241, 0.08)
Gap between cards: 12px
KPI row gap:      12px
```

---

## Layout System

### Shell

```
┌─────────────────────────────────────────────────┐
│  Sidebar (52px collapsed / 220px expanded)      │
│  + Main content area (flex: 1)                  │
│  + Page canvas (bg: #f8fafc, padding: 24px)     │
└─────────────────────────────────────────────────┘
```

The shell is a full-height flex row. The sidebar is always rendered; it collapses to icon-only width by default and expands to full width on hover (CSS transition: `width 200ms ease`). The main content area takes the remaining width.

### Sidebar — Collapsed (52px)

- Logo block: 30×30px indigo rounded square with "K"
- Nav icons: 36×36px touch targets, icon centered; active item has `--sidebar-active` background
- Pillar section: kanji character as icon
- Bottom: user avatar (28px circle, initials)

### Sidebar — Expanded (220px, on hover)

- Logo block expands to show "Kokoro 心" wordmark + "Vnext Japan" subtitle in indigo
- Each nav item shows icon + label; active item highlighted with `--sidebar-active`
- Pillar section header: "PILLARS" label in tiny uppercase indigo
- Each pillar item shows kanji + name + colored dot indicator (pillar accent color)
- Divider between main nav and pillars section
- Bottom: avatar + name + tenant name

### Page Header Pattern

Every page follows this structure:

```
[Page Title — 20px 800 indigo]    [Secondary action]  [Primary action button]
[Subtitle — tenant · period · count]
```

---

## Component Patterns

### KPI Card

White card, 12px radius, subtle indigo-tinted shadow. Internal layout:

```
[LABEL — 10px uppercase muted]
[Hero number — 28px 800 in pillar accent color]
[Delta — 11px success/danger with ▲▼ prefix]
```

Width: fills grid cell. KPI rows use `grid-template-columns: repeat(N, 1fr)` where N matches the metric count for the page (4–5 columns on Team Overview, 2–3 on pillar pages).

### Metric Bar / Progress Bar

Used inside cards where a score needs a visual fill:

```
height: 4px, border-radius: 2px
track: --primary-light
fill: pillar accent color
```

### Chart Bars (fluency trend, carbon trend)

Simple vertical bar charts using `div`-based bars (no recharts replacement needed for bars — recharts stays for line charts). Bars use a gradient from light to full accent color as value increases toward recent dates.

### Feed Card (Tâm, Makoto)

```
White card, 12px radius, 16px padding
Left border: 3px solid pillar accent
Badge (type): 10px uppercase, accent bg-light, accent text, 6px radius
Title: 14px 700 --text-body
Author + date: 12px --text-secondary
Body preview: 13px --text-secondary, 2-line clamp
Footer: like count · comment count · Read more (indigo)
```

### Button

```
Primary: bg --primary, text white, 8px radius, 6px 14px padding, 13px 600
Secondary: bg white, border --border, text --text-secondary, same sizing
Pill/tag: bg pillar-light, text pillar accent, 999px radius
```

### Badge / Tag

```
Rectangular (post type): 10px uppercase 700, bg-light, accent text, 6px radius, 2px 7px padding
Status dot: 6px circle, pillar accent
Pill (active filter): bg --primary, text white, 999px radius
```

---

## Per-Page Design Notes

### Team Overview (`/`)

- 5-column KPI row: En Score (violet), Carbon (emerald), Tâm Points (amber), Annotations (indigo), Fluency Avg (violet)
- 2-column bottom row: Fluency Trend chart (left, wider) + Top Performers list (right)
- Top Performers: avatar initials, name, horizontal progress bar, score number
- Page header action: "Export Report" primary button

### Personal Fluency (`/me`)

- 3-column KPI row: My Fluency Score, Annotations This Month, Improvement vs Last Month
- Full-width Fluency Breakdown card: grouped horizontal bars per cultural dimension (Japanese, Cross-cultural, Business register, etc.)
- Recent Annotations list: card per annotation, cultural context badge, timestamp

### Pilot Results (`/public`)

- Sidebar is present and collapsed; a "Public View" chip appears in the page header to signal context
- Large headline stat (overall program result), supporting stats grid
- Chart of participant progress over program duration

### Carbon 命 (`/carbon`)

- Page tint: emerald accent throughout (card borders, chart bars, KPI numbers in emerald)
- 2-column KPI: My Footprint (tCO₂), Team Average
- Full-width Reduction Trend chart (bars going down = good, emerald)
- Actions checklist: logged carbon-reducing behaviors with checkboxes and point values
- Ranking card: user's position in team carbon leaderboard

### Admin Carbon (`/admin/carbon`)

- Same emerald tint as Carbon view
- Team-level aggregates, per-person breakdown table
- Export button

### Tâm 心 Feed (`/tam`)

- Page tint: amber accent
- Feed cards with amber left border for official/cause posts
- Type filter pills (All / Cause / Action) using amber active state
- "+ New Post" primary button
- Like / comment footer on each card

### Tâm Leaderboard (`/tam/leaderboard`)

- Amber accent
- Top 3 displayed as podium cards (1st largest, gold badge; 2nd/3rd smaller, silver/bronze)
- Ranked list below: rank number, avatar, name, points bar, total
- User's own row highlighted with indigo border

### Makoto 誠 Feed (`/makoto`)

- Indigo accent (shares primary color)
- Two sections: Official Announcements (amber cards, top) + Knowledge Base (white cards, below)
- Search input + type filter + New Article button in page header
- Metric embed chips on official post cards (En Score, Carbon)

### Makoto Article Detail (`/makoto/:id`)

- Max-width 720px centered content for readability
- Full body text at 15px, 1.7 line-height
- Reactions bar (indigo like button + comment count)
- Threaded comments: avatar initials, card bubble, reply indented 20px
- Add comment textarea with Post button

### Create Post / Create Article (`/tam/new`, `/makoto/new`)

- Single-column form, max-width 600px centered
- Type selector as pills (not a dropdown)
- Title input (large, prominent)
- Body textarea (min-height 200px)
- Submit primary button + Cancel secondary

### Login (`/login`)

- Full-page centered layout, no sidebar
- Kokoro 心 logo + "Vnext Japan" subtitle
- "Sign in with Google" button (white, border, Google icon)
- Tagline below: "Cultural intelligence for global teams"

---

## Implementation Approach

### Styling

All styling stays as inline `React.CSSProperties` — no Tailwind, no CSS-in-JS library. A shared `theme.ts` file exports the color token constants so values are not hardcoded across files.

### New files to create

```
code/src/web/dashboard/src/theme.ts    — color tokens, spacing constants, shared style objects
```

### Files to modify

```
code/src/web/dashboard/src/components/Nav.tsx          — replace top nav with collapsible sidebar
code/src/web/dashboard/src/App.tsx                     — update AuthLayout to use sidebar shell
code/src/web/dashboard/src/pages/TeamView.tsx          — redesign
code/src/web/dashboard/src/pages/PersonalView.tsx      — redesign
code/src/web/dashboard/src/pages/PublicView.tsx        — redesign
code/src/web/dashboard/src/pages/CarbonView.tsx        — redesign with emerald tint
code/src/web/dashboard/src/pages/AdminCarbonView.tsx   — redesign with emerald tint
code/src/web/dashboard/src/pages/TamFeed.tsx           — redesign with amber tint
code/src/web/dashboard/src/pages/TamLeaderboard.tsx    — redesign with podium + amber
code/src/web/dashboard/src/pages/MakotoFeed.tsx        — redesign
code/src/web/dashboard/src/pages/MakotoPost.tsx        — redesign form
code/src/web/dashboard/src/pages/MakotoArticle.tsx     — redesign article detail
code/src/web/dashboard/src/pages/LoginView.tsx         — redesign login
code/src/web/dashboard/src/pages/TamPost.tsx           — redesign form
```

### No backend changes

This is a pure frontend redesign. No API endpoints, no data model changes, no new services.

### No new dependencies

Inter font is loaded from Google Fonts via a `<link>` tag in `index.html`. No new npm packages required.

---

## Out of Scope

- Mobile / responsive layout — desktop only for investor demo
- Dark mode
- Animations beyond sidebar hover transition
- New features or data — only visual redesign of existing pages
- Role-based UI differences
- Accessibility audit (important post-MVP)
