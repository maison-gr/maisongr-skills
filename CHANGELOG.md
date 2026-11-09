# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

What counts as breaking: renaming or removing a skill, subagent or principle, or changing an installation path. Rewording guidance is a minor or patch change.

## [Unreleased]

## [1.4.0] - 2026-11-09

### Added

- Receipts catches servers left running, and stops them. Each dev server, watcher or tail the session started (`next dev`, `vite`, `astro dev`, `wrangler dev`, `npm start`, `docker compose up` and similar) is checked before the agent stops.
  - When the port is known (a `--port` or `-p` flag, `PORT=`, or the tool's default), the ports it may use (that one and the next ten, where Vite and Next.js move) are tried just before the command runs. Only a port that was free then, and answers now from a process that started after the command, counts as the agent's, so a server the user started is never blamed or stopped.
  - When the port is unknown, Claude Code's list of background tasks still running decides; without it, a later command that stopped the server does.
  - Anything still running sends the agent back to stop it, or to list it under "Left running" with its address when the user asked to keep it. Saying it was stopped is not enough while its port still answers. Lines under "Left running" are not read as verified claims.
  - When the session ends, the agent's servers still running are stopped, except those left running on purpose. When the next session starts, what a session that ended without that cleanup left behind is stopped too, and the agent is told. Only the very process recorded is stopped, matched by process ID and start time, never one that later reused the port.
- Three skills, bringing the total to thirteen:
  - `maisongr-git`: focused commits staged by name, a secret check of the staged diff before every commit, no direct commits to branches that deploy, safe conflict resolution, `.gitattributes`, semver tags, and what to do when a secret was committed (rotate first).
  - `maisongr-deploy`: confirmed approval, a rollback point recorded before the change, a backup before data changes, a cost estimate for paid services, and a check of the live system after every deploy.
  - `maisongr-open-source`: contributing to repositories you don't maintain. Reads CONTRIBUTING, the CLA or DCO and the project's AI policy before the first commit, and stops if AI-assisted contributions are refused. Claims the issue first, keeps one small proven pull request per problem, acts on review bots through the code without replying to them, and never chases maintainers.
- The Claude Code plugin has an icon (`.claude-plugin/icon.png`), the Maison GR mark.

### Changed

- Principle 6 now also keeps personal data out of logs, analytics events and error reports.
- Principle 7 now asks the agent to state the cost before using a paid service or plan.
- Principle 5 now asks the agent to leave the machine as it found it: stop every server, watcher and background process it started, delete its temporary files, and keep its footprint small (one dev server at a time, one-shot commands instead of watch mode). Forgotten servers pile up without a window, and on a laptop short of memory they freeze the machine.
- `maisongr-engineering` checks that no process it started is still running, and its report gains a "Left running" section for anything the developer asked to keep.

### Fixed

- Receipts no longer reads a flag of the next chained command as a Git flag: `git commit -m x && sed -n 1p file` is not a `--no-verify`, `git push; ls -f` is not a force-push, and `git reset file | grep -- --hard` is not a history rewrite. A guarded flag on the Git command itself is still flagged.
- Receipts ignores what is inside quotes when it looks for guarded Git flags: `git commit -m "a; b" --no-verify` is flagged, and `git commit -m "docs: explain --no-verify"` is not.
- Receipts flags a force-push written as a `+refspec` (`git push origin +main`).

## [1.3.1] - 2026-11-06

### Changed

- The repository is now `maison-gr/maisongr-skills`, matching the npm package. The old address redirects.

### Fixed

- Receipts no longer reports a Git config read as a change when the next line, a pipe, `&&` or a redirect follows it.
- Receipts no longer raises a guarded action again in every later report once a report has owned it. The same kind of action happening later is still flagged.

## [1.3.0] - 2026-11-05

### Added

- After an install, a "You can also" list: `list`, updating, `--global`, `--agent`, `remove` and `--help`.

### Fixed

- A repeat install reports skills and subagents that are already current as unchanged, instead of updated, and rewrites only those that differ.

### Changed

- A clearer CLI. Every file it touches is marked ✓ changed, · already as it should be, or ! could not be changed; the run ends with the next steps and Done, with how many lines need a look. Errors say the cause first and the fix under it, and suggest the command, agent or option meant (`remvoe` → `remove`). An unexpected failure says it's a bug and where to report it, and exits with 2. A dry run ends with the command that makes the change. Colour only on a terminal that shows it (`NO_COLOR`, `FORCE_COLOR` and the new `--no-color` are followed), and ASCII symbols in the old Windows console.

## [1.2.0] - 2026-11-03

### Added

- Receipts now also checks guarded, often irreversible Git actions. If a session force-pushed, skipped Git hooks with `--no-verify`, staged everything with `git add -A`, rewrote history (amend, rebase, reset `--hard`), or changed Git config, and the report never mentions it, the agent is sent back to disclose and justify the action or undo it. Deterministic, from the same session record, with no extra model calls.

## [1.1.1] - 2026-11-03

### Added

- Security policy, code of conduct and support guide. Questions now go to Discussions, and vulnerabilities to private reporting.
- The npm package is published from GitHub releases with a provenance attestation.

### Fixed

- The build reads generated files in one step, so a file can't change between the check and the read.

## [1.1.0] - 2026-11-02

### Added

- Receipts for Claude Code: the plugin records the shell commands run in a session and, before the agent stops, checks every command listed under "Verified" in its report. A command that never ran, or whose last run failed while the report says it passed, sends the agent back to run it or move it to "Not verified".

### Changed

- The reporting principle asks agents to write each verified command in backticks, so the report can be checked.

## [1.0.0] - 2026-11-02

### Added

- Seven Maison GR engineering principles in `AGENTS.md`: understand before implementing, simplicity first, surgical changes, goal-driven execution, verify before completion, secure by default, and guard irreversible actions.
- Ten skills following the Agent Skills specification: engineering, architecture, code review, debugging, testing, security review, documentation, database, API and frontend.
- Claude Code plugin and marketplace manifests, with three subagents: architect, reviewer and tester.
- Gemini CLI extension manifest.
- `npx maisongr-skills`: a dependency-free installer that sets up the principles, skills and subagents for any combination of agents, per project or user-wide, with dry-run, update and remove.
- Cursor project rule and GitHub Copilot repository instructions, generated from `AGENTS.md`.
- Installation guide for Claude Code, Codex, Cursor, GitHub Copilot and Gemini CLI, with update and removal steps.
- Templates for project-specific agent instructions and implementation plans.
- Validation script, installer tests and a GitHub Actions workflow that also installs the packed npm tarball with npx on Linux, macOS and Windows.
- Research notes on the projects and platform documentation that informed the design.
