# Repository Architecture

How this repository is organised, and why. Read this before adding a skill, a platform or a generated file.

## Goals

1. **One source of truth.** Every rule is written once. Platform files are generated or shared, never maintained by hand in parallel.
2. **Native on every platform.** Each platform gets its files in the format and location its own documentation specifies.
3. **Small always-on context.** What loads into every session is short; detail loads only when a task needs it.
4. **Verifiable.** A script checks everything that can drift or break installation, and CI runs it.

## Layers

```text
                     ┌────────────────────────────┐
  always loaded      │  AGENTS.md (7 principles)   │  ~6 KB
                     └──────────────┬─────────────┘
                                    │ scripts/build.mjs
          ┌─────────────────────────┼──────────────────────────┐
          ▼                         ▼                          ▼
  .cursor/rules/*.mdc          GEMINI.md          .github/copilot-instructions.md
  (Cursor)                     (Gemini extension)  (GitHub Copilot)

  CLAUDE.md ── @AGENTS.md import (Claude Code)

                     ┌────────────────────────────┐
  loaded on demand   │  skills/maisongr-*/SKILL.md │  ~1k tokens each when used
                     └────────────────────────────┘
                     ┌────────────────────────────┐
  delegated          │  agents/maisongr-*.md       │  run in their own context
                     └────────────────────────────┘
```

**Principles** are the always-on layer. Every agent reads them in every session, so they are written as short, direct instructions. Their explanations live in [principles.md](principles.md), which agents do not load.

**Skills** are the on-demand layer. An agent sees only each skill's name and description (about 100 tokens) until a task matches. The full method then loads. Each skill solves one engineering problem and does not repeat the principles; it assumes them.

**Subagents** are the delegation layer, for platforms that support them (Claude Code and Gemini CLI). They run in a separate context, which suits independent review, design exploration and test writing.

## Directory map

| Path | Purpose | Consumed by |
|---|---|---|
| `AGENTS.md` | The principles; the single source | Codex, Cursor, Copilot, Gemini (via settings), Claude Code (via import) |
| `CLAUDE.md` | Imports `AGENTS.md`; the same one-line file projects use | Claude Code |
| `GEMINI.md` | Generated copy of `AGENTS.md` | Gemini CLI extension context |
| `.cursor/rules/maisongr-engineering.mdc` | Generated copy with Cursor frontmatter | Cursor |
| `.github/copilot-instructions.md` | Generated copy | GitHub Copilot |
| `skills/` | Thirteen skills in the Agent Skills format | All five platforms |
| `agents/` | Three subagents | Claude Code plugin, Gemini CLI extension |
| `.claude-plugin/plugin.json` | Claude Code plugin manifest | Claude Code |
| `.claude-plugin/marketplace.json` | Lists this repository's root as the plugin | Claude Code |
| `gemini-extension.json` | Gemini CLI extension manifest | Gemini CLI |
| `package.json` | npm package; publishes only `cli/`, `skills/`, `agents/` and `AGENTS.md` | npm, npx |
| `receipts/` | Claude Code hooks that record shell commands and check the report's "Verified" claims, plus guarded Git actions (force-push, `git add -A`, history rewrites, `--no-verify`, config changes) the report doesn't disclose, and servers the session started and never stopped, which it stops when the session ends or, after a crash, when the next one starts (`processes.mjs` holds the system lookups). Declared in `plugin.json`, not in the default `hooks/hooks.json`, because Gemini CLI also loads that file from an extension and uses different event names | Claude Code plugin |
| `cli/maisongr-skills.mjs` | Installer behind `npx maisongr-skills`. Kept out of `bin/` because Claude Code adds a plugin's `bin/` to the shell `PATH` | Users of any agent |
| `test/` | Installer tests, run with `npm test` | Contributors, CI |
| `templates/` | Starting points for project instructions and plans | People |
| `docs/` | Rationale, installation, compatibility, FAQ | People |
| `scripts/` | Build and validation, Node.js with no dependencies | Contributors, CI |

## Why the repository root is also the plugin and the extension

Claude Code's marketplace can point a plugin at its own root (`"source": "./"`), and Gemini CLI installs an extension from a repository URL. Making the root serve both means one install command per platform and no copies of `skills/` in subfolders. The cost is that the root must satisfy both platforms at once, which drives two decisions:

- **Subagent frontmatter is limited** to `name`, `description` and `model: inherit`, the fields both platforms document, because both load `agents/`.
- **Gemini context is a generated file** (`GEMINI.md`), the default name an extension loads, rather than pointing `contextFileName` at `AGENTS.md`, which the Gemini documentation does not confirm.

## Generated files

`scripts/build.mjs` writes three files from `AGENTS.md`. Each starts with a comment saying so. Never edit them by hand. `node scripts/build.mjs --check` and `node scripts/validate.mjs` both fail when they are out of date.

## Validation

`scripts/validate.mjs` checks:

- Skill frontmatter against the Agent Skills specification: `name` format and length, `name` matching its folder, `description` length, body under 500 lines, the `maisongr-` prefix.
- Subagent frontmatter: required fields, names matching file names, and only keys both platforms support.
- Manifest consistency: the marketplace lists the plugin, and the plugin, extension and changelog versions agree.
- Generated files are current.
- Relative links in Markdown resolve.

It does not check what only a platform can check. For Claude Code, run `claude plugin validate .` as well.

## Versioning

The version appears in `.claude-plugin/plugin.json`, `gemini-extension.json`, `package.json` and the top entry of `CHANGELOG.md`, and they must match. Claude Code only offers an update when the manifest version changes, so every release bumps it. Renaming or removing a skill, subagent or principle is a breaking change.
