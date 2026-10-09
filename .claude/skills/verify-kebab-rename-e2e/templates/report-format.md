# Report Format — Kebab-Case Rename E2E Verification

## Structure

- **Total endpoint pairs tested**: N (from the mapping — don't hardcode a count)
- **Before rename**: how many old paths responded (should be N), how many new paths failed
- **After rename**: how many old paths now return 404, how many new paths match their exact
  expected status
- **Regressions**: any new path that still returns 404, or returns a status other than its
  expected one (e.g. `500` instead of `422`) = broken rename or misconfigured guard
- **Pass/Fail**: GREEN if all old paths → 404 AND all new paths → their exact expected status;
  RED otherwise

## Worked Example

```
Kebab-Case Rename E2E Verification
Before Rename (Baseline):
Old paths responding: N/N ✓
New paths responding: 0/N ✗
After Rename (Post-Fix):
Old paths returning 404: N/N ✓
New paths matching expected status: N/N ✓
Result: GREEN ✓
All endpoints successfully migrated to kebab-case.
Details:
[POST /auth/signin] → 404 ✓
[POST /auth/sign-in] → 422 (expected 422) ✓
[POST /auth/sign-out] → 401 (expected 401, no token) ✓
```

`N` is however many endpoint pairs came from the audit mapping — a different codebase, or a
partial rename, will have a different N. Don't reuse a number from a prior run.

## Pass Criteria

- ✅ All old paths return 404
- ✅ All new paths return their exact expected status (not just "non-404")
- ✅ No regressions introduced
- ✅ E2e test suite runs and completes

## Fail Criteria

- ❌ Any old path still responds (means rename incomplete or redirect exists)
- ❌ Any new path returns a status other than its expected one — including `404` (rename
  failed) or `500` (crash) — even if it's technically "not a 404"
- ❌ E2e tests crash or cannot run
