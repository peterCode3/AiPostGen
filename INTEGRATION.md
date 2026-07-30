# AiPostGen — Integration Guide

A practical reference for understanding what this repo is and how to plug it into other projects (a marketing site, a corporate CMS, a mobile app, an internal tool, etc.).

---

## 1. What this repo is

AiPostGen is a **standalone Next.js 15 (App Router) application** that automates SEO blog generation. It is a self-contained service with:

- A **Next.js web app** (admin UI + public-facing pages + JSON API) that runs on `next start`.
- A **MongoDB database** (via Mongoose) that owns the canonical content.
- A **Redis-backed BullMQ queue** with two long-running workers (`workers/scrape.ts`, `workers/generate.ts`).
- An **LLM layer** (`src/lib/llm/`) that calls Google Gemini first, falls back to Groq.
- An **outbound CMS publishing hook** (`src/lib/cms/client.ts`) for forwarding published articles to an external CMS.

The system is **opinionated for the dental-industry vertical** (see `scripts/autoDentistFlow.ts`, prompts in `src/lib/llm/prompt.ts`), but the data model, API surface, and worker pipeline are domain-neutral.

### High-level flow
```
SerperAPI search ─► Cheerio scrape ─► Gemini keyword extraction ─► Gemini article generation
                                                                          │
                                                                          ▼
                                                                MongoDB (Article doc)
                                                                          │
                              ┌───────────────────────────────────────────┤
                              ▼                                           ▼
                  GET /api/blogs (public)                   POST → external CMS (optional)
```

### Core data model — `Article` (`src/lib/db/models/Article.ts`)
```
slug, title, metaTitle, metaDescription, keywords[], language,
status: 'draft' | 'review' | 'scheduled' | 'published' | 'rejected',
canonicalUrl, featuredImage,
content: { html, markdown },
seo: { schemaOrgJson, internalLinks[], images[], og },
sourceRefs[], outline[],
cost: { totalUSD, tokensIn, tokensOut, provider },
scheduledAt, publishedAt, timestamps
```

Other models: `Source`, `Keyword`, `Job`, `User` (all in `src/lib/db/models/`).

---

## 2. Runtime requirements

| Dependency | Required? | Purpose |
|---|---|---|
| Node.js 20+ | Yes | Next.js 15 + tsx workers |
| MongoDB | Yes | Article/Source/Keyword storage |
| Redis | For workers / job queue | BullMQ scrape + generate queues |
| Google Gemini API key | Yes | Primary LLM |
| Groq API key | Optional | Fallback LLM |
| SerperAPI key | Yes (for auto flow) | Google SERP scraping |
| Writable filesystem | For `/api/upload` | Image uploads land in `public/uploads/` (NOT compatible with Vercel/serverless read-only FS) |

---

## 3. Integration patterns

There are **four** sensible ways to integrate this repo with another project. Pick based on how tightly coupled you want the systems to be.

### Pattern A — Consume the public blogs API (loosest coupling, recommended)

AiPostGen exposes a **public, unauthenticated read endpoint** that returns all `published` articles. Any frontend (Next.js, React, Vue, Astro, mobile, static site generator) can fetch it.

**Endpoint:** `GET /api/blogs`
**File:** `src/app/api/blogs/route.ts`
**Returns:** array of `{ _id, slug, title, content, metaTitle, metaDescription, featuredImage, createdAt, publishedAt, language }`

```ts
// Example: a separate Next.js site consuming AiPostGen content
const res = await fetch('https://aipostgen.your-host.com/api/blogs', {
  next: { revalidate: 300 }, // cache for 5 min
});
const blogs = await res.json();
```

**Pros:** Zero coupling. AiPostGen owns content; downstream is just a renderer.
**Cons:** Endpoint is unauthenticated and returns *all* fields including full markdown — fine for public blogs, not for private content. Add a query-string filter or auth header check if you need it.

### Pattern B — Outbound webhook to your CMS (push model)

AiPostGen already has an outbound publish hook: `src/lib/cms/client.ts` (`cmsPublish`). When an article is published, it `POST`s to `${CMS_BASE_URL}/cms/articles` with an `x-api-key` header and `Idempotency-Key` set to the Mongo `_id`.

**Configure on the AiPostGen side:**
```env
CMS_BASE_URL=https://your-cms.example.com
CMS_API_KEY=<shared-secret>
```

**Implement on the receiving side:**
```ts
// POST /cms/articles on your CMS
export async function POST(req: Request) {
  if (req.headers.get('x-api-key') !== process.env.AIPOSTGEN_KEY) {
    return new Response('Unauthorized', { status: 401 });
  }
  const idempotencyKey = req.headers.get('idempotency-key');
  const { slug, title, html, markdown, meta } = await req.json();
  // Upsert into your CMS keyed on slug or idempotencyKey
  await cms.upsertArticle({ slug, title, html, markdown, ...meta });
  return Response.json({ ok: true });
}
```

