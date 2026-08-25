# T-Shirt Store API — conventions

Living document. Add to it as real conventions get established while building, don't try to
front-load everything.

## Repo layout

- `docs/` holds real project artifacts: `openApi.yml` (the API contract), `openApi_Patterns.md`
  (design decisions/rationale, referenced by URL from inside `openApi.yml` — if it moves, update
  that link too), `schemaERD.sql` (the DB schema).
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
