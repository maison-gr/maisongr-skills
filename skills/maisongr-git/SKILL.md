---
name: maisongr-git
description: Maison GR method for everyday version control. Use when creating branches, staging and committing, writing commit messages, resolving merge conflicts, keeping a branch current, tagging a release, or setting up a repository's Git hygiene (.gitignore, .gitattributes). Checks the staged diff for secrets before every commit, keeps commits focused, protects branches that deploy, and handles a leaked secret correctly.
license: MIT
metadata:
  author: Maison GR
---

# Maison GR Git

## Objective

Leave a history that a reviewer can read, a teammate can build on, and an incident responder can trust. Every commit is one understandable change, contains nothing secret, and lands where the team's workflow expects it.

## When to use

- Branching, staging, committing, merging or rebasing.
- Resolving merge conflicts.
- Tagging a release or maintaining a changelog.
- Setting up or fixing `.gitignore` and `.gitattributes`.
- Discovering that a secret was committed.

## Method

### 1. Read the state and the conventions

- Check the current branch, its upstream, and the working tree. Note any uncommitted work that is not yours: never stage, stash, discard or overwrite it.
- Find the project's conventions: CONTRIBUTING, commit message linting, recent `git log`, branch names on the remote, and the release process.
- Find out which branches deploy or publish automatically (look at CI workflows and hosting configuration). Those branches are not committed to directly.

### 2. Branch

- Start work on a branch, not on the default branch or any branch that deploys, unless the project's workflow says otherwise.
- Use the project's naming. Without one, use `type/short-description` in lowercase with hyphens: `feat/csv-export`, `fix/mobile-nav`, `chore/update-actions`.
- Branch from an up-to-date base.

### 3. Stage deliberately

- Stage files by name. Do not stage everything with a wildcard command; it sweeps in local configuration, build output and other people's work.
- Read the staged diff (`git diff --staged`) in full before every commit.
- Leave out generated files, build output, editor settings, logs and local environment files unless the project deliberately tracks them.

### 4. Check for secrets before every commit

Search the staged diff for:

| Look for | Examples |
|---|---|
| Key and token formats | `sk-`, `ghp_`, `gho_`, `xoxb-`, `AKIA`, `AIza`, `-----BEGIN ... PRIVATE KEY-----`, long random strings |
| Assignments | `password=`, `secret=`, `token=`, `api_key=`, `Authorization: Bearer` |
| Files | `.env*` (other than `.env.example`), `*.pem`, `*.key`, `id_rsa`, credential JSON, `.npmrc` with a token |
| Connection strings | Database URLs with a password, webhook URLs with a token |

Confirm `.gitignore` covers `.env*` and the project's credential files, with `.env.example` kept tracked and free of values. If the project has a secret scanner (pre-commit hook or CI job), run it too.

### 5. Commit

- One logical change per commit. If the diff mixes two changes, split it.
- Follow the project's message format. Without one, use Conventional Commits: `type(scope): summary` in the imperative, under about 72 characters, with a body explaining why when it is not obvious.
- Do not skip hooks. If a hook fails, fix the cause.

### 6. Keep branches current and resolve conflicts

- Update from the base branch the way the project prefers: merge or rebase.
- Rebase or otherwise rewrite only commits that have not been shared, unless the developer approves. When a rewrite of a pushed branch is approved, push it with `--force-with-lease`, never a plain force.
- In a conflict, understand both sides before choosing. Never resolve by discarding the other side wholesale. Run the tests after resolving.

### 7. Repository hygiene

- `.gitattributes` normalises line endings so Windows checkouts do not commit CRLF:

  ```text
  * text=auto eol=lf
  *.png binary
  *.jpg binary
  *.woff2 binary
  ```

- Large binaries and datasets stay out of Git, or go through the project's large-file mechanism.
- Public repositories have a description, a licence and a README.

### 8. Tag releases

- Use Semantic Versioning. A breaking change to a public interface is a major version.
- Move the changelog's unreleased entries under the new version, set the version in every manifest, run the full checks, then tag (`vX.Y.Z`).
- Pushing a tag or publishing a release is usually irreversible and often triggers publishing. It needs the developer's approval.

## If a secret was committed

1. Stop. Do not push, or stop pushing.
2. Tell the developer at once: which secret, which file, which commits, and whether it was pushed. Do not print the secret's value.
3. **The secret must be rotated or revoked at its provider.** Deleting it from the code does not help once it has left the machine: history, forks, clones and caches keep it.
4. Remove it from the code and load it from the environment instead.
5. Rewrite history to remove it only with the developer's approval, and only after rotation.

## Constraints

- Never commit directly to a branch that deploys or publishes unless the developer asks.
- Never stage with a wildcard, skip hooks, or commit unreviewed changes.
- Never discard, stash or overwrite work that is not yours.
- Never print a secret's value, even when reporting it.
- Never delete branches, tags or releases without the developer's approval.

## Verification

- [ ] Work is on a branch named by the project's convention.
- [ ] The staged diff was read in full and contains only this change.
- [ ] No secrets, credential files or `.env` files are staged; `.gitignore` covers them.
- [ ] The commit message follows the project's format.
- [ ] Tests pass after any merge, rebase or conflict resolution.

## Output

```text
Branch: name, based on <base> at <commit>.
Commits: <hash> <message>, one line each.
Secret check: what was searched, and the result.
Not done: push, tag or release, waiting on the developer.
```
