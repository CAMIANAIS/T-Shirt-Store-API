---
name: verify-kebab-rename-e2e
description: runs e2e verification to make sure all url are actually working after manual.
---

# Skill: Verify — Kebab-Case Rename E2E Tests

## Description

Run e2e tests to verify that a kebab-case URL rename refactor was successful. Tests that old paths return 404 (no longer respond) and new paths respond correctly, proving no routes were broken in the rename.

## When to Use

Run this skill after:

- Skill 1 (consistency-kebab-url-endpoints) has identified all violations
- The kebab-case renames have been applied to the codebase
- You need proof that the refactor didn't break the application

## Input Required

From Skill 1, you need:

- List of old paths → new paths mappings (6 endpoints from the audit)
- Or: Manually provide pairs like `{ old: "/auth/signin", new: "/auth/sign-in" }`

## Instructions

### Step 1: Create E2E Test File

Generate a new e2e test file (e.g., `test/kebab-rename.e2e-spec.ts`) that tests all path migrations.

### Step 2: For Each Endpoint Pair, Test Two Cases

**Case A: Old POST path should return 404**
POST /auth/signin
Expected: 404 Not Found (or no route handler)
Actual: [result]
**Case B: New POST path should respond (not 404)**
POST /auth/sign-in
Expected: 200/201/400/403 (anything except 404)
Actual: [result]

### Step 3: Run the Test Suite

Execute the e2e tests against the renamed codebase:

```bash
npm run test:e2e -- test/kebab-rename.e2e-spec.ts
```

Capture output: **BEFORE** (old paths work, new paths fail) and **AFTER** (old paths fail, new paths work).

### Step 4: Generate Report

Output:

- **Total endpoint pairs tested**: 6
- **Before rename**: How many old paths responded (should be 6), how many new paths failed
- **After rename**: How many old paths now return 404, how many new paths respond
- **Regressions**: Any new path that still returns 404 = broken rename
- **Pass/Fail**: GREEN if all old paths → 404 AND all new paths → not 404; RED otherwise

## Expected Output

Kebab-Case Rename E2E Verification
Before Rename (Baseline):
Old paths responding: 6/6 ✓
New paths responding: 0/6 ✗
After Rename (Post-Fix):
Old paths returning 404: 6/6 ✓
New paths responding: 6/6 ✓
Result: GREEN ✓
All endpoints successfully migrated to kebab-case.
Details:
[POST /auth/signin] → 404 ✓
[POST /auth/sign-in] → 201 ✓
[POST /auth/signup] → 404 ✓
[POST /auth/sign-up] → 201 ✓

## Pass Criteria

- ✅ All old paths return 404
- ✅ All new paths return non-404 status
- ✅ No regressions introduced
- ✅ E2e test suite runs and completes

## Fail Criteria

- ❌ Any old path still responds (means rename incomplete or redirect exists)
- ❌ Any new path returns 404 (means rename failed for that route)
- ❌ E2e tests crash or cannot run
