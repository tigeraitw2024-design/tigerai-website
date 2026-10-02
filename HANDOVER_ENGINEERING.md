# TigerAI Website — Engineering Handover

> **Audience:** TigerAI in-house engineer
> **Date:** 2026-10-02
> **Repository:** `tigeraitw2024-design/tigerai-website`
> **Live:** https://tigerai-website.tiger-ai-tw2024.workers.dev

This document answers four questions: **what the site is built with, where it stands,
how the admin works, and how you join in.** A scope-and-cost comparison is at the end.

---

## 1. One-line summary

An **Astro static front end + a hand-written schema-driven admin + Cloudflare D1**,
running entirely on Cloudflare's free tier, with automated pixel-level regression
testing against the design prototype.

The eight marketing pages were ported pixel-by-pixel from Claude Design's `.dc.html`
prototypes. The acceptance standard is "identical to the prototype"; apart from
deliberate deviations, pages currently sit at 0.00–0.05% difference.

---

## 2. Stack and rationale

| Layer | Choice | Why |
|---|---|---|
| Front end | Astro 5, `output: 'static'` + React islands | HTML generated at build (full SEO); only interactive components ship JS |
| Admin UI | React SPA, hash routing, also static | Doesn't consume Worker CPU; hash routing needs zero server rewrite rules |
| Admin API | Cloudflare Workers + Hono | Only `/api/*` ever wakes the Worker |
| Database | Cloudflare D1 (SQLite) | Free 5 GB, 5M reads/day |
| Files | Cloudflare R2 (**not yet enabled**) | Free 10 GB, no egress fees |
| Fonts | Noto Sans TC via Google Fonts | The prototype self-hosted Source Han Sans OTFs — measured at 54 MB per page load |
| Deploy | Cloudflare Workers Builds, tracking GitHub `main` | Push triggers build and deploy |

### The constraint that shaped everything

**Cloudflare Workers' free tier allows 10 ms of CPU time per request.**
The whole architecture is designed around this:

- The front end is fully static, so Cloudflare serves those files **without invoking the Worker at all**
- `"run_worker_first": ["/api/*"]` in `wrangler.jsonc` is the critical line — only API calls wake the Worker
- Password hashing had to be split in two (below)

### Why password hashing is split

Properly strong hashing (PBKDF2 at 600,000 iterations) takes tens to hundreds of
milliseconds on Workers — past the 10 ms budget, meaning nobody can log in.
Lowering the iteration count removes the protection.

The solution: **move the slow part into the browser.**

```
Browser: PBKDF2-SHA256(password, salt = "tigerai:" + email, 200,000 iters) → dk
Server:  PBKDF2-SHA256(dk, per-user random salt, 10,000 iters) → stored
```

The user's CPU is free (1–2 seconds even on a phone). If the database leaks, an
attacker still has to get through the browser-side 200,000 iterations.

**Three files must stay in sync.** Change one without the others and nobody can log in:
`src/api/auth.ts`, `src/admin/api.ts`, `src/components/shop/shop.ts`

---

## 3. Current status

### Done

| Item | Status |
|---|---|
| Eight marketing pages ported | Complete, pixel verification passing |
| Mobile layout | Complete, 0px horizontal overflow across 12 pages |
| Admin engine | Complete — 17 modules, 30 tables |
| Content wired to admin | Nearly site-wide, see §4 |
| Members, cart, orders | API and front-end pages complete; payment gateway stubbed |
| Booking system | Complete (slots, confirmation email, 24h auto-cancel) |
| Legal pages, 404, robots, sitemap | Complete |

### Pixel verification

```
home 0.00–0.04%   products 0.00%   tiger-gpu-pro 0.00%   cases 0.00%
blog 0.00%        resources 0.00%  consultants 0.05%     courses 0.06%
```

`courses` and `home` contain deliberately different sections (new banner, new GPU Pro
band). These are handled by **masking or hiding that one region while the rest stays
strictly compared**, rather than loosening the whole-page threshold. Reasons are
documented inline in `site/tools/verify.mjs`.

### Not finished / blocked

