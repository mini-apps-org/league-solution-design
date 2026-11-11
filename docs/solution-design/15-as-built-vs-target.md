# 15 — As-Built vs Target (Gap Analysis)

Snapshot taken 2026-11-10 from `league-be@444af15` (tag 0.2.10) and `league-fe@fc5bf84` (tag 0.1.4).

> ## ⚠️ P0: the league module is missing from league-be
>
> The FE plans (`plan-1`, `plan-2`, `plan-3`) record these as **"done and verified" on 2026-11-06/07**:
> - `team_rosters` and the status CHECKs.
> - `00002_business_rules.sql` (476 lines of triggers, functions and views).
> - The seed fixes and the `make migrate`/`make seed` targets.
> - `internal/league` with 13 endpoints.
> - `role` and `playerId` on `/me`.
>
> **None of it is in league-be:** not on `master`, not on any remote branch, not in git history, and not in a stash. The FE notes mention `stash@{0}`, but no stash exists.
>
> Consequences:
> - The committed seed fails (it inserts into `team_rosters`).
> - The FE can't leave onboarding (`/members/preview` and `/me/link` don't exist).
> - All league screens stay parked.
>
> **Action:** check the other developer machines for uncommitted work first. If it isn't found, rebuild from plan-1/2/3, which describe every function and test case in enough detail. Commit in small PRs: schema → rules → seed → API → `/me`.

## 1. Gap matrix

Priority: **P0** blocks the MVP · **P1** needed before beta · **P2** Phase 2 · **P3** later.

