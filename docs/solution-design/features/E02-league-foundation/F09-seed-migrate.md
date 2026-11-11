# F9 — Seed and migrate/seed targets

> [Feature specs](../README.md) › [E02 — League Data Foundation](README.md) › **F9** · Phase 1

| Phase | Status | Repo refs |
|---|---|---|
| 1 | ❌ the seed is broken | `league-be/db/migrations/seeds/20261106_seed.sql`, `Makefile` |

## Requirements

| ID | Requirement |
|---|---|
| FR-9.1 | `make migrate` applies `db/migrations/0000*_*.sql` in order with `psql -v ON_ERROR_STOP=1` against `DATABASE_URL` |
| FR-9.2 | `make seed` applies the seed file. It's idempotent (`ON CONFLICT DO NOTHING`) |
| FR-9.3 | The seed makes the 23 cap bind: 03209's top five = 29, 03211's = 27, and 03207 = 22 as the control |
| FR-9.4 | Dev identities: `admin@example.test` (ADMIN) and `captain@example.test` (CAPTAIN, member 95007620). They can't log in; they exist only for role tests |
| FR-9.5 | Two unpaid players exist, to exercise `40003` |
| FR-9.6 | Week-10 fixtures on 2026-11-10 19:30 +07: 03209 v 03214 and 03211 v 03207 |

## Acceptance criteria
- **AC-9.1** On a fresh DB, `make migrate && make seed` succeeds, and running `make seed` twice changes nothing.

---

[← F8](F08-postgres-business-rules.md) · [E02 overview](README.md) · [F10 →](F10-league-api.md)