| Item | Status | Needs |
|---|---|---|
| New courses banner, new GPU Pro band | Code complete, **not yet deployed** | Push pending |
| Email delivery | Queued only, never actually sent | Decision: Resend vs company SMTP relay |
| R2 (image upload) | Not enabled on the account (requires a card on file) | Robin's decision |
| `CONTENT_API` build variable | **Not set — admin edits do not reach the front end yet** | Cloudflare dashboard |
| ECPay payment | Interface and TODOs in place | Official API docs |
| Three legal documents | Draft exists, **not reviewed by counsel** | Legal |
| Homepage 3D teardown demo | Placeholder kept, layout height correct | To be built |

---

## 4. The admin

### Core idea: one field definition grows the whole admin

```
site/src/api/modules/courses.ts   ← write only this file
        ↓ automatically produces
table, list view, edit form, permission checks, REST API, CSV export
```

**No admin screen is hand-written for any specific feature.** The UI fetches field
definitions from `/api/admin/schema` and renders itself. Adding a field is a one-line
schema change; the corresponding input appears immediately.

This satisfies the owner's requirement that "every feature is a component". Delete a
module file and that feature disappears entirely, leaving no residue elsewhere.

### Layout

```
site/
├── src/
│   ├── pages/          Front-end pages (Astro)
│   ├── components/     Front-end components
│   ├── content/        Build-time content loader (D1 with local fallback)
│   ├── admin/          Admin SPA (React)
│   ├── api/
│   │   ├── index.ts        Worker entry (Hono)
│   │   ├── schema/         Field types and collection definitions
│   │   ├── modules/        17 feature components, one file each
│   │   ├── routes/         Generic CRUD, auth, public endpoints, cart
│   │   ├── adapters/       Mail / payment / storage, swappable
│   │   └── ARCHITECTURE.md Read this first
│   └── data/           Seed data (consultants, partners, workflows…)
├── tools/              Verification and generation tooling (§6)
└── migrations/         Table DDL generated from the schema
```

### How content reaches the front end

The front end is static, so this is not a runtime database read:

```
Edit in admin → D1 → press "Publish" → Deploy Hook → rebuild → static files redeployed
```

At build time `src/content/` fetches from `/api/content` and bakes content into the HTML.
**If it can't reach the API it falls back to `src/data/*.ts`** and prints a loud warning
in the build log.

That fallback matters: the site builds with no database, no network, or on a fresh
machine — and **produces output identical to the prototype**, so pixel verification is
unaffected by the CMS (verify runs without `CONTENT_API` set).

### Permission model

| Role | Access |
|---|---|
| `owner` | Everything, including user management, global settings, publish |
| `sales` | Content read-only + bookings, leads, orders (**full contact details visible**) |
| `editor` | Content only. Bookings/leads/members/orders do not appear in the sidebar |
| `viewer` | Read-only everywhere; PII fields always masked |

"Cannot see" means **the backend refuses**, not that the front end hides it.
Calling the API directly returns 403. `site/tools/smoke.mjs` tests this explicitly.

Field-level protection too: fields marked `pii: true` in the schema are returned masked
to insufficiently privileged roles.

### Three swappable concerns

One file each under `src/api/adapters/`; switching providers means one file plus one
environment variable:

| | Current | Later |
|---|---|---|
| Mail | `console` (queue only) | Resend or company SMTP relay |
| Payment | `none` (record order, collect offline) | ECPay (skeleton and TODOs in place) |
| Storage | R2 (falls back to memory when unbound) | Add an S3 implementation |

### Using the admin

URL: `/admin`. Fully usable on both phone and desktop.

The admin contains a built-in **operations manual** (second item in the sidebar), written
for non-engineers: opening course sessions, editing copy, swapping images, handling
bookings, exporting leads, creating colleague accounts, and what to do when something
breaks. Point sales and marketing staff at that directly.

---

## 5. How this was built

Built by Robin using **Claude Code**. The working model:

1. **Design** — Claude Design produces `.dc.html` prototypes (with design-system tokens and per-section specs)
2. **Port** — Claude Code rebuilds them in Astro + React. **No redesigning.**
3. **Verify** — every page runs pixel comparison; differences must approach zero, and any deliberate deviation must carry a written reason
4. **Iterate** — Robin tests in a real browser, reports issues, fixes are re-verified

23 commits, ~13,400 lines of application code (excluding generated data) and ~1,900
lines of verification tooling.

### Three real incidents that show why the process matters

**(1) 54 MB of fonts**
The prototype self-hosted four weights of Source Han Sans as OTF. Measurement showed
54 MB per page load. Switched to Noto Sans TC on Google Fonts — the same typeface under
Google's distribution name — loaded on demand by unicode-range. Page weight went from
57 MB to 3.5 MB.

