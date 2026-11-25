---
name: maisongr-documentation
description: Maison GR method for writing technical documentation that stays accurate. Use when writing or updating a README, setup or installation guide, API reference, architecture overview, runbook, changelog entry, migration guide, or code comments, and when a code change makes existing documentation wrong.
license: MIT
metadata:
  author: Maison GR Inc.
---

# Maison GR Documentation

## Objective

Give a specific reader exactly what they need to succeed, with every command and claim verified against the code. Wrong documentation is worse than none, because readers trust it.

## When to use

- Writing or updating a README, guide, reference, runbook or changelog.
- A code change alters behaviour, configuration, commands or interfaces that are documented.
- Adding comments to code whose intent is not obvious from the code itself.

## Method

### 1. Name the reader and the task

Write down who reads this and what they are trying to do:

- A new contributor setting up the project.
- An operator restoring service at 3 a.m.
- An API consumer integrating for the first time.
- A maintainer deciding whether to change a design.

Each reader needs a different document. Do not merge a tutorial, a reference and a design rationale into one page.

### 2. Pick the document type

| Type | Purpose | Shape |
|---|---|---|
| Tutorial or quick start | Get a newcomer to a first success | Numbered steps, one path, a visible result |
| How-to guide | Accomplish a specific task | Goal, prerequisites, steps, verification |
| Reference | Look up exact details | Complete, consistent, structured tables or entries |
| Explanation | Understand why | Context, decisions, trade-offs |
| Runbook | Act under pressure | Symptoms, checks, actions, escalation |

### 3. Gather facts from the source

- Read the code, configuration and scripts. Do not document from memory or from older documentation.
- Copy commands, flags, environment variables and defaults from where they are defined.
- Note versions and prerequisites explicitly.

### 4. Write

- Lead with what the reader can do and the fastest path to doing it.
- One idea per paragraph; short sentences; active voice.
- Show real, runnable examples with their expected output.
- Use the project's own terms consistently. Define a term once, then reuse it exactly.
- Put commands in code blocks that can be copied as is, without prompts like `$` mixed into the text.
- State limitations and known issues plainly.

### 5. Verify

- Run every command in the document, in a clean environment where practical.
- Follow every link and anchor.
- Check that file paths, option names and defaults match the code.
- Read it as the named reader: is any step missing or assumed?

## Code comments

- Comment why, not what. The code already says what it does.
- Document non-obvious constraints, workarounds and the reason a simpler approach was rejected, with a link to the issue where useful.
- Match the comment density of the surrounding code.
- Keep public API doc comments accurate when signatures change.

## Keeping documentation in sync

- When you change behaviour, search the repository for documentation of it (README, `docs/`, comments, examples, help text) and update it in the same change.
- Prefer generating reference material (CLI help, API schemas) from the code where the project supports it.
- Add a changelog entry for user-visible changes when the project keeps a changelog.

## Constraints

- Never document a command, option or behaviour you have not confirmed in the code or by running it.
- Do not add marketing language, filler or claims you cannot support.
- Do not restructure existing documentation beyond the task without asking.

## Verification

- [ ] The reader and their task are clear from the opening.
- [ ] Every command was run or its source was checked.
- [ ] Links and paths resolve.
- [ ] Documentation affected by the code change was updated.

## Output

The updated documents, plus a note listing which commands were executed, which were checked only by reading the source, and anything left unverified.
