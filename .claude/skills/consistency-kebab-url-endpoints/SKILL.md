---
name: consistency-kebab-url-endpoints
description: it analize the code (controllers) on the project (NestJS).Output a report on enpoints which does NOT have them.
---

# Skill: Consistency — Kebab-Case URL Endpoints

## Description

Audit the codebase for endpoint URL violations of kebab-case format. Finds all routes that use camelCase, PascalCase, snake_case, or other non-kebab formats, reports their locations, and suggests corrections.

## When to Use

Run this skill when:

- You need to enforce kebab-case format on all API endpoint URLs
- You're preparing a large refactor to standardize URL naming
- You want a complete inventory of format violations before applying fixes

## Instructions

### Step 1: Locate Route Definition Files

Scan the codebase for files that define endpoints. Typical locations:

- `src/routes/` (or equivalent routing directory)
- `src/api/`
- Files matching `@Controller()`, `*.controller.ts`, `@Get/@Post/@Put/@Patch/@Delete()`

### Step 2: Extract All Route Definitions

From each file, capture:

- HTTP method (GET, POST, PUT, DELETE, PATCH)
- Full endpoint path (e.g., `/users/getUserProfile`, `/api/products/getAll`)
- File path and line number

### Step 3: Identify Violations

A route violates kebab-case if any path segment contains:

- camelCase: `getUserProfile` → `get-user-profile`
- PascalCase: `ProductList` → `product-list`
- snake_case: `get_all` → `get-all`
- Mixed: `get_Profile` → `get-profile`
- Lowercase compound words (no separators, but clearly 2+ words joined): `forgotpassword` → `forgot-password`, `signin` → `sign-in`. Use judgment to identify word boundaries when there are no case shifts or underscores.

Do NOT flag:

- Path parameters (`:id`, `{id}`, `[id]`)
- Leading/trailing slashes or double slashes
- File extensions
- Underscores in database field names or query params (only path segments matter)

### Step 4: Generate Report

Output a structured list showing:

1. **Endpoint**: Method + full path
2. **Location**: File and line number
3. **Current**: Exact path as written
4. **Should Be**: Kebab-case corrected version
5. **Type**: camelCase / PascalCase / snake_case / mixed

Group by file. Include summary counts at top.

## Expected Output

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
