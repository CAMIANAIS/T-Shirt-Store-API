# AI Module - Write-Up

**Repository / PR:** T-Shirt-Store-API, branch `ai-module/kebab-case-urls` — PR link: TODO
**Starting commit:** `57062ba`
**Improvement:** Make sure all URLs of endpoints are kebab-case — a decision the team took." Success criteria you gave: "all endpoints are kebab-case format; a new e2e test covers this case and it passes — checks all endpoints called, and if something still calls the old path, nothing responds

## Skills

| Skill (file link)                                                                                | Goal, inputs → steps → output | Exact invocation                   |
| ------------------------------------------------------------------------------------------------ | ----------------------------- | ---------------------------------- |
| [consistency-kebab-url-endpoints](../../.claude/skills/consistency-kebab-url-endpoints/SKILL.md) | Goal: find every NestJS route whose path isn't kebab-case. Input: none (scans all `*.controller.ts`). Steps: locate controller files → extract every `@Controller`/`@Get/@Post/@Put/@Patch/@Delete` path segment → flag camelCase/PascalCase/snake_case *and* lowercase compound words (judgment call) → report grouped by file. Output: a violation list with file:line and the corrected path. | `/consistency-kebab-url-endpoints` |
| [verify-kebab-rename-e2e](../../.claude/skills/verify-kebab-rename-e2e/SKILL.md)                 | Goal: prove a kebab-case rename didn't break anything. Input: the old→new path pairs from Skill 1. Steps: generate an e2e spec that hits each old path (expect 404) and each new path (expect not-404) → run `npm run test:e2e` before and after the rename. Output: RED/GREEN pass counts and a per-endpoint breakdown. | `/verify-kebab-rename-e2e`         |

**Notes:** human in the loop for read the outcome from first skill consistency-kebab-url-endpoint and make changes on the endpoints so it is able to see list of endpoints changed and communicate to frontend to change the webhook setup.

## Project Results

**Before → after:**

What a plain camelCase regex would have missed:
signin → sign-in (pure lowercase compound, no case shift to trigger regex)
signout → sign-out (same)
forgotpassword → forgot-password (same)

Now all fllows the same pattern they use kebab-case and there is consistency between all endpoints

**Evidence:**

Before rename (RED — old paths still exist, new paths don't):
![before](../REDLOG.png)

After rename (GREEN — `npm run test:e2e`, 5 suites, 28/28 passing, including the 6 new checks):
![after](../GREENLOG.png)

Note: all mocked except the real Stripe test-mode webhook call.
