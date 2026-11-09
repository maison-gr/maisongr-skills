# The Maison GR Principles

[`AGENTS.md`](../AGENTS.md) states the seven principles as instructions an agent follows. This document explains them for the people who adopt, adapt or extend them: the failure each principle prevents, how to recognise that failure, and where the line falls.

## Why principles at all

AI coding agents fail in recognisable ways. They are fluent, fast and eager to please, so their mistakes look finished:

- They fill gaps in a request with confident guesses.
- They write more code than the task needs, because more code looks like more help.
- They improve things nobody asked them to touch.
- They stop when the code is written, not when it is shown to work.
- They report success they have not observed.

None of these is a knowledge problem. The model usually knows the right practice; it does not apply it under the pull of finishing the task. Short, explicit principles that load into every session change that default. They work best when they are few, concrete and testable, so this framework keeps them to seven.

## 1. Understand before implementing

**Prevents:** building the wrong thing correctly.

Requests are compressed. "Add export" omits format, scope, permissions, size limits and where the button goes. A person fills those gaps from context they share with the team; an agent fills them with plausible defaults and does not say so. The resulting code can be clean and well-tested and still be wrong.

**In practice:** the agent reads the code before proposing changes, lists what it knows versus what it assumes, and asks only the questions that change the result. "Should the CSV include archived users?" is worth asking. "Should I use a for loop?" is not.

**The line:** asking is not free. A clarifying question costs the developer an interruption. The principle asks for questions whose answers change the outcome and are expensive to change later, such as data models, public interfaces and user-visible behaviour. For cheap, reversible choices, the agent picks the project's convention and reports the choice.

## 2. Simplicity first

**Prevents:** code that costs more to own than it is worth.

Every line is a liability: it must be read, tested, secured and changed later. Agents overbuild because they pattern-match on "production-grade" code they have seen: factories, configuration layers, plugin systems and generic interfaces, applied to problems that have one implementation and one caller.

**In practice:** the smallest complete solution. Complete means it handles the real cases, including errors that can actually occur. Smallest means no speculative options, no abstraction until a second real use exists, and reuse of what the project already has.

**The line:** simplicity is not minimal effort. Validation, error handling and tests for real cases are part of complete. What gets cut is code for situations that do not exist yet.

## 3. Surgical changes

**Prevents:** diffs that cannot be reviewed, and regressions in code nobody meant to change.

When an agent fixes a bug and also renames variables, reorders imports, reformats the file and "improves" a neighbouring function, the reviewer can no longer see the fix. Worse, the drive-by edits carry their own risk with none of the scrutiny the requested change receives.

**In practice:** every changed line traces to the request. The agent matches the surrounding style even where it would choose differently, and it mentions unrelated problems rather than fixing them. It cleans up only what its own change made obsolete.

**The line:** if the requested change genuinely requires touching adjacent code, for example a signature change that ripples to its callers, that is in scope. The test is traceability, not file count.

## 4. Goal-driven execution

**Prevents:** work that ends when the code is written instead of when the goal is met.

"Make the import handle large files" is an instruction. "A 500 MB file imports in under two minutes with memory below 1 GB" is a goal. With only the instruction, an agent can declare success after any plausible change. With the goal, success is observable, and so is failure.

**In practice:** before coding, the agent restates the request as success criteria it can check. For multi-step work it writes a short plan where each step has its own verification. When reality diverges from the plan, it re-plans out loud instead of forcing the original course.

**The line:** a one-line fix does not need a written plan. It still needs a known way to tell that it worked.

## 5. Verify before completion

**Prevents:** confident reports of untested work.

This is the most important principle, because it is the one that catches failures of the other six. An agent that runs the tests, exercises the behaviour and re-reads its diff finds its own wrong assumptions, overbuilding and stray edits before anyone else has to.

**In practice:** the agent runs the project's own checks, reproduces a bug before and after the fix, reads the full diff, and reports exactly what it ran and what happened. It names what it could not verify.

**Leave the machine as you found it.** Verifying often means starting things: a dev server, a preview build, a file watcher, an in-memory database, a headless browser. An agent that forgets them leaves them running after the session ends, and the developer never sees them, because they have no window. They add up: on one 12 GB laptop, 21 servers left behind by earlier sessions over four days took the free memory down to about 1 GB and pushed the page file to 14 GB, and the machine froze. So the agent stops what it started, deletes the temporary files it created, and runs one server at a time with one-shot commands rather than watch mode. A weak machine stays usable, and a fast one stays fast.

