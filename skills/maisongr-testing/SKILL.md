---
name: maisongr-testing
description: Maison GR method for writing meaningful automated tests. Use when adding tests for new or changed behaviour, writing a regression test for a bug, practising test-first development, improving weak or flaky tests, or deciding what level (unit, integration, end-to-end) a test belongs at.
license: MIT
metadata:
  author: Maison GR Inc.
---

# Maison GR Testing

## Objective

Write tests that fail when the behaviour breaks and pass when it works, at the cheapest level that gives real confidence. Coverage is a by-product, not the goal.

## When to use

- New behaviour needs tests.
- A bug needs a regression test.
- You want to drive an implementation test-first.
- Existing tests are flaky, slow, or pass even when the code is wrong.

## Method

### 1. Learn the project's test setup

- Find the test runner, the test command, where tests live and how they are named.
- Read two or three existing tests in the same area and copy their structure, helpers and fixtures.
- Find out what the project uses for databases, HTTP and time in tests (real test database, fakes, mocks, frozen clocks).

### 2. Decide what to test

List behaviours, not functions. For each one, cover:

- **The main case:** typical valid input produces the expected result.
- **Boundaries:** empty, zero, one, maximum, just over the maximum.
- **Invalid input:** wrong type, missing field, malformed value. It is rejected with the right error.
- **Failure of dependencies:** timeout, error response, unavailable resource.
- **State and permissions:** the operation under a different user, role or state.

Skip tests that only restate the implementation, such as asserting that a mock was called with exactly the arguments the code passes.

### 3. Choose the level

| Level | Use for | Watch out for |
|---|---|---|
| Unit | Pure logic, calculations, parsing, branching | Over-mocking until the test proves nothing |
| Integration | Code with its database, queue, file system or HTTP layer | Slow setup; isolate data per test |
| End-to-end | A few critical user journeys | Flakiness and cost; keep these few |

Prefer the lowest level that exercises the real risk. A query bug needs an integration test against a real database engine, not a mocked repository.

### 4. Write the test

- Name it after the behaviour: `rejects_expired_coupon`, not `test_coupon_3`.
- Arrange, act, assert. One behaviour per test.
- Assert on outcomes the user or caller can observe: return values, persisted state, responses, emitted events.
- Make tests independent: no reliance on order, shared mutable state or wall-clock time.
- Use realistic but minimal data. Build it with the project's factories or fixtures.

### 5. Prove the test can fail

A test you have never seen fail may not test anything.

- **Test-first:** write the test, run it, watch it fail for the expected reason, then implement.
- **Test-after:** temporarily break the code under test (invert a condition, return early), confirm the test fails, then restore the code.

### 6. Run and stabilise

- Run the new tests, then the surrounding suite.
- Run new tests several times if they touch time, concurrency or randomness.

## Mocks

- Mock at the boundaries you do not own (payment providers, email, third-party APIs), not your own modules.
- Prefer fakes with real behaviour (in-memory store, local test server) over mocks that return canned values.
- Do not mock the thing being tested.

## Constraints

- Do not weaken or delete an existing test to make a change pass. If a test is wrong, explain why and fix it separately.
- Do not use sleeps to wait for asynchronous work; wait on a condition.
- Do not add a test framework or library without approval.

## Verification

- [ ] Each test covers a named behaviour, including edge and failure cases.
- [ ] Each new test was seen failing for the right reason.
- [ ] Tests are independent and deterministic.
- [ ] The project's test command passes.

## Output

List the tests added or changed, the behaviour each covers, the command used to run them and its result. State any behaviour you chose not to test and why.
