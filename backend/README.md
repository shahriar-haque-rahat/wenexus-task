# Backend — Event Booking API

NestJS + TypeScript API and BullMQ worker. See the [root README](../README.md)
for architecture, setup, API reference, and design decisions.

## Commands

```bash
npm install
npm run migration:run   # apply migrations to a clean DB
npm run seed            # insert 3 sample events
npm run start           # API + worker on http://localhost:8000
npm run start:dev       # watch mode

npm test                # unit tests (no infrastructure needed)
npm run test:integration# concurrency + idempotency (needs Postgres + Redis)
npm run build           # type-check + compile
```

Configuration is via `backend/.env` (copy from `.env.example`): `PORT`,
`DATABASE_URL`, `REDIS_URL`.