**Pros:** Push-based, immediate. AiPostGen stays the source of truth for editorial workflow; your CMS owns rendering/distribution.
**Cons:** Failures are swallowed silently — `cmsPublish` returns `{ success: true }` even when the external POST fails (`client.ts:54`). If you depend on this, add a retry queue or check `Article.status === 'published'` directly via a reconciliation job.

### Pattern C — Direct MongoDB read (tightest coupling)

If your other project already lives in the same infra and can talk to the same MongoDB cluster, query the `articles` collection directly. The schema is documented above.

```ts
const articles = await db.collection('articles')
  .find({ status: 'published', language: 'en' })
  .sort({ publishedAt: -1 })
  .toArray();
```

**Pros:** Zero network hop, full schema access (filter by `keywords`, `cost`, `sourceRefs`, etc.).
**Cons:** Schema-coupled — any change to the `Article` model in this repo breaks downstream. Only use this when both projects are co-owned and deployed together.

### Pattern D — Embed AiPostGen as a subroute of a larger Next.js app

Because it's a vanilla Next.js App Router app, you can copy `src/app/api/*`, `src/app/admin/*`, `src/lib/*`, and `workers/*` into a larger monorepo (e.g., a Turborepo) and mount them. Things to watch:

- `next.config.ts` has `transpilePackages: ['react-hot-toast']` and a webpack `fs: false` fallback — merge those into the host config.
- Workers (`workers/generate.ts`, `workers/scrape.ts`) are launched via `concurrently` in `npm run dev` and must run as **separate long-lived Node processes** (not Next API routes) in production.
- The admin auth is **hardcoded** (`admin@example.com` / `admin123` in `src/app/api/auth/login/route.ts:8`) — replace with real auth before merging into anything user-facing.

---

## 4. Programmatic content generation (machine-to-machine)

Two API endpoints let an external system trigger generation:

### `POST /api/auto-dentist`
Runs the full pipeline (search → scrape → keywords → articles). Domain-locked to dental-industry queries by default. **2–3 minutes per run.** No request body required.
File: `src/app/api/auto-dentist/route.ts`

### `POST /api/generate`
Generate articles from existing `Keyword` IDs.
File: `src/app/api/generate/route.ts`

```bash
curl -X POST https://aipostgen.your-host.com/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "keywordIds": ["507f1f77bcf86cd799439011"],
    "language": "en",
    "wordCount": 1500,
    "customInstructions": "Focus on small dental practices in EU."
  }'
```

Response includes per-article `articleId`, `slug`, `wordCount`, `cost`, plus a summary block with `totalCost` and `succeeded`/`failed` counts.

> ⚠️ Both endpoints are currently **unauthenticated**. Put them behind your gateway, add `requireRole` (`src/lib/auth/rbac.ts:13`) middleware, or run them on a private network before exposing publicly.

---

## 5. Auth model (current state)

- **Admin login:** `POST /api/auth/login` with hardcoded credentials → returns a JWT signed with `process.env.NEXTAUTH_SECRET`.
- **Token storage:** the admin UI stores the JWT in `localStorage` (no cookie set).
- **Middleware:** `src/middleware.ts` matches `/admin/*` but **does not actually enforce auth** — it just calls `NextResponse.next()` and relies on per-request 401s from the API.
- **API protection:** use `requireRole(req, ['admin','editor'])` from `src/lib/auth/rbac.ts` — but **most public-facing routes do not call it yet.**

**Before integrating with anything that matters, you must:**
1. Replace hardcoded credentials with a real user lookup (`User` model already exists).
2. Wrap `/api/generate` and `/api/auto-dentist` with `requireRole` or an API-key middleware.
3. Decide cookie vs. header auth and update both `middleware.ts` and the admin pages.

---

