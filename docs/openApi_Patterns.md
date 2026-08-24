# T-Shirt Store API: Patterns & Decisions
## 0.HTTP Status Code Reference by Method

| Method | 400 | 401 | 403 | 404 | 409 | 422 | Success |
|--------|-----|-----|-----|-----|-----|-----|---------|
| GET | ✓ | ✓ | ✓ | ✓ | — | — | 200 |
| POST (create) | ✓ | ✓ | ✓ | ✓* | ✓ | ✓ | 201 |
| POST (action) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 200/204 |
| PATCH | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 200 |
| DELETE (resource) | ✓ | ✓ | ✓ | ✓ | — | — | 204 |
| DELETE (membership) | ✓ | ✓ | ✓ | — | — | — | 204 |

**\* Parent resource on nested endpoints** (e.g., POST /products/{id}/variants)

### Code Meanings

| Code | Name | Meaning | Examples |
|------|------|---------|----------|
| 400 | Bad Request | Malformed/invalid path parameter format | `/products/abc` (expecting int), `/orders/-1` |
| 401 | Unauthorized | Missing or invalid authentication credentials | Missing bearer token, invalid token, wrong login password |
| 403 | Forbidden | Valid auth, but insufficient permissions | Client trying to delete manager-only resource |
| 404 | Not Found | Resource or parent resource doesn't exist | Product not found, product missing for variant POST |
| 409 | Conflict | Request valid, but conflicts with existing state | Duplicate email, duplicate SKU, can't cancel shipped order |
| 422 | Unprocessable Entity | Request structure is broken (not data conflict) | Missing required field, wrong type, invalid enum value |
| 200 | OK | GET/PATCH succeeded | Successful read or update |
| 201 | Created | POST (create) succeeded | New resource created |
| 204 | No Content | DELETE succeeded | Resource/membership removed |

### Key Distinctions

