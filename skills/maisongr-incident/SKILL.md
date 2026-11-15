---
name: maisongr-incident
description: Maison GR method for handling a production incident and learning from it. Use when a live site, API or service is down, slow or returning errors, when a deploy or migration broke production, when data may have been lost, corrupted or exposed, when asked to mitigate or roll back an outage, and when writing a post-mortem or incident report afterwards.
license: MIT
metadata:
  author: Maison GR
---

# Maison GR Incident Response

## Objective

Restore service first, with reversible steps the developer approved, while keeping a truthful record. Then find the cause and change something so the same incident cannot happen twice.

## When to use

- Production is down, degraded or returning wrong results to users.
- A deploy, migration or configuration change has just broken a live system.
- Data may have been lost, corrupted, duplicated or exposed.
- Writing the post-mortem after an incident.

For a defect that is not hurting live users, use the debugging method instead. An incident changes the order: stabilise first, diagnose after.

## Method

### 1. Size it and say so

Answer in a few minutes, from evidence (monitoring, logs, a request to the live system), not from assumption:

- What is failing, for whom, and since when?
- Is it getting worse, stable or recovering?
- Is data at risk, or only availability?

| Severity | Meaning |
|---|---|
| **Critical** | Most users cannot use the product, or data is being lost or exposed |
| **Major** | A key path is broken or badly degraded for many users, with no workaround |
| **Minor** | A limited feature or a small group is affected, or a workaround exists |

Tell the developer at once: what you see, the severity, and what you propose to do next. One person decides during an incident, and it is the developer, not the agent.

### 2. Start the timeline immediately

Keep a running record, with times in UTC:

- What was observed, and where (the alert, the log line, the failing request).
- Every action taken on the live system, the exact command or setting, who approved it, and its effect.
- Every decision and the reason for it.

Write it as it happens. A timeline reconstructed from memory afterwards is wrong in the places that matter.

### 3. Stabilise before diagnosing

Users need the service back more than they need the cause understood.

- Ask first: **what changed last?** A deploy, a configuration or secret change, a migration, a dependency update, an expired certificate or domain, a DNS change, a quota or plan limit, a third-party outage. Most incidents follow a change.
- Prefer the mitigation that is fastest to apply and easiest to undo:

  | Mitigation | Use when |
  |---|---|
  | Roll back to the last good version | The incident followed a deploy. This is the default |
  | Turn the feature off | A flag or setting isolates the broken path |
  | Restore the previous configuration | A setting, secret or DNS record changed |
  | Add capacity or restart | Load or exhausted resources; capture the evidence first, because a restart erases it |
  | Fail over or serve a maintenance page | The dependency that failed is outside your control |

- Get the developer's approval for each action on production, even under pressure. State what it does, how to undo it, and what it could cost.
- Change one thing at a time and check its effect before the next. Two simultaneous changes hide which one worked, and which one made it worse.
- Before any step that destroys evidence, save the logs, the error output and the state you can.
- A fix written in a hurry is the riskiest change of the day. Roll back first; fix forward only when no rollback exists.

### 4. Tell people the truth, on a schedule

- Report what is known, the impact on users, what is being done, and when the next update will come. Then send that update on time, even if it says nothing has changed.
- Do not state a cause until it is confirmed. "We are investigating" is accurate; a guess that turns out wrong costs trust.
- Do not blame a person, a team or a vendor in a status message.
- If personal data may have been exposed, lost or accessed without authorisation, tell the developer immediately and separately. Notification duties to regulators and to the people affected can carry short legal deadlines. That decision belongs to the owner and their advisers, not to the agent.
- Drafting a public message is in scope; sending or publishing one needs approval.

### 5. Confirm recovery on the live system

The incident is not over when the mitigation command exits.

- The failing path works on the live system: run it.
- Error rates, latency and queues are back to their normal levels, and stay there for an agreed watch period.
- Find out what happened to data during the incident window: requests lost, jobs not run, payments or emails duplicated, records half-written. List what needs repairing; repair nothing without approval.
- Tell the developer it is resolved, and what is still being watched.

### 6. Find the cause

Once the service is stable, investigate without the clock:

- Reproduce the failure away from production where possible.
- Separate the **trigger** (what set it off) from the **root cause** (why the system allowed it) and the **contributing factors** (why it was not caught earlier, why it took as long as it did to detect and to fix).
- Support each with evidence: a log line, a diff, a metric, a reproduction. Label anything you believe but could not confirm.

### 7. Write a blameless post-mortem

Write it within a few days, while the timeline is fresh. People acted on the information they had; the question is what the system let happen, never who is at fault.

```markdown
# Incident: <what failed>, <date>

## Summary
Two or three sentences: what happened, the impact, how it was resolved.

## Impact
Who was affected, for how long (start, detection and recovery times in UTC), and what data or money was involved.

## Timeline
<time UTC> <observation or action>

## Cause
Trigger, root cause and contributing factors, each with its evidence.

## What went well, and what did not
Detection, diagnosis, mitigation, communication.

## Actions
| Action | Prevents or detects | Owner | Due |
```

- Every action is specific and tracked where the project tracks work. "Be more careful" is not an action.
- At least one action stops the cause from recurring (a test, a check, a guard), and one makes it faster to detect (an alert, a monitor, a health check).
- A defect behind the incident gets a regression test that fails before the fix.

## Constraints

- Never change production without the developer's approval, however urgent it feels.
- Never apply a destructive fix during an incident: deleting or rewriting data, resetting a database, force-pushing, purging queues.
- Never destroy evidence before saving it.
- Never put secrets, tokens or personal data in the timeline, a status message or the post-mortem.
- Never declare an incident resolved without checking the live system.
- Never publish or send a message about the incident without approval.
- Never report a security incident in a public issue or channel.

## Verification

- [ ] The developer was told the impact and severity before any action was taken.
- [ ] Every production action was approved, recorded with its time, and checked for its effect.
- [ ] Recovery was confirmed on the live system, and the data affected during the incident was assessed.
- [ ] The cause is supported by evidence, or labelled unconfirmed.
- [ ] The post-mortem has tracked actions that prevent and detect a recurrence.

## Output

During the incident:

```text
Status: investigating | mitigating | monitoring | resolved.
Impact: <who and what is affected, since when>.
Severity: critical | major | minor.
Done so far: <actions, with times>.
Proposed next: <action>, undone by <how>. Waiting for approval.
Next update: <time>.
```

Afterwards: the post-mortem above, plus what could not be determined and why.
