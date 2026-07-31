# AiPostGen — Integration Guide

How to plug this repo into another project. For **deploying** it, see
[`DEPLOYMENT.md`](./DEPLOYMENT.md).

---

## 1. What this repo is

A standalone **Next.js 15 (App Router)** application that automates SEO blog
generation, plus a background worker. It is self-contained:

- the **web app** — admin UI, public pages, JSON API
- the **worker** — consumes Pub/Sub jobs (generate / scrape / auto-dentist)
- **Cloud SQL for MySQL** owns the canonical content
- **Cloud Storage** holds uploaded images

```
Serper (SERP) ──► scrape ──► Claude ──► Article row (MySQL)
                                          │
                  GET /api/blogs (public) ┤
                  POST → external CMS (optional, on publish)
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

Other models: `Source`, `Keyword`, `Job`, `User` (`src/lib/db/models/`).

> **Ids look like Mongo ObjectIds and are not.** This ran on DocumentDB; the data
> layer is now MySQL behind a Mongoose-compatible surface (`src/lib/db/model.ts`).
> Ids are `CHAR(24)` holding the original hex, so existing references and URLs
> still resolve, and nested documents (`content`, `seo`, `sourceRefs`) are JSON
> columns. **There is no MongoDB anywhere** — do not point a Mongo client at this.

---

## 2. Runtime requirements

| Dependency | Required? | Purpose |
|---|---|---|
| Node.js 20+ | Yes | Next.js 15 + tsx scripts |
| MySQL 8 (Cloud SQL) | Yes | Article / Source / Keyword storage |
| Pub/Sub | For the worker | job queue — replaced SQS. **No Redis, no BullMQ.** |
| Anthropic API key | Yes | the LLM — Claude |
| Serper API key | Yes for the auto flow | Google SERP scraping |
| A GCS bucket | For `/api/upload` | uploads go to `GCS_UPLOAD_BUCKET`, **not** the filesystem |
| Unsplash access key | Optional | stock imagery |

---

## 3. Integration patterns

### Pattern A — Consume the public blogs API (loosest coupling, recommended)

**`GET /api/blogs`** (`src/app/api/blogs/route.ts`) returns every `published`
article as `{ _id, slug, title, content, metaTitle, metaDescription,
featuredImage, createdAt, publishedAt, language }`.

```ts
const res = await fetch('https://blog.edentist.ai/api/blogs', {
  next: { revalidate: 300 },
});
const blogs = await res.json();
```

⚠️ **This endpoint is currently unauthenticated.** On AWS an ALB listener rule
required an `X-API-Key`; that rule was not ported and the application-level check
does not exist yet. Fine for public blog content, wrong for anything private.

### Pattern B — Outbound webhook to your CMS (push model)

On publish, `src/lib/cms/client.ts` (`cmsPublish`) `POST`s to
`${CMS_BASE_URL}/cms/articles` with an `x-api-key` header and an
`Idempotency-Key` set to the article id.

```env
CMS_BASE_URL=https://your-cms.example.com
CMS_API_KEY=<shared-secret>
```

```ts
// POST /cms/articles on your CMS
export async function POST(req: Request) {
  if (req.headers.get('x-api-key') !== process.env.AIPOSTGEN_KEY) {
    return new Response('Unauthorized', { status: 401 });
  }
  const idempotencyKey = req.headers.get('idempotency-key');
  const { slug, title, html, markdown, meta } = await req.json();
  await cms.upsertArticle({ slug, title, html, markdown, ...meta });
  return Response.json({ ok: true });
}
```

⚠️ **Failures are swallowed.** `cmsPublish` returns `{ success: true }` even when
the external POST fails (`client.ts:54`). If you depend on it, reconcile against
`Article.status === 'published'` instead of trusting the hook.

### Pattern C — Read the database directly (tightest coupling)

Query the `articles` table in the `edentist` database with a **MySQL** client.

```sql
SELECT slug, title, publishedAt FROM articles
WHERE status = 'published' AND language = 'en'
ORDER BY publishedAt DESC;
```

Connect through the Cloud SQL connector; the instance's public IP accepts one
authorized `/32` and requires TLS. Schema-coupled — only worth it when both
projects are co-owned.

### Pattern D — Drive the queue

Publish to the `aipostgen-jobs` Pub/Sub topic:

```json
{"type": "generate" | "scrape" | "auto-dentist", "payload": {...}}
```

The worker acks on success and dead-letters after 5 failed deliveries.

---

## 4. Programmatic generation

| Endpoint | What it does |
|---|---|
| `POST /api/auto-dentist` | full pipeline: search → scrape → keywords → articles. **2–3 minutes.** No body required. |
| `POST /api/generate` | generate articles from existing `Keyword` ids |

```bash
curl -X POST https://blog.edentist.ai/api/generate \
  -H "Content-Type: application/json" \
  -d '{"keywordIds":["507f1f77bcf86cd799439011"],"language":"en","wordCount":1500}'
