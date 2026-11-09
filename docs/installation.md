# Installation

Maison GR has two parts, and each platform loads them differently:

- **The principles** (`AGENTS.md`): short, always-on instructions loaded into every session.
- **The skills** (`skills/maisongr-*`): detailed methods the agent loads only when a task needs them.

Install both. The principles set the standard; the skills carry the detailed methods.

| Platform | Principles | Skills | Packaged install |
|---|---|---|---|
| Claude Code | `CLAUDE.md` importing `AGENTS.md` | Plugin, or `.claude/skills/` | Plugin marketplace |
| OpenAI Codex | `AGENTS.md` | `.agents/skills/` | None yet; copy the skills |
| Cursor | `AGENTS.md` or `.cursor/rules/*.mdc` | `.agents/skills/` or `.cursor/skills/` | None; copy the files |
| GitHub Copilot | `AGENTS.md` and `.github/copilot-instructions.md` | `.agents/skills/`, `.github/skills/` or `.claude/skills/` | None; copy the files |
| Gemini CLI | Extension context, or `GEMINI.md` | Extension, or `.agents/skills/` | Extension |

**One copy for four agents.** Codex, Cursor, GitHub Copilot and Gemini CLI all read skills from `.agents/skills/` in the project. Claude Code reads `.claude/skills/` instead, or uses the plugin.

## Fastest: npx

One command installs everything for every agent. Run it from your project's root (Node.js 18.3 or later):

```bash
npx maisongr-skills
```

What it does, for the agents you choose (all five by default):

| Writes | For | Behaviour with existing files |
|---|---|---|
| `AGENTS.md` | Every agent | Adds the principles in a marked block above your content; updates only that block on later runs |
| `.agents/skills/maisongr-*` | Codex, Cursor, Copilot, Gemini CLI | Replaces only `maisongr-*` folders |
| `.claude/skills/maisongr-*`, `.claude/agents/maisongr-*.md` | Claude Code | Replaces only `maisongr-*` files |
| `CLAUDE.md` | Claude Code | Adds an `@AGENTS.md` line if missing |
| `.gemini/settings.json` | Gemini CLI | Adds `AGENTS.md` to `context.fileName`, keeping your other settings |

Options:

| Command | Effect |
|---|---|
| `npx maisongr-skills --agent claude,codex` | Only the named agents: `claude`, `codex`, `cursor`, `copilot`, `gemini` |
| `npx maisongr-skills --global` | Installs for your user account: skills in `~/.agents/skills` and `~/.claude/skills`, principles in `~/.claude/AGENTS.md` (imported by `~/.claude/CLAUDE.md`), `~/.codex/AGENTS.md` and `~/.gemini/GEMINI.md`. Cursor and Copilot have no user-wide instruction file, so add them per project |
| `npx maisongr-skills --dir ../my-app` | Installs into another directory |
| `npx maisongr-skills --dry-run` | Shows what would change and writes nothing |
| `npx maisongr-skills` again | Updates to the latest version; unchanged files are left alone |
| `npx maisongr-skills remove` | Removes the skills, subagents and principles block. Leaves your own content, `CLAUDE.md` and `.gemini/settings.json` in place, and says so |
| `npx maisongr-skills list` | Lists the skills |

Commit the result so the whole team uses it. The sections below describe each platform's native packaging and the manual steps, if you prefer them.

## Get the files

The copy-based steps below assume a local clone:

```bash
git clone --depth 1 https://github.com/maison-gr/maisongr-skills.git ~/maisongr
```

```powershell
git clone --depth 1 https://github.com/maison-gr/maisongr-skills.git "$HOME\maisongr"
```

Then, from your project's root:

```bash
# Principles (skip if the project already has an AGENTS.md; see below)
cp ~/maisongr/AGENTS.md AGENTS.md

# Skills, shared by Codex, Cursor, Copilot and Gemini CLI
mkdir -p .agents/skills
cp -R ~/maisongr/skills/maisongr-* .agents/skills/
```

