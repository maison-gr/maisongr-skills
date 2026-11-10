# Contributing

Thank you for helping improve maisongr-skills. This guide explains what we accept and how to make a change that passes review.

## What we look for

- **Fixes** to installation steps, configuration or guidance that leads agents to wrong results. These are always welcome.
- **Improvements** to an existing skill that make agents measurably better at its task.
- **New skills** that solve a distinct engineering problem no existing skill covers. Open a [skill proposal](.github/ISSUE_TEMPLATE/skill-proposal.md) first, so we can agree on scope before you write it.
- **New platforms**, when the platform documents a format we can target natively.

We usually decline:

- Rules that duplicate an existing principle or skill in different words.
- Style preferences that a formatter or linter should enforce.
- Guidance tied to one framework, unless it lives in a stack-specific skill.
- Platform configuration that is not confirmed by the platform's official documentation.

## Repository layout

See [docs/architecture.md](docs/architecture.md). The essentials:

- `AGENTS.md` is the single source of the principles. `GEMINI.md`, `.cursor/rules/maisongr-engineering.mdc` and `.github/copilot-instructions.md` are generated from it.
- Skills live in `skills/maisongr-<name>/SKILL.md`.
- Subagents live in `agents/maisongr-<name>.md`.
- `CLAUDE.md` contains only `@AGENTS.md`, so Claude Code reads the same principles as every other agent.

## Making a change

1. Fork the repository and create a branch.
2. Make your change.
3. If you edited `AGENTS.md`, regenerate the platform files:

   ```bash
   node scripts/build.mjs
   ```

4. Run the validator. It must pass:

   ```bash
   node scripts/validate.mjs
   ```

5. If you changed the installer in `cli/`, run its tests:

   ```bash
   npm test
   ```

6. If you have Claude Code, also run its validator:

   ```bash
   claude plugin validate .
   ```

7. Add an entry to `CHANGELOG.md` under `## [Unreleased]`.
8. Open a pull request and complete the checklist.

The scripts and the installer need Node.js 18.3 or later and have no dependencies.

## Writing a skill

A skill teaches an agent one method. Structure it like the existing skills:

```markdown
---
name: maisongr-<name>
description: <What it does>. Use when <the situations and requests that should trigger it>.
license: MIT
metadata:
  author: Maison GR
---

# Maison GR <Title>

## Objective
## When to use
## Method
## Constraints
## Verification
## Output
```

Rules:

- **`name`** starts with `maisongr-`, uses lowercase letters, digits and single hyphens, is at most 64 characters, and matches the folder name.
- **`description`** is at most 1,024 characters and says both what the skill does and when to use it. Agents choose skills from this text alone, so name the concrete situations, tools and keywords that should trigger it.
- **The body** stays under 500 lines. Move long reference material into a `references/` file inside the skill folder and link to it.
- **Do not repeat the principles.** Skills assume them. Write only what is specific to the task.
- **Be concrete.** Prefer a checklist, a table or an example over general advice.
- **Stay platform-neutral.** Do not name one agent's tools. Write "search the codebase", not a specific tool name.
- **Keep it self-contained.** Users copy skill folders individually, so a skill must not link to files outside its own folder.

## Writing a subagent

Subagents are loaded by both Claude Code and Gemini CLI. Use only `name`, `description` and `model: inherit` in the frontmatter, and write any tool limits as instructions in the body. The validator rejects other keys.

## Changing the principles

The principles load into every session of every user, so every word costs context. A change should:

- Fix a failure we can show with a real example.
- Keep the principle testable: a reviewer should be able to point at a diff and say whether it complies.
- Come with an update to [docs/principles.md](docs/principles.md) explaining the reason.

## Platform configuration

Every command, path and configuration key must come from the platform's current official documentation, or from running it. Record the source in [docs/compatibility.md](docs/compatibility.md). If you could only test on one platform, say which in the pull request.

## Commits

Use short conventional commit messages, such as `fix: correct Gemini skill path` or `feat: add observability skill`. Keep each commit to one change.

## Releases

Maintainers release by:

1. Moving `[Unreleased]` entries under a new version heading in `CHANGELOG.md`.
2. Setting the same version in `.claude-plugin/plugin.json`, `gemini-extension.json` and `package.json`. The validator checks that all four match.
3. Running `node scripts/validate.mjs` and `npm test`, and checking the package contents with `npm pack --dry-run`.
4. Tagging the release (`git tag v1.2.0`), pushing it, and publishing a GitHub release for the tag. The [release workflow](.github/workflows/release.yml) then publishes to npm with provenance; nobody publishes from a local machine.

Claude Code users receive an update only when the version changes; npx users get the new version on their next run.

Versioning follows [Semantic Versioning](https://semver.org/). Renaming or removing a skill, subagent or principle, or changing an installation path, is a major change.