```

The response carries per-article `articleId`, `slug`, `wordCount`, `cost`, plus a
summary with `totalCost` and `succeeded`/`failed`.

⚠️ Both are **unauthenticated and cost real money per call.** Put them behind a
gateway or `requireRole` before exposing them.

---

## 5. Auth model (current state)

- `POST /api/auth/login` checks `ADMIN_EMAIL` / `ADMIN_PASSWORD` (from Secret
  Manager — no longer hardcoded) and returns a JWT signed with `NEXTAUTH_SECRET`.
- The admin UI keeps that JWT in `localStorage`; no cookie is set.
- `src/middleware.ts` matches `/admin/*` but **does not enforce anything** — it
  calls `NextResponse.next()` and relies on per-request 401s.
- `requireRole(req, ['admin','editor'])` (`src/lib/auth/rbac.ts`) exists, but
  **most routes do not call it.**

Before this fronts anything that matters: wrap `/api/generate`,
`/api/auto-dentist` and every `/api/articles/*` write route, then decide cookie
vs. header auth and make `middleware.ts` actually enforce it.

---

## 6. API surface

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `POST` | `/api/auth/login` | none | issue admin JWT |
| `GET` | `/api/blogs` | none | public list of published articles |
| `POST` | `/api/auto-dentist` | none ⚠️ | run the full pipeline |
| `POST` | `/api/generate` | none ⚠️ | generate from keyword ids |
| `GET` | `/api/articles/draft` · `/draft/[id]` | none | list / fetch drafts |
| `PUT` | `/api/articles/[id]/update` | none | update body/meta |
| `POST` | `/api/articles/draft/[id]/publish` | none | publish (calls `cmsPublish`) |
| `POST` | `/api/articles/draft/[id]/schedule` · `/approve` · `/reject` | none | workflow transitions |
| `DELETE` | `/api/articles/draft/[id]/delete` | none | hard delete |
| `GET`/`POST`/`DELETE` | `/api/sources/*` | none | list / scrape / delete sources |
| `GET`/`POST` | `/api/keywords/list` · `/import` | none | list / bulk import |
| `GET` | `/api/metrics/published` | none | publish stats |
| `POST`/`GET` | `/api/upload` · `/upload/list` | none | upload to GCS / list |
| `GET` | `/api/test-gpt` | none | LLM connectivity check |
| `GET` | `/api/jobs` | none | queue state (backlog via Cloud Monitoring) |

⚠️ = does costly or destructive work. Lock these first.

---

## 7. Environment variables

See `env.example` and `DEPLOYMENT.md`. The ones an integrator sets:

```env
INSTANCE_UNIX_SOCKET=/cloudsql/<project>:<region>:<instance>
DB_USER= DB_PASSWORD= DB_NAME=
PUBSUB_JOBS_TOPIC=aipostgen-jobs
PUBSUB_JOBS_SUBSCRIPTION=aipostgen-jobs-push
GCS_UPLOAD_BUCKET=
ANTHROPIC_API_KEY=  SERPER_API_KEY=  UNSPLASH_ACCESS_KEY=
ADMIN_EMAIL=  ADMIN_PASSWORD=  NEXTAUTH_SECRET=
CMS_BASE_URL=  CMS_API_KEY=          # optional publish hook
AUTO_PUBLISH=false                    # true publishes with NO human review
```

---

## 8. Things that will bite you

- **`AUTO_PUBLISH=true` publishes generated articles with no review.** `false` in
  dev, deliberately.
- **`require.main === module` is not bundler-safe.** The CLI guards in
  `src/lib/autoDentistFlow/articlesai.ts` and `scripts/autoDentistFlow.ts` fire at
  process start inside a single-file esbuild bundle. They now also require
  `RUN_AUTO_DENTIST_CLI=1` — removing that check restarts a self-feeding cost loop.
- **Unique keys are collated `utf8mb4_bin`.** Mongo's unique index was
  case-sensitive, MySQL's default is not, and the default silently merged keywords
  differing only in capitalisation.
- **Queue depth comes from Cloud Monitoring, not from the queue.** Pub/Sub has no
  data-plane count API, so `getQueueCounts()` returns `configured: false` rather
  than a fake `0` when the metric is unavailable. In-flight and delayed counts do
  not exist at all.
- **`npm run build` runs `next build && tsc --noEmit`** — a type error anywhere,
  including in `scripts/`, fails the image build.

---

## 9. File map

```
src/app/api/           ← REST surface — your integration boundary
src/app/admin/         ← editor UI (JWT-gated)
src/app/blogs/         ← public read pages
src/lib/db/model.ts    ← Mongoose-compatible layer over MySQL
src/lib/db/sql.ts      ← mysql2 pool, ObjectId-shaped id generation
src/lib/db/models/     ← schemas — the contract for direct DB access
src/lib/queue/         ← Pub/Sub publish + Monitoring REST backlog metric
src/lib/llm/           ← Claude provider and prompts
src/lib/cms/client.ts  ← outbound publish webhook
src/lib/auth/rbac.ts   ← JWT verify + role check
src/cloudrun/worker.ts ← worker entrypoint (Pub/Sub push consumer)
migrations/            ← the DocumentDB → MySQL schema
```
