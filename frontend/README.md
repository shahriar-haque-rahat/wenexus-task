# Frontend — Event Booking Dashboard

React + TypeScript (Vite) dashboard. See the [root README](../README.md) for the
full picture.

## Commands

```bash
npm install
npm run dev       # dev server on http://localhost:3000
npm run build     # type-check + production build
npm run preview   # preview the production build
```

Configuration is via `frontend/.env` (copy from `.env.example`):
`VITE_API_URL` — the base URL of the backend API (default `http://localhost:8000`).

The dashboard lists bookings (paginated, filterable by event and status), lets
you create a booking, and scoped‑polls the new booking until it settles
(`CONFIRMED`/`FAILED`) — no continuous background polling.
