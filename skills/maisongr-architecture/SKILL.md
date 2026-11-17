---
name: maisongr-architecture
description: Maison GR method for technical design decisions. Use when choosing how to structure a feature, where code should live, whether to add a module, service, library or dependency, how components should communicate, or when a change crosses module boundaries. Also use when asked to write a design document or an architecture decision record.
license: MIT
metadata:
  author: Maison GR
---

# Maison GR Architecture

## Objective

Choose the simplest design that fits the system as it already is, make the trade-offs explicit, and record decisions that will be expensive to reverse.

## When to use

- A feature needs a new module, service, package, queue, cache or data store.
- You are deciding between two or more structural approaches.
- A change crosses module, service or ownership boundaries.
- Someone proposes a new dependency, framework or pattern.
- You are asked for a design doc, an RFC or an architecture decision record (ADR).

Not for choosing a variable name or a local refactor inside one function.

## Method

### 1. Map what exists

Before designing, describe the current system in a few lines:

- The components involved and what each one owns (data, behaviour, interface).
- How they communicate: function calls, HTTP, events, shared database.
- The conventions already in use for the same kind of problem. If the codebase solved it once, that solution is the default.
- The real constraints: load, latency, data volume, team size, deployment model, budget.

### 2. State the decision to make

Write the question in one sentence, with the forces acting on it:

> Where should invoice PDF generation run, given that it takes 4 to 8 seconds and the API has a 10 second timeout?

### 3. Generate options, including the boring one

List two or three options. One of them must be the smallest change that works within the existing architecture. For each option, note:

| | Option A | Option B |
|---|---|---|
| What changes | | |
| New moving parts (services, dependencies, infra) | | |
| Failure modes | | |
| Reversibility | | |
| Fits existing conventions | | |

### 4. Decide with explicit criteria

Prefer, in order:

1. Correctness and data integrity.
2. Consistency with the existing architecture.
3. Fewer moving parts and dependencies.
4. Reversibility: a decision that is easy to change later can be made quickly.
5. Performance and cost, when measured or clearly material.

Do not choose an option because it is fashionable, because it might be needed later, or because it is more interesting to build.

### 5. Define the boundaries

For the chosen design, specify:

- Each component's single responsibility and the data it owns.
- The interfaces between components: inputs, outputs, errors.
- Where validation, authorisation and error handling happen.
- What happens when a dependency is slow or unavailable.

### 6. Record decisions that are costly to reverse

For decisions about data models, public interfaces, infrastructure, or dependencies with lock-in, write a short ADR:

```markdown
# ADR-NNN: <decision>

Status: proposed | accepted | superseded by ADR-MMM
Date: YYYY-MM-DD

## Context
The problem and the forces at play, in a few sentences.

## Decision
What we will do.

## Consequences
What becomes easier, what becomes harder, and what we accept.

## Alternatives considered
Each option and why it was not chosen.
```

Store ADRs where the project already keeps them (often `docs/adr/`). If the project has none, propose the location instead of creating a convention silently.

## Dependency evaluation

Before proposing a new dependency, answer:

- Can the language, platform or an existing dependency already do this?
- Is it maintained (recent releases, open issues handled)?
- What is its licence, and is that compatible with the project?
- What does it add to bundle size, cold start or attack surface?
- How hard would it be to remove later?

Adding a dependency requires the developer's approval.

## AI model dependencies

A feature that calls an AI model depends on a provider whose models, prices and terms change every few months. Design it so the model can be swapped and the change measured:

- **One interface.** One module builds the request and reads the answer. The rest of the application never calls the provider's SDK directly.
- **Configuration, not code.** The model name, the prompt version, token limits and timeouts live in one place.
- **A private evaluation set.** 20 to 50 real inputs, each with what a good answer must and must not contain, kept in the repository. Run it before changing the model, the provider or the prompt, and compare the results with the current version.
- **Cost bounds.** A spending cap per user or per day, and token use logged per feature, so a new model's cost is known before it ships.
- **Failure behaviour.** What the feature does when the provider is slow, down or refuses: a clear message, a retry, or a degraded mode, never a blank screen.

## Constraints

- Do not introduce a new architectural pattern where one already exists for the same problem.
- Do not split a component until a real second consumer or a measured scaling need exists.
- Do not design for hypothetical scale; design so the scaling path is not blocked.
- Present designs as proposals. The developer decides.

## Verification

- [ ] The current architecture was described from the code, not assumed.
- [ ] At least one minimal option was considered.
- [ ] Trade-offs are stated against explicit criteria.
- [ ] Component responsibilities and interfaces are defined.
- [ ] Failure behaviour of external dependencies is addressed.
- [ ] A feature that calls an AI model has one interface to the provider, an evaluation set and a cost bound.
- [ ] Costly-to-reverse decisions have an ADR or a written rationale.

## Output

A short design note: context, options with trade-offs, recommendation and reasoning, boundaries and interfaces, open questions. Include an ADR when step 6 applies.
