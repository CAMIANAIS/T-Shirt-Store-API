---
name: consistency-kebab-url-endpoints
description: Audit NestJS controllers and Markdown docs for kebab-case URL violations — route naming, endpoint rename, camelCase/snake_case paths. Reports file, line, and the corrected path.
---

# Skill: Consistency — Kebab-Case URL Endpoints

## When to Use

Run this skill when:

- You need to enforce kebab-case format on all API endpoint URLs
- You're preparing a large refactor to standardize URL naming
- You want a complete inventory of format violations before applying fixes

## Instructions

### Step 1: Locate Route Definition Files

Scan the codebase for files that define endpoints. Typical locations — routes are not limited
to these, so don't stop searching once you've checked them:

- `src/routes/` (or equivalent routing directory)
- `src/api/`
- Files matching `@Controller()`, `*.controller.ts`, `@Get/@Post/@Put/@Patch/@Delete()`

Also scan Markdown files (`*.md`) — `README.md`, `CLAUDE.md`, and files under `docs/` — not
just controllers. Routes get documented there too, and a stale reference in a doc breaks
onboarding just as badly as a stale route in code.

### Step 2: Extract All Route Definitions

From each file, capture:

- HTTP method (GET, POST, PUT, DELETE, PATCH)
- Full endpoint path (e.g., `/users/getUserProfile`, `/api/products/getAll`)
- File path and line number

### Step 3: Identify Violations

A route violates kebab-case if any path segment isn't already kebab-case. Most violations are
obvious (camelCase, PascalCase, snake_case, mixed). The one pattern that needs judgment, since
no case-shift or separator flags it automatically:

- Lowercase compound words joined with no separator (`forgotpassword` → `forgot-password`,
  `signin` → `sign-in`). Identify word boundaries by reading the words, not by pattern-matching.

Do NOT flag:

- Path parameters (`:id`, `{id}`, `[id]`)
- Leading/trailing slashes or double slashes
- File extensions
- In Markdown: only count a match if it's backtick-wrapped and starts with `/` (e.g.
  `` `POST /auth/signin` ``, `` `/auth/signin` ``). Plain prose mentioning the word with no
  backticks and no leading `/` (e.g. "too many signin attempts") is not a path reference — skip
  it. This also naturally excludes backtick-wrapped file paths (e.g.
  `` `src/auth/auth.controller.ts` ``), since those don't start with `/`.
- In Markdown: skip any match inside a section explicitly marked historical — a dated
  "Resolved (date):" log entry, or text tagged `<!-- kebab-audit: skip -->`. Those describe a
  past state, not a current instruction to fix.
- Underscores in database field names or query params (only path segments matter)

### Step 4: Generate Report

Load `templates/report-format.md` for the exact structure and a worked example. Count
violations from what Step 3 actually found — never hardcode a number.

### Step 5: Hand Off

Once the report is generated and renames are applied to the codebase, hand off to the
`verify-kebab-rename-e2e` skill to confirm the rename didn't break routing. Give it the old →
new path mapping from this report — that's its required input.