**The line:** the requirement is honesty, not perfection. "I could not run the integration tests because they need a database I cannot reach" is a good report. "All tests pass," when they were not run, is the worst possible one.

## 6. Secure by default

**Prevents:** vulnerabilities introduced by code that works.

Security flaws rarely break functionality. A missing ownership check on an invoice endpoint returns the right invoice to its owner and to everyone else. Because agents optimise for "it works", security has to be an explicit default rather than a later review step.

**In practice:** untrusted input is validated at the boundary; queries are parameterised; authorisation is checked on the server for each specific resource; secrets never enter code, logs or prompts; personal data stays out of logs, analytics and error reports, which are kept longer and read by more people than the database it came from; and security-relevant changes are flagged in the report. Agents also face a risk specific to them: instructions hidden in the content they read, such as files, web pages and issue text. Treating that content as data, never as instructions, is part of this principle.

**The line:** this principle sets defaults for everyday code. Deep reviews of authentication, payments or sensitive data use the [security review skill](../skills/maisongr-security-review/SKILL.md).

## 7. Guard irreversible actions

**Prevents:** damage that another edit cannot undo.

Most agent mistakes are cheap: the diff is reviewed, rejected or reverted. A few are not: a pushed commit others have pulled, a dropped column, a deleted record, a published package, a sent email, a broken public API that clients already call. Agents work fast, so a mistake of this kind can land before anyone notices.

**In practice:** the agent slows down at these boundaries. Public contracts evolve by adding, deprecating, then removing. Migrations are reversible or explicitly approved. Version control follows the developer's workflow: focused commits under the developer's own identity, with no AI attribution trailers, and no push, force-push or history rewrite unless asked in the current conversation. Deployments, publishing, messages and paid services need explicit approval, and a paid service or plan comes with its cost stated up front: a recurring charge is hard to notice and easy to forget once it starts.

**The line:** when in doubt about reversibility, treat the action as irreversible and ask. The cost of one extra question is small next to the cost of one irreversible mistake.

## What is not a principle, and why

Several other concerns were considered for principle status. Each matters, but making it a principle would either overlap an existing one or load detail into every session that only some tasks need. They live in skills, which load on demand:

| Concern | Where it lives | Why not a principle |
|---|---|---|
| Testing practice | [Testing skill](../skills/maisongr-testing/SKILL.md) | The universal part (prove the change works) is principle 5; the craft of writing good tests is task-specific |
| Architectural consistency | [Architecture skill](../skills/maisongr-architecture/SKILL.md), principle 3 | Matching existing patterns is part of surgical changes; design decisions are occasional |
| API contracts | [API skill](../skills/maisongr-api/SKILL.md), principle 7 | Contract stability is covered by guarding irreversible actions |
| Database integrity | [Database skill](../skills/maisongr-database/SKILL.md), principle 7 | Data safety is covered by guarding irreversible actions |
| Dependency management | Principle 2, [architecture skill](../skills/maisongr-architecture/SKILL.md) | "Ask before adding a dependency" is part of simplicity first |
| Error handling | Principles 2 and 6, [API skill](../skills/maisongr-api/SKILL.md) | Handle real errors (simplicity), do not leak internals (security) |
| Documentation | [Documentation skill](../skills/maisongr-documentation/SKILL.md) | Needed when documentation is the task or is affected by it |
| Accessibility and performance | [Frontend skill](../skills/maisongr-frontend/SKILL.md) | Specific to user interfaces |
| Version control practice | [Git skill](../skills/maisongr-git/SKILL.md), principle 7 | The irreversible part (push, rewrite, attribution) is principle 7; branching, secret checks and tagging are task-specific |
| Deployment and cost | [Deploy skill](../skills/maisongr-deploy/SKILL.md), principle 7 | Approval is principle 7; rollback points and live checks are needed only when shipping |
| Contributing upstream | [Open-source skill](../skills/maisongr-open-source/SKILL.md) | Only applies to repositories the developer does not maintain |
| Context efficiency | This framework's design | Applied by keeping always-on instructions short and moving detail into skills |
| Observability | Not yet covered | A candidate for a future skill; see [CONTRIBUTING](../CONTRIBUTING.md) |

## Adapting the principles

The principles are defaults. A project's own `AGENTS.md` section can make them concrete (which commands prove a change, which directories are off limits) or narrow them (for example, "always write a plan before editing"). Avoid weakening principle 5 or 7: they are the safety net for everything else.
