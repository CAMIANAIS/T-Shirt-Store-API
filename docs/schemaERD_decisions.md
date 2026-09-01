# Schema Design Decisions
1. Users → Roles: One-to-Many (one user, one role)
Decision: Keep simple. A user has one role. No M:N junction table needed. The business doesn't require a user to be admin and delivery_person at the same time. One role per user. Done.
2. Users → Orders: One-to-Many (one client has many orders)
Decision: Straightforward. One user places many orders. FK on Orders.user_id. Simple and correct.
3. Cart_Items vs Order_Items (separate tables)
Decision: Keep separate. Cart items are temporary, they sit in the cart until checkout, then disappear. Order items are the permanent historical record, we need to know what was actually ordered, with the price at that moment. They serve different purposes, so separate tables make sense.

4. Price_History 
Decision: Track historical prices. We need to know what price a product was at on a specific date. If a price changes, we insert a new price_history row, we never edit the old one. This way we can look back and say "this variant cost €50 on that date," which matters for auditing and understanding past orders.

5. Enums vs. free fields: Size stays CHECK, Color does not
Decision: not "lock everything down the same way" — the actual rule is CHECK enum only if the
value set is genuinely stable for the long term, plain field otherwise. `size` stays a CHECK
enum (S–XXL is stable for apparel). `color` is plain `TEXT`, not CHECK, because print-run
palettes change often enough that a CHECK constraint would need a migration every time the
catalog adds a color. Order status, role types, and payment methods are all still CHECK-backed
(pending/paid/processing/shipped/cancelled/delivered; manager/client/delivery_person;
card/bank_account/apple_pay/google_pay) — those sets are genuinely fixed by the business, unlike
color.

6. Password_hash (Users) and Auth_Tokens (separate table)
Decision: Standard security. `password_hash` on `Users` is for login, hashed before storage,
never plaintext. Session/refresh/reset tokens do not live as columns on `Users` anymore — they
moved into a dedicated `Auth_Tokens` table once that need became real, so `Users` doesn't carry
token state that has its own lifecycle (issued, rotated, expired) separate from the user record
itself.

7. CHECK constraints on amounts and quantities
Decision: Let the database enforce. Quantity > 0 because zero in a cart makes no sense. Payment amount > 0 because money has to move. Price >= 0 because free items happen. This catches mistakes early and prevents bad data from ever getting in.

8. Order status flow now includes 'delivered'
Decision: Add delivered state. The full flow is pending → paid → processing → shipped →
delivered. Shipped and delivered are different: shipped means it left the warehouse, delivered
means it arrived. Cancellation is NOT possible at any point — per the assignment's mandatory
rule, an order can only be cancelled before it reaches `shipped`. The CHECK constraint on
`status` only restricts which values are valid; the before-shipped-only rule is enforced in
application logic, not the database, so it has to be implemented deliberately when order
cancellation is built (Week 4).

9. Adress Decision: Let users save multiple addresses. A user can have as many shipping addresses and billing addresses as they want. But only one can be marked as default. I use a partial unique index, it only checks the rows marked default, and makes sure there's only one default per address type. Non-default addresses don't get checked, so users can have as many as you need.

10.  Added a CHECK constraint that enforces: if changed_by_type = 'user', changed_by_email must always be recorded. The changed_by_user_id can go null if the user is deleted ,that's fine. If changed_by_type = 'system', both fields stay null. The email is the durable identifier that keeps the audit trail meaningful. The user_id is just a convenience link. This way you can delete a user without breaking the historical record.

11. Auth_Tokens gets a `type` column (refresh/reset), NOT NULL
Decision: reuse Auth_Tokens for password-reset tokens instead of a separate table — it already had
token_hash/expires_at/revoked/jti/user_id, which is most of what a reset token needs. Added a
NOT NULL type CHECK enum so a token's purpose is never ambiguous; without it, "any live token for
this user" could accidentally match a refresh token when only a reset token should count, or
vice versa.

