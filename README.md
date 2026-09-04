# T-Shirt Store API

[![CI](https://github.com/CAMIANAIS/T-Shirt-Store-API/actions/workflows/ci.yaml/badge.svg?branch=main)](https://github.com/CAMIANAIS/T-Shirt-Store-API/actions/workflows/ci.yaml)

A T-Shirt e-commerce REST API built with NestJS, PostgreSQL (via Prisma), and Stripe: the
capstone project for RAVN's Nerdery backend block. Implements the data model designed in Week 1
and the OpenAPI contract designed in Week 2.

The badge above reflects the latest `lint → build → test` run on `main`; check the
[Actions tab](https://github.com/CAMIANAIS/T-Shirt-Store-API/actions) for the full commit history
and run details on every checkpoint.

## Try it live

Deployed on Railway: **[t-shirt-store-api-production.up.railway.app/api](https://t-shirt-store-api-production.up.railway.app/api)** (Swagger UI).

Seeded with a small demo catalog (1 category, 3 products with variants) and one account per role:

| Role | Email | Password |
|---|---|---|
| Client | `demo.client@tshirtstore.dev` | `DemoClient!2026` |
| Manager | `demo.manager@tshirtstore.dev` | `DemoManager!2026` |

Sign in via `POST /auth/signin` in Swagger, then click **Authorize** with the returned
`access_token` to try protected routes. Manager can create/update/disable products, upload
images, and view all orders; Client can browse, cart, buy, like products, and view their own
order history.

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
- `STRIPE_SECRET_KEY` (string): Stripe secret key, must match `sk_test_...` or `sk_live_...`.
- `STRIPE_WEBHOOK_SECRET` (string): signing secret for the `/webhooks/stripe` endpoint, must match
  `whsec_...`. Locally, `stripe listen` prints a temporary one; a deployed environment needs a
  permanent one from a Dashboard-registered webhook endpoint instead.
- `EMAIL_HOST` (string), `EMAIL_PORT` (number), `EMAIL_USER` (email), `EMAIL_PASSWORD` (string),
  `EMAIL_FROM` (string): SMTP config for password-reset/change and stock-notification emails.
  [Ethereal](https://ethereal.email) works for a disposable dev inbox.
- `AWS_ACCESS_KEY_ID` (string): must match `AKIA...`. `AWS_SECRET_ACCESS_KEY` (string),
  `AWS_REGION` (string), `AWS_S3_BUCKET_NAME` (string): for product image uploads (private bucket,
  signed URLs).
- `REDIS_URL` (string): must be `redis://...` or `rediss://...` (TLS — needed for a managed
  provider like Upstash). Backs the BullMQ stock-notification queue.

Every variable above is required — the app refuses to boot if any is missing or fails its format
check, even ones a given request path doesn't touch. See `.env.example` for a ready-to-copy
template.

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

`lint → build → test` is the enforced gate locally, via the husky pre-commit hook. CI (GitHub
Actions) runs that same gate plus `test:e2e` on every push/PR to `main` — the e2e suite provisions
its own disposable Postgres (Testcontainers) and a Redis service container, so it needs no manual
setup to run there.

## Project status

![Test and coverage metrics: 192/193 unit tests across 28 suites, 85.1% statement coverage, 13 e2e tests across 4 suites, 35 endpoints across 26 routes and 11 controllers, CI gate lint→build→test→e2e green on main](docs/metrics.png)

All 10 of `challenge.md`'s minimum required features are implemented and tested, along with every
item on its Mandatory Implementations checklist.

<details>
<summary><strong>Core capabilities (challenge.md items 1–10)</strong></summary>

| Feature | Status | Built with |
|---|---|---|
| 1. Authentication (signup/signin/signout/forgot/reset password, password-change email) | Done | JWT access tokens, SHA-256 opaque refresh tokens, `@nestjs/throttler`, Nodemailer + Ethereal |
| 2. Product catalog (pagination, category search, SKUs/variants, public images) | Done | Prisma, class-validator pagination DTOs, S3 signed URLs |
| 3–5. Roles & per-role capabilities (Manager/Client) | Done | Prisma roles table, JWT claims |
| 6. CASL authorization (MUST) | Done | `@casl/ability`, custom `PoliciesGuard`, `@CheckPolicies()` |
| 7. Stripe — Payment Links + Payment Intents (MUST) | Done | Stripe SDK, CLI-verified webhook signatures |
| 8. Stock notification queue (MUST) | Done | `@nestjs/bullmq`, Redis, retry + exponential backoff |
| 9. Order history with filtering (MUST) | Done (feature); e2e test for the filters still pending | class-validator DTO extending shared `PaginationParamsDto` |
| 10. Order status flow | Done | `order_status_history` table, CASL-guarded transition endpoint |

</details>

<details>
<summary><strong>Mandatory implementations</strong></summary>

| Requirement | Status | Built with |
|---|---|---|
| Env schema validation | Done | class-validator `EnvironmentVariables`, validated at boot |
| Global exception filter | Done | `AllExceptionsFilter` |
| Guards & validation pipes | Done | `JWTAuthGuard`, `PoliciesGuard`, global `ValidationPipe` → 422 |
| Custom decorators | Done | `@CurrentUser()`, `@CheckPolicies()` |
| AWS S3 image storage | Done | `@aws-sdk/client-s3`, private bucket, signed URLs |
| Helmet, CORS, rate limiting | Done | `helmet`, `@nestjs/cors`, throttle 3 req/60s on auth routes |
| E2E tests: auth, checkout, order history | Done | Jest, Supertest, Testcontainers (disposable Postgres per run) |
| One-page architecture write-up | Done | [`docs/architecture.md`](docs/architecture.md) |
| CI/CD pipeline gates the full suite, including e2e | Done | GitHub Actions, Redis service container, husky pre-commit, commitlint |
| Observability | Done | `nestjs-pino`, redacts tokens/passwords from logs |

</details>

### Where the rigor shows up

The test suite grew with the code, not after it — 192 unit tests across 28 suites landed alongside
each service as it was built, holding coverage at 85% statements / 84% lines the whole way. That
habit caught real defects before review: a fail-open CASL guard that would have silently granted
access on a missing policy decorator, a JWT payload shape that differed between sign-up and sign-in
(would have crashed order actions with a real 500), and a BullMQ restock race against a deleted
product.

Every webhook signature is verified against the real Stripe CLI, not assumed correct because the
code looked right. Refresh tokens are opaque and SHA-256 hashed rather than reusing a
password-hashing algorithm built for the wrong threat model. The e2e suite runs against a real,
disposable PostgreSQL container per run — the same discipline that surfaced a previously invisible
gap: the suite had been silently broken since 2026-08-24 by a Prisma/Jest ESM conflict the unit
tests never touched, found and fixed this week rather than left for submission day.

### In progress

- [ ] More e2e coverage: order-history filters/pagination, auth role-checks + sign-out +
      forgot/reset-password + rate-limit, checkout wrong-signature + insufficient-stock + Payment
      Link flow
- [ ] `WebhooksService` unit test for a known, documented edge case: if the payment transaction
      fails partway through, the idempotency guard can treat Stripe's automatic retry as an
      already-processed duplicate, leaving the order stuck unpaid (see `docs/architecture.md`'s
      known risks)
- [ ] `openApi.yml`: `429` missing on sign-in/sign-up, 3 missing `409` responses, `422` missing on
      3 pagination endpoints

### Deliberately deprioritized (optional / extra credit)

- [ ] Delivery Person role & the `delivered` status
- [ ] Promo code system
- [ ] Cloud deployment (Railway) — `challenge.md`'s own last line calls this "Extra Points";
      parked mid-setup to protect time for required work
- [ ] `/auth/refresh` and change-password-while-logged-in — mentor-suggested, confirmed not in
      `challenge.md`'s required scope

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

**CASL & payments (Week 4)**

- **`PoliciesGuard` fails closed, not open, when a route is missing `@CheckPolicies`.**
  `Array.prototype.every()` on an empty handler list is vacuously `true` in plain JS — a guard
  applied without the decorator would have silently granted access to any authenticated user
  instead of none. Changed to throw instead, so a future route added without the decorator breaks
  loudly at that route rather than leaking access.
- **Product images are served via signed S3 URLs from a private bucket, never a public bucket
  URL.** The DB only stores the S3 key; a fresh signed URL is generated per request, so access can
  be revoked/expired without touching stored data.
- **The stock-notification threshold triggers on crossing _up_ through 3 (restock), not crossing
  down (low-stock warning).** `challenge.md`'s wording ("when stock reaches 3, notify users who
  liked it") is genuinely ambiguous between the two; settled on restock to match
  `docs/schemaERD_decisions.md` #14. A separate, higher-threshold "only 5 left" indicator was
  considered but deferred as a distinct feature, not folded into this alert.

**Queue, logging & deploy (Week 4)**

- **BullMQ retry/backoff (3 attempts, exponential, 5s base delay)** on the stock-notification job.
  A transient SMTP or S3 failure shouldn't permanently drop a restock email, but unbounded retries
  could mask a real, ongoing outage — 3 attempts was chosen as "survive a blip, don't hide a
  systemic failure."
- **`nestjs-pino` over Winston** for structured logging: native NestJS integration, JSON in
  production/pretty-printed in dev, and `Authorization`/`Cookie` headers plus password fields are
  redacted by default rather than opt-in, since logs are a common place for secrets to leak by
  accident.
- **A shared `PaginationParamsDto`** (limit clamped 0–50, matching `docs/openApi.yml`'s already-
  documented `maximum: 50`) replaces duplicating the same two fields across 5 DTOs. Found after
  discovering 4 list endpoints had no validation on `limit` at all, despite the contract
  documenting a max for all of them.
- **Prisma client generation stays on the `prisma-client` generator.** Briefly swapped to the
  classic `prisma-client-js` to unblock the local e2e/BullMQ Jest conflict, but that broke 5
  services whose imports depend on `prisma-client`-specific generated type files — reverted, and
  fixed the real gap instead: a `postinstall` script (`prisma generate`) so any host regenerates
  the client automatically, since `generated/prisma/` is gitignored and nothing else did.
- **Deployed database is a separate Redis provider (Upstash), not Railway's own Redis add-on** —
  Railway's free plan caps the number of services per project. Required loosening `REDIS_URL`'s
  validator to accept `rediss://` (TLS) as well as `redis://`, since `ioredis` only auto-enables
  TLS based on that exact URL scheme.
- **`docs/architecture.md`'s diagrams show target production architecture (AWS-shaped), not what's
  actually deployed (Railway).** That gap is called out directly on the diagrams themselves
  (observability/monitoring boxes marked planned-not-implemented) rather than left implicit.

**Architecture (System Design Review)**

- **BullMQ over RabbitMQ/Kafka.** It runs on the Redis already in the stack; the condition that
  would change this is scaling to multiple independent services or needing cross-service
  eventing, neither of which applies to this single-service capstone.
- **Migrations follow expand-contract, never a same-step rename/drop.** A column gets added, the
  new code deploys and starts using it, and only then does the old column get removed, so a
  rolling deploy never has old code instances hit a column that's already gone.
- **Stock decrement uses an idempotency key on the order ID**, closing the gap where a payment
  succeeds but a retried stock decrement could run twice and oversell.