**(2) The identity gate's dead HTML overlay**
On a user's second visit the homepage was covered by an unclickable transparent layer.
Cause: the gate is a React island whose HTML is written into the file at build time. For
a returning visitor the component returns `null` on the client, and React — finding
nothing to render but a large existing subtree — simply left it in place.

This bug was **invisible to pixel verification** (verification compares after dismissing
the gate) and **impossible to reproduce with a fresh browser profile** (it never happens
on a first visit). It took a 22-second screen recording from Robin to localise it to
"every visit after the first".

Lesson: **pixel verification proves it looks right, not that it works.** A human clicking
through a real browser remains irreplaceable.

**(3) A deployment that overwrote production**
Testing the Deploy Hook triggered a production build while GitHub still held older code.
The build completed and wiped `/api` and `/admin` from the live site.

The rule is now part of the workflow: **always push before deploying.**

---

## 6. The verification tooling

Everything under `site/tools/` was written for this project. Get familiar with it first:

| Command | Purpose |
|---|---|
| `npm run verify` | Pixel comparison of eight pages against the prototype. **This is the acceptance standard** |
| `npm run mobile` | Mobile audit: horizontal overflow, touch targets <44px, fonts <12px |
| `npm run smoke` | 49 end-to-end admin checks: install, login, CRUD, permissions, public endpoints |
| `node tools/roundtrip.mjs` | Full loop: edit in admin → rebuild → front-end HTML actually changed |
| `npm run admin-shots` | Admin screenshots, mobile and desktop |
| `npm run schema` | Generate table DDL from the schema |

### Design notes on `verify.mjs`

- **`maskProto` / `maskBuilt`** — paint both sides the same colour. For "different content, same size"
- **`hideProto` / `hideBuilt`** — `display:none` on both sides. For deliberate changes that **also change height**
  (e.g. the banner becoming full-screen, which shifts everything below; masking cannot fix that)
- **`settle()`** — waits until the page is genuinely still. It checks not only the DOM but a fingerprint
  of every element's current inline `transform`/`opacity`, because the top bar capsule and the laptop
  tilt are driven by JS writing styles each frame — not CSS animations, so `getAnimations()` misses them
- Fonts are normalised to Noto Sans TC **on the prototype side too**, otherwise every page carries
  ~0.5% of font noise and the ruler becomes too blunt to catch real porting errors

**Important principle: investigate differences, never raise the threshold.**
`products` once went from 0.00% to 0.05%; the cause turned out to be a visible string
I had casually reworded while wiring the CMS. Had the threshold been widened, that
mistake would never have surfaced.

---

## 7. How to work alongside

### Premise

This project was **written with Claude Code and is expected to be maintained with it**.
Comment density and style are designed for that: each file opens by explaining *why*
it is the way it is, not merely what it does.

### Setup

```bash
git clone https://github.com/tigeraitw2024-design/tigerai-website.git
cd tigerai-website/site
npm install
npm run dev          # syncs assets from design/ into public/, then starts the dev server
```

In a second terminal, for the admin API:

```bash
npm run api          # wrangler dev with a local D1 simulation
```

Local environment variables live in `site/.dev.vars` (gitignored; create your own —
template in `後台上線步驟.md`).

### Access you will need

| Item | Ask |
|---|---|
| GitHub write access | Robin (repo is currently public) |
| Cloudflare account access | Robin (`tiger.ai.tw2024@gmail.com`) |
| Admin account | Robin creates it under `/admin` → Admin Accounts; `owner` recommended |

### Workflow (please follow)

```
change code → npm run verify passes → git commit → git push origin main
            → Cloudflare builds and deploys → verify live
```

**Three rules:**

1. **Push before deploying.** Cloudflare builds from GitHub; divergence causes the two to overwrite each other.
2. **Never build while verify is running.** Verify compares `dist/`; rebuilding mid-run invalidates the numbers.
   (This mistake has already been made three times.)
3. **`design/` is the single source of truth — read-only.** For design changes, Robin obtains an updated
   `.dc.html` or full handoff zip from Claude Design, which we then port.

### Good first tasks

1. **SMTP relay.** Workers cannot open raw TCP, so company email needs a small HTTP endpoint that
   accepts JSON and sends via SMTP. The interface is `smtp-relay` in `src/api/adapters/mail.ts`.
