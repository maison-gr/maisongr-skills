---
name: maisongr-database
description: Maison GR method for safe database work. Use when changing a schema, writing or reviewing a migration, adding or changing queries, indexes or constraints, modelling data, writing data backfills or fixes, or diagnosing slow queries, in SQL databases (PostgreSQL, MySQL, SQLite) or document stores (MongoDB) and through ORMs such as Prisma, Drizzle, SQLAlchemy, ActiveRecord or Mongoose.
license: MIT
metadata:
  author: Maison GR Inc.
---

# Maison GR Database Engineering

## Objective

Change data structures and queries without losing data, breaking running code, or locking production. The database outlives every application version that talks to it.

## When to use

- Designing or changing tables, collections, columns, fields, constraints or indexes.
- Writing migrations, backfills or one-off data fixes.
- Writing or optimising queries.
- Reviewing changes that do any of the above.

## Method

### 1. Learn the current state

- Find the schema source of truth: migration files, ORM schema, or the live schema via the project's tooling.
- Find the migration tool and its commands: create, apply, roll back, status.
- Identify which environment you are connected to before running anything. Check the connection string or database name. Never assume a local command targets a local database.
- Read the existing constraints, indexes and naming conventions.

### 2. Model the data

- Put integrity rules in the database where the engine supports them: `NOT NULL`, foreign keys, unique constraints, check constraints. Application validation alone does not protect data written by other code paths.
- Choose types that match the data: timestamps with time zones, exact decimals for money, enums or check constraints for fixed sets.
- Name things consistently with the existing schema.
- In document stores, enforce the schema in one place (validator or ODM schema) and decide explicitly between embedding and referencing based on access patterns.

### 3. Plan the migration for a running system

Assume old and new application versions run at the same time during deploys. Use expand and contract:

1. **Expand:** add the new column, table or index in a backward-compatible way (nullable, or with a default).
2. **Migrate code:** deploy code that writes to both or reads from the new structure with a fallback.
3. **Backfill:** move existing data in batches.
4. **Contract:** once nothing uses the old structure, remove it in a later migration.

Never rename or drop a column that deployed code still reads, in the same release.

### 4. Make migrations safe

- Each migration is reversible, or its irreversibility is stated and approved.
- On large tables, avoid operations that rewrite the table or hold long locks. Use the engine's online options, such as `CREATE INDEX CONCURRENTLY` in PostgreSQL.
- Batch backfills and make them resumable and idempotent.
- Never edit a migration that has already run in a shared environment. Write a new one.
- Keep schema migrations and large data migrations separate.

### 5. Write correct queries

- Parameterise every value. Never build queries by concatenating input.
- Use a transaction when several writes must succeed or fail together. Keep transactions short.
- Watch for N+1 queries in loops; fetch related data in one query or a batched one.
- Select the columns you need, and paginate unbounded results.
- Handle concurrency explicitly: unique constraints, conditional updates or row locks, not check-then-write.

### 6. Measure performance

- Read the query plan (`EXPLAIN ANALYZE` in PostgreSQL, `.explain()` in MongoDB) before and after adding an index.
- Add indexes for real query patterns, matching column order to filters and sort order. Every index slows writes and uses space.

## Constraints

- Never run destructive statements (`DROP`, `TRUNCATE`, `DELETE` or `UPDATE` without a narrow `WHERE`) against a shared or production database without explicit approval and a verified backup.
- Never point development tooling at production data unless the developer confirms it is intended.
- Do not disable constraints or triggers to make a migration pass.
- Do not log query parameters that contain personal data or secrets.

## Verification

- [ ] The target environment was confirmed before running anything.
- [ ] The migration applies cleanly on a fresh database and on a copy of current data where possible.
- [ ] The rollback was run, or its absence is approved.
- [ ] Old and new application versions both work during the transition.
- [ ] Query plans were checked for new or changed hot queries.

## Output

Describe the schema change, the migration steps and their order across releases, the rollback path, lock and performance risks, and the verification performed.
