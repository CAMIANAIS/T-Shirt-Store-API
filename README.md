# T-Shirt Store API

[![CI](https://github.com/CAMIANAIS/T-Shirt-Store-API/actions/workflows/ci.yaml/badge.svg?branch=main)](https://github.com/CAMIANAIS/T-Shirt-Store-API/actions/workflows/ci.yaml)

A T-Shirt e-commerce REST API built with NestJS, PostgreSQL (via Prisma), and Stripe: the
capstone project for RAVN's Nerdery backend block. Implements the data model designed in Week 1
and the OpenAPI contract designed in Week 2.

The badge above reflects the latest `lint → build → test` run on `main`; check the
[Actions tab](https://github.com/CAMIANAIS/T-Shirt-Store-API/actions) for the full commit history
and run details on every checkpoint.

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

Create a `.env` file — see [Environment Variables](#environment-variables) below for what each
one needs.

## Environment Variables

Validated at startup by `src/config/environment.ts`; the app refuses to boot if any are missing
or invalid.

- `DATABASE_URL` (string): PostgreSQL connection string, e.g.
  `postgres://user:password@localhost:5432/t_shirt_store`.
- `JWT_SECRET` (string): secret key for signing JWTs. Minimum 32 characters — generate one with
  `openssl rand -hex 32`.
- `JWT_EXPIRATION` (number): access token lifetime **in seconds**, not minutes/hours — a bare
  number is interpreted as seconds by `@nestjs/jwt`. Min `60`, max `86400`. Example: `900` (15
  minutes).
- `PORT` (number): port the server listens on. Min `1`, max `65535`. Example: `3000`.
- `NODE_ENV` (string): e.g. `development`, `test`, `production`.

Stripe-related variables aren't listed yet — payment integration isn't built.

Build the database from `docs/schemaERD.sql` (idempotent, safe to re-run), then generate the
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
npm run lint    # eslint, no --fix; CI and the pre-commit hook both run this as-is
npm run build
npm run test     # unit tests
npm run test:e2e # end-to-end tests
```

`lint → build → test` is the enforced gate, both locally (husky pre-commit hook) and in CI
(GitHub Actions), mirroring `CLAUDE.md`'s documented convention.

## Project status

**Week 3 checkpoint: authentication, products, and SKUs/variants, implemented and
unit-tested.** See `docs/architecture.md` for the production architecture write-up (System
Design Review deliverable).

**Week 4 in progress**: CASL role-based authorization (Manager/Client abilities, enforced on
Products/Variants routes) and a global exception filter (catches unhandled errors, matches the
API contract's `Error` schema, never leaks internal details) are implemented and verified against
a running instance. CORS, Helmet, and a live Swagger UI are also wired in. Cart/orders, Stripe
payments, and background jobs are still in progress for the next milestone.

## Documentation

- [`docs/openApi.yml`](docs/openApi.yml): the API contract (Swagger/OpenAPI)
- [`docs/schemaERD.sql`](docs/schemaERD.sql): the database schema
- [`docs/schemaERD_decisions.md`](docs/schemaERD_decisions.md): schema design decisions and rationale
- [`docs/architecture.md`](docs/architecture.md): production architecture, queue choice, deploy
  shape, monitoring, and known risks

## Design process highlights

Key decisions worth knowing about before reading the code, spanning Week 1's schema design
through this week's implementation. Full rationale for the schema items lives in
`docs/schemaERD_decisions.md`; architecture items live in `docs/architecture.md`.

**Schema (Week 1)**

- **Enums only where the value set is genuinely stable long-term**, plain fields otherwise:
  `size` stays a `CHECK` enum (S–XXL doesn't change), `color` is plain `TEXT` (print-run palettes
  change too often for a `CHECK` constraint to keep up without a migration every time).
- **`Cart_Items` and `Order_Items` are separate tables on purpose.** Cart items are temporary and
  disappear at checkout; order items are the permanent historical record, including the price at
  the moment of purchase, and are never edited afterward (enforced by a DB trigger that blocks
  `UPDATE` on `Order_Items` entirely once a row exists).
- **`Price_History` is append-only.** A price change inserts a new row rather than editing the
  old one, so "what did this variant cost on a given date" is always answerable.
- **One role per user** (`Users` → `Roles` is one-to-many, no join table). The business doesn't
  need a user to hold two roles at once, so the simpler model was kept rather than designing for
  a case that isn't required.

**API design (Week 2)**

- **REST resource shape**: a resource with no meaning independent of its parent is nested
  (`/products/{id}/variants`, `/products/{id}/likes`); something that only narrows a collection
  becomes a query param instead (`/products?categoryId=`), not its own path.
- **Cart has no top-level CRUD.** A cart is created implicitly on the first
  `POST /carts/items`; adding an existing item again increments its quantity instead of
  duplicating the line.
- **Schemas are defined once and reused via `$ref`** in the OpenAPI spec (e.g. `Product`), not
  repeated inline per endpoint. Deliberate: a contract change in one place cascades everywhere
  that schema is used, rather than needing to be replicated by hand.

**Products & catalog (Week 3)**

- **`ProductInput` accepts an optional `variants[]`** so a product and its SKUs can be created in
  one call, avoiding a frontend N+1. `ProductUpdateInput` deliberately excludes it: a PATCH that
  "replaces" the variants array by omission would silently orphan variants already referenced by
  live cart/order rows.
- **Activate/deactivate are two dedicated `POST` endpoints, not a toggle.** A toggle isn't
  idempotent, and the frontend shouldn't need to know current status before calling it.
  `discontinued` stays distinct from `inactive`/soft-deleted, since it exists specifically to
  preserve order-history integrity for products no longer sold.

**Auth & security (Week 3)**

- **Access tokens are stateless signed JWTs; refresh/reset tokens are opaque, SHA-256-hashed, and
  DB-backed** (`Auth_Tokens`). The split exists because a stateless JWT alone can't be revoked
  before it expires, which refresh/reset tokens need to support (logout, password reset).
- **The role a user gets is always resolved server-side** (a DB lookup after credentials are
  verified, added to the JWT payload as the role name so future CASL abilities can check
  `user.role` directly), never accepted from the client. Same rule applies to any other
  client-supplied `userId`/`role` field, treated as a settled security decision, not a
  per-endpoint judgment call.
- **`forgotPassword` returns an identical response whether or not the email exists**, to resist
  account enumeration. `signUp`'s duplicate-email case is a deliberate exception (`409`, matches
  the project's status-code convention): a fully generic response there would need
  email-verification infra this app doesn't have, so it's mitigated with rate limiting on
  `/auth/signup` instead.

**Architecture (System Design Review)**

- **BullMQ over RabbitMQ/Kafka.** It runs on the Redis already in the stack; the condition that
  would change this is scaling to multiple independent services or needing cross-service
  eventing, neither of which applies to this single-service capstone.
- **Migrations follow expand-contract, never a same-step rename/drop.** A column gets added, the
  new code deploys and starts using it, and only then does the old column get removed, so a
  rolling deploy never has old code instances hit a column that's already gone.
- **Stock decrement uses an idempotency key on the order ID**, closing the gap where a payment
  succeeds but a retried stock decrement could run twice and oversell.
