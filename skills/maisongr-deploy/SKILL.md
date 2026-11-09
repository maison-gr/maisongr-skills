---
name: maisongr-deploy
description: Maison GR method for shipping changes to production safely. Use when deploying an application, publishing a package or release, running a production migration, changing hosting, infrastructure, DNS or environment configuration, or adding a paid or external service. Confirms approval, records a rollback point, takes a backup before data changes, estimates cost, and checks the live result after every deploy.
license: MIT
metadata:
  author: Maison GR
---

# Maison GR Deploy

## Objective

Every deploy can be undone, its cost is known before it happens, and its result is checked on the live system. A deploy is finished when the live system is verified, not when the command exits.

## When to use

- Deploying an application or a configuration change to a shared or production environment.
- Publishing a package, release, extension or app store build.
- Running a migration or data change against production.
- Changing hosting, infrastructure, DNS, environment variables or secrets.
- Adding a paid plan, paid API or new external service.

## Method

### 1. Confirm the deploy is approved

- The developer explicitly asked for this deploy, to this environment, in the current conversation. A passing build or a merged branch is not approval.
- Write down what is being deployed: the environment, the commit or version, and what changes for users.

### 2. Check before shipping

- The project's checks (tests, lint, type check, build) pass on the exact commit being deployed.
- Every environment variable and secret the change needs exists in the target environment. Check names, never print values.
- Migrations have been reviewed for locks, duration and backwards compatibility: the old and new code versions may run at the same time.
- The changelog or release notes describe the change.

### 3. Record the rollback point

Before changing anything, record how to return to the current state:

| Change | Rollback point |
|---|---|
| Application deploy | The currently live version, release ID or commit, and the command or dashboard action that restores it |
| Package publish | Publishing is usually permanent; the fallback is a fixed new version or a deprecation notice, so check twice |
| Database migration | A backup taken and confirmed restorable, plus the down migration or the reverse steps |
| DNS or configuration | The previous records or values, copied exactly |

If no rollback exists, say so and get explicit approval for an irreversible change.

### 4. Estimate the cost

- For a new service, plan upgrade or paid API: state the monthly or per-run cost, the pricing source, and what happens at the free plan's limits.
- Propose any recurring cost with its monthly amount, and wait for approval before creating it.
- For a large paid API run, estimate the cost of the run before starting it.

### 5. Deploy in the smallest step

- Ship one change at a time, so a failure has one suspect.
- Prefer the project's own deploy path (its CI workflow or deploy script) over manual commands.
- Watch the deploy output to completion. Do not start a second change while the first is unverified.

### 6. Verify the live result

- The service responds: status 200 on the main pages or a health check.
- The changed behaviour works on the live system: run the path that changed.
- Error logs and monitoring show no new errors.
- For public web pages: the right title and canonical, no accidental `noindex`, and the sitemap still valid.
- For packages: install the published version in a clean directory and run it.

### 7. Roll back on the agreed signal

Decide before deploying what triggers a rollback (errors, a failed check, a broken key path). If it happens, roll back first and investigate after, then report.

## Constraints

- Never deploy, publish or run a production migration without the developer's explicit approval in the current conversation.
- Never print, log or paste secrets while checking configuration.
- Never disable checks, skip tests or force a deploy to get it through.
- Never create a recurring cost or paid resource without approval of its amount.
- Never change production data beyond the approved migration.

## Verification

- [ ] The developer approved this deploy, this target and this version.
- [ ] Checks passed on the deployed commit.
- [ ] The rollback point was recorded before the change; a backup exists before any data change.
- [ ] Any cost was estimated and approved.
- [ ] The live system was checked after the deploy, including the changed behaviour.

## Output

```text
Deployed: <what> to <environment>, version <x>, at <time>.
Rollback point: <previous version or backup> and how to restore it.
Cost: none, or <amount per month or per run>, approved.
Live check: <checks run on the live system and their results>.
Not verified: <anything that could not be checked live, and why>.
```
