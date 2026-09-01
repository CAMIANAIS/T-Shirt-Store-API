# T-Shirt Store API — conventions

Living document. Add to it as real conventions get established while building, don't try to
front-load everything.

## Repo layout

- `docs/` holds real project artifacts: `openApi.yml` (the API contract), `openApi_Patterns.md`
  (design decisions/rationale, referenced by URL from inside `openApi.yml` — if it moves, update
  that link too), `schemaERD.sql` (the DB schema), `schemaERD_decisions.md` (schema design
  decisions/rationale, numbered, one per real decision — if it moves, update the two references in
  `README.md` too), `architecture.md` (production architecture write-up).
- `guidelines/` is Nerdery program material plus personal working notes — gitignored, never
  tracked. Don't put real project documentation there.
- `.env` and anything matching `*.pem`/`*.key`/`*secrets*` is blocked from tool reads/edits by a
  `PreToolUse` hook, not just `.gitignore`. Don't rely on `.gitignore` alone for secrets.

## Tooling / CI

- The `lint` script never gets `--fix`. A CI runner's auto-fix vanishes with the disposable
  container — the branch never sees it, so `--fix` in a shared/CI script just makes a red build
  report green. Auto-fixing on save is handled separately, by the Claude Code `PostToolUse` hook.
- Gate order is fixed and mirrors both CI and the pre-commit hook: `lint` → `build` → `test`,
  chained to stop at the first failure.
- The husky pre-commit hook enforces this locally before a commit can even be created; GitHub
  Actions CI enforces it again on push/PR to `main`, regardless of what ran locally.
- `eslint.config.mjs` has a `**/*.spec.ts`-scoped override turning off `@typescript-eslint/
  unbound-method` and `@typescript-eslint/no-unsafe-assignment`. Both are known false positives
  in Jest test files specifically — `expect(mock.method).toHaveBeenCalledWith(...)` is the
  standard Jest pattern and isn't a real unbound-`this` risk, and `expect.any(...)` is typed
  `any` by `@types/jest` itself. Production code still gets full strict checking; this override
  is test-file-only.

## Commit messages

- Conventional Commits (https://www.conventionalcommits.org/en/v1.0.0/), starting 2026-08-25.
  Enforced, not just followed: a `commit-msg` husky hook running `commitlint` rejects a
  non-conforming message outright — verified it actually blocks one, not just that it's
  configured.

## Architecture

- Controllers don't run queries; services don't reach for the request object. Both "work" in
  the sense that the code runs, but both defeat the reason the layer boundary exists, and both
  become unmockable/untestable the moment you try to unit test them. DB access lives in
  services, never in controllers; anything a service needs comes in via DI/parameters, not by
  pulling it off the raw request.
- Don't instantiate external clients ad hoc inside a method (e.g. `new Stripe(process.env.KEY)`
  inline). Wire them as providers so they're swappable/mockable, same reasoning as Prisma.

## Auth & validation (established Week 3, Day 2)

- **Request validation**: every module's request bodies get a typed DTO class under
  `src/<module>/dto/*.dto.ts` using `class-validator` decorators (same pattern as
  `EnvironmentVariables`), not a bare `@Body()` with no type. A global `ValidationPipe` is wired
  in `main.ts` with `whitelist: true` + `forbidNonWhitelisted: true` — an unexpected field (e.g.
  a client sneaking a `role_id` into a signup body) gets the whole request rejected, not silently
  stripped. This is the enforcement mechanism behind the client-supplied-userId/role rule above,
  not just a nice-to-have.
- **Access tokens**: short-lived, stateless, signed JWTs (`@nestjs/jwt`, secret from
  `ConfigService`/`EnvironmentVariables`, never hardcoded — delete any `constants.ts` with a
  literal secret on sight, that's the NestJS tutorial's own placeholder). Payload fields come from
  a server-side DB lookup after credentials are verified, never from client-supplied data.
- **Refresh tokens**: opaque random bytes, hashed with **SHA-256** (not bcrypt) and stored in
  `Auth_Tokens` (`type = 'refresh'`), looked up directly via `WHERE token_hash = sha256(token)`.
  bcrypt is the wrong tool here — it's salted/non-deterministic (breaks a direct hash lookup) and
  its slow-hashing purpose (brute-force resistance) doesn't apply to a high-entropy random token
  the way it does to a low-entropy human password. Revocation (logout, password change) works by
  flipping `revoked` on the DB row — a stateless JWT alone can't be revoked before it expires,
  which is the actual reason the refresh token needs a DB-backed record at all. `Auth_Tokens.jti`
  exists in the schema but is currently unused/dead weight — only relevant if a per-device
  "log out this session" feature gets built later.
