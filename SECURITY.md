# Security Policy

## Supported versions

Only the latest release receives security fixes. Update with `npx maisongr-skills`, `claude plugin update maisongr@maison-gr` or `gemini extensions update maisongr`.

| Version | Supported |
|---|---|
| 1.x (latest) | Yes |
| Older releases | No |

## What is in scope

- **The installer** (`cli/maisongr-skills.mjs`): writing outside the target directory, overwriting files it did not create, or following links it should not.
- **The receipts hooks** (`receipts/`): anything that runs commands it should not, stops a process that was not started by the agent, leaks the session record, or lets an agent bypass the check without running the command it reports.
- **Skills, subagents and principles**: guidance that would lead an agent to an unsafe action, such as disabling a security control, exposing a secret or running a destructive command without asking.
- **The CI workflows** in `.github/workflows/`.

Bugs in an agent itself (Claude Code, Codex, Cursor, Copilot, Gemini CLI) belong to that agent's vendor.

## Reporting a vulnerability

Report privately through [GitHub's private vulnerability reporting](https://github.com/maison-gr/maisongr-skills/security/advisories/new). Do not open a public issue.

Include:

- the version (`npx maisongr-skills --version`) and the agent you used;
- the steps to reproduce, and what happened;
- the impact you expect.

## What to expect

- An acknowledgement within 3 business days.
- An assessment, and a fix or a decision, within 30 days for confirmed issues.
- A security advisory and a patched release, with credit to the reporter unless you prefer otherwise.
