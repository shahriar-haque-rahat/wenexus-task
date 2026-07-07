# Progress Log — Event Booking System

Status legend: ⬜ not started · 🟨 in progress · ✅ done · ⛔ blocked

## Phase Status
| Phase | Description                        | Status | Last updated |
|-------|-------------------------------------|--------|--------------|
| 0     | Scaffolding                         | ✅     | 2026-07-07   |
| 1     | DB schema & seed                    | ✅     | 2026-07-07   |
| 2     | Events module                       | ✅     | 2026-07-07   |
| 3     | Bookings module (skeleton)           | ✅     | 2026-07-07   |
| 4     | Queue integration (BullMQ)          | ✅     | 2026-07-07   |
| 5     | Concurrency & idempotency safety    | ✅     | 2026-07-07   |
| 6     | Validation & error handling         | ✅     | 2026-07-07   |
| 7     | Frontend dashboard                  | ✅     | 2026-07-07   |
| 8     | Tests                               | ✅     | 2026-07-07   |
| 9     | README & final polish               | ✅     | 2026-07-07   |

## Task-Level Log
_(append entries here as each task is completed — newest at the top)_

### [2026-07-07] Phase 9 — README & final polish complete
- What was done: Wrote the root `README.md` (overview, architecture, quick start via
  docker-compose, env vars, API reference, design decisions for overbooking/idempotency/
  retry, testing, project structure, and "what I'd improve"), with a dashboard screenshot.
- Fresh-clone sanity check: cloned the repo to a clean directory and followed the README
  against a brand-new database (`eventbooking_fresh`) on the local PG cluster — `npm install`
  worked with no pending scripts (the committed `allowScripts` allowlist travels), both
  migrations applied, seed inserted 3 events, the server started, and POST→worker→CONFIRMED
  worked end-to-end. (Docker itself can't run on this box; the equivalent real services were
  used — see the environment note below.)
- Commit: `docs: README + final polish`

### [2026-07-07] Adversarial code review + hardening
- Ran a multi-agent adversarial correctness review of the backend; it surfaced 6 confirmed
  issues, all fixed (test-first where a behaviour changed):
  1. (HIGH) Same booking processed concurrently (BullMQ at-least-once re-delivery) could
     double-deduct seats — the PENDING guard used an unlocked read. Fixed by locking the
     booking row `FOR UPDATE` inside the transaction; proven by a new failing-first test
     (same booking ×8 concurrent → seats deducted once).
  2. (MED) Booking could stay `PENDING` forever after retries were exhausted. Added an
     `@OnWorkerEvent('failed')` handler + `failIfPending` to mark it FAILED.
  3. (MED) Booking persisted but enqueue lost → orphaned. `create()` now re-enqueues a
     still-PENDING existing booking (idempotently) on a duplicate request.
  4. (MED) `redis.config.ts` ignored the `/<db>` index and `rediss://` TLS — now handled.
  5. (LOW) Empty filter params (`?status=`) returned 400 — now treated as "no filter" (200).
- Verification: full suite green (5 unit suites / 23 tests + 2 integration suites / 3 tests);
  overbooking and duplicate-requestId re-verified end-to-end against the live server.
- Commit: `fix: harden concurrency, failure handling, and input robustness`

### [2026-07-07] Phase 8 — Tests complete
- What was done: Added unit tests — `create-booking.dto.spec.ts` (8 cases covering the
  class-validator rules, incl. the accepted non-UUID requestId) and
  `bookings.service.spec.ts` (3 cases with mocked repos/queue: 404 on unknown event,
  create+enqueue for a new requestId, return-existing-without-enqueue for a duplicate).
  The concurrency and idempotency integration tests were already added test-first in
  Phase 5. Unit specs need no infrastructure; integration specs run via
  `npm run test:integration`.
- Verification performed: `npm test` → 3 suites / 12 tests pass; `npm run test:integration`
  → 2 suites / 2 tests pass (concurrency + idempotency), against the live Postgres.
- Commit: `test: booking logic + concurrency tests`

### [2026-07-07] Phase 7 — Frontend dashboard complete
- What was done: Built a clean, self-contained React+TS dashboard (no CDN/font deps).
  `api.ts` client (VITE_API_URL), `types.ts`, and components: `BookingForm`
  (event/name/email/seats → POST with a `crypto.randomUUID()` requestId),
  `BookingsTable` (reference, event, customer, seats, status badge), `FiltersBar`
  (event + status), `Pagination`, `StatusBadge`. `App.tsx` orchestrates state, filters,
  pagination, loading + error states, and polls every 3s so PENDING bookings settle
  live. Added `frontend/.env.example` (VITE_API_URL), removed unused Vite scaffold
  assets, restyled with a plain professional theme.
