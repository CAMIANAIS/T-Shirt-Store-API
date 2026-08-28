# T-Shirt Store API

A T-Shirt e-commerce REST API built with NestJS, PostgreSQL (via Prisma), and Stripe — the
capstone project for RAVN's Nerdery backend block. Implements the data model designed in Week 1
and the OpenAPI contract designed in Week 2.

## Tech stack

- NestJS + TypeScript
- PostgreSQL + Prisma
- Redis + BullMQ (background jobs)
- Stripe (Payment Links + Payment Intents)
- CASL (role-based authorization)
- Jest (unit + e2e testing)

## Setup

```bash
npm install
```

Create a `.env` file with:

```
DATABASE_URL=postgres://...
JWT_SECRET=          # 32+ chars, e.g. `openssl rand -hex 32`
JWT_EXPIRATION=
PORT=
NODE_ENV=
```

Build the database from `docs/schemaERD.sql` (idempotent — safe to re-run), then generate the
Prisma client:

```bash
npx prisma generate
```

Run the app:

```bash
npm run start:dev
```

## Testing

```bash
npm run lint    # eslint, no --fix — CI and the pre-commit hook both run this as-is
npm run build
npm run test     # unit tests
npm run test:e2e # end-to-end tests
```

`lint → build → test` is the enforced gate, both locally (husky pre-commit hook) and in CI
(GitHub Actions) — mirrors `CLAUDE.md`'s documented convention.

## Project status

**Week 3 checkpoint: authentication, products, and SKUs/variants — implemented and
unit-tested.** See `docs/architecture.md` for the production architecture write-up (System
Design Review deliverable). CASL authorization, Stripe payments, orders, and background jobs are
in progress for the next milestone.

## Documentation

- [`docs/openApi.yml`](docs/openApi.yml) — the API contract (Swagger/OpenAPI)
- [`docs/schemaERD.sql`](docs/schemaERD.sql) — the database schema
- [`docs/decisionsERD.md`](docs/decisionsERD.md) — schema design decisions and rationale
- [`docs/architecture.md`](docs/architecture.md) — production architecture: queue choice, deploy
  shape, monitoring, and known risks

## Design process highlights

A few decisions worth knowing about before reading the code, drawn from the design/review
sessions across Weeks 2-3:

- **REST resource shape**: a resource with no meaning independent of its parent is nested
  (`/products/{id}/variants`, `/products/{id}/likes`); something that only narrows a collection
  becomes a query param instead (`/products?categoryId=`), not its own path.
- **Cart has no top-level CRUD.** A cart is created implicitly on the first
  `POST /carts/items`; adding an existing item again increments its quantity instead of
  duplicating the line.
- **`ProductInput` accepts an optional `variants[]`** so a product and its SKUs can be created in
  one call, avoiding a frontend N+1. `ProductUpdateInput` deliberately excludes it — a PATCH that
  "replaces" the variants array by omission would silently orphan variants already referenced by
  live cart/order rows.
- **Activate/deactivate are two dedicated `POST` endpoints, not a toggle** — a toggle isn't
  idempotent, and the frontend shouldn't need to know current status before calling it.
  `discontinued` stays distinct from `inactive`/soft-deleted, since it exists specifically to
  preserve order-history integrity for products no longer sold.
- **Access tokens are stateless signed JWTs; refresh/reset tokens are opaque, SHA-256-hashed, and
  DB-backed** (`Auth_Tokens`) — the split exists because a stateless JWT alone can't be revoked
  before it expires, which refresh/reset tokens need to support (logout, password reset).
- **The role a user gets is always resolved server-side** (a DB lookup after credentials are
  verified), never accepted from the client — the same rule applies to any other
  client-supplied `userId`/`role` field, treated as a settled security decision, not a
  per-endpoint judgment call.