Update (Week 3, Day 2): dropped `session` from the enum. Access tokens ended up as stateless
signed JWTs, never persisted, so no row was ever going to carry that type — keeping it would have
left the schema documenting a token kind that doesn't exist. Only `refresh` (opaque random token,
SHA-256 hash, looked up directly by `token_hash`) and `reset` actually get rows.

12. Order_Items — no updated_at, blocked from UPDATE entirely
Decision: once an order is placed, its line items are locked in — quantity and price_at_purchase
never change after creation. Caught via a normalization check on Orders.total_amount: it's
derivable from Order_Items, and Order_Items had updated_at + a trigger implying it was mutable,
which would have let total_amount silently go stale on an edit. Resolved by removing updated_at
(nothing to track if updates can't happen) and adding a trigger (block_order_items_update) that
raises on any UPDATE — the database enforces the immutability, not just application code.
Cart_Items is the deliberate opposite: quantity is genuinely mutable before checkout
(PATCH /carts/items/{id}), so it keeps updated_at and allows normal UPDATE.

13. Order_Items correction path — deliberately not built yet
If a legitimate operational need ever comes up (a manager fixing a genuine data-entry mistake),
that should NOT be "just allow updates" or a trigger bypass hidden in application code. The
right shape, when/if it's actually needed: a separate, explicit stored procedure
(e.g. admin_correct_order_item) that disables block_order_items_update for the duration of the
correction, makes the change, writes to an audit log (who, what, when, why), then re-enables the
trigger. The blocking trigger says "normal code cannot do this"; the procedure says "a specific,
logged, admin-only path can, and it's never silent." Not built today — no requirement asks for
it yet — but the principle is settled so it isn't re-derived from scratch later.

14. Stock_Notifications — new table, "once ever per product" de-dup
Decision: checked challenge.md/GUIDELINES3 first — Week 4 doesn't ask for per-restock-cycle
re-notification, so went with the simple version: UNIQUE(product_id, user_id) blocks a second
notification row for the same pair, period. If a liked product restocks, sells out, and restocks
again later, the same user does not get notified twice. Documented trade-off, not an oversight —
if a future requirement wants per-cycle re-notification, the extension path is a restock_cycle_id
column and UNIQUE(product_id, user_id, restock_cycle_id) instead.

15. JWT payload includes role name (Week 3, CASL prep)
Decision: the JWT payload for both `signIn` and `signUp` now includes a `role` field — the
role's name string (e.g. `'client'`, `'manager'`), not its numeric id. It's resolved server-side
via a `role_id` lookup against `Roles`, never accepted from the client, matching the standing
rule against client-supplied `userId`/`role`. In `signIn`, the lookup happens after password
validation, not before — no reason to spend a DB query resolving a role for a login that's about
to fail anyway. This lets a future CASL ability factory check `user.role` straight from the JWT
payload, without an extra DB round-trip on every request.

16. Delete vs. disable products — resolved
Decision: both stay status transitions, not row removal. `remove()` (`DELETE /products/:productId`)
is a soft delete — sets `deleted_at`, never issues a real SQL `DELETE` — so `product_variants`'
`ON DELETE RESTRICT` back to `products` never actually gets exercised. "Disable" split further
into two distinct states on the existing `status` field: `inactive` (reversible — dedicated
`POST /products/:productId/activate`/`deactivate` endpoints) and `discontinued` (permanent — both
endpoints reject it with 409). Confirms this wasn't an oversight — a hard delete on a product
with order history was never the goal.

17. Orders.payment_method — made nullable
Decision: an order is created (POST /orders) before payment method is chosen — neither the
Payment Links flow (Stripe hosts the checkout, customer picks method there) nor the Payment
Intents flow (client attaches a method via Stripe Elements after the intent exists) requires a
method upfront. Verified against the real Stripe API docs, not assumed: both checkout.session.completed
and payment_intent.succeeded webhook payloads resolve to a payment method only via an ID chain
that needs expanding, confirming the method is genuinely decided at the customer-interaction step,
not before. `payment_method` dropped its `NOT NULL` (both in schemaERD.sql and schema.prisma);
the CHECK constraint stays as-is since Postgres CHECK constraints pass on NULL automatically. Gets
populated by the relevant webhook handler once payment actually completes.
