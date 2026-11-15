---
name: maisongr-security-review
description: Maison GR method for reviewing code for security vulnerabilities. Use when asked for a security review or audit, and when a change touches authentication, authorisation, sessions, user input handling, file uploads, payments, personal data, secrets, cryptography, third-party integrations, dependencies, or AI features that process untrusted content, and before an application built quickly with an AI assistant or a starter template goes live.
license: MIT
metadata:
  author: Maison GR
---

# Maison GR Security Review

## Objective

Find vulnerabilities an attacker could realistically exploit, prove each one with a concrete attack path, and recommend the smallest fix. Report fewer, verified findings rather than a long list of theoretical ones.

## When to use

- An explicit security review or audit.
- Changes to login, sessions, tokens, permissions or roles.
- New endpoints, forms, file uploads, webhooks or integrations.
- Code handling payments, personal data, health data or credentials.
- LLM or agent features that read untrusted content or can call tools.
- An application built quickly with an AI assistant or from a starter template, before it goes live.

For general code quality, use the code review skill instead.

## Method

### 1. Model the threat

Before reading code line by line, answer:

- **Assets:** what is worth protecting? Accounts, money, personal data, admin powers, secrets.
- **Actors:** anonymous visitor, signed-in user, user of another tenant, administrator, compromised dependency.
- **Entry points:** every place untrusted data enters: HTTP parameters, headers, cookies, uploaded files, webhooks, queue messages, environment, files the app reads, content fed to an LLM.
- **Trust boundaries:** where data crosses from less trusted to more trusted code.

### 2. Trace untrusted data

For each entry point, follow the data to where it is used, and check the sink:

| Sink | Risk | Expected control |
|---|---|---|
| SQL or NoSQL query | Injection | Parameterised queries; no string-built queries or operator objects from input |
| Shell command | Command injection | No shell; argument arrays; allow-listed values |
| File path | Path traversal | Resolve and confirm the path stays inside an allowed root |
| HTML output | Cross-site scripting | Framework auto-escaping; no raw HTML from input; sanitiser where HTML is required |
| Outbound request URL | Server-side request forgery | Allow-list hosts; block internal address ranges |
| Redirect target | Open redirect | Relative paths or allow-listed hosts only |
| Deserialiser or template engine | Code execution | No untrusted input to unsafe deserialisers or template compilation |
| LLM prompt with tool access | Prompt injection | Treat content as data; restrict tools; require confirmation for consequential actions |

### 3. Check access control

Broken access control is the most common serious flaw. For every protected operation:

- Is the user authenticated?
- Is the user authorised for **this specific resource**? Look up the record and check its owner or tenant, not just the user's role.
- Is the check on the server, on every path to the operation (API, background job, export, admin tool)?
- Can a user change an identifier in the request to reach another user's data?
- Can a user set fields they should not, such as `role`, `price` or `ownerId`, through mass assignment?

### 4. Check authentication and sessions

- Passwords hashed with a slow algorithm designed for passwords (Argon2id, scrypt, bcrypt).
- Rate limiting or lockout on login, password reset and verification codes.
- Session cookies `HttpOnly`, `Secure` and `SameSite`; sessions rotated at login and invalidated at logout.
- Tokens verified for signature, expiry, audience and issuer. No `alg: none`.
- Password reset tokens single-use, short-lived and not leaked in logs or referrers.

### 5. Check data exposure and secrets

- Responses return only the fields the client needs. No password hashes, internal flags or other users' data.
- Logs and error messages contain no secrets, tokens or unnecessary personal data. Stack traces are not shown to users.
- Secrets come from the environment or a secret manager, never from the repository. Search the diff and history for keys.
- Sensitive data is encrypted in transit, and at rest where the project requires it.

### 6. Check configuration and dependencies

- Security headers and CORS: no wildcard origin combined with credentials.
- CSRF protection on state-changing requests that rely on cookies.
- Debug modes and verbose errors are disabled in production configuration.
- Dependencies: run the ecosystem's audit tool (`npm audit`, `pnpm audit`, `pip-audit`, `cargo audit`, `govulncheck`) and report known vulnerabilities that are reachable.

### 7. Check what generated code ships by default

Code written quickly, by an AI assistant or from a starter template, tends to work on the first run and to fail in the same few places. When most of an application was produced that way, check each of these whatever the diff shows:

| Failure | How to check |
|---|---|
| A secret in the browser | Search the **built** client output, not only the source, for keys and tokens. A variable with a public prefix (`NEXT_PUBLIC_`, `VITE_`, `EXPO_PUBLIC_`) is shipped to every visitor; an admin or service-role key must never carry one |
| A database the client reaches directly, with no row rules | For hosted backends queried from the browser, confirm row-level security or security rules are enabled on **every** table and storage bucket, and that no policy is simply "allow all". A missing rule exposes the whole table to anyone holding the public key |
| Authorisation only in the interface | A hidden button or a client-side route guard is not a control. Call the server action, API route or function directly, signed out and as another user |
| Values trusted from the client | The price, user id, role, plan or discount is read from the request instead of the session and the database |
| Unsigned webhooks | A payment or integration webhook acts on a request without verifying its signature, or can be replayed |
| Starter defaults left on | Wildcard CORS, debug or seed routes, an example admin account, default credentials, a committed `.env` |
| A dependency that should not be there | A package name that was invented, misspelt or impersonates a known one. Confirm each new dependency exists, is the intended project and is maintained |
| Model output trusted | User or fetched content is concatenated into the instructions; the model's output is used as HTML, SQL, a shell argument, a file path or a tool call without validation |
| No limit on costly endpoints | Sign-in, sign-up, password reset and any route that calls a paid API can be called without a rate limit, so one script can run up a bill or brute-force a code |

Prove access-control failures with a second test account against a local or test instance: try to read, change and delete records created for the test under the first account. Never try it on real data.

### 8. Verify each finding

For every candidate finding, write the attack path: who sends what, through which entry point, to reach which impact. Check that no upstream control already blocks it. If you can safely demonstrate it in a local or test environment, do so. Never test against production or third-party systems without written authorisation.

## Severity

| Severity | Meaning |
|---|---|
| **Critical** | Remote, unauthenticated compromise of data or systems |
| **High** | Authenticated user can reach other users' data or escalate privileges |
| **Medium** | Exploitable with conditions, or limited impact |
| **Low** | Defence-in-depth gap without a direct exploit |

## Constraints

- Report only what you can support with an attack path. Label anything else as a hardening suggestion.
- Do not print real secrets you find; give their location and recommend rotation.
- Do not run destructive tests, scans against systems you do not own, or exploit code against shared environments.

## Verification

- [ ] Entry points and trust boundaries were listed.
- [ ] Every protected operation was checked for object-level authorisation.
- [ ] For generated or template-based code, the built client output was searched for secrets where the application has a client, and the server was called directly as another user.
- [ ] Each finding has an attack path and a severity.
- [ ] The dependency audit was run, or the report says why not.

## Output

```text
[High] Insecure direct object reference — GET /api/invoices/:id
Attack: signed-in user A requests /api/invoices/<id of user B's invoice>.
Impact: any user can read any invoice, including customer addresses.
Evidence: handler loads the invoice by id without checking ownerId (src/routes/invoices.ts:42).
Fix: load with { id, ownerId: session.userId } and return 404 when missing.
```

End with the scope reviewed, what was out of scope, and any hardening suggestions separated from findings.
