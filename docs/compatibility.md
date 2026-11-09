# Compatibility

What each platform supports, how Maison GR uses it, and the evidence behind each claim. Platforms change quickly; every row records where it was checked.

**Last checked:** 2 November 2026.

## Summary

| Capability | Claude Code | OpenAI Codex | Cursor | GitHub Copilot | Gemini CLI |
|---|---|---|---|---|---|
| Reads `AGENTS.md` | Through `@AGENTS.md` import in `CLAUDE.md` | Yes, natively | Yes, natively | Yes (nearest file wins) | When listed in `context.fileName` |
| Native instruction file | `CLAUDE.md` | `AGENTS.md` | `.cursor/rules/*.mdc` | `.github/copilot-instructions.md` | `GEMINI.md` |
| Agent Skills (`SKILL.md`) | Yes | Yes | Yes | Yes | Yes |
| Project skill folders | `.claude/skills/` | `.agents/skills/` | `.agents/skills/`, `.cursor/skills/`, `.claude/skills/` | `.github/skills/`, `.claude/skills/`, `.agents/skills/` | `.agents/skills/`, `.gemini/skills/` |
| User skill folders | `~/.claude/skills/` | `~/.agents/skills/` | `~/.agents/skills/`, `~/.cursor/skills/` | `~/.copilot/skills/`, `~/.agents/skills/` | `~/.agents/skills/`, `~/.gemini/skills/` |
| Subagents from this repo | Yes (plugin) | No | No | No | Yes (extension) |
| Packaged install | Plugin marketplace | Not provided yet | No | No | Extension |
| Verified by running it | Yes | No | No | No | No |

"Verified by running it" means the installation was executed during development, not only read from documentation. Claude Code was tested with `claude plugin validate` and an install into an isolated configuration directory: 10 skills and 3 agents loaded with version 2.1.314, and all 13 skills and 3 agents with version 2.1.319 on 9 November 2026. The other platforms' CLIs were not available on the development machine; their rows rely on official documentation.

## Claude Code

