# Dar Henani — Property Management System

A boutique guest-house PMS for Dar Henani: reservations (stays & events), rooms,
finance, and analytics, in one clean, fast, operational dashboard.

## Stack

- **Next.js** (App Router, TypeScript) + **Tailwind CSS v4** for a custom
  luxury/boutique design system (see `src/app/globals.css` for tokens)
- **Prisma** + **SQLite** for data (guests, rooms, reservations, payments,
  expenses are the source of truth — nothing on the dashboard is hard-coded)
- **Recharts** for analytics, **Radix UI** primitives for dialogs/tabs

## Getting started

```bash
npm install
npx prisma migrate dev   # creates prisma/dev.db and applies the schema
npm run seed              # loads demo data (rooms, guests, reservations, payments)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — it redirects to `/dashboard`.

## Project structure

- `prisma/schema.prisma` — data model (User, Guest, Room, Reservation, Payment,
  Expense, PropertySettings). A `Reservation` covers both stays
  (`type = STAY`) and events (`type = EVENT`) — events don't need a room, stays
  don't need an event space.
- `src/app/(app)/*` — the six main sections: Dashboard, Reservations, Rooms,
  Finance, Analytics, Settings. Each has its own `page.tsx` (server component,
  real DB queries) and, where needed, `actions.ts` (server actions for
  mutations: create reservation, add payment, check-in/out, cancel, etc.)
- `src/lib/*` — shared query/aggregation helpers (dashboard KPIs, availability
  checks, finance/analytics aggregation) so every page reads from the same
  source of truth.
- `src/components/ui/*` — the shared design-system primitives (Button, Card,
  Badge, Dialog, Table, …), themed entirely off CSS variables.

## Business rules enforced

- No double-booking: room and event-space availability is checked against
  overlapping active reservations before a booking is created.
- Rooms marked Maintenance / Out of service can't be booked.
- Remaining balance is always `total − sum(payments)`, never a manually
  entered number.
- Cancelled reservations are kept in history, never deleted.
