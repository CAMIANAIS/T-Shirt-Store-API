# Report Format — Kebab-Case URL Audit

## Structure

For each file with violations, list:

1. **Endpoint**: Method + full path
2. **Location**: File and line number
3. **Current**: Exact path as written
4. **Should Be**: Kebab-case corrected version
5. **Type**: camelCase / PascalCase / snake_case / mixed / compound-word

Group by file. Include summary counts at top — **count what you actually found, don't reuse the
number from the worked example below.**

## Worked Example

```
Kebab-Case URL Audit
Summary
Total Violations: 6

src/auth/auth.controller.ts (5 violations)
POST /auth/signin
Line 38 → Change to: /auth/sign-in
POST /auth/signup
Line 45 → Change to: /auth/sign-up
POST /auth/signout
Line 55 → Change to: /auth/sign-out
POST /auth/forgotpassword
Line 64 → Change to: /auth/forgot-password
POST /auth/resetpassword
Line 73 → Change to: /auth/reset-password

src/products/products.controller.ts (1 violation)
POST /products/:productId/paymentLink
Line 175 → Change to: /products/:productId/payment-link
```

That `6` is from one real run against this project's base commit, before the rename. A
different codebase, or a partially-fixed one, will have a different count — always derive it
from what Step 3 actually found.