- Verification performed: `npm run build` (tsc + vite) passes. Drove the built app in a
  real headless browser (Playwright) against the live backend: events populate the
  dropdown, submitting a booking shows the 202 reference + PENDING, the row appears and
  settles to CONFIRMED via worker + polling, the status filter works, and there were
  zero console errors. Screenshot captured.
- Commit: `feat: frontend dashboard`

### [2026-07-07] Phase 6 — Validation & error handling complete
- What was done: Hardened the global `ValidationPipe` with `forbidNonWhitelisted`
  (unknown properties are now rejected). Added `AllExceptionsFilter` producing a
  consistent JSON error shape `{ statusCode, error, message, path, timestamp }`;
  unexpected errors log server-side and return a generic 500 (no leakage). Enabled
  CORS for the frontend. Registered both globally in `main.ts`.
- Verification performed (live server, bodies via curl):
  - 400 validation → `{statusCode:400,error:"Bad Request",message:["customerEmail must be
    an email","seats must not be less than 1"],...}`.
  - 400 unknown field → `message:["property hacker should not exist"]`.
  - 404 unknown event → `{statusCode:404,error:"Not Found",message:"Event 999 not found"}`.
  - 202 on valid create; duplicate requestId → 202 returning the SAME booking id
    (idempotent, not 409).
- Commit: `feat: validation + error handling polish`

### [2026-07-07] Phase 5 — Concurrency safety + idempotency complete (TDD)
- Approach (test-first): extracted the worker's logic into `BookingProcessingService`
  so it can be driven concurrently by tests; the queue processor is now a thin adapter
  running at `concurrency: 10`.
- RED: `booking-processing.integration-spec.ts` fires 20 concurrent 1-seat bookings at a
  5-seat event. Against the naive check-then-deduct it FAILED — 20 confirmed vs capacity 5
  (overbooking directly observed).
- GREEN: replaced check-then-deduct with an atomic conditional UPDATE
  (`UPDATE events SET available_seats = available_seats - :n WHERE id = :id AND
  available_seats >= :n RETURNING id`) inside a transaction; `affected === 1` ⇒ CONFIRMED,
  else FAILED. (Debugged a subtlety: TypeORM's `query()` returns a `[rows, affected]`
  tuple — probed and confirmed — so the affected count, not `rows.length`, is the signal.)
  Test passes 3× reproducibly.
- CHECK backstop: migration `AddAvailabilityCheck` adds `available_seats >= 0` and
  `available_seats <= total_seats`; verified Postgres rejects a manual `available_seats=-1`.
- Idempotency (TDD): RED `bookings-idempotency.integration-spec.ts` (2nd create threw a
  unique violation) → GREEN via fast-path return-existing + catch-unique-violation
  (returns the race winner); `isUniqueViolation` helper. Test passes.
- End-to-end verification against the LIVE server (through the real BullMQ worker), run 2×:
  40 concurrent 1-seat POSTs vs the 20-seat event → exactly 20 CONFIRMED, 20 FAILED,
  availableSeats 0 (no overbooking); same requestId POSTed 5× concurrently → 1 booking id
  returned, 1 row in DB. `npm test` (unit) and `npm run test:integration` both green.
- Added `test:integration` script (runs `*.integration-spec.ts` in-band); unit `npm test`
  excludes them so it needs no infrastructure.
- Commit: `feat: concurrency-safe seat deduction + idempotent requestId handling`

### [2026-07-07] Phase 4 — Async booking processing (BullMQ) complete
- What was done: Added a Redis connection builder (`config/redis.config.ts`, parses
  REDIS_URL), wired `BullModule.forRootAsync` in `AppModule` and registered the
  `bookings` queue (defaultJobOptions: attempts 3, exponential backoff 1000ms).
  `BookingsService.create` now enqueues a `process-booking` job (jobId = booking id)
  after inserting the PENDING row — the controller does no business logic.
  `BookingsProcessor` (WorkerHost) loads the booking, validates the event, checks
  availability, deducts seats and marks CONFIRMED, or marks FAILED with a reason.
  Retry policy documented in code: business outcomes (event gone, sold out) return
  normally (no retry); unexpected errors propagate so BullMQ retries with backoff.
- Verification performed (server on 3100, real Redis + Postgres):
  - POST returned 202 with status PENDING immediately.
  - After the worker ran: a valid booking → CONFIRMED and event 3 availability
    20 → 18; an oversized booking (100 seats vs 50) → FAILED "Not enough seats
    available". Confirmed via GET /bookings, GET /events, and worker logs.
  - Reset DB + flushed Redis afterwards for a clean Phase 5 starting state.
- Note: the worker's check-then-deduct is intentionally still racy here; Phase 5
  adds the failing concurrency test first, then the atomic fix.
- Commit: `feat: async booking processing via BullMQ worker`

