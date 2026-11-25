---
name: maisongr-api
description: Maison GR method for designing and changing APIs without breaking their consumers. Use when adding or modifying HTTP/REST, GraphQL, RPC or webhook endpoints, request and response shapes, validation, error formats, pagination, authentication requirements, versioning, or an OpenAPI or schema definition, and when reviewing such changes.
license: MIT
metadata:
  author: Maison GR Inc.
---

# Maison GR API Engineering

## Objective

Treat every API as a contract with consumers you may not know. Make it consistent, validated at the boundary, predictable in failure, and evolvable without breaking existing clients.

## When to use

- Adding or changing an endpoint, operation, webhook or event payload.
- Changing request validation, response fields, status codes or error shapes.
- Adding pagination, filtering, rate limiting or versioning.
- Reviewing an API change.

## Method

### 1. Learn the existing conventions

Before designing, read several existing endpoints and record the conventions the API already follows:

- URL and naming style (plural nouns, casing of fields).
- Authentication and authorisation mechanism.
- Validation library and where validation happens.
- Error response shape and status code usage.
- Pagination style (cursor or offset), date format, ID format.
- Where the contract is declared (OpenAPI file, GraphQL schema, typed router, shared types).

New endpoints follow these conventions even when you would choose differently.

### 2. Design the contract first

Write the contract before the handler:

- Method and path, or operation name.
- Request: parameters, body schema, required and optional fields, limits.
- Responses: success shape and status, and every error case with its status and code.
- Who may call it, and what they may access.
- Idempotency: can the client safely retry? For non-idempotent operations that clients will retry (payments, orders), support an idempotency key.

### 3. Validate at the boundary

- Validate every input against a schema: type, format, range, length, allowed values.
- Reject unknown fields where the project does so, and never bind request bodies directly to database models (mass assignment).
- Return all validation errors in one response, with the field each applies to.

### 4. Make errors consistent

Use the project's error format. If it has none, propose one, such as RFC 9457 Problem Details:

```json
{
  "type": "https://example.com/errors/validation",
  "title": "Invalid request",
  "status": 422,
  "errors": [{ "field": "email", "code": "invalid_format", "message": "Email address is not valid." }]
}
```

- Use status codes for their meaning: 400 malformed, 401 not authenticated, 403 not allowed, 404 not found (also for resources the caller may not know exist), 409 conflict, 422 validation failed, 429 rate limited, 5xx server faults.
- Give machine-readable codes that clients can branch on, and human-readable messages.
- Never leak stack traces, SQL or internal identifiers in errors.

### 5. Evolve without breaking

**Compatible changes:** adding an optional request field, adding a response field, adding an endpoint, adding an enum value where clients were told to expect new values.

**Breaking changes:** removing or renaming a field, changing a type or format, making an optional field required, changing status codes or error codes, changing default behaviour, tightening validation on existing inputs.

For a breaking change:

1. Get explicit agreement.
2. Introduce the new form alongside the old (new field, new version or new endpoint).
3. Mark the old one deprecated in the contract and documentation, with a timeline.
4. Remove it only after consumers have migrated.

### 6. Keep the contract and code in sync

- Update the schema, generated types and API documentation in the same change.
- Add contract tests or schema validation tests that fail when the implementation drifts from the declared contract.

## Constraints

- Do not make breaking changes to a published API without explicit approval.
- Do not return more data than the consumer needs, especially personal data.
- Do not invent a new error or pagination style when the API already has one.
- Every endpoint enforces authorisation on the specific resource, not only authentication.

## Verification

- [ ] The change follows the existing conventions.
- [ ] Inputs are validated with clear errors.
- [ ] Success and error cases are tested, including authorisation failures.
- [ ] The change is classified as compatible or breaking, and breaking changes are approved.
- [ ] Schema, types and documentation match the implementation.

## Output

The contract (request, responses, errors, access rules), whether the change is compatible or breaking, the tests added, and any follow-up needed for consumers.
