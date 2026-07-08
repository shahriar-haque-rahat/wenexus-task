# Event Booking System

A small full‑stack event‑booking service built for the Wenexus take‑home.
Customers browse events and request seats; bookings are **accepted instantly**
(HTTP 202) and processed **asynchronously** by a queue worker that guarantees
**no overbooking** under concurrent load and treats each client `requestId` as
an **idempotency key**.

- **Backend** — Node.js + [NestJS](https://nestjs.com/) (TypeScript), PostgreSQL via [TypeORM](https://typeorm.io/), Redis + [BullMQ](https://docs.bullmq.io/) for the async worker.
- **Frontend** — React + TypeScript (Vite) dashboard: create bookings and watch them settle in real time.

---

## Architecture

```
                POST /bookings (202 + booking reference)
   Browser  ───────────────────────────────────────────▶  NestJS API
   (React)  ◀───────────────────────────────────────────   │   │
      ▲         GET /events, GET /bookings, GET /bookings/:id │   │ enqueue job
      │                                                       │   ▼
      │ scoped poll of the new booking                        │  Redis (BullMQ queue)
      │ until it leaves PENDING                                │   │
      │                                                        ▼   ▼
      └───────────────────────────────────────────────  BullMQ Worker
                                                           (seat deduction,
                                                            CONFIRMED / FAILED)
                                                                │
                                                                ▼
                                                            PostgreSQL
                                                        (events, bookings)
```

The HTTP handler does **no** business logic beyond persisting a `PENDING`
booking and enqueuing a job — so it returns in a few milliseconds. All
availability checks and seat deduction happen in the worker.

---

## Prerequisites

- **Node.js** ≥ 20 and npm
- **Docker** + Docker Compose (to run PostgreSQL and Redis), _or_ your own
  local PostgreSQL 13+ and Redis 6+.

---

## Quick start

From the repository root:

```bash
# 1. Start PostgreSQL (5432) and Redis (6379)
docker compose up -d

# 2. Backend
cd backend
cp .env.example .env          # defaults already match docker-compose
npm install
npm run migration:run         # create the schema
npm run seed                  # insert 3 sample events
npm run start                 # API on http://localhost:8000  (worker starts with it)

# 3. Frontend (in a second terminal)
cd frontend
cp .env.example .env          # VITE_API_URL=http://localhost:8000
npm install
npm run dev                   # dashboard on http://localhost:3000
```

Then open **http://localhost:3000**, create a booking, and watch it move from
`PENDING` to `CONFIRMED` (or `FAILED` if the event is sold out) without any
manual database intervention.

> **Note:** the API server and the BullMQ worker run in the **same** Nest
> process (`npm run start`) for simplicity — you do not need to start a
> separate worker process.

### Environment variables

**backend/.env**

| Variable       | Default                                                   | Purpose                          |
| -------------- | --------------------------------------------------------- | -------------------------------- |
| `PORT`         | `8000`                                                    | HTTP port the API listens on     |
| `DATABASE_URL` | `postgres://postgres:postgres@localhost:5432/eventbooking`| PostgreSQL connection string     |
| `REDIS_URL`    | `redis://localhost:6379`                                  | Redis connection (BullMQ). Supports `rediss://` (TLS) and a `/<db>` index. |

**frontend/.env**

| Variable       | Default                  | Purpose                  |
| -------------- | ------------------------ | ------------------------ |
| `VITE_API_URL` | `http://localhost:8000`  | Base URL of the backend  |

---

## API reference

Base URL: `http://localhost:8000`

### `GET /events`
Returns the events, each including remaining availability:

```json
[
  { "id": 1, "name": "Tech Conference 2026", "date": "2026-09-15T09:00:00.000Z",
    "priceCents": 15000, "totalSeats": 100, "availableSeats": 100 }
]
```

### `POST /bookings` → **202 Accepted**
Creates a `PENDING` booking and enqueues it. The response `bookingReference`
(a UUID) is the **booking reference** used to track it. `requestId` is
generated server-side (not sent by the client).

```jsonc
// request
{ "eventId": 1, "customerName": "Jane Doe",
  "customerEmail": "jane@example.com", "seats": 2 }

// 202 response
{ "bookingReference": "…uuid…", "requestId": "…server-generated-uuid…",
  "eventId": 1, "customerName": "Jane Doe",
  "customerEmail": "jane@example.com", "seats": 2, "status": "PENDING",
  "failureReason": null, "createdAt": "…", "updatedAt": "…" }
```

Submitting the same booking data (same event + customer email + seats) within
a 30-second window returns the original booking (still 202), never a duplicate.
Unknown `eventId` → **404**; invalid payload → **400**.

### `GET /bookings`
Paginated, newest first. Query params:

| Param     | Default | Notes                                             |
| --------- | ------- | ------------------------------------------------- |
| `page`    | `1`     | 1‑based                                            |
| `limit`   | `20`    | max `100`                                          |
| `eventId` | –       | filter by event (404 if the event does not exist) |
| `status`  | –       | `PENDING` \| `CONFIRMED` \| `FAILED`               |

```json
{ "data": [ /* bookings */ ], "page": 1, "limit": 20, "total": 42, "totalPages": 3 }
```

### `GET /bookings/:id`
Fetch a single booking by its reference (used by the dashboard's scoped
polling). `404` if not found, `400` if `:id` is not a UUID.

### `GET /health`
`{ "status": "ok", "service": "event-booking-api" }`

All errors share a consistent shape:
`{ "statusCode", "error", "message", "path", "timestamp" }`. Unexpected errors
return a generic 500 with the stack logged server‑side only (never leaked).

---

## Key design decisions

### Overbooking prevention (no oversell under concurrency)

Seat deduction is an **atomic conditional UPDATE inside a transaction**:

```sql
UPDATE events
   SET available_seats = available_seats - :n
 WHERE id = :id AND available_seats >= :n
```

The row‑level write lock Postgres takes for the duration of the `UPDATE`
serialises concurrent updates to the same event row, and the
`available_seats >= :n` guard makes overselling impossible — no explicit
`SELECT … FOR UPDATE` on the event is needed. If the update matches **0** rows
the booking is marked `FAILED` (sold out); if it matches **1** row the booking
is `CONFIRMED`. A DB‑level `CHECK (available_seats >= 0)` constraint is a hard
backstop even against a future code bug.

The worker also loads the **booking** row `FOR UPDATE` and re‑checks it is still
`PENDING` inside the transaction. BullMQ is at‑least‑once, so a stalled job can
be re‑delivered while another slot is still processing the same booking; the
lock serialises them so seats are deducted **exactly once** per booking.

This is proven, not assumed — see [`booking-processing.integration-spec.ts`](backend/src/bookings/booking-processing.integration-spec.ts):
20 concurrent 1‑seat bookings against a 5‑seat event confirm exactly 5.

### Duplicate request handling (request fingerprinting)

This is a **deliberate deviation** from the assignment's literal wording. The
assignment specifies that `requestId` is a client-generated idempotency key;
here, `requestId` is a **server-generated UUID** (one per incoming HTTP
request, created by the controller via `crypto.randomUUID()`). Because the
server now produces a fresh UUID for every request, the UNIQUE constraint on
`request_id` no longer catches client-side duplicates (double-clicks, multiple
tabs). Instead, duplicate protection uses **request fingerprinting**:

1. **Frontend button disable** — the submit button is `disabled={submitting}`
   immediately on click, preventing the most common double-submit.
2. **Backend request fingerprint** — before creating a booking, the service
   checks for an existing booking with the same `(eventId + customerEmail +
   seats)` created within the last **30 seconds**. If found, the existing
   booking is returned (HTTP 202) — no duplicate is created.

This two-layer approach is solid because:

- The frontend catches the most likely duplicate surface (user double-click).
- The backend catches near-simultaneous submits (two browser tabs, or a click
  that races past the frontend disable) by comparing the business-relevant
  fingerprint within a short time window.
- Even if a duplicate somehow slips through both layers, the atomic conditional
  UPDATE in the worker prevents overbooking (see above), so the worst case is
  a single extra seat booked — never negative availability or corruption.

The queue job continues to use `jobId = booking id`, so a booking is never
enqueued twice. Proven in
[`bookings-idempotency.integration-spec.ts`](backend/src/bookings/bookings-idempotency.integration-spec.ts).

### Queue / retry strategy

BullMQ `defaultJobOptions`: **`attempts: 3`** with **exponential backoff
(base 1000 ms)**.

- **Business outcomes** (event missing, sold out) resolve normally — the job
  completes and is **not** retried (retrying a sold‑out booking is pointless).
- **Unexpected/transient errors** (e.g. a DB blip) are thrown, so BullMQ retries
  with backoff.
- If retries are exhausted, an `@OnWorkerEvent('failed')` handler marks the
  booking `FAILED` so it can never get stuck in `PENDING` forever.

### Other choices

- **`events.id`** is an integer (matches the sample payload's `"eventId": 1`);
  **`bookings.id`** is a server‑generated UUID that doubles as the public,
  non‑guessable booking reference.
- **`requestId`** is a server-generated UUID (via `crypto.randomUUID()` in
  the controller), not sent by the client. This deviates from the assignment's
  literal wording ("client-generated requestId") but simplifies the client
  contract: the frontend never needs to manage UUIDs at all.
- **Prices** are stored as integer cents to avoid floating‑point rounding.
- **Schema is migration‑owned** (`synchronize: false`).

---

## Testing

```bash
cd backend
npm test               # unit tests (no infrastructure needed)
npm run test:integration   # concurrency + idempotency against a live Postgres/Redis
```

- **Unit** (24 tests): DTO validation rules, booking service (create / duplicate /
  unknown event / list‑filter 404), Redis URL parsing.
- **Integration** (3 tests): the overbooking concurrency test and the duplicate
  request-fingerprint test, run against real Postgres + Redis (start
  `docker compose up` first and point `backend/.env` at it).

---

## Project structure

```
backend/
  src/
    events/        GET /events (controller / service / dto)
    bookings/      POST & GET /bookings, worker, processing service, dtos
    entities/      Event, Booking (TypeORM)
    migrations/    InitSchema, AddAvailabilityCheck (CHECK constraints)
    common/        global exception filter, paginated envelope, pg-error util
    config/        DataSource + Redis connection builders
    database/      seed script (3 events)
frontend/
  src/
    api.ts         single shared API client
    components/    BookingForm, BookingsTable, FiltersBar, Pagination, StatusBadge
    components/ui/ reusable primitives (Select, Button, Input, Table, Badge, Modal, Spinner)
    utils/         formatting helpers
docker-compose.yml postgres:16 + redis:7
```

---

## What I'd improve with more time

- **Close the dual‑write gap.** A booking is committed to Postgres and _then_
  enqueued to Redis; if the enqueue fails, the booking is orphaned in `PENDING`.
  A transactional **outbox** (or a periodic reaper that re‑enqueues/fails stale
  `PENDING` bookings) would make this bulletproof.
- **Push instead of poll.** Replace the frontend's scoped polling with
  WebSocket/SSE so status changes stream live.
- **Richer read model.** Return the event **name** (and price) on `GET /bookings`
  so the frontend doesn't join client‑side, and surface event date/price in the UI.
- **AuthN/Z & rate limiting** on the write endpoint.
- **More tests:** a full HTTP‑level e2e suite and a load test asserting the
  overbooking invariant at higher concurrency.
- **Observability:** structured logging, metrics on queue depth / processing
  latency, and a dead‑letter queue for permanently failed jobs.
