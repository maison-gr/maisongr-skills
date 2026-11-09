---
name: maisongr-open-source
description: Maison GR method for contributing to a repository the developer does not maintain. Use when preparing a fix or feature for an open-source or upstream project, forking and opening a pull request, answering review on someone else's repository, or keeping an open contribution up to date. Reads the project's contribution, CLA or DCO and AI policies before the first commit, keeps each pull request small and proven, and treats every public comment as the developer's own words.
license: MIT
metadata:
  author: Maison GR
---

# Maison GR Open-Source Contribution

## Objective

Land a change in someone else's project in a form its maintainers can accept quickly. A contribution is judged by the cost it puts on the maintainers: a small, proven change that follows their rules costs them minutes; anything else costs them hours or gets closed.

## When to use

- Fixing a bug or adding a feature in a repository the developer does not maintain.
- Forking, branching and opening a pull request upstream.
- Responding to review, CI failures or merge conflicts on an open contribution.
- Not needed for the developer's own repositories; use the engineering method there.

## Method

### 1. Read the project's rules first

Before the first commit, read and note:

| Source | What to extract |
|---|---|
| `CONTRIBUTING`, `README`, `docs/` | Setup, test commands, branch and commit format, changelog or changeset rules |
| `CODE_OF_CONDUCT` | Tone and conduct expectations |
| CLA or DCO | Whether a contributor licence agreement must be signed, or every commit needs `Signed-off-by` (`git commit -s`) |
| AI or agent policy (`AGENTS.md`, CONTRIBUTING sections, pull request template checkboxes) | Whether AI-assisted contributions are allowed, must be disclosed, or are refused |
| Pull request template | Every field and checkbox the maintainers expect |
| `LICENSE` | That the developer can contribute under it |

**If the project forbids AI-assisted contributions, stop and tell the developer.** Do not work around the policy or hide the assistance. If it requires a disclosure, include it exactly as the policy words it.

### 2. Check that the work is wanted

- Search open and closed issues and pull requests for the same problem. Do not duplicate someone else's work in progress.
- If the issue is assigned or claimed, do not start without the claimant's or a maintainer's agreement.
- For anything larger than a typo or an obvious bug, propose the approach on the issue and wait for a maintainer's response before writing code. Draft the comment for the developer to approve; posting it is a public action.
- Respect labels such as `good first issue`, `help wanted` or `needs design`: they say who the maintainers expect to take the work and when.

### 3. Prepare the change

- Fork, then branch from the current default branch. Use the project's branch naming if it has one.
- Reproduce the problem on the unchanged code first, ideally as a test that fails.
- Make the smallest change that solves the issue. One pull request per problem; no unrelated cleanups, renames or formatting.
- Match the project's style, even where it differs from the developer's own.
- Write commit messages in the project's format, with sign-off if the DCO requires it.
- Add the changelog entry, changeset or documentation update the project asks for.

### 4. Prove it the project's way

- Run the project's own test, lint, type-check and build commands, not substitutes.
- Show the new test failing without the fix and passing with it.
- If something cannot run locally (a platform, a service, a CI-only job), say so in the pull request instead of implying it passed.

### 5. Open the pull request

Write the description for a maintainer who has thirty seconds:

```text
Fixes #123.

Problem: what goes wrong, and for whom.
Cause: the root cause in one or two sentences.
Change: what this pull request does.
Verified: the commands run and their results; the test that failed before and passes now.
Not verified: anything that could not be run locally, and why.
```

Complete every field of the template. Opening the pull request, pushing to the fork and posting comments are public actions: the developer approves each one.

### 6. Handle review and upkeep

- Answer maintainers' questions directly and briefly, about the work only.
- Act on automated reviewers (code-review bots, linters, security scanners) through the code. Do not reply to a bot, thank it, or argue with it. Resolve its thread once the change is made and verified, if the project allows contributors to resolve threads.
- Keep the branch current with the base branch the way the project prefers (merge or rebase). Rewrite a pushed branch only with the developer's permission, and then with `--force-with-lease`.
- Do not ping, tag or chase maintainers. At most one polite follow-up after 14 days without a response, and only with the developer's approval.
- Keep at most two open pull requests per upstream repository at a time.
- If the maintainers decline the change, accept it, ask once what would have been acceptable if that is unclear, and record the reason.

## Constraints

- Never bypass or misrepresent a CLA, DCO or AI policy.
- Never post, push, comment or open a pull request without the developer's approval.
- Never include unrelated changes, generated files, local configuration or secrets in the pull request.
- Never mark a check as passing in the description unless it ran and passed.
- Never claim credit for someone else's work; credit prior issues, patches and discussions you built on.

## Verification

- [ ] CONTRIBUTING, CLA or DCO, AI policy and pull request template were read and followed.
- [ ] The issue is not claimed by someone else, and larger work was agreed on the issue first.
- [ ] The change is one problem, in the project's style, with a test that fails before and passes after.
- [ ] The project's own checks ran; anything not run is named in the description.
- [ ] Every public action was approved by the developer.

## Output

```text
Project: owner/repository, issue and pull request links.
Rules followed: CLA/DCO, AI policy, commit format, changelog.
Change: what changed and why.
Verified: commands and results, before and after.
Waiting on: maintainer review, CI approval, CLA signature, or nothing.
```
