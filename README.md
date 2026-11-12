# Signal Desk — AI Social Content Agent

Signal Desk is a human-in-the-loop social media content workspace. It turns a topic into three tone variations, keeps every draft in an approval queue, lets a human edit and approve copy, and moves approved posts onto a visual calendar. In demo mode, the scheduler marks due posts as **would post** instead of publishing to a live platform.

## What is included

| Area | Behavior |
| --- | --- |
| Content generation | Three variants per topic: professional, casual, and punchy. Uses Groq Llama when `GROQ_API_KEY` is configured; otherwise uses a deterministic local fallback so the demo always works. |
| Approval queue | Inline copy editing, approve, reject, and status pills for draft, approved, scheduled, and would post. |
| Scheduling | Approved posts can be assigned a date/time and platform. Scheduled content is displayed on the calendar. |
| Dispatcher | `content.runDue` marks due scheduled posts as `posted` with a `usedAt` timestamp. This is the safe simulated posting mode. |
| Calendar | Month grid with platform labels, scheduled post cards, and dispatcher status. |
| Preference learning | Simple counts of used posts by tone and platform. This is not engagement analytics. |
| Persistence | MySQL/TiDB through Drizzle when `DATABASE_URL` is available, with an in-memory seeded fallback for preview/demo mode. |

## Product flow

1. Enter a topic in **Draft engine**.
2. Review the three generated variants in the approval queue.
3. Edit copy if needed, then approve a variant.
4. Select a date/time and schedule it.
5. Open **Content calendar** to see the publishing rhythm.
6. Run the dispatcher endpoint/job to mark due posts as “would post.”

## Stack

The deployed app uses the supported full-stack WebDev template: React 19, TypeScript, Tailwind CSS, Express, tRPC, Drizzle, and MySQL/TiDB. The generation adapter can call Groq's OpenAI-compatible endpoint with Llama models, while the rest of the app remains provider-agnostic.

## Local development

```bash
pnpm install
cp .env.example .env
pnpm db:push
pnpm dev
```

For a lightweight preview, `DATABASE_URL` can be omitted. The app will use its seeded memory store. For durable data, configure a MySQL/TiDB connection string.

### Environment variables

- `DATABASE_URL` — MySQL/TiDB connection string. Optional for demo mode.
- `GROQ_API_KEY` — Optional Groq API key. When present, generation calls `llama-3.3-70b-versatile` by default.
- `GROQ_MODEL` — Optional override for the Groq model.

## API surface

The UI uses typed tRPC procedures under `/api/trpc`:

| Requested capability | Procedure |
| --- | --- |
| `POST /api/content/generate` | `content.generate` mutation |
| `GET /api/content/queue` | `content.queue` query |
| `PUT /api/content/{id}/approve` | `content.approve` mutation |
| `POST /api/content/{id}/schedule` | `content.schedule` mutation |
| `GET /api/content/calendar` | `content.calendar` query |

The equivalent REST routes can be added as a thin adapter later if a live platform or external client needs them; the typed procedures are the canonical app contract in this build.

## Scheduler notes

The safe default is simulation-only. There is no live LinkedIn/X/Instagram token and no post is published externally. For a production dispatcher, connect the chosen platform API behind a server-side adapter and keep the human approval check in place. The scheduled-work integration should invoke a `/api/scheduled/*` HTTP handler rather than relying on an in-process timer, because the managed runtime can scale instances down between requests.

## Docker Compose

`docker-compose.yml` provides a local MySQL 8 service for durable development. The managed deployment supplies its own database environment and does not require running this file.
