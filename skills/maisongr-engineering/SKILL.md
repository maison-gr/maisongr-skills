---
name: maisongr-engineering
description: Maison GR method for carrying a coding task from request to verified result. Use when implementing a feature, fixing a defect, refactoring, or making any change to an existing codebase that is larger than a one-line edit, especially when the request is ambiguous, spans several files, or touches behaviour other code depends on.
license: MIT
metadata:
  author: Maison GR
---

# Maison GR Engineering

## Objective

Deliver the change the developer actually needs, in the smallest correct form, with evidence that it works. The task is finished when the success criteria are demonstrated, not when the code is written.

## When to use

- Implementing a feature, fixing a defect, refactoring, or changing configuration in an existing codebase.
- Any task that touches more than one file or behaviour that other code depends on.

Not needed for a typo, a one-line rename, or a question that does not change code. Use the specialised skills when the task is mainly review, debugging, testing, security, architecture, documentation, database, API, frontend, version control, deployment or contributing to someone else's repository.

## Method

### 1. Inspect

Before proposing anything, find out how the project already works.

- Locate the code that owns the behaviour, its callers, and its tests.
- Find the project's commands: install, test, lint, type check, build. Look in the README, the package manifest, the Makefile and the CI workflows.
- Note the conventions you must match: naming, folder layout, error handling, test style.
- Check the working tree. Do not overwrite or mix in someone else's uncommitted work.

### 2. Clarify

Write down, for yourself, three short lists:

- **Facts:** what the request, code and docs establish.
- **Assumptions:** what you are inferring. Each one is a risk.
- **Open questions:** the ones whose answer changes what you build.

Ask the open questions before building when the answer is costly to change later (data model, public interface, user-facing behaviour, new dependency). For cheap, reversible choices, pick the project's convention, proceed, and report the choice.

### 3. Plan

For anything beyond a small change, write a plan before editing:

```text
Goal: <one sentence, in the user's terms>
Done when:
  - <observable criterion>
  - <observable criterion>
Steps:
  1. <change> -> verify: <command or check>
  2. <change> -> verify: <command or check>
Out of scope: <what you will deliberately not touch>
Risks: <what could break, and how you will notice>
```

Share the plan and wait for agreement when the change is large, risky, touches a public contract or data, or when you made an assumption the developer may reject.

### 4. Implement

- Make one step at a time and verify it before starting the next.
- Write the simplest code that meets the criteria. Prefer the existing helper, component or library over a new one.
- Match the surrounding style exactly, even where you would choose differently.
- If a step reveals that the plan is wrong, stop, update the plan, and say what changed.
- Keep a running list of anything you noticed but did not fix. It belongs in the report.

### 5. Verify

- Run the checks named in the plan, then the project's broader test and lint commands if the change could affect other areas.
- For behaviour that tests do not cover, exercise it directly: run the command, call the endpoint, load the page.
- Read the complete diff. Remove debug output, commented-out code, stray files and unrelated edits.
- Confirm every "done when" criterion against real evidence.

### 6. Report

```text
Changed:
  - path/to/file: what and why
Verified:
  - <command>: <result>
Not verified:
  - <item>: <reason>
Decisions to review:
  - <assumption or trade-off>
Noticed, not changed:
  - <unrelated issue>
```

## Constraints

- Do not add dependencies, external services or new architectural layers without approval.
- Do not change public interfaces, schemas or stored data formats unless the task requires it, and then say so explicitly.
- Do not commit, push or deploy unless the project's workflow or the developer asks for it.
- Never report a check as passing unless you ran it in this session and saw it pass.

## Verification checklist

- [ ] Success criteria were written before implementation.
- [ ] Every changed line traces to the request.
- [ ] The project's own test, lint and type commands were run, or the report says why not.
- [ ] The full diff was reviewed.
- [ ] The report separates what was verified from what was not.

## Stop and ask when

- Two reasonable interpretations would produce different code.
- The fix requires changing a public contract, a schema or production data.
- The existing tests fail before you have changed anything.
- The task needs credentials, paid services or access you do not have.