2. **ECPay integration.** `src/api/adapters/payment.ts` has a complete skeleton with three TODOs;
   only the official parameter table and CheckMacValue algorithm are missing. Orders, cart and
   members need no changes once it lands.
3. **Homepage 3D teardown demo.** The products page reserves the 300vh scroll section and a
   placeholder frame, so layout heights are already correct. The prototype uses three.js + anime.js
   seeked by scroll progress.

---

## 8. Roadmap

Robin's direction:

1. **Design continues to come from Claude Design.** Robin obtains the `.dc.html` or full zip and hands
   it to engineering to port. Today's "Tiger GPU Pro band" worked exactly this way
   (`TigerGpuPro入口帶.html`).
2. **Every new feature must ship with both**: a working mobile layout and admin editability.
   This is a standing rule; it will not be restated each time.
3. Course sales (needs payment), member engagement, lead follow-up workflow.
4. Opening the admin to colleagues (the permission model is ready).

---

## 9. Scope and cost comparison

### What exists

| Item | Count |
|---|---|
| Front-end pages | 19 (8 marketing + cart/member/legal/404 etc.) |
| Admin feature modules | 17 |
| Database tables | 30 |
| Application code | ~13,400 lines (excluding generated data) |
| Verification tooling | ~1,900 lines |
| Automated tests | 8 pixel pages, 12 mobile pages, 49 admin checks, 13 end-to-end |
| Elapsed time | 2026-09-30 to 10-02 (about three days) |

### Market comparison (Taiwan, 2026)

Rough estimates for **outsourcing equivalent scope**. For sizing the asset, not a quote:

| Item | Typical outsourced estimate (TWD) |
|---|---|
| Eight-page corporate site (design fidelity, responsive) | 150k–300k |
| Custom CMS (17 modules, role-based permissions, CSV export) | 300k–600k |
| Member system + cart + orders (excluding payment integration) | 200k–400k |
| Booking system (slots, notification email, expiry handling) | 80k–150k |
| Pixel-level automated verification and test suite | Usually excluded; 100k–200k if commissioned |
| **Total** | **~830k–1.65M TWD** |

At a senior full-stack day rate of TWD 8,000–12,000, that range is roughly
**70–140 person-days** (3–7 months).

### Running costs

| Item | Monthly |
|---|---|
| Cloudflare Workers + D1 + R2 | **TWD 0** (within free tier) |
| Domain | ~TWD 30–100 depending on registrar |
| Email (Resend free tier: 100/day) | TWD 0; from ~TWD 600 beyond that |
| **Total** | **~TWD 0–700** |

A conventional stack (shared hosting + WordPress + plugin licences + CDN) typically runs
TWD 1,500–5,000 per month.

### Caveats worth stating plainly

- The comparison **excludes design**, which came from Claude Design and is outside this scope.
- Covering this scope in three days depended on AI-assisted development **and on the automated
  verification**. The tooling is a meaningful share of the effort, but it is also the reason the
  pace was sustainable: every change could be confirmed non-breaking within minutes.
- The project **has not yet run in production**. The features pass automated tests but have not
  been validated under real traffic and real users.
- Legal documents are unreviewed and payment is not integrated, so this should not be treated as
  a complete, commercially deployable handover.

---

## 10. Three things to do immediately

In priority order:

1. **Set the `CONTENT_API` build variable** (2 minutes)
   Cloudflare → `tigerai-website` → Settings → Build variables
   Add `CONTENT_API` = `https://tigerai-website.tiger-ai-tw2024.workers.dev`
   **Without this, admin edits never reach the front end** — the admin is only half-connected.

2. **Decide the email provider.** Booking confirmations and order notifications currently cannot be sent.

3. **Decide whether to enable R2** (requires a card on file). The site works without it, but the
   admin cannot accept image uploads; swapping images means committing files to the repo.

---

## Appendix: key files

| File | Contents |
|---|---|
| `README.md` | Project overview, architecture, font decision, test commands |
| `後台上線步驟.md` | Step-by-step deployment from scratch (written for non-engineers) |
| `site/src/api/ARCHITECTURE.md` | Admin architecture and design rationale |
| `site/tools/verify.mjs` | Pixel verification; full design notes at the top of the file |
| `design/專案守則.md` | Site-wide copy rules (no em dashes, lowercase n8n, etc.) |
| `design/` | Claude Design prototypes — **single source of truth, read-only** |