### [2026-07-07] Phase 3 — Bookings module (skeleton) complete
- What was done: Added `BookingsModule` with `CreateBookingDto` (class-validator),
  `QueryBookingsDto` (page/limit/eventId/status with coercion), `BookingResponseDto`,
  and a shared `PaginatedResponse<T>` envelope. `POST /bookings` validates input,
  rejects unknown events with 404, creates a PENDING booking and returns 202 with
  the booking reference (UUID id). `GET /bookings` returns a paginated list
  (newest first) filterable by event and status. Enabled a global `ValidationPipe`
  (`transform`, `whitelist`) in `main.ts` (hardened further in Phase 6). No queue
  yet — bookings stay PENDING until Phase 4's worker.
- Verification performed (server on 3100 against local substrate):
  - Valid POST with the assignment's sample non-UUID requestId
    (`7f3c2a10-...-booking-001`) → HTTP 202, status PENDING, UUID id, timestamps set.
  - Invalid POST (seats=0, bad email, empty name) → HTTP 400.
  - Unknown eventId (999) → HTTP 404.
  - GET /bookings → correct paginated envelope; `?status=PENDING&eventId=1` filters
    to the booking; `?status=CONFIRMED` returns empty. `npm run build` green.
- Commit: `feat: bookings endpoints (pre-queue)`

### [2026-07-07] Phase 2 — Events module complete
- What was done: Wired the root `TypeOrmModule.forRootAsync` (via `ConfigService`)
  and global `ConfigModule` into `AppModule`. Added `EventsModule` (controller +
  service + `EventResponseDto`) exposing `GET /events`, returning id, name, date
  (ISO), priceCents, totalSeats, availableSeats, ordered by date. Repurposed the
  generated root controller into a `GET /health` endpoint and updated its spec.
- Decision: backend runs on port 3100 for local verification because an unrelated
  process already holds 3000 on this shared box; committed `.env.example` keeps
  the conventional 3000. (Logged under Decisions.)
- Verification performed: Started the server against the local substrate; `GET
  /health` → `{"status":"ok",...}`; `GET /events` → the 3 seeded events with the
  exact DTO shape, ordered by date. `npm run build` and `npm test` (1 passing)
  both green.
- Commit: `feat: events module`

### [2026-07-07] Phase 1 — DB schema, migrations, seed complete
- What was done: Added `Event` and `Booking` TypeORM entities
  (`src/entities/`), a shared `buildDataSourceOptions` factory (`src/config/`),
  a standalone `AppDataSource` for the CLI (`src/data-source.ts`), the initial
  migration `1720000000000-InitSchema` (creates `events` + `bookings` with UNIQUE
  request_id, FK, seats>0 and status CHECKs, and indexes), and an idempotent seed
  script for 3 events (`src/database/seed.ts`). Added npm scripts
  `migration:run/revert/show` and `seed`, a `ts-node` override in tsconfig
  (commonjs/node resolution) so the CLI runs under Nest's nodenext config, and
  `dotenv` as a dependency. `synchronize` is off — schema is migration-owned.
- Verification performed: `npm run migration:run` applied the migration; `npm run
  seed` inserted 3 events. Independently confirmed via `psql`: tables
  `events`/`bookings`/`migrations` exist; 3 seed rows with correct seats/prices;
  constraints present (CHK_bookings_seats_positive, CHK_bookings_status,
  FK_bookings_event, unique index IDX_bookings_request_id); migration recorded.
  `npm run build` (full nodenext type-check) passes.
- Commit: `feat: db schema, migrations, seed data`

### [2026-07-07] Phase 0 — Scaffolding complete
- What was done: Generated the NestJS backend (`backend/`, Nest 11 + TS 5.7, ESLint/Prettier
  from the CLI) and the Vite React+TS frontend (`frontend/`, Vite 8 + React 19). Installed
  backend runtime deps (`@nestjs/config`, `@nestjs/typeorm` + `typeorm` + `pg`,
  `@nestjs/bullmq` + `bullmq`, `class-validator`, `class-transformer`). Added root
  `docker-compose.yml` (postgres:16-alpine + redis:7-alpine with healthchecks) and
  `backend/.env.example` (PORT, DATABASE_URL, REDIS_URL).
- Note: npm 11.16 blocks dependency install scripts by default (`allow-scripts=[""]`). Ran
  `npm approve-scripts --all`, which records an `allowScripts` allowlist in each `package.json`
  that travels with the repo, so a fresh `npm install` runs the approved native builds.
- Verification performed: `npm run build` succeeds in `backend/`; `npm run build` succeeds in
  `frontend/` (Vite build ✓); `npx vite --version` → 8.1.3. Confirmed `backend/.env` is
  gitignored and `.env.example` is tracked.
- Commit: `chore: scaffold monorepo, docker-compose, tooling`

