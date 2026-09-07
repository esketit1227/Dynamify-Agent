# Dynamify Scout

An internal AI prospect-research and personalized-demo generation system for
Dynamify. Scout independently researches a prospective customer's website,
identifies the single strongest conversion/personalization opportunity,
builds a design-preserving before/after preview of one page, and drafts a
short first-touch outreach email — all before a human ever has to open the
prospect's site themselves.

Scout is **not** the Dynamify product. It's the outbound engine that proves
Dynamify's thesis (autonomous website personalization) is easy to demonstrate
for a given prospect, then prepares the evidence to start a sales
conversation.

## Pipeline

```
Lead → ICP qualification → website acquisition/exploration → company
research → competitor research → conversion analysis → personalization
analysis → opportunity scoring/selection → demo strategy → preview
generation → preview QA → internal report → outreach draft → [human
approval] → outreach send → reply tracking → CRM outcome → eval dataset
```

Everything up to and including the outreach draft runs automatically
(`src/lib/pipeline/run-lead.ts`). Sending an email always requires an
explicit human approval step — there is exactly one code path that can send
an email (`src/lib/pipeline/send-outreach.ts`), and it refuses to run unless
a draft's status is `approved`.

## Architecture

- **Next.js 15 (App Router) + TypeScript + Tailwind** — the internal
  dashboard (`src/app`) and API routes (`src/app/api`).
- **Postgres + Drizzle ORM** (`src/lib/db/schema.ts`) — one table per pipeline
  stage's output, plus a `pipeline_stage_events` audit trail so every agent
  call is inspectable after the fact. See the schema file itself for the
  full data model; it mirrors the pipeline diagram above end to end,
  including the learning/eval dataset.
- **pg-boss** (`src/lib/queue`) — Postgres-backed job queue. The web app only
  ever enqueues a lead's pipeline run; a separate worker process
  (`npm run worker`) executes it, so a multi-minute run (many OpenAI calls +
  Playwright navigations) never blocks a web request.
- **OpenAI Responses API** (`src/lib/agents/openai-client.ts`) — every agent
  calls `runStructured()`, which uses `client.responses.parse` with a Zod
  schema (`openai/helpers/zod`) so a malformed or incomplete model output
  fails loudly instead of writing bad data. Research agents can use the
  hosted `web_search` tool; writing agents (report, outreach) don't need it.
- **Playwright** (`src/lib/capture`) — deterministic browser capture for the
  Website Explorer and for rendering preview screenshots. Chromium is
  expected to already be installed (`PLAYWRIGHT_BROWSERS_PATH`) — nothing in
  this codebase calls `playwright install`.
- **Zod** (`src/lib/agents/schemas.ts`) — the typed contract for every
  agent's input/output, shared between the OpenAI structured-output config
  and the Drizzle schema's `$type<...>()` jsonb columns.

### Agents (`src/lib/agents`)

| File | Role |
|---|---|
| `icp-qualifier.ts` | Agent A — decides whether a lead is worth the full pipeline |
| `website-explorer.ts` | Agent B — budgeted crawl + page classification |
| `company-researcher.ts` | Agent C — product/audience/positioning, source-cited |
| `competitor-researcher.ts` | Agent D — 3–5 competitors, gaps relevant to Dynamify |
| `conversion-analyst.ts` | Agent E — the 100-point Dynamify scoring framework |
| `personalization-analyst.ts` | Agent F — 8-dimension diversity assessment + detectability |
| `opportunity-selector.ts` | Selects exactly one primary opportunity (spec 1.3 criteria) |
| `demo-strategist.ts` | Plans the before/after preview for the primary opportunity |
| `preview-generator.ts` | Produces bounded DOM patches (not a full HTML rewrite) |
| `preview-qa.ts` | Deterministic + model checks before a human sees the preview |
| `report-generator.ts` | Internal-only analysis report |
| `outreach-drafter.ts` | Short, plain-text, link-free first-touch email |
| `reply-classifier.ts` | Sentiment/next-action classification for logged replies |

### Design-preserving previews

Section 1.4 of the product spec is the trickiest constraint: the generated
page must look like the prospect's own site, "but smarter" — never an
unrelated redesign. `src/lib/preview/html.ts` is how that's enforced
mechanically rather than just by prompting:

1. `preparePage()` loads the real captured HTML with `cheerio`, strips
   `<script>` tags (a static preview doesn't need them, and it keeps the
   preview safe to render), injects a `<base href>` so relative CSS/image/
   font URLs keep resolving against the real site, and tags every
   text-bearing/interactive element with a stable `data-scout-id`.
2. The model sees a compact **outline** of just those tagged elements — not
   the full page markup — and returns a bounded list of DOM patches
   (`set_text` / `set_html` / `set_attribute` / `remove`), each addressed by
   `[data-scout-id="…"]`.
3. `applyPatches()` applies them to the prepared HTML. Everything the model
   wasn't explicitly asked to change — logo, layout, CSS, imagery, nav — is
   untouched byte-for-byte.

## Getting started

```bash
cp .env.example .env.local   # then fill in DATABASE_URL and OPENAI_API_KEY
npm install
npm run db:generate          # generate SQL migrations from the schema
npm run db:migrate           # apply them
npm run seed                 # optional: two sample leads
npm run dev                  # the dashboard, on :3000
npm run worker               # in a second terminal — required to actually run pipelines
```

Open the dashboard, create a lead (or use a seeded one), and click **Run
pipeline**. Progress shows up as stage chips on the lead's page as the worker
processes it; refresh (or wait — the button calls `router.refresh()`) to see
results land.

### Required environment variables

See `.env.example` for the full list and inline explanations. At minimum:

- `DATABASE_URL` — Postgres connection string (used by both Drizzle and
  pg-boss).
- `OPENAI_API_KEY` — every research/analysis/generation agent needs it.

`EMAIL_PROVIDER` defaults to `log`, which records what an outreach send
would have done without contacting a real provider — intentional, since
outbound email should only go live after a real provider is deliberately
configured and approved for use.

### Storage

`STORAGE_DRIVER=local` (default) writes captured screenshots/HTML and
generated previews to `./storage` on disk, served back to the dashboard via
`src/app/storage-files/[...path]/route.ts`. Switch to `STORAGE_DRIVER=s3` and
implement `S3StorageDriver` in `src/lib/capture/storage.ts` for a real
deployment — the interface is already in place so no caller needs to change.

## What's intentionally out of scope here

- **Auth.** This is an internal tool; put it behind SSO/VPN before exposing
  it beyond localhost. No login flow is implemented.
- **A real email provider.** `src/lib/email/provider.ts` has a working Resend
  implementation gated behind `EMAIL_PROVIDER=resend` + `RESEND_API_KEY`, but
  defaults to logging — flip it only once a provider is actually approved
  for outbound use.
- **Inbound reply ingestion.** Replies are logged by a human pasting them in
  (`POST /api/leads/:id/replies`), which runs them through the reply
  classifier. Wiring a real inbox (e.g. a Postmark/Resend inbound webhook)
  is a natural next step but isn't part of this scaffold.
- **S3 storage driver.** Interface is defined; implementation is a stub that
  fails loudly rather than silently no-op'ing, so it's obvious when a real
  bucket needs to be wired in.
