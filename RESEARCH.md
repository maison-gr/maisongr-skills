# Research

The projects and platform documentation studied while designing Maison GR AI Engineering Skills, what each taught us, and how it shaped the framework. Research was carried out on 2 November 2026. Repository details (activity, structure, licences) reflect what was published on that date.

Maison GR's text, skills and examples are original. Nothing below is copied into the framework; these projects informed decisions about structure, scope and compatibility.

## Summary of findings

1. **The skill format has converged.** All five target platforms now read the same `SKILL.md` format from the open [Agent Skills specification](https://agentskills.io/specification). A skill written once to the specification's strictest rules works everywhere.
2. **`AGENTS.md` is the closest thing to a universal instruction file.** Codex, Cursor and GitHub Copilot read it natively; Claude Code can import it; Gemini CLI can be configured to load it.
3. **Packaging has not converged.** Claude Code has plugins and marketplaces, Gemini CLI has extensions, Codex has a plugin system whose documentation is still in flux, and Cursor and Copilot rely on files in the repository.
4. **Always-on context is expensive.** Every platform recommends keeping instruction files short and moving detail into on-demand skills. Several projects studied load far more than their users need.
5. **The most valuable discipline is verification.** The strongest projects all enforce some form of "prove it works before saying it is done". Agents rarely lack knowledge; they lack the habit of checking.

## Projects investigated

### Behavioural guideline packs

#### multica-ai/andrej-karpathy-skills

[Repository](https://github.com/multica-ai/andrej-karpathy-skills), which mirrors content published by `forrestchang`.

- **Problem it solves:** common mistakes of LLM coding agents: silent assumptions, overcomplication, drive-by edits, and unverifiable goals.
- **Strongest ideas:** four short principles (think before coding, simplicity first, surgical changes, goal-driven execution), each easy to remember and to check in review. An examples file pairs a typical agent mistake with the expected behaviour.
- **Architecture:** a single skill, a `CLAUDE.md`, a Cursor rule with `alwaysApply: true`, and a Claude Code plugin with a marketplace whose plugin source is the repository root.
- **Installation:** Claude Code marketplace; for Cursor, copy the rule file.
- **Compatibility:** Claude Code and Cursor.
- **Strengths:** very small; the always-on cost is low; the principles are memorable.
- **Weaknesses:** the same text is maintained by hand in three files, so they can drift; no verification principle separate from goal-setting; no security guidance; no task-specific skills; no `LICENSE` file, although the manifests declare MIT.
- **What Maison GR does differently:** adds verification, security and irreversible-action principles; generates every platform file from one source; adds thirteen task-specific skills; covers five platforms.

### Skill collections

#### anthropics/skills

[Repository](https://github.com/anthropics/skills)

- **Problem it solves:** examples of Agent Skills for Claude, from document handling to development tasks.
- **Strongest ideas:** the minimal skill contract (`name` and a `description` that says when to use it); progressive disclosure, where only metadata loads until a skill is needed; a template folder for new skills.
- **Installation:** Claude Code marketplace (`/plugin marketplace add anthropics/skills`), Claude.ai and the API.
- **Strengths:** the reference for how skills should be shaped.
- **Weaknesses:** presented as demonstration and educational material; licences vary by skill, and some document skills are source-available rather than open source.
- **Lesson:** descriptions decide activation, so every Maison GR description states both what the skill does and when to use it.

#### obra/superpowers

[Repository](https://github.com/obra/superpowers)

- **Problem it solves:** a full development methodology for coding agents: design, plan, test-first implementation, review, and finishing a branch.
- **Strongest ideas:** skills that trigger automatically and gate progress; plans broken into small tasks, each with files and verification; strict red-green-refactor; four-phase root-cause debugging; "verification before completion" as an explicit skill; independent review of each task's output.
- **Installation:** Claude Code plugin; Gemini CLI extension (`gemini extensions install https://github.com/obra/superpowers`); other harnesses listed in its README.
- **Licence:** MIT.
- **Strengths:** a coherent, opinionated workflow; strong emphasis on evidence.
- **Weaknesses:** a heavy process for small tasks; the README says new skills are generally not accepted; it depends on platform hooks for triggering in some harnesses.
- **Lesson:** the debugging and verification disciplines are the highest-value ideas. Maison GR keeps them, as `maisongr-debugging` and principle 5, but scales ceremony to task size.

#### affaan-m/everything-claude-code

[Repository](https://github.com/affaan-m/everything-claude-code)

- **Problem it solves:** a comprehensive configuration bundle: agents, skills, commands, hooks, rules, memory, MCP configurations and security scanning.
- **Strongest ideas:** per-language rule packs; per-harness folders; packaging for several platforms from one repository.
- **Installation:** an npm setup command, or a Claude Code marketplace.
- **Licence:** MIT.
- **Strengths:** breadth; active development.
- **Weaknesses:** hundreds of components make it hard to know what is loaded and what it costs; its README warns against mixing installation methods; component counts are inconsistent across its documentation.
- **Lesson:** more components are not better. Maison GR keeps a small set of distinct skills and measures its always-on cost.

#### github/awesome-copilot

[Repository](https://github.com/github/awesome-copilot)

- **Problem it solves:** a community catalogue of Copilot instructions, agents, skills, plugins and hooks.
- **Strongest ideas:** path-scoped instructions applied automatically by file pattern.
- **Licence:** MIT.
- **Weaknesses:** contributions come from many third parties and the README asks users to inspect each one.
- **Lesson:** Copilot's `applyTo` instructions are a good fit for stack-specific rules; the installation guide shows how to add them.

#### openai/skills

[Repository](https://github.com/openai/skills)

- **Problem it solves:** a catalogue of Codex skills in system, curated and experimental tiers, installable with `$skill-installer`.
- **Status:** the README marks the repository as deprecated in favour of [openai/plugins](https://github.com/openai/plugins).
- **Lesson:** Codex packaging is moving. Maison GR relies on the stable part, skills in `.agents/skills/` and `AGENTS.md`, and documents the plugin system as not yet adopted.

### Standards

#### Agent Skills specification

[agentskills.io](https://agentskills.io/specification) · [Repository](https://github.com/agentskills/agentskills)

- **Defines:** a skill as a folder with a `SKILL.md`; required `name` (1 to 64 lowercase characters, digits and hyphens, matching the folder) and `description` (up to 1,024 characters); optional `license`, `compatibility`, `metadata` and `allowed-tools`; optional `scripts/`, `references/` and `assets/` folders.
- **Guidance:** about 100 tokens of metadata at startup; under 5,000 tokens and 500 lines for the body; references one level deep.
- **Licence:** Apache-2.0 for code, CC-BY-4.0 for documentation.
- **How Maison GR uses it:** every skill follows the strictest version of these rules, and `scripts/validate.mjs` enforces them.

#### AGENTS.md

[agents.md](https://agents.md/)

- **Defines:** a plain Markdown file of instructions for coding agents, separate from the human README; nested files for subprojects, the nearest file winning.
- **Governance:** stewarded by the Agentic AI Foundation under the Linux Foundation.
- **How Maison GR uses it:** `AGENTS.md` is the single source of the principles.

### Coding agents

#### continuedev/continue

[Repository](https://github.com/continuedev/continue) · [Rules documentation](https://docs.continue.dev/customize/deep-dives/rules)

- **Rules model:** Markdown files in `.continue/rules/`, loaded in lexical order, with frontmatter for `globs`, `regex`, `description` and `alwaysApply`.
- **Status:** the repository is marked as no longer actively maintained and read-only.
- **Decision:** Continue is not a supported target. Its rules format is close enough to Cursor's that a team still using it could adapt the generated rule.

## Platform documentation

The details are recorded, with links, in [docs/compatibility.md](docs/compatibility.md). The findings that changed the design:

| Finding | Consequence |
|---|---|
| Claude Code does not load a plugin's `CLAUDE.md` as context | The installation guide adds `@AGENTS.md` to each project's `CLAUDE.md` |
| Claude Code offers an update only when the manifest `version` changes | Every release bumps the version; the validator keeps the manifests and changelog in step |
| Claude Code's `agents` manifest field accepts only `.md` paths, and agents listed from other folders were not reported in testing | Subagents use the default `agents/` folder |
| Gemini CLI loads `agents/` from extensions, with subagents on by default | Subagent frontmatter is limited to the fields both platforms document |
| Cursor ignores plain `.md` files in `.cursor/rules/` | The Cursor rule is generated as `.mdc` |
| Codex, Cursor, Copilot and Gemini CLI all read `.agents/skills/` | One copy of the skills serves four agents |
| Claude Code ships `code-review` and `security-review` skills; other platforms do not namespace | All names carry the `maisongr-` prefix |
| No platform reads `CODEX.md` or `CURSOR.md` | Those files are not shipped |
| Gemini CLI is being replaced by Antigravity CLI for some users | Documented as a known risk |

## Engineering lessons

1. **Principles must be few and testable.** A reviewer should be able to point at a diff and say which principle it breaks.
2. **Separate always-on from on-demand.** Principles load every session; methods load when needed. Mixing them wastes context on every task.
3. **One source, generated outputs.** Hand-maintained copies drift. Generation plus a CI check prevents it.
4. **Verify against the platform, not the README.** Running `claude plugin validate` and a real install found a manifest form that documentation alone would have suggested was fine.
5. **Ceremony should scale with risk.** A typo fix needs no plan; a schema change needs a plan, approval and a rollback.
6. **Agents need explicit safety boundaries.** Pushing, deploying, deleting data and changing public contracts are cheap for an agent to do and expensive to undo.

## Sources

Accessed 2 November 2026.

**Projects**

- https://github.com/multica-ai/andrej-karpathy-skills
- https://github.com/anthropics/skills
- https://github.com/obra/superpowers
- https://github.com/affaan-m/everything-claude-code
- https://github.com/github/awesome-copilot
- https://github.com/openai/skills
- https://github.com/openai/plugins
- https://github.com/continuedev/continue
- https://github.com/agentskills/agentskills
- https://agents.md/

**Platform documentation**

- Claude Code: https://code.claude.com/docs/en/plugins, https://code.claude.com/docs/en/plugins-reference, https://code.claude.com/docs/en/plugin-marketplaces, https://code.claude.com/docs/en/skills, https://code.claude.com/docs/en/sub-agents
- OpenAI Codex: https://developers.openai.com/codex/skills, https://developers.openai.com/codex/guides/agents-md, https://developers.openai.com/plugins/build/plugins
- Cursor: https://cursor.com/docs/context/rules, https://cursor.com/docs/context/skills
- GitHub Copilot: https://docs.github.com/en/copilot/how-tos/configure-custom-instructions/add-repository-instructions, https://docs.github.com/en/copilot/concepts/agents/about-agent-skills, https://docs.github.com/en/copilot/reference/custom-agents-configuration
- Gemini CLI: https://geminicli.com/docs/cli/gemini-md/, https://geminicli.com/docs/extensions/reference/, https://geminicli.com/docs/cli/skills/, https://geminicli.com/docs/core/subagents/
- Agent Skills: https://agentskills.io/specification
- Continue: https://docs.continue.dev/customize/deep-dives/rules