- **Reference/lookup table seed data** (e.g. `Roles`): baked into `docs/schemaERD.sql` itself as
  an idempotent `INSERT ... ON CONFLICT (col) DO NOTHING` at the end of the file, matching the
  existing "rebuild from the script" pattern rather than a separate seed mechanism. Requires a
  `UNIQUE` constraint on the conflict target column — a `CHECK` restricting allowed values is not
  a substitute for `UNIQUE` and `ON CONFLICT` will fail without it.
- **Password-reset tokens** reuse `Auth_Tokens` (`type = 'reset'`) rather than a separate table —
  same shape as a refresh token (opaque random bytes, SHA-256 hashed, looked up by
  `token_hash`), just a 15-minute expiry instead of 7 days. `resetPassword` revokes the reset
  token it used once the password update succeeds, so it can't be replayed. It does **not**
  currently revoke the user's other active refresh tokens (sessions) on a successful reset —
  known gap, flagged for a future fix, not yet built.
- **Account-enumeration resistance on auth endpoints**: `forgotPassword` returns the exact same
  response whether or not the email is registered — no early-return, no distinguishing
  exception, so a client (or attacker) can't learn which emails have accounts. The reset token
  itself is only ever generated/stored when the user *does* exist; nothing is created on the
  not-found path. `signUp`'s duplicate-email case is a deliberate exception to this: it stays a
  `409 ConflictException` (matches the status-code convention above, keeps the API debuggable)
  rather than going fully generic, because a full fix there would require email-verification
  infra this app doesn't have. Mitigate that specific gap with rate limiting on `/auth/signup`,
  not response-shape hiding.

## API design conventions (full rationale in `docs/openApi_Patterns.md`)

- Status codes: `422` for structurally invalid requests (missing field, wrong type); `409` for
  valid requests that conflict with current state (duplicate, invalid status transition); `404`
  for a missing resource. An empty list is `200` with `[]`, never `404`.
- `DELETE` idempotency split: membership/relationship removal (e.g. a like, a cart item) is
  always `204`, safe to retry, no error if already gone. Deleting an actual resource is `404` if
  it's already gone — not idempotent, don't retry blindly.
- Naming: camelCase everywhere, lowercase status enums, specific path params (`productId`, not
  generic `id`).
- The Stripe webhook route (`POST /webhooks/stripe`) is the deliberate exception to
  `security: []` being suspicious — it's called by Stripe's servers, not a logged-in user, and
  is verified via the `Stripe-Signature` header instead of a bearer token.

## Testing

- Write a unit test for every service/feature as you build it, not after — this block's stated
  approach, not optional polish. Focus on services.
- Mock dependencies a unit test doesn't need to exercise — especially anything DB-backed
  (Prisma-based services). A unit test for one service/controller shouldn't require a live
  database connection just to satisfy Nest's DI resolution.
- Don't let Claude write the assertions for code it just wrote, unit or e2e. It will assert the
  behavior it produced, bugs included. Write assertions yourself; Claude can help with mocking
  setup.
- Fake secret-shaped fixtures (Stripe `client_secret`, API keys, tokens, etc.) in test mocks must
  not match the real service's actual format — e.g. don't write `pi_123_secret_abc` for a fake
  Stripe `client_secret`, since that's indistinguishable from a real one to a secret scanner.
  GitGuardian flagged exactly this as a false positive on a real commit. Use an obviously-fake
  placeholder instead (`'fake-client-token-for-tests'`), not a string shaped like the real thing.

## Security — recurring pattern, don't reintroduce it

- Never accept a client-supplied `userId`/`role` in a request body. The acting user is always
  derived from the auth token, never from the body. This has come up multiple times already
  during spec design (OWASP API1, Broken Object Level Authorization) — treat it as settled, not
  a per-endpoint judgment call.

## Working with Claude on CASL and Stripe specifically

- CASL and Stripe are heavily represented in training data at versions this project isn't
  running. Verify every generated snippet against the actual required readings — "does this API
  still exist with these arguments," not "does it look plausible."
- Never accept an unverified webhook signature implementation. It either works against the
  Stripe CLI or it's a security hole, not a bug.
- Authorization (CASL abilities) is the highest-risk area in this capstone for accepting
  ungrounded code — a plausible-looking ability that quietly leaks another client's orders will
  pass every test that wasn't written to catch it.
