---
name: maisongr-debugging
description: Maison GR method for finding and fixing the root cause of a defect. Use when something fails, crashes, returns wrong results, behaves intermittently, or a test is failing, and the cause is not already known. Reproduces the failure, narrows it to a root cause with evidence, applies the smallest fix, and proves the failure is gone with a regression test.
license: MIT
metadata:
  author: Maison GR Inc.
---

# Maison GR Debugging

## Objective

Fix the cause, not the symptom, and prove it. A fix without a reproduction is a guess.

## When to use

- A bug report, error message, stack trace, failing test or unexpected behaviour.
- A flaky or intermittent failure.
- A regression after a change.

## Method

### 1. Reproduce

- Get the exact failing input, environment and steps. Ask for them if they are missing.
- Reproduce the failure yourself, ideally as a failing automated test. If that is not practical, as a script or a command with observable output.
- Record the actual and the expected result.

If you cannot reproduce it, say so. Do not proceed to a fix based on a theory alone. Gather more evidence instead: logs, versions, data, timing.

### 2. Read the evidence

- Read the full error and stack trace. The first frame in project code is usually more useful than the last line.
- Check what changed recently: `git log`, `git diff`, dependency updates, configuration, data.
- Note the boundaries: which inputs fail and which succeed?

### 3. Form hypotheses and test them

List the possible causes, then eliminate them with evidence, one at a time:

```text
Hypothesis: timestamps are parsed in local time, not UTC.
Test: run the import with TZ=UTC and TZ=America/Toronto.
Result: fails only with America/Toronto. Confirmed.
```

Useful techniques:

- **Bisect** the history (`git bisect`) when the failure is a regression.
- **Bisect the input**: halve a failing dataset until the smallest failing case remains.
- **Instrument**: add temporary logging or assertions at the boundaries of the suspect area.
- **Compare**: diff a working environment against a failing one.

Change one thing at a time. If you change several, you will not know which one mattered.

### 4. Identify the root cause

You have the root cause when you can explain the full chain from trigger to symptom, and the explanation predicts which inputs fail. Ask "why" until the answer is something you can fix at its source. A null check that hides a value which should never be null is a symptom fix.

### 5. Fix

- Make the smallest change that removes the cause.
- Check for the same bug pattern elsewhere in the codebase. Report other occurrences; fix them only if they are in scope.
- Remove all temporary instrumentation.

### 6. Prove it

- The reproduction from step 1 now passes.
- Keep it as a regression test that fails without the fix. Confirm that it does fail without the fix.
- Run the surrounding test suite to check you did not break neighbouring behaviour.

## Intermittent failures

- Look for shared state, ordering assumptions, time, randomness, concurrency and external services.
- Run the failing test many times in a loop to measure the failure rate before and after the fix.
- Never "fix" flakiness with retries or longer sleeps unless the root cause is an external system you cannot control, and say so in the report.

## Constraints

- Do not suppress the error, catch-and-ignore, or loosen an assertion to make a failure disappear.
- Do not refactor while debugging. Fix first, verify, then propose any refactor separately.
- Do not delete or skip a failing test unless you have shown that the test itself is wrong.

## Verification

- [ ] The failure was reproduced before the fix.
- [ ] The root cause is explained with evidence.
- [ ] A regression test fails without the fix and passes with it.
- [ ] Related tests pass.
- [ ] Temporary instrumentation is removed.

## Output

```text
Symptom: what was observed.
Reproduction: test or command that showed it.
Root cause: the chain from trigger to symptom, with the evidence.
Fix: what changed and why it addresses the cause.
Proof: regression test name and the before and after results.
Related risk: other places the same pattern appears.
```
