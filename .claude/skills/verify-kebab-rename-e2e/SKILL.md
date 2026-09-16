---
name: verify-kebab-rename-e2e
description: Run e2e tests to verify a kebab-case URL rename succeeded — old paths return 404, new paths respond with the expected status. Use after applying renames from the audit skill.
---

# Skill: Verify — Kebab-Case Rename E2E Tests

## When to Use

Run this skill after:

- Skill 1 (consistency-kebab-url-endpoints) has identified all violations
- The kebab-case renames have been applied to the codebase
- You need proof that the refactor didn't break the application

## Input Required

From Skill 1, you need:

- The old path → new path mapping, from the audit report (count = however many the audit found,
  don't hardcode a number)
- Or: Manually provide pairs like `{ old: "/auth/signin", new: "/auth/sign-in" }`

Each pair also needs one **expected status** for the new path — required, not optional. Derive
it from the route's guards, matching this project's status-code convention (`CLAUDE.md`):

- Route has `@UseGuards(...)`, called with no/invalid token → expect `401`.
- Route has no guard, called with an empty/invalid body → expect `422` (structurally invalid
  request, per the `422` convention).
- Called with valid data → expect the route's real success status (e.g. `200`, `201`).

"Anything except 404" is not a valid expected status — it hides real bugs (see Step 2).

## Instructions

### Step 1: Create E2E Test File

Generate a new e2e test file (e.g., `test/kebab-rename.e2e-spec.ts`) that tests all path migrations.

### Step 2: For Each Endpoint Pair, Test Two Cases

**Case A: Old path should return 404**
POST /auth/signin
Expected: 404 Not Found (or no route handler)
Actual: [result]

**Case B: New path should return its exact expected status**
POST /auth/sign-in
Expected: 422 (empty body — unguarded route, structurally invalid request)
Actual: [result]

Assert equality against the expected status from the mapping, not "anything except 404." A
`500` (crash), a `200` where `422` was expected, or a `403` where a guard should give `401` are
all failures — the route responds, but something is still broken.

### Step 3: Run the Test Suite

Execute the e2e tests against the renamed codebase:

```bash
npm run test:e2e -- test/kebab-rename.e2e-spec.ts
```

Capture output: **BEFORE** (old paths work, new paths fail) and **AFTER** (old paths fail, new paths work).

### Step 4: Generate Report

Load `templates/report-format.md` for the exact structure, a worked example, and the pass/fail
criteria. Count endpoint pairs from the mapping you were given — never hardcode a number.