| Item | Detail | Source |
|---|---|---|
| Plugin manifest | `.claude-plugin/plugin.json`; only `name` is required | [Plugins reference](https://code.claude.com/docs/en/plugins-reference) |
| Component discovery | `skills/` and `agents/` at the plugin root are discovered by default | Same |
| Custom agent paths | The `agents` field accepts only `.md` file paths. During testing, agents listed there from other folders were not reported by `claude plugin details`, so this repo uses the default `agents/` folder | Tested with 2.1.314 |
| Marketplace | `.claude-plugin/marketplace.json` with `name`, `owner`, `plugins`; `"source": "./"` means the marketplace root | [Plugin marketplaces](https://code.claude.com/docs/en/plugin-marketplaces) |
| Versions and updates | The manifest `version` decides when users receive updates; without it, updates follow commits | [Plugin loading](https://code.claude.com/docs/en/plugins/loading) |
| Plugin `CLAUDE.md` | Not loaded as context; principles must be added to each project | `claude plugin validate` warning |
| Skill frontmatter | `name`, `description` and optional fields; unknown fields are ignored; keep `SKILL.md` under 500 lines | [Skills](https://code.claude.com/docs/en/skills) |
| Subagent frontmatter | `name` and `description` required; `model: inherit` supported | [Subagents](https://code.claude.com/docs/en/sub-agents) |
| Receipts hooks | `PreToolUse` gives `tool_input.command` before a command runs; `Stop` gives `last_assistant_message` and `background_tasks` (shell tasks still running); `SessionStart` (also on resume, clear and compact) and `SessionEnd` exist. `SessionEnd` has a 1.5-second default budget, raised by a per-hook `timeout` in seconds, up to 60; this repo sets 30 | [Hooks reference](https://code.claude.com/docs/en/hooks), read 9 November 2026 |
| Finding a server's process | On one Windows 11 machine, `netstat -ano` left a listening test server out of its table while `Get-NetTCPConnection` named its process, so Windows uses `Get-NetTCPConnection` first. macOS and Linux use `lsof`, then `ss`, and `ps` | Tested on Windows 11; macOS and Linux in CI |

## OpenAI Codex

| Item | Detail | Source |
|---|---|---|
| `AGENTS.md` discovery | `~/.codex/AGENTS.md` (or `AGENTS.override.md`), then one file per directory from the repository root to the working directory; closer files override | [AGENTS.md guide](https://developers.openai.com/codex/guides/agents-md) |
| Size limit | `project_doc_max_bytes`, 32 KiB by default | Same |
| Skill folders | `.agents/skills/` from the working directory up to the repository root; `~/.agents/skills/`; `/etc/codex/skills` | [Skills](https://developers.openai.com/codex/skills) |
| Skill frontmatter | `name` and `description` required; optional `agents/openai.yaml` for display and invocation policy | Same |
| Plugins | Codex has a plugin system (`.codex-plugin/plugin.json` and a newer root `plugin.json`), but its documentation disagrees on the preferred layout and installation happens through the ChatGPT desktop app. Maison GR does not ship a Codex plugin until this settles | [Build plugins](https://developers.openai.com/plugins/build/plugins), [openai/plugins](https://github.com/openai/plugins) |
| `openai/skills` | The repository is marked deprecated in favour of `openai/plugins` | [openai/skills](https://github.com/openai/skills) |

## Cursor

| Item | Detail | Source |
|---|---|---|
| Project rules | `.cursor/rules/*.mdc`; plain `.md` files there are ignored | [Rules](https://cursor.com/docs/context/rules) |
| Rule frontmatter | `description`, `globs`, `alwaysApply`; `alwaysApply: true` applies to every chat | Same |
| `AGENTS.md` | Read from the root and subdirectories; nested files combine, more specific wins | Same |
| Skills | `.agents/skills/`, `.cursor/skills/`, plus `.claude/skills/` and `.codex/skills/` for compatibility; user folders under `~` | [Skills](https://cursor.com/docs/context/skills) |
| Skill `name` | Lowercase letters, digits and hyphens; must match the folder | Same |

## GitHub Copilot

| Item | Detail | Source |
|---|---|---|
| Repository instructions | `.github/copilot-instructions.md`, plain Markdown | [Add repository instructions](https://docs.github.com/en/copilot/how-tos/configure-custom-instructions/add-repository-instructions) |
| Path instructions | `.github/instructions/*.instructions.md` with `applyTo` and optional `excludeAgent` | Same |
| Agent instructions | `AGENTS.md` anywhere (nearest wins), or a root `CLAUDE.md` or `GEMINI.md` | Same |
| Skills | Project: `.github/skills/`, `.claude/skills/`, `.agents/skills/`. Personal: `~/.copilot/skills/`, `~/.agents/skills/` | [About agent skills](https://docs.github.com/en/copilot/concepts/agents/about-agent-skills) |
| Skill frontmatter | `name` (lowercase, hyphens) and `description` required; `license` and `allowed-tools` optional | Same |
| Custom agents | `.github/agents/*.agent.md`, a different format from Claude Code subagents; not provided here | [Custom agents configuration](https://docs.github.com/en/copilot/reference/custom-agents-configuration) |

## Gemini CLI

| Item | Detail | Source |
|---|---|---|
| Status | Google began replacing Gemini CLI with Antigravity CLI for unpaid-tier and Google One users on 18 June 2026 | Banner on [geminicli.com/docs](https://geminicli.com/docs/) |
| Context files | `GEMINI.md`, hierarchical; other names through `context.fileName` | [GEMINI.md](https://geminicli.com/docs/cli/gemini-md/) |
| Extension manifest | `gemini-extension.json` at the extension root; `contextFileName` names the context file | [Extensions reference](https://geminicli.com/docs/extensions/reference/) |
| Extension contents | `skills/<name>/SKILL.md` and `agents/*.md` are bundled from the extension root | Same |
| Install | `gemini extensions install <GitHub URL>`; `update`, `uninstall` and `list` subcommands | Same |
| Skill folders | `.agents/skills/` and `.gemini/skills/` (project), `~/.agents/skills/` and `~/.gemini/skills/` (user); `.agents/` wins within a tier | [Skills](https://geminicli.com/docs/cli/skills/) |
| Subagents | Enabled by default; `name` and `description` required; `model` defaults to `inherit` | [Subagents](https://geminicli.com/docs/core/subagents/) |

## Design consequences

- **One skill format.** All five platforms read the [Agent Skills](https://agentskills.io/specification) `SKILL.md` format, so the skills are written once to its strictest rules: `name` of 1 to 64 lowercase characters matching the folder, `description` of at most 1,024 characters, and body under 500 lines.
- **Prefixed names.** Claude Code ships built-in skills named `code-review` and `security-review`, and Codex, Copilot and Gemini do not namespace skills. Every Maison GR skill and subagent name starts with `maisongr-`.
- **Shared subagent format.** Claude Code and Gemini CLI both load `agents/` from this repository. Neither documents how it treats the other's tool names, so the subagents use only `name`, `description` and `model: inherit`, and state their limits (for example, read-only) in their instructions.
- **No fake configuration files.** `CODEX.md` and `CURSOR.md` are not read by any tool, so this repository does not ship them. Platform guidance lives in [installation.md](installation.md).