### [2026-07-07] Phase 0 — Project started
- What was done: Read IMPLEMENTATION_PLAN.md, AI_AGENT_PROMPT.md, PROGRESS.md, and the
  assignment PDF in full. Probed the build environment and stood up a local verification
  substrate (see Decisions Log). Marked the project as started.
- Verification performed: Confirmed real PostgreSQL 18.4 (port 5433, own trust cluster) and
  Redis 7.4.9 (port 6379) are reachable — these back the end-to-end concurrency/idempotency
  verification the plan requires.
- Commit: (this entry committed with the initial repo + scaffolding tasks)

## Decisions Log
_(record any judgment calls made on ambiguous spec points)_

- **Decision:** ORM = **TypeORM** (not Prisma).
  **Reasoning:** First-class NestJS integration (`@nestjs/typeorm`), straightforward SQL
  migrations, and fine-grained control over the raw atomic `UPDATE ... WHERE available_seats >= n`
  and `SELECT ... FOR UPDATE` needed for overbooking safety, plus native `CHECK` constraints.

- **Decision:** `requestId` is validated as a **required non-empty string** (max length 200),
  NOT a strict UUID.
  **Reasoning:** The assignment's own sample payload uses
  `"requestId": "7f3c2a10-9b1e-4d5a-8c6f-booking-001"`, whose final segment (`booking-001`) is
  not valid hex, so it is not a real UUID. Enforcing `@IsUUID()` would reject the documented
  sample and fail "it runs by following your README/spec." The spec only calls it a
  "client-generated requestId," so a non-empty string is the correct contract.

- **Decision:** `events.id` = integer identity; `bookings.id` = UUID (server-generated), which
  doubles as the **booking reference** returned in the 202 response.
  **Reasoning:** The sample payload uses `"eventId": 1` (an integer). A UUID booking id is a
  natural, non-guessable, shareable reference and avoids leaking booking counts.

- **Decision:** Overbooking prevention = **atomic conditional UPDATE** inside a transaction:
  `UPDATE events SET available_seats = available_seats - :n WHERE id = :id AND available_seats >= :n`,
  backed by a `CHECK (available_seats >= 0)` constraint. `rowCount === 1` ⇒ CONFIRMED;
  `rowCount === 0` ⇒ FAILED (sold out).
  **Reasoning:** The row-level write lock Postgres takes during UPDATE serializes concurrent
  updates to the same event row, and the `WHERE ... >= :n` guard makes negative availability
  impossible without needing an explicit advisory/pessimistic lock. Simpler and provably safe.
  (To be implemented + proven with a failing-first concurrency test in Phase 5.)

- **Decision:** Idempotency = `bookings.request_id` **UNIQUE** constraint + BullMQ `jobId = requestId`.
  **Reasoning:** Duplicate detected at insert time (unique violation ⇒ return existing booking)
  and at enqueue time (same jobId is de-duplicated by BullMQ), so a repeated `requestId` never
  creates a second booking or a second job. (Implemented + proven in Phase 5.)

- **Decision:** Retry/backoff = BullMQ `attempts: 3`, exponential backoff base `1000ms`.
  Transient errors (DB connection blips) throw and are retried; business outcomes (event not
  found, sold out) mark the booking FAILED and return **without** throwing (no retry).
  **Reasoning:** Retrying a business failure is pointless and would waste attempts; only
  infrastructure blips deserve a retry.

- **Decision:** Pagination defaults `page=1`, `limit=20`, `limit` capped at `100`.
  **Reasoning:** Sensible, common defaults; cap prevents unbounded result sets.

- **Decision:** A duplicate `requestId` is handled **idempotently** (HTTP 202 with the
  original booking), not with a 409 Conflict.
  **Reasoning:** `requestId` is an idempotency key; the correct semantic for replaying an
  idempotent request is to return the same result, not an error. The plan lists 409 as
  "if applicable" — with idempotency it is not.

## Blockers / Open Questions
_(anything genuinely blocking progress — flag here rather than stalling silently if resolvable)_

- **Environment note (not blocking):** This Windows dev box has **no Docker and no WSL**, so the
  plan's `docker-compose up` cannot be executed *on this machine*. The `docker-compose.yml` is
  still delivered (a required bonus) and written to standard, correct configuration. For local
  end-to-end verification I instead run **real** equivalent services: a throwaway PostgreSQL 18.4
  cluster (created from the machine's installed PG binaries via `initdb`, trust auth, port 5433)
  and a portable Redis 7.4.9 (port 6379). These provide genuine multi-connection Postgres row
  locking and a real BullMQ-compatible Redis, so the overbooking and idempotency guarantees are
  verified against real services — not mocks. The app reads all connection settings from env
  vars, so pointing it at docker-compose vs. the local substrate is purely configuration.
