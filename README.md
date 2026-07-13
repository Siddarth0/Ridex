# <img src="./apps/web/public/ridexlogo.png" alt="Ridex Logo" width="36" style="border-radius: 50%; vertical-align: middle;"/> Ridex

**Ridex** is a ride-hailing platform for the Nepal market (Pathao / inDrive style), serving **riders**, **drivers**, and **admins** in real time.

## 🧰 Stack

| Layer | Tech |
|---|---|
| Monorepo | pnpm workspaces + Turborepo |
| Web | Next.js 15, Tailwind 4, shadcn/ui |
| API | Express 5 + TypeScript, Socket.IO |
| Shared | `@ridex/shared` — Zod schemas & domain constants used by both sides |
| Database | PostgreSQL + PostGIS (Supabase), Drizzle ORM |
| Maps | MapLibre GL + OSM tiles, OSRM/ORS routing |
| Payments | Cash at launch; eSewa/Khalti behind a provider interface later |

## 📁 Layout

```
apps/
  web/        Next.js — rider booking, driver dashboard, admin panel
  api/        Express + Socket.IO API
packages/
  shared/     Zod schemas, ride state machine, constants
```

## ⚙️ Getting started

```bash
corepack enable   # or: npm i -g pnpm@9
pnpm install

# API env
cp apps/api/.env.example apps/api/.env   # then fill in values

# Database (Supabase Postgres): apply migrations + seed fare configs
pnpm --filter api db:migrate
pnpm --filter api seed

pnpm dev          # runs web (:3000) and api (:8000) together
```

Make yourself an admin after registering: `pnpm --filter api promote-admin you@example.com`

Useful commands: `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm lint`.

## 📈 Roadmap

- [x] **Phase 0** — Monorepo scaffold, CI, TypeScript everywhere
- [x] **Phase 1** — Postgres schema (Drizzle migrations), auth (15-min JWT + rotating refresh cookies), driver onboarding, admin KYC queue
- [x] **Phase 2** — Core ride loop: MapLibre booking with fare estimates, offer-based dispatch (atomic state machine), live driver tracking, cash fares + ledger, mutual ratings
- [ ] **Phase 3** — Admin ops (live map, pricing/surge config), hardening, integration tests
- [ ] **Phase 4** — Expo mobile apps, eSewa/Khalti payments, promos, SOS

The previous Express + MongoDB implementation is archived on the [`legacy`](../../tree/legacy) branch.

## 📬 Contact

- 🧑‍💻 Lead Developer: Siddartha Kunwar
- 📧 Email: siddartha.kunwar01@gmail.com
- 🌐 GitHub: https://github.com/siddarth0
