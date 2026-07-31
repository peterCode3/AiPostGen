# AiPostGen — Deployment

AI blog generation platform: a Next.js app with an admin UI, plus a background
worker. Runs on **Google Cloud Run** in `me-central2` (Dammam, Saudi Arabia).

---

## Services

| Component | Cloud Run service | Role |
|---|---|---|
| Next.js app + admin UI + blog API | `aipostgen-web` | serves `blog.edentist.ai`; publishes jobs |
| Pub/Sub push consumer | `aipostgen-worker` | runs generate / scrape / auto-dentist |

`aipostgen-web` is reachable at `https://blog.edentist.ai` via the shared load
balancer. `aipostgen-worker` is **private** (`--no-allow-unauthenticated`) and is
invoked only by Pub/Sub push with an OIDC token.

---

## Backing services

| Concern | What it uses |
|---|---|
| Database | **Cloud SQL for MySQL** — instance `edentist-db`, database `edentist` |
| Queue | **Pub/Sub** — topic `aipostgen-jobs`, dead-letter `aipostgen-jobs-dlq` |
| Object storage | **Cloud Storage** — `edentist-dev-aipostgen-assets` |
| Schedule | **Cloud Scheduler** — `aipostgen-daily-auto-dentist` (currently **PAUSED**) |
| LLM | Anthropic Claude via `ANTHROPIC_API_KEY` from Secret Manager |

### There is no MongoDB

This ran on DocumentDB. GCP has no managed MongoDB, and at 94 MB across five
collections, standing up a replica set was not justified — so the data layer was
ported to the **same Cloud SQL instance the rest of the platform uses**.

`src/lib/db/model.ts` implements a Mongoose-compatible surface over MySQL. A
survey of `src/` found only `find/findOne/findById/create/save/updateOne/...`
plus `$set/$in/$regex/$or/$gte/$exists` in use — **no `aggregate()`, no
`populate()`** — so implementing exactly that surface left all ~20 API route
files unmodified.

Schema notes worth knowing (`migrations/`):
- Ids are `CHAR(24)` holding the original Mongo ObjectId hex, so cross-document
  references survived a straight copy and `/api/articles/draft/<id>` URLs still resolve.
- Nested sub-documents (`content`, `seo`, `sourceRefs`, `review`) are native JSON.
  Only queried fields get real columns and indexes.
- Unique keys are collated `utf8mb4_bin`. Mongo's unique index is
  case-**sensitive**; MySQL's default is not, and it collapsed 5 keyword pairs
  that differed only in capitalisation — 52 articles referenced those ids.

---

## Deploying

Push to `main` → deploys to **dev**.

```bash
git push origin main
```

Manual: Actions → **Deploy to GCP (Cloud Run)** → choose `service`
(`both` / `web` / `worker`) and `target` (`dev` / `prod`).

Authentication is **Workload Identity Federation** — no GCP credentials in this
repository. GitHub mints a short-lived OIDC token per run; GCP verifies it
against a condition pinned to this repo's immutable numeric ID.

---

## Environment

| Variable | Purpose |
|---|---|
| `INSTANCE_UNIX_SOCKET` | Cloud SQL socket, `/cloudsql/<project>:<region>:<instance>` |
| `DB_USER` / `DB_PASSWORD` / `DB_NAME` | database credentials (password from Secret Manager) |
| `PUBSUB_JOBS_TOPIC` | `aipostgen-jobs` |
| `PUBSUB_JOBS_SUBSCRIPTION` | `aipostgen-jobs-push` — used for the backlog metric |
| `GCS_UPLOAD_BUCKET` | `edentist-dev-aipostgen-assets` |
| `AUTO_PUBLISH` | **`false` in dev.** `true` publishes generated articles without review |
| `ANTHROPIC_API_KEY`, `SERPER_API_KEY`, `UNSPLASH_ACCESS_KEY` | from Secret Manager |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `NEXTAUTH_SECRET` | admin auth, from Secret Manager |

---

## Queue behaviour differs from SQS

| | SQS | Pub/Sub |
|---|---|---|
| Min delivery attempts | 3 | **5** (enforced floor) |
| Queue depth | `GetQueueAttributes` | no data-plane API — read from **Cloud Monitoring** |
| In-flight / delayed counts | available | **not available** — always 0 |
| Topic with no subscription | n/a | **silently discards messages** |

`getQueueCounts()` returns `configured: false` when the backlog metric is
unavailable, rather than a fake `0` — so the admin view can tell "empty queue"
apart from "no metric".

It deliberately avoids `@google-cloud/monitoring`: that client is gRPC-based and
loads `protos.json` from disk at runtime, which Next.js does not trace into its
build output, failing with `ENOENT: no such file or directory, open 'protos.json'`.
It calls the Monitoring REST API instead.

---

## ⚠️ `require.main === module` is not bundler-safe

`src/lib/autoDentistFlow/articlesai.ts` and `scripts/autoDentistFlow.ts` both end
with a CLI guard. That guard is safe under Lambda but **fires at process startup**
inside a single-file esbuild bundle run directly (`node dist/worker.cjs`).

It once launched the full auto-dentist flow on every container start — Serper
search, scrape, Claude extraction — which enqueued jobs that woke the worker
again. A self-feeding cost loop.

Both guards now require an explicit opt-in:

```js
if (require.main === module && process.env.RUN_AUTO_DENTIST_CLI === '1') {
```

**Never remove that env check.**

---

## Verifying a deploy

```bash
curl -s -o /dev/null -w '%{http_code}\n' https://blog.edentist.ai/
curl -s https://blog.edentist.ai/api/blogs | head -c 200      # expect real articles

# worker: publish a job and watch it process
gcloud pubsub topics publish aipostgen-jobs --project=edentist-dev \
  --message='{"type":"scrape","payload":{"urls":["https://example.com"]}}'
gcloud logging read \
  'resource.labels.service_name="aipostgen-worker" AND textPayload:"[worker]"' \
  --project=edentist-dev --limit=5 --freshness=5m --format='value(textPayload)'
```

Data-layer regression suite (runs real SQL against a real database):

```bash
DB_HOST=<ip> DB_USER=edentist_app DB_PASSWORD=<pw> DB_NAME=edentist \
  npx tsx scripts/verify-sql-layer.ts
```

---

## Open item

`blog.edentist.ai/api/blogs*` is currently reachable **without** the `X-API-Key`.
The AWS load balancer enforced that with a listener rule; the GCP equivalent is
intentionally not reproduced (it is brittle, and rotating the key without editing
the rule caused silent 403s). The check belongs in application middleware.
**This must close before production.**