```powershell
Copy-Item "$HOME\maisongr\AGENTS.md" AGENTS.md
New-Item -ItemType Directory -Force .agents\skills | Out-Null
Copy-Item -Recurse "$HOME\maisongr\skills\maisongr-*" .agents\skills\
```

**If the project already has an `AGENTS.md`**, paste the Maison GR principles at the top and keep your project's own section below them. Then fill in [`templates/project-instructions.md`](../templates/project-instructions.md) with your commands, conventions and boundaries; it is the part that makes the principles concrete for your codebase.

Commit these files so the whole team, and every agent, uses the same standard.

---

## Claude Code

### Plugin (recommended)

The plugin installs all thirteen skills, three subagents (`maisongr-architect`, `maisongr-reviewer`, `maisongr-tester`) and the receipts check, which compares the commands an agent lists under "Verified" with the commands it actually ran and flags guarded Git actions (force-push, `git add -A`, history rewrites, `--no-verify`, config changes) the report doesn't disclose, and servers the session started and never stopped. It keeps them updated.

Inside Claude Code:

```text
/plugin marketplace add maison-gr/maisongr-skills
/plugin install maisongr@maison-gr
```

On Claude Code 2.1.275 or later, one command does both:

```text
/plugin install maisongr --marketplace maison-gr/maisongr-skills
```

From a terminal:

```bash
claude plugin marketplace add maison-gr/maisongr-skills
claude plugin install maisongr@maison-gr
```

Installation goes to your user scope by default. To share it with everyone working on a repository, install it into the project scope, which writes to the committed `.claude/settings.json`:

```bash
claude plugin install maisongr@maison-gr --scope project
```

Skills are namespaced by the plugin, so you can call one directly with `/maisongr:maisongr-code-review`. Claude also loads them automatically when a task matches their description.

### Add the principles

A plugin cannot add always-on project instructions; Claude Code does not load a plugin's `CLAUDE.md`. Add the principles to each project:

