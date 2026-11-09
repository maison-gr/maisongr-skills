# FAQ

## Do I need both the principles and the skills?

Yes, for the full effect. The principles in `AGENTS.md` are always loaded and set the standard for every task. The skills are detailed methods that load only when a task matches, such as debugging, a security review or a migration. The principles without the skills still help; the skills without the principles lose the always-on defaults.

## Will this make my agent slower or use more tokens?

A little. `AGENTS.md` is about 6 KB of always-on context. Each skill adds about 100 tokens to every session for its name and description, and about 1,000 tokens when it is used. Measured on Claude Code with the first ten skills, the plugin added about 1,200 tokens to every session; the three skills added since add about 300 more by the same per-skill figure. The checks the principles require (running tests, reading the diff) take time. That is deliberate: they replace the time you would spend finding the problems yourself.

## The agent asks too many questions.

The principles ask for questions only when the answer changes what gets built and is expensive to change later. If your agent asks about trivial choices, tell it in your project's section of `AGENTS.md`, for example: "For styling and naming choices, follow existing patterns without asking." Specific project instructions take precedence over the general ones.

## A skill is not being used when I expect it.

Agents choose skills by matching the task against each skill's `description`. Check that:

1. The skill is installed where your agent looks (see [installation](installation.md)), and the agent was restarted.
2. Your request resembles the description. You can always invoke a skill explicitly: `/maisongr:maisongr-debugging` in Claude Code with the plugin, `$maisongr-debugging` in Codex, or `/maisongr-debugging` in Cursor.

## Why do the skill names all start with `maisongr-`?

To avoid collisions. Claude Code already ships skills called `code-review` and `security-review`, and Codex, Cursor, Copilot and Gemini CLI do not namespace skills, so two packs with a `testing` skill would clash.

## Why are there no `CODEX.md` or `CURSOR.md` files?

Because no tool reads them. Codex reads `AGENTS.md`, and Cursor reads `AGENTS.md` and `.cursor/rules/*.mdc`. Shipping files with platform names that nothing loads would suggest a configuration that does not exist.

## Cursor loads the principles twice.

You have both `AGENTS.md` and `.cursor/rules/maisongr-engineering.mdc` in the project. Keep one: `AGENTS.md` if other agents also work in the repository, otherwise either.

## Can I change the principles for my team?

Yes. Copy `AGENTS.md` into your project and edit it, or keep it as is and add your own section below it using [`templates/project-instructions.md`](../templates/project-instructions.md). Narrowing or adding rules is safe. Be careful about weakening principle 5 (verify) or principle 7 (irreversible actions): they catch the failures of the other principles.

## Why does the plugin not install the principles in Claude Code?

Claude Code does not load a plugin's `CLAUDE.md` as context, so a plugin cannot add always-on project instructions. Add `@AGENTS.md` to your project's `CLAUDE.md`, as described in [installation](installation.md#add-the-principles).

## Are the subagents read-only?

The architect and reviewer are instructed never to edit files, and the tester to edit only tests. These limits are written in their instructions, not enforced by a tool allowlist, because Claude Code and Gemini CLI both load the same subagent files and name their tools differently. If you need a hard restriction in Claude Code, copy a subagent into `.claude/agents/` and add a `tools:` line, for example `tools: Read, Grep, Glob`.

## Is there a Codex plugin?

Not yet. Codex supports skills directly from `.agents/skills/`, which is all Maison GR needs. Codex also has a plugin system, but at the time of writing its documentation disagrees on the preferred manifest layout, and plugins are installed through the ChatGPT desktop app. See [compatibility](compatibility.md#openai-codex).

## Gemini CLI is being replaced by Antigravity CLI. Does this still work?

The extension follows the Gemini CLI documentation. The skills use the open Agent Skills format and `AGENTS.md` is an open convention, so both should carry over to any successor that supports those standards. Check the [compatibility notes](compatibility.md#gemini-cli) for the latest status.

## How do I contribute a new skill?

See [CONTRIBUTING](../CONTRIBUTING.md). In short: open a proposal describing the engineering problem it solves that no existing skill covers, then follow the skill structure and run the validator.
