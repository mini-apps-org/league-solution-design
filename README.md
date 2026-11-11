# MViP Billiard League — Solution Design

| | |
|---|---|
| **Product** | MViP (Mini Vietnamese Pool league): APA-style handicapped amateur pool league platform for Vietnam |
| **Document type** | Solution design (deep dive) for software engineers |
| **Status** | **0.4.2, 2026-11-11**: HTML site restyled ([change log](docs/solution-design/CHANGELOG.md)). Aligned with the repos on 2026-11-10 (`league-be@444af15`, tag 0.2.10 · `league-fe@fc5bf84`, tag 0.1.4) |
| **Repos** | [`mini-apps-org/league-be`](https://github.com/mini-apps-org/league-be) (Go API) · [`mini-apps-org/league-fe`](https://github.com/mini-apps-org/league-fe) (React SPA) |
| **Frontend** | Vite 8 + React 19 + TypeScript 6, Tailwind 4, shadcn (`radix-nova`), TanStack Query 5, react-router 7, axios, i18next → **Vercel** (GitHub Actions, on tag) at `www.mvip-league.com` |
| **Backend** | Go 1.26, `net/http` + gorilla/mux, pgx raw SQL, Google OIDC + cookie sessions, PostgreSQL (rules in triggers/functions) → image in **Artifact Registry**, **GKE** on GCP (`asia-southeast1`) at `be.mvip-league.com` |
| **Edge** | Cloudflare DNS for `mvip-league.com` |

> ⚠️ **Read first:** the league API and the business-rules migration that the FE plans mark as done are **missing from league-be**. See [15 — As-built vs target](docs/solution-design/15-as-built-vs-target.md).

## Table of contents

| # | Chapter | What it answers |
|---|---|---|
| 01 | [Business context](docs/solution-design/01-business-context.md) | Why the product exists, actors, revenue, risks |
| 02 | [Glossary](docs/solution-design/02-glossary.md) | Billiard and league terms (EN / VI / repo identifier) |
| 03 | [Scope and phases](docs/solution-design/03-scope-and-phases.md) | Phase 1 = the repo MVP (with build status), Phases 2–3, user stories, next steps |
| 04 | [**Domain rules**](docs/solution-design/04-domain-rules.md) | All business rules with IDs, plus **where each one is implemented** |
| 05 | [Architecture](docs/solution-design/05-architecture.md) | Stack, C4 diagrams, cookie topology, request lifecycle, ADRs from the repos |
| 06 | [Data model](docs/solution-design/06-data-model.md) | As-built schema (`00001`), planned rules (`00002`), target additions |
| 07 | [API design](docs/solution-design/07-api-design.md) | Envelopes, error-code registry, built and planned endpoints, examples |
| 08 | [**Scorekeeping engine**](docs/solution-design/08-scorekeeping-engine.md) | MVP result-entry flow; Phase 2 live-scoring engine |
| 09 | [Frontend design](docs/solution-design/09-frontend-design.md) | `league-fe` stack, `src/` tree, conventions, routes and screen status, auth client, PWA |
| 10 | [Backend design](docs/solution-design/10-backend-design.md) | `league-be` layout, repository rules, config, planned `internal/league` |
| 11 | [Security and roles](docs/solution-design/11-security-and-roles.md) | Google OIDC + sessions + CSRF, cookies, RBAC, gaps, PDPD |
| 12 | [Infrastructure and DevOps](docs/solution-design/12-infra-devops.md) | Real CI/CD pipelines, target GKE runtime, observability, cost |
| 13 | [NFRs and testing](docs/solution-design/13-nfr-and-testing.md) | Targets, SQL-first rule tests, integration gate, DoD |
| 14 | [**Open questions**](docs/solution-design/14-open-questions.md) | Notion defects, missing business rules, repo questions and defects |
| 15 | [**As-built vs target**](docs/solution-design/15-as-built-vs-target.md) | Gap matrix with priorities; what changed from design v0.1 |
| A | [Rule tables (JSON)](docs/solution-design/appendix-rule-tables.md) | Machine-readable race / points / matrix tables and where the live copies are |
| F | [**Feature specs**](docs/solution-design/features/README.md) | 54 features in 12 epics: one folder per epic, one file per feature, with requirements, logic, sequence and component diagrams per phase |

**Suggested reading order:**
- New engineers: 15 → 02 → 04 → 06 → 07 → your side (09 or 10).
- Product owners: 03 → 14.

## Conventions

| Mark | Meaning |
|---|---|
| `R-xxx` | Business rule ID (chapter 04). Use it in tests, tickets and PRs |
| 🏗 | As-built: in a repo on `master` |
| 🅿️ | Built but parked in `league-fe/_parked/` (not compiled) |
| 📐 | Planned MVP: specified in `league-fe/plans/20261104-2126-bida-league-mvp/`, code not in the repo |
| 🎯 | Target: later phase of this design |
| ✅ / ⚠️ / 🛠 | Confirmed by the Notion source / assumption pending confirmation / corrected source defect |

Diagrams are Mermaid. JSON examples are valid JSON with `<placeholder>` values.

## Source traceability

| Notion source page | Covered in | Implemented in (repo) |
|---|---|---|
| Introduce to business (first try) | 01, 03 | — |
| Foundation Database of players | 04 §5.3, §13 · 06 · 09 | `00001_init.sql` (team/individual matches, stats); 🅿️ Schedule/Match pages |
| How to score (on paper manually) | 04 §6–§7 · 13 | MVP result entry (games, innings, DS totals) |
| Score keeper | 04 §5–§9 · 08 · Appendix | `race_chart`; 📐 `fn_score_individual_match` |
| Player profile | 04 §12 · 09 (Phase 2) | `players_stats`; 📐 `player_division_stats` |
| DEMO (SRS MVP) | 03 · 04 · 08 · 09 · 11 | 🅿️ put-up, result, admin players; 📐 `change_skill_level` |
| Division Difference | 04 §2–§3 · 06 | `divisions.format`, `skill_level_cap`; 📐 `team_rosters` |
| ID Generation Rules | 04 §11 · 14 Q2/Q3/Q33 | `players.member_id`, `teams.team_number` (free text today) |
| Dictionary | 02 | FE i18n keys |

| Repo source | Covered in |
|---|---|
| `league-be/internal/auth/*`, `platform/middleware/*` | 05, 07, 10, 11 |
| `league-be/db/migrations/00001_init.sql`, `seeds/*` | 06, 15 |
| `league-be/.github/workflows/*`, `Dockerfile`, `Makefile` | 12 |
| `league-fe/src/*`, `CLAUDE.md`, `.claude/rules/*` | 09 |
| `league-fe/_parked/*`, `plans/*` | 03, 04, 06, 07, 08, 15 |
| `league-fe/.github/workflows/*`, `vercel.json` | 12 |

## Next steps

1. **P0:** restore or rebuild the league-be league module and the `00002` rules migration ([15](docs/solution-design/15-as-built-vs-target.md)).
2. Un-park the FE screens, generate the API types, and run FE + BE together in a browser.
3. Deploy the API to GKE (manifests + deploy job), publish the Google consent screen, and create a separate staging environment.
4. Answer the open questions that affect the beta: Q29–Q34 ([14](docs/solution-design/14-open-questions.md)).
5. Beta with one division; then Phase 2 (live scoring, verification, 9-Ball, payments, Zalo).