| Area | As-built (🏗) | Planned (📐) | Target (🎯) | Gap / next action | Prio |
|---|---|---|---|---|---|
| Schema | `00001_init.sql`: league tables, RBAC, race chart | `team_rosters`, CHECKs (plan-1) | Per-format SL, racks, events, fees… ([06 §C](06-data-model.md#c--target-additions-later-phases)) | Restore plan-1 changes | P0 |
| Business rules | — | `00002`: snapshot, score, roll-up, stats triggers; `can_put_up`, `change_skill_level`; views | Same; revisit for live scoring | Restore `00002` | P0 |
| Seed | `seeds/20261106_seed.sql` (broken) | Works after `team_rosters` exists | — | Restore with the schema | P0 |
| Migration runner | Manual `psql` | `make migrate`, `make seed` | `golang-migrate`/`goose` + k8s Job | Add the Makefile targets now, the tool later | P0 / P1 |
| League API | — | 13 endpoints + `/teams` (`internal/league`) | + standings, stats, Phase 2 scoring | Rebuild per plan-3 | P0 |
| `/me` | `{id,email,name,avatarUrl}` | + `role`, `playerId` | — | Add with the role resolver | P0 |
| Onboarding API | — | `GET /members/preview`, `POST /me/link` | Rate limit + minimal disclosure | Build, and decide [Q31](14-open-questions.md) | P0 |
| Authorization | RBAC tables only, no checks | Role middleware + captain-owns-night helper | Scoped LO/Rep roles | Build with `internal/league` | P0 |
| Auth | Google OIDC + PKCE, cookie sessions, CSRF | — | Zalo login (Phase 2) | Publish the Google consent screen (it's in Testing mode) | P1 |
| FE screens | Login, onboarding UI, placeholders | Schedule, night, put-up, result, submit, admin (parked) | Profile, standings, live scoring | Un-park per `RESTORE.md` once the API exists | P0 |
| FE API types | Hand-written `types/league.ts` | `openapi-typescript` from swagger | — | Generate after the swagger is regenerated | P1 |
| FE ↔ BE integration | Never run together in a browser | — | — | Joint test: CORS, cookies across `www.`/`be.`, CSRF | P1 |
| Swagger | 5 paths; user `id` shown as integer | 18 paths | OpenAPI 3 for codegen | Regenerate; fix the id type | P1 |
| BE deployment | Image pushed to Artifact Registry on tag | — | GKE manifests, deploy job, Cloud SQL, Secret Manager | Write the manifests + deploy job ([12 §4](12-infra-devops.md#4--target-runtime-on-gcp)) | P1 |
| Port | Dockerfile 9200, YAML staging/prod 5001 | — | One value | Align them, or set `PORT` in the manifest | P1 |
| Staging | `staging.yaml` = `production.yaml` | — | Separate hosts and OAuth client | Create a staging environment | P1 |
| Health | Liveness only (`/api/v1/health`) | — | `/readyz` with a DB ping | Add before GKE probes | P1 |
| Rate limiting | Code `42901` only | — | Redis bucket + Cloudflare rules | Cloudflare rules first (no code) | P1 |
| Logging | stdlib `log`, YAML logger block unused | — | `slog` JSON + request ID | Add with the deploy work | P1 |
| Config hygiene | Unused `server`, `logger`, `domains.*` YAML; `BASE_URL` unused; `FRONTEND_URL` stale in `.env.example` | — | — | Clean up | P2 |
| Pagination | Cursor encodes an int64 id | — | UUID / `(created_at,id)` cursor | Fix before the first paginated league list | P1 |
| PWA / offline | Static cache only, never HTML/API | — | IndexedDB queue for live scoring | Phase 2 | P2 |
| Live scoring | — | Out of MVP scope | Event-sourced engine + Redis + WS ([08](08-scorekeeping-engine.md)) | Phase 2 design spike: Postgres functions vs a Go engine | P2 |
| Verification bonus | — | Captain submit only | Dual-captain matching, disputes | Phase 2 | P2 |
| 9-Ball | — | — | Per-format SL, ball scoring | Phase 2 | P2 |
| IDs | `member_id` TEXT (8 digits assumed), `team_number` APA-style (`03209`) | — | Generated `YYMMNNNN` / `RRVVT` | Decide [Q2/Q3](14-open-questions.md) | P2 |
| Roster rule | One active roster per player (planned index) | — | One per division (R-011) | Change the index when multi-division lands ([Q32](14-open-questions.md)) | P2 |
| Audit | `skill_level_history` only | — | `audit_log` | Phase 2 | P2 |
| Payments | `players.is_paid` flag | — | Fees + MoMo/ZaloPay | Phase 2 | P2 |
| Observability | — | — | Metrics, tracing, Sentry | With GKE | P2 |
| E2E tests | — | — | Playwright two-captain night | Needs dependency approval | P2 |
| Docs drift | `__Host-csrf` in FE `CLAUDE.md`/README; stale auth README (paths, JWT, `hd` check, missing test); CLAUDE.md path `.claude/database.md`; stale `next`-path comment | — | — | Fix in both repos ([Q35](14-open-questions.md)) | P1 |

## 2. Where the original design changed

These are the choices from v0.1 of this design that the repos replaced. The rest of the design now follows the repos.

| Topic | Design v0.1 | Repo decision (now the design) |
|---|---|---|
| Go framework | Gin | `net/http` + gorilla/mux |
| DB access | sqlc + golang-migrate | Raw pgx with the `args []any` convention; no migration tool yet |
| Auth | Zalo OAuth / phone OTP + JWT access/refresh | Google OIDC + PKCE + opaque cookie sessions + CSRF |
| Business rules | Pure Go `pkg/rules` shared with TS | Postgres triggers/functions; TS mirror for preview only |
| Phase 1 scoring | Event-sourced live scoring, offline, verification | Per-match result entry + captain submit |
| Put-up order | Coin flip | Home first on odd matches (coin flip in Phase 2) |
| FE repo | pnpm + Turborepo monorepo (player/admin/public apps) | Single Vite app with role-gated admin routes |
| FE state | Zustand for live scoring | React Query only; a store needs approval in Phase 2 |
| i18n default | Vietnamese | English (vi available) |
| IDs | UUIDv7 | UUID v4; TEXT for users/sessions |
| Domains | `mvip.vn` | `mvip-league.com` (`www.`, `be.`) |
| Errors | RFC 9457 problem+json | `{error:{code,message}}` with 5-digit codes |
| Envelope | Bare JSON | `{session_id, count, data, metadata}` |
| Deploy | GitHub Actions → GKE (Helm) | Tag → Artifact Registry; GKE deploy not built yet |