1. Copy `AGENTS.md` into the project root (see [Get the files](#get-the-files)).
2. Create or extend the project's `CLAUDE.md` with an import line:

   ```markdown
   @AGENTS.md
   ```

Claude Code expands the import at session start, so Claude Code and every other agent read the same file. To apply the principles to every project on your machine, add the same import to `~/.claude/CLAUDE.md`, pointing to a copy of `AGENTS.md` you keep there.

### Without the plugin

Copy the skills and subagents into the project:

```bash
mkdir -p .claude/skills .claude/agents
cp -R ~/maisongr/skills/maisongr-* .claude/skills/
cp ~/maisongr/agents/*.md .claude/agents/
```

Use `~/.claude/skills/` and `~/.claude/agents/` instead to install them for every project.

### Update and remove

The plugin's version comes from `.claude-plugin/plugin.json`, so you receive changes when a new version is released:

```bash
claude plugin marketplace update maison-gr
claude plugin update maisongr@maison-gr
```

Automatic updates are off by default for third-party marketplaces. Turn them on for `maison-gr` from the Marketplaces tab of `/plugin`.

To remove:

```bash
claude plugin uninstall maisongr@maison-gr
claude plugin marketplace remove maison-gr
```

---

## OpenAI Codex

Codex reads `AGENTS.md` natively and discovers skills in `.agents/skills/`.

1. Copy `AGENTS.md` and the skills into the project as shown in [Get the files](#get-the-files).
2. To use the skills in every project, copy them to `~/.agents/skills/` instead.
3. For global principles, copy `AGENTS.md` to `~/.codex/AGENTS.md`.

Codex loads the skill list at startup and reads a full skill only when it uses it. Invoke one explicitly with `$maisongr-code-review`, or browse them with `/skills`.

You can also ask Codex's built-in installer to fetch a single skill from GitHub:

```text
$skill-installer install https://github.com/maison-gr/maisongr-skills/tree/main/skills/maisongr-debugging
```

To confirm what Codex loaded:

```bash
codex --ask-for-approval never "Summarize the current instructions."
```

`AGENTS.md` is about 6 KB, well under Codex's default 32 KiB limit for combined instruction files (`project_doc_max_bytes`).

**Update:** copy the files again from a fresh clone. **Remove:** delete the `maisongr-*` folders and the principles from `AGENTS.md`.

---

## Cursor

Cursor reads `AGENTS.md` from the project root natively. Choose **one** way to load the principles, not both, or they load twice:

- **`AGENTS.md`** (recommended when the team uses several agents): copy it as in [Get the files](#get-the-files).
- **A project rule:** copy [`.cursor/rules/maisongr-engineering.mdc`](../.cursor/rules/maisongr-engineering.mdc) into your project's `.cursor/rules/`. It is set to `alwaysApply: true` and appears in Cursor's Rules settings.

Skills: Cursor discovers them in `.agents/skills/` or `.cursor/skills/` in the project, and in `~/.agents/skills/` or `~/.cursor/skills/` for all projects. It loads them when relevant, or on demand when you type `/` followed by the skill name in chat.

**Update:** copy the files again. **Remove:** delete the rule file and the `maisongr-*` skill folders.

---

## GitHub Copilot

Copilot reads repository instructions from several files, and support differs between Copilot surfaces (chat in the IDE, the cloud agent, code review). GitHub's [custom instructions support reference](https://docs.github.com/en/copilot/reference/custom-instructions-support) lists which surface reads which file.

1. **Principles:** copy [`.github/copilot-instructions.md`](../.github/copilot-instructions.md) into your repository's `.github/` folder. If the repository also has `AGENTS.md` for other agents, Copilot can read that too; the nearest `AGENTS.md` to the file being edited takes precedence.
2. **Skills:** Copilot discovers skills in `.github/skills/`, `.claude/skills/` or `.agents/skills/` in the repository, and in `~/.copilot/skills/` or `~/.agents/skills/` for personal use. The `.agents/skills/` copy from [Get the files](#get-the-files) works as is.
3. **Path-specific rules (optional):** for rules that apply only to some files, add `.github/instructions/NAME.instructions.md` with an `applyTo` glob:

   ```markdown
   ---
   applyTo: "**/*.sql,**/migrations/**"
   ---
   Follow the Maison GR database method: expand and contract migrations, reversible steps, parameterised queries.
   ```

Copilot code review reads instructions from the pull request's head branch, so changes take effect in the PR that adds them.

**Update:** copy the files again. **Remove:** delete the files.

---

## Gemini CLI

> In June 2026 Google began moving unpaid-tier and Google One users from Gemini CLI to Antigravity CLI. These steps follow the Gemini CLI documentation; check the current status for your account.

### Extension (recommended)

The extension installs the principles as always-on context, plus all thirteen skills and three subagents:

```bash
gemini extensions install https://github.com/maison-gr/maisongr-skills
```

Run it from a terminal, not inside an interactive session, then restart Gemini CLI. Check the result with `gemini extensions list`, and `/skills list` inside a session.

```bash
gemini extensions update maisongr     # update
gemini extensions uninstall maisongr  # remove
```

### Without the extension

- Copy the skills into `.agents/skills/` (see [Get the files](#get-the-files)); Gemini CLI also reads `.gemini/skills/`, and `~/.agents/skills/` or `~/.gemini/skills/` for all projects.
- Load `AGENTS.md` as context by adding it to `context.fileName` in `.gemini/settings.json`:

  ```json
  { "context": { "fileName": ["AGENTS.md", "GEMINI.md"] } }
  ```

  Check what was loaded with `/memory show`.

---

## Other agents

`AGENTS.md` is an open convention read by many coding agents beyond those above; see [agents.md](https://agents.md/) for the current list. Any agent that supports the [Agent Skills](https://agentskills.io/specification) format can use the `skills/` folders as they are; copy them to the directory that agent scans.

## Verify the installation

Ask the agent: *"Which Maison GR principles apply in this project, and which Maison GR skills can you use?"* It should name the seven principles and list the `maisongr-*` skills. If it cannot, check the paths above, restart the agent, and see the [FAQ](faq.md).