## 6. Full API surface

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `POST` | `/api/auth/login` | none | Issue admin JWT |
| `GET` | `/api/blogs` | none | Public list of published articles |
| `POST` | `/api/auto-dentist` | none ⚠️ | Run full search→generate pipeline |
| `POST` | `/api/generate` | none ⚠️ | Generate articles from keyword IDs |
| `GET` | `/api/articles/draft` | none | List drafts |
| `GET` | `/api/articles/draft/[id]` | none | Fetch single draft |
| `PUT` | `/api/articles/[id]/update` | none | Update article body/meta |
| `POST` | `/api/articles/draft/[id]/publish` | none | Publish (calls `cmsPublish`) |
| `POST` | `/api/articles/draft/[id]/schedule` | none | Schedule publish |
| `POST` | `/api/articles/draft/[id]/approve` | none | Move draft → review/approved |
| `POST` | `/api/articles/draft/[id]/reject` | none | Mark rejected |
| `DELETE` | `/api/articles/draft/[id]/delete` | none | Hard delete |
| `GET` | `/api/sources/list` | none | List scraped sources |
| `POST` | `/api/sources/scrape` | none | Scrape new URLs |
| `POST` | `/api/sources/scrape/[id]` | none | Re-scrape one source |
| `DELETE` | `/api/sources/delete/[id]` | none | Delete a source |
| `GET` | `/api/keywords/list` | none | List keywords |
| `POST` | `/api/keywords/import` | none | Bulk import keywords |
| `GET` | `/api/metrics/published` | none | Publish stats |
| `POST` | `/api/upload` | none | Upload image to `public/uploads/` |
| `GET` | `/api/upload/list` | none | List uploaded images |
| `GET` | `/api/test-gpt` | none | Health-check Gemini + Groq |
| `GET` | `/api/jobs` | none | List BullMQ job state |

⚠️ = exposed but does meaningful work (cost, side-effects). Lock these down first.

---

## 7. Environment variables

From `env.example`. Required vs. optional:

```env
# Required
MONGODB_URI=mongodb://localhost:27017
GOOGLE_API_KEY=...
JWT_SECRET=...           # NOTE: rbac.ts reads NEXTAUTH_SECRET — keep both in sync or pick one

# Required for auto-dentist flow
SERPER_API_KEY=...

# Required for workers
REDIS_URL=redis://localhost:6379

# Optional
GROQ_API_KEY=...                 # LLM fallback
CMS_BASE_URL=https://...         # Outbound publish hook
CMS_API_KEY=...
CLOUDINARY_*=...                 # Listed but unused since commit 065a1ef
NEXT_PUBLIC_APP_URL=http://localhost:3000
RATE_LIMIT_MAX=100
MONTHLY_COST_LIMIT_USD=500
```

> ⚠️ `env.example` lists `JWT_SECRET` but `src/lib/auth/rbac.ts:5` reads `process.env.NEXTAUTH_SECRET`. Set **both to the same value** until this is unified.

---

## 8. Deployment notes for integrators

- **Filesystem writes:** `/api/upload` writes to `public/uploads/` (`src/app/api/upload/route.ts:44`). Vercel, Netlify, Cloudflare Pages, and other serverless hosts have read-only filesystems — uploads will return `READ_ONLY_FILESYSTEM` 500s. Use a VPS, Render, Railway, Fly, or a container host. If you must deploy serverless, restore the Vercel Blob support that was removed in commit `1b1cc13` or swap in S3/R2.
- **Workers:** `workers/scrape.ts` and `workers/generate.ts` are BullMQ consumers. They must run as separate processes (`tsx workers/scrape.ts`, `tsx workers/generate.ts`) — they cannot run inside Next API handlers in production. Use PM2, systemd, or a separate container.
- **MongoDB connection** (`src/lib/db/connect.ts`) caches across hot reloads via `global.mongoose`, sets `tls: true`, IPv4-only (`family: 4`). Standard for MongoDB Atlas; adjust `tls` for self-hosted clusters.
- **Build step:** `npm run build` runs `next build && tsc --noEmit`. The TypeScript pass will fail the build on type errors — keep that in mind for CI.

---

## 9. Recommended integration recipe

For most "I want to display these blog posts on my main site" cases:

1. Deploy AiPostGen on a private host (VPS/Render/Railway) with MongoDB + Redis.
2. Lock down `/api/generate`, `/api/auto-dentist`, all `/api/articles/*` write routes behind `requireRole` or an API gateway.
3. Leave `GET /api/blogs` public (or behind a lightweight CDN cache).
4. From your main site, fetch `GET /api/blogs` with ISR / revalidation, render `markdown` with `react-markdown`, use `slug` as the canonical URL.
5. (Optional) Set `CMS_BASE_URL` + `CMS_API_KEY` to push published articles into your existing CMS instead of polling.
6. Replace the hardcoded admin login with your real auth before letting anyone touch the admin UI.

---

## 10. File map cheat-sheet

```
src/app/api/         ← REST surface (this is your integration boundary)
src/app/admin/       ← Editor UI (private, JWT-gated)
src/app/blogs/       ← Public read pages
src/lib/db/models/   ← Mongoose schemas — the contract for direct DB integration
src/lib/cms/client.ts ← Outbound publish webhook
src/lib/llm/         ← Gemini + Groq provider, prompts
src/lib/queue/       ← BullMQ definitions
src/lib/auth/rbac.ts ← JWT verify + role check helper (use to lock down APIs)
workers/             ← Long-running BullMQ consumers
scripts/autoDentistFlow.ts ← The end-to-end orchestrator
```
