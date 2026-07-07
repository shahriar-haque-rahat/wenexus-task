# Implementation Plan — Event Booking System (Wenexus Take-Home)

Goal: NestJS + PostgreSQL + Redis/BullMQ backend, React+TS frontend, per the assignment spec.
Work in small, committed increments. Do not skip ahead — each phase depends on the previous one working.

## Phase 0 — Scaffolding
- [x] Init monorepo: `/backend` (NestJS) and `/frontend` (React+TS, Vite)
- [x] Backend: Nest CLI project, ESLint/Prettier, `@nestjs/config`, TypeORM or Prisma (pick one, document choice) — **TypeORM**
- [x] `docker-compose.yml`: postgres, redis (+ adminer/redis-commander optional)
- [x] `.env.example` with DB_URL, REDIS_URL, PORT
- [x] Commit: "chore: scaffold monorepo, docker-compose, tooling"

## Phase 1 — Database Schema & Seed
- [x] `events` table: id, name, date, total_seats, available_seats, price_cents
- [x] `bookings` table: id, request_id (UNIQUE), event_id (FK), customer_name, customer_email, seats, status (PENDING/CONFIRMED/FAILED), failure_reason, created_at, updated_at
- [x] Migration files (not just synchronize)
- [x] Seed script: 2–3 events
- [x] Commit: "feat: db schema, migrations, seed data"

## Phase 2 — Events Module
- [x] `EventsModule`: `GET /events` → id, name, date, price, available_seats
- [x] Commit: "feat: events module"

## Phase 3 — Bookings Module (sync skeleton first)
- [x] DTO for `POST /bookings` with class-validator (requestId UUID, eventId int, customerName, customerEmail, seats > 0) — requestId validated as non-empty string (see Decisions Log)
- [x] `POST /bookings`: create booking row as PENDING, return 202 + booking reference immediately
- [x] `GET /bookings`: pagination (page/limit), filter by eventId + status
- [x] Commit: "feat: bookings endpoints (pre-queue)"

## Phase 4 — Queue Integration (BullMQ)
- [x] Add BullMQ + Redis connection module
- [x] On `POST /bookings`, enqueue a job with booking id (don't do business logic in the controller)
- [x] Worker: validate event exists → check availability → deduct seats → mark CONFIRMED, or mark FAILED with reason
- [x] Configure retry/backoff for transient failures (e.g. DB connection blips) — document what triggers a retry vs. an immediate FAILED
- [x] Commit: "feat: async booking processing via BullMQ worker"

## Phase 5 — Concurrency Safety (critical — do not skip)
- [x] Prevent overbooking: use a DB transaction with row-level locking (`SELECT ... FOR UPDATE`) or an atomic conditional update (`UPDATE events SET available_seats = available_seats - :n WHERE id = :id AND available_seats >= :n`) inside the worker — atomic conditional update in a transaction
- [x] Add a CHECK constraint (`available_seats >= 0`) as a hard backstop
- [x] Idempotency: `request_id` UNIQUE constraint; on duplicate, return the existing booking instead of creating a new one (handle both at insert-time and at enqueue-time)
- [x] Write a concurrency test: fire N parallel bookings against an event with fewer seats than N, assert confirmed seats never exceed total
- [x] Commit: "feat: concurrency-safe seat deduction + idempotent requestId handling"

## Phase 6 — Validation & Error Handling
- [x] Global `ValidationPipe` (whitelist, forbidNonWhitelisted)
- [x] Global exception filter → consistent error JSON shape
- [x] Proper status codes: 202 on accept, 404 unknown event, 400 validation, 409 for conflicting duplicate if applicable — duplicate requestId handled idempotently (202 + existing booking) instead of 409 (see Decisions Log)
- [x] Commit: "feat: validation + error handling polish"

## Phase 7 — Frontend Dashboard
- [x] Vite React+TS app, minimal styling (plain/clean per spec)
- [x] Bookings table: reference, event name, customer, seats, status
- [x] Filters: by event, by status; pagination controls
- [x] New booking form (event select, name, email, seats) → POST, then poll/refresh
- [x] Loading + error states
- [x] Commit: "feat: frontend dashboard"

## Phase 8 — Tests (bonus but strongly recommended)
- [x] Unit tests: booking service validation logic
- [x] Integration test: concurrency test from Phase 5 as an automated test
- [x] Commit: "test: booking logic + concurrency tests"

## Phase 9 — README & Final Polish
- [x] README: setup/run instructions (docker-compose up, migrate, seed, run backend, run frontend)
- [x] README: design decisions — overbooking prevention, idempotency, queue/retry strategy
- [x] README: "what I'd improve with more time"
- [x] Sanity-check: fresh clone + README-only steps actually works
- [x] Commit: "docs: README"

## Non-negotiables (re-check before calling anything "done")
- Endpoint responds 202 immediately; all business logic happens in the worker
- No overbooking possible under concurrent load — proven, not assumed
- Duplicate `requestId` never creates a second booking
- Git history has real incremental commits, not one final dump