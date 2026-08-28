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

Key decisions worth knowing about before reading the code, spanning Week 1's schema design
through this week's implementation. Full rationale for the schema items lives in
`docs/decisionsERD.md`; architecture items live in `docs/architecture.md`.

**Schema (Week 1).** Enums are used only where the value set is genuinely stable long-term, plain
fields otherwise: `size` stays a `CHECK` enum since S–XXL doesn't change, but `color` is plain
`TEXT` because print-run palettes change too often for a `CHECK` constraint to keep up without a
migration every time. `Cart_Items` and `Order_Items` are kept as separate tables on purpose —
cart items are temporary and disappear at checkout, while order items are the permanent
historical record (including the price at the moment of purchase) and are never edited
afterward, enforced by a DB trigger that blocks `UPDATE` on `Order_Items` entirely once a row
exists. `Price_History` is append-only for the same reason: a price change inserts a new row
instead of editing the old one, so "what did this variant cost on a given date" stays
answerable. And `Users` → `Roles` stayed one-to-many with no join table, since the business
doesn't need a user to hold two roles at once — no reason to design for a case that isn't
required.

**API design (Week 2).** A resource with no meaning independent of its parent gets nested
(`/products/{id}/variants`, `/products/{id}/likes`); something that only narrows a collection
becomes a query param instead (`/products?categoryId=`), not its own path. The cart has no
top-level CRUD — it's created implicitly on the first `POST /carts/items`, and adding an existing
item again increments its quantity rather than duplicating the line. Schemas like `Product` are
defined once and reused via `$ref` rather than repeated inline per endpoint, so a contract change
in one place cascades everywhere that schema is used instead of needing to be replicated by hand.

**Products & catalog (Week 3).** `ProductInput` accepts an optional `variants[]` so a product and
its SKUs can be created in one call, avoiding a frontend N+1; `ProductUpdateInput` deliberately
excludes it, since a PATCH that "replaces" the variants array by omission would silently orphan
variants already referenced by live cart/order rows. Activate/deactivate are two dedicated
`POST` endpoints rather than a toggle, since a toggle isn't idempotent and the frontend shouldn't
need to know current status before calling it — `discontinued` stays distinct from
`inactive`/soft-deleted because it exists specifically to preserve order-history integrity for
products no longer sold.

**Auth & security (Week 3).** Access tokens are stateless signed JWTs, while refresh/reset tokens
are opaque, SHA-256-hashed, and DB-backed in `Auth_Tokens` — the split exists because a stateless
JWT alone can't be revoked before it expires, which refresh/reset tokens need to support (logout,
password reset). The role a user gets is always resolved server-side, via a DB lookup after
credentials are verified, and added to the JWT payload as the role name so future CASL abilities
can check `user.role` directly — never accepted from the client, same as any other
client-supplied `userId`/`role` field would be. `forgotPassword` returns an identical response
whether or not the email exists, to resist account enumeration; `signUp`'s duplicate-email case
is a deliberate exception, staying a `409` to match the project's status-code convention, since a
fully generic response there would need email-verification infra this app doesn't have — the gap
is mitigated with rate limiting on `/auth/signup` instead.

**Architecture (System Design Review).** BullMQ was chosen over RabbitMQ/Kafka because it runs
on the Redis already in the stack; the condition that would change this is scaling to multiple
independent services or needing cross-service eventing, neither of which applies to this
single-service capstone. Migrations follow expand-contract rather than a same-step rename/drop —
a column gets added, the new code deploys and starts using it, and only then does the old column
get removed, so a rolling deploy never has old code instances hit a column that's already gone.
Stock decrement uses an idempotency key on the order ID, closing the gap where a payment succeeds
but a retried stock decrement could run twice and oversell.
