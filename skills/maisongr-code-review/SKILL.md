---
name: maisongr-code-review
description: Maison GR method for reviewing a code change. Use when asked to review a diff, a pull request, a branch or a set of files, or before declaring your own substantial change complete. Finds correctness bugs, security issues, regressions, broken contracts, missing tests and unnecessary complexity, and reports them ranked by severity with concrete failure scenarios.
license: MIT
metadata:
  author: Maison GR Inc.
---

# Maison GR Code Review

## Objective

Find the problems in a change that would hurt users, data or the team, explain each with a concrete failure scenario, and rank them so the most important ones are fixed first. A review that lists twenty style nits and misses the data-loss bug has failed.

## When to use

- Reviewing a pull request, a branch, a diff or specific files.
- Self-review before reporting a substantial change as complete.

## Method

### 1. Establish intent

- Read the PR description, linked issue or task statement. What is this change supposed to do?
- Read the diff in full before commenting on any part of it.
- Read the surrounding code that the diff relies on, not only the changed lines. Many bugs live in the interaction between a change and code it did not touch.

### 1b. Treat the author's report as claims

Writing code is cheap; proving it right is the hard part. When the change comes with a report (an AI agent's summary, a PR checklist, "all tests pass"), each statement in it is a claim to check, not evidence:

- Re-run every check the report says passed (tests, type checker, linter, build) with the project's own commands, and compare the results.
- Compare what the report says changed with what the diff actually changes. Flag files changed but not mentioned, and behaviour claimed but not in the diff.
- A test added for a fix or for new behaviour must fail without the change. If you can, revert the change locally and run it. A test that pins existing behaviour before a refactor is expected to pass both ways.
- Report any claim you could not reproduce as **unverified**, with the command you ran.

For a change that touches security, payments, personal data or production data, ask for a second review in a fresh context, ideally by a model from a different family than the one that wrote the change (for example, review with Codex or Gemini CLI what was written with Claude Code, and the other way round). Models of one family tend to share blind spots. Where the two reviews disagree, verify the point; never settle it by majority.

### 2. Review in priority order

Work through these passes. Spend your effort at the top.

1. **Correctness.** Does it do what was intended? Look for wrong conditions, off-by-one errors, null and empty cases, unhandled errors, race conditions, wrong units or time zones, and incorrect assumptions about inputs.
2. **Security.** Untrusted input reaching queries, shell commands, file paths, HTML or redirects. Missing authorisation checks. Secrets in code or logs. Personal data exposed in responses or logs.
3. **Data and contracts.** Schema changes without safe migrations. API, event or file-format changes that break existing consumers. Changed defaults.
4. **Regressions.** Behaviour that existing callers depend on and that the change alters. Search for callers of every changed function signature.
5. **Tests.** Is the new behaviour tested? Do the tests assert outcomes, or only that code ran? Is the failure case tested?
6. **Complexity.** Abstractions with one use, speculative options, duplicated logic that an existing helper already provides, dependencies that were not needed.
7. **Consistency.** Deviations from the project's established patterns, naming and error handling.

### 3. Verify each finding

Before reporting a finding, confirm it:

- Trace the code path that triggers it. Name the input or state.
- Check that a guard elsewhere does not already handle it.
- If you can, run the code or a test that demonstrates it.

Drop findings you cannot support. Mark findings you believe but could not confirm as **unconfirmed**.

### 4. Classify severity

| Severity | Meaning | Examples |
|---|---|---|
| **Blocker** | Must be fixed before merge | Data loss, security hole, crash on a common path, broken public contract |
| **Major** | Should be fixed before merge | Bug on a realistic edge case, missing test for new logic, significant regression risk |
| **Minor** | Worth fixing, does not block | Unclear naming, small duplication, missing log context |
| **Note** | Optional | Alternative approach, question, praise for a good decision |

Style preferences already settled by a formatter or linter are not findings.

## Output

Lead with a one-line verdict: **approve**, **approve with minor changes**, or **changes required**. Then list findings, most severe first:

```text
[Blocker] src/billing/invoice.ts:88
Problem: Discount is applied after tax, so taxed totals are understated.
Scenario: cart total 100, tax 10%, discount 10 -> charges 100 instead of 99.
Fix: apply the discount to the subtotal before computing tax (line 82).
```

Every finding has a location, the problem, a concrete scenario, and a suggested fix. End with what you did not review (generated files, files outside the diff, behaviour you could not run).

## Constraints

- Review the change, not the author.
- Do not rewrite the change in your review. Suggest the smallest fix.
- Do not demand refactors of code the change did not touch. Note them separately if they matter.
- If you have no significant findings, say so plainly. Do not invent problems to appear thorough.

## Verification

- [ ] The full diff and the code it depends on were read.
- [ ] Every check the author's report claims was re-run, and the report was compared with the diff.
- [ ] Every finding has a location and a concrete failure scenario.
- [ ] Findings were checked against existing guards.
- [ ] Findings are ranked by severity.
- [ ] The review states what was not covered.