**400 vs 409:**
- **400**: Request itself is malformed (bad format, missing field, wrong type)
- **409**: Request is valid, but server state forbids it (duplicate SKU, can't cancel shipped order)

**404 vs 409:**
- **404**: Resource you're trying to operate on doesn't exist
- **409**: Resource exists, but the operation conflicts with its state

**DELETE (resource) vs DELETE (membership):**
- **Resource DELETE** (non-idempotent): 404 if already gone, client should not retry blindly
- **Membership DELETE** (idempotent): 204 always, safe to retry, no error if already removed

**POST (create) vs POST (action):**
- **Create** (201): New resource created in system
- **Action** (200/204): Operating on existing resource (e.g., like, cancel order)

## 1. Sourced from Formal Specifications 

### OpenAPI/JSON Schema
- **discriminator requires $ref'd schemas, not inline** (OpenAPI 3.x spec language)
  - Link: [OpenAPI Discriminator](https://spec.openapis.org/oas/v3.0.3#discriminator-object)
  - Why: Code generators (Orval, openapi-typescript) only process referenced schemas

- **`required` keyword affects generated validator behavior** (JSON Schema core)
  - Impact: Missing `required` = generated code treats fields as optional even if needed
  - My fix: CartItemsInput, CartItemsInputById, OrderInput, OrderAddressInput, PaymentIntentInput all explicitly declare required fields

### HTTP Standards (RFC 7235, RFC 7231)
- **401 Unauthorized definition**: "request lacks valid authentication credentials for the target resource" (RFC 9110 §15.5.2)
  - Applies to: missing/invalid bearer token OR missing/invalid login credentials
  - Decision we made: treat login attempt (email/password) same as token-based auth
  - Rationale: both are "credentials didn't check"; both are 401

- **409 Conflict definition**: "request conflicts with the current state of the server" (RFC 9110 §15.5.10)
  - My mapping (see Section 3 below): uniqueness violations + state-transition rejections
  - RFC doesn't mandate this mapping; we chose it; it's defensible

- **422 (Unprocessable Content)** (RFC 9110 §15.5.21 — current name and home; originated in RFC 4918/WebDAV, now defined directly in core HTTP semantics)
  - Exact definition: "the syntax of the request content is correct, but it was unable to process the contained instructions"
  - Note: this is looser than "structurally broken" — it's syntax-correct-but-unprocessable, which genuinely overlaps with 409's territory. The RFC doesn't draw the clean 400/422/409 line we use.
  - My boundary (by choice, not spec mandate): body structure/type/required-field failures → 422; conflicts with existing state → 409

---

## 2. Conventions (Widely Practiced, Not Mandatory, Worth Consistency)

### REST API Design (Google, Microsoft, GitHub style guides)
- **Empty list returns 200 with [], never 404**
  - Rationale: 404 is "resource doesn't exist"; list is a resource and exists (it's just empty)
  - My choice: applied this to GET /products/{id}/variants and GET /products/{id}/images

- **Consistent field naming within a single API**
  - camelCase throughout (not snake_case, not SCREAMING_CASE)
  - Status enums lowercase (active, pending, shipped)
  - Path params specific (productId, orderId) not generic (id)
  - Rationale: client code reads naturally; generated types are consistent
  - Note: camelCase vs snake_case is genuinely a choice; Stripe and GitHub use snake_case successfully

- **Success messages follow "{Resource} {verb} successfully" pattern**
  - Rationale: consistency over spec — helps client code recognize intent
  - Not mandated anywhere; mine to maintain

---

## 3. My Own Patterns

### DELETE Idempotency Rule: Membership vs. Resource
**Status codes for DELETE:**
- **204 No Content (idempotent)** for membership/relationship removal
  - Examples: `/products/{id}/likes`, `/carts/items/{id}`
  - Semantics: "make sure I'm not in this set"
  - Safe to retry; no error on already-absent
  
- **404 Not Found (non-idempotent)** for resource deletion
  - Examples: `/products/{id}`, `/orders/{id}`
  - Semantics: "destroy this specific thing"
  - Error if already gone

**Source:** NOT from RFC 7231 (which only says repeated DELETEs must have same effect, not which codes to use). This is a design pattern you reasoned into existence from use-case semantics.

**RFC compliance:** ✓ Idempotent (both returns are semantically equivalent). But the split is convention we made, not something the spec forces.

**Defense:** In code review, you can justify this as "memberships are sets where repeated removals are harmless; resources are entities where repeated deletion is an error." That's sound modeling, not just opinion.

### 409 for State-Transition Conflicts
**Examples in our API:** Can't cancel a shipped order, can't transition from paid directly to shipped
- Request is structurally valid (well-formed body/params)
- Server rejects it because current state forbids the transition
- 409 signals this clearly to clients (unlike 400, which means "your data was malformed")

**Source:** RFC defines 409 as "conflict with current server state," but doesn't mandate that state-transitions must use it. We chose this mapping; it's reasonable; defend it as "state conflicts get 409, malformed requests get 400."

### Categories — Closed
`GET /categories` added to endpoints.yml (paginated, matches the limit/offset/X-TotalCount pattern used everywhere else). Directly supports the "search products by category" requirement — a client can now discover valid category values instead of guessing.

### Addresses — Closed (Inline, Not a Separate Resource)
**The problem I found:** my ERD's `Orders` table had no relationship to `Addresses` at all, even though `OrderInput.addressId` assumed one. An order needs to remember which address it shipped to even if the user later edits or deletes that saved address.

**The decision:** added `Order_Addresses` to `schemaERD.sql` — a snapshot captured at order-creation time (`order_id`, `type`, full address fields duplicated, `UNIQUE (order_id, type)` so one shipping + one billing max per order). Same pattern as `Order_Items.price_at_purchase`: don't point at a mutable row, copy the value at the moment it matters.

**Simplification on the API side:** rather than requiring a client to already have a saved `addressId` (which would need a whole reusable address-book resource just to be usable), `OrderInput.shippingAddress` takes the address fields inline via `OrderAddressInput`. The client submits the address at checkout time; the server snapshots it into `Order_Addresses`. No `/addresses` book needed for this to work.

**Explicitly deferred:** a reusable, per-user address book (list mine, set a default, reuse across orders) is real, useful, and matches the original `Addresses` table already in the ERD — but it's not required for checkout to function, so it's a Week 4 nice-to-have, not a Week 2 gap.

### Stripe Payments (Section 7, MUST) — Closed
**Payment Links** (`POST /products/{productId}/paymentLink`): generates a shareable Stripe link for a single-product purchase, no cart involved. `201` (a link is a created resource) with the link + expiry in the body — not `204`, since the client needs that URL back.

**Payment Intents** (`POST /orders/{orderId}/payment`): created against an existing order, once it's in `pending` status. `409` if the order's already paid or not pending — same "valid request, state says no" pattern as everything else using 409 this session, not a new invention.

**Stock validation placement:** decided this belongs at `POST /orders` time (`409 "Cart contains items with insufficient stock"`), not at payment-intent time. Validating stock before an order object even exists is more sound than creating an order you can't fulfill and only failing at the payment step.

**`PaymentIntentInput.paymentMethod`** matches `schemaERD.sql`'s `Payments.method_type` check constraint for actual payment instruments (`card`, `bank_account`, `apple_pay`, `google_pay`) — deliberately excluding `payment_link`/`payment_intent` from that same DB enum, since those describe the *channel* (already captured separately by `Order.paymentMethod`), not the *instrument*.

**Webhook auth is a deliberate exception to the global default:** `POST /webhooks/stripe` has `security: []` — not because it's "public" in the browsable sense, but because it's called by Stripe's servers, not a logged-in user, so a bearer token check makes no sense there. Verified via `Stripe-Signature` header instead (Stripe's real header name, not `X-Stripe-Signature` — checked, not guessed).

---

## 4. Lessons Learned (Meta-Documentation)

**Distinguish between:**
- Specs I can cite (OpenAPI, RFC, JSON Schema) these are checkable
- Conventions I follow (camelCase) argue for consistency, not correctness
- Patterns I invented (DELETE idempotency rule) own them clearly, explain the reasoning



