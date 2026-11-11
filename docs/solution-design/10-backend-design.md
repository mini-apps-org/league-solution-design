# 10 — Backend Design (league-be)

Repo: `league-be` (GitHub `mini-apps-org/league-be`), module `github.com/nguyentanvinh/league-be`. Tags 0.1.0–0.2.10.

> 🏗 as-built · 📐 planned MVP (plan-2/plan-3, not in the repo) · 🎯 target

## 1. Stack (🏗)

| Concern | Choice | Notes |
|---|---|---|
| Language | **Go 1.26** | `go.mod` |
| HTTP | Standard `net/http` + **gorilla/mux 1.8** | Subrouters per area |
| DB | **pgx/v5 `pgxpool`, raw SQL** | `pgx.CollectOneRow` + `RowToStructByName`. No ORM, no sqlc |
| Auth | `coreos/go-oidc/v3` + `golang.org/x/oauth2` | Google OIDC, PKCE |
| CORS | `rs/cors` | Single origin |
| Config | `spf13/viper`, embedded YAML per env + env vars | `internal/platform/config` |
| API docs | `swaggo/swag` + `http-swagger` | `make swagger` |
| Crypto | stdlib AES-256-GCM | `internal/secret` |
| Logging | stdlib `log` | 🎯 `log/slog` JSON + request ID |
| Migrations | Hand-applied numbered SQL | 📐 `make migrate` / `make seed` |
| Cache / realtime | — | 🎯 Redis (Memorystore) for live scoring in Phase 2 |

## 2. Layout

```text
league-be/
├─ cmd/server/main.go               # config → pgxpool → router → CORS → http.Server, graceful shutdown (10 s)
├─ internal/
│  ├─ auth/                         # 🏗 Google sign-in, sessions, cookies, RequireAuth
│  │  ├─ handlers.go  handlers_cookie.go  middleware.go
│  │  ├─ services.go  services_google.go  login_transaction.go  cleanup.go
│  │  ├─ repositories.go  models.go  model_handlers.go  model_services.go
│  │  └─ README.md  handlers_cookie_test.go
│  ├─ league/                       # 📐 plan-3: models, model_handlers, repositories, services, handlers
│  ├─ platform/
│  │  ├─ config/   config.go model.go globals.go {development,staging,production}.yaml
│  │  ├─ db/       db.go (pgxpool Connect)
│  │  ├─ handler/  handlers.go (JSON helpers, DecodeJSON), error.go (code registry)
│  │  ├─ middleware/ csrf.go security_headers.go
│  │  ├─ model/    cursor.go model.go (keyset pagination)
│  │  └─ router/   router.go auth.go health.go (📐 league.go) router_test.go
│  └─ secret/secret.go              # AES-256-GCM Box
├─ db/migrations/00001_init.sql  seeds/20261106_seed.sql   (📐 00002_business_rules.sql)
├─ docs/swagger/
├─ Dockerfile  Makefile  .air.toml
└─ .github/workflows/ci.yaml release.yaml
```

Dependency direction: `router → <module> → platform/{db,config,handler}`, and `auth → secret`.

## 3. Layering and file conventions

```text
handlers.go      HTTP only: decode, validate, call service, encode envelope / APIError
services.go      business decisions, authorization, transactions; maps repo sentinels → API codes
repositories.go  SQL only; returns models or sentinels (ErrNoUser, ErrNoSession…)
models.go        DB row structs
model_handlers.go  JSON request/response shapes (camelCase)
model_services.go  service-boundary types
```

`Service`, `Repository` and `IdentityProvider` are interfaces, so they can be faked in tests. `*secret.Box` is concrete on purpose.

### 3.1 Repository rules (`.claude/rules/database.md`)

1. **Query shape.** Each query function declares `const query`, then a named `args := []any{…}` with one argument per line in placeholder order, then calls with `args...`. This applies even with a single argument. With more than 2 arguments, annotate each with its `$n` and column.
2. **Values are placeholders only.** `fmt.Sprintf` may shape the query, never inject values. Dynamic filters use an `add(clause, value)` helper that numbers placeholders from `len(args)`. `LIKE` input escapes `\ % _`.
3. **Errors** are wrapped as `"<package>: <operation>: %w"`. Never log credentials or request bodies.
4. **No rows.** `pgx.ErrNoRows` becomes a package sentinel, and the service maps it to `40401`. Writes check `RowsAffected() == 0`.
5. **Row mapping** prefers `RowToStructByName`. Explicit `Scan` lists must match the column order.
6. **Context.** `ctx` is the first parameter. `context.Background()` is allowed only where there is no request (the cleanup sweep).
7. **Lists** are bounded with keyset paging (`WHERE id > $1 ORDER BY id LIMIT $2`, fetching limit+1 as a lookahead) and call `model.CursorParams.Normalise()`.
8. **Rows** always get `defer rows.Close()` and a `rows.Err()` check. Start lists with `out := []T{}` so an empty result encodes `[]`, not `null`.

Example in the house style:
```go
func (r *repo) PlayerByMemberID(ctx context.Context, memberID string) (Player, error) {
	const query = `
		SELECT id, member_id, full_name, skill_level, is_paid
		FROM players
		WHERE member_id = $1`
	args := []any{
		memberID,
	}
	p, err := queryOne[Player](ctx, r.db, query, args...)
	if errors.Is(err, pgx.ErrNoRows) {
		return Player{}, ErrNoPlayer
	}
	if err != nil {
		return Player{}, fmt.Errorf("league: player by member id: %w", err)
	}
	return p, nil
}
```

## 4. Platform services (🏗)

| Piece | Behavior |
|---|---|
| `handler.DecodeJSON` | 1 MiB limit, `DisallowUnknownFields`, exactly one JSON object |
| `handler.Error(code, cause)` | Builds an `*APIError`. The log line has method, path, status, code, reason and cause; the client gets `{error:{code,message}}` |
| `config.SuccessResponse` | `{session_id, count, data, metadata}` |
| `middleware.CSRF` | Double-submit check on unsafe methods for the whole `/api/v1` subrouter |
| `middleware.SecurityHeaders` | `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, `COOP: same-origin`, CSP `default-src 'none'; frame-ancestors 'none'` (not on `/swagger/`), HSTS in production |
| `model.CursorParams` | Default 50, max 200, `base64url("p1:"+id)` |
| `secret.Box` | `base64url(version ‖ nonce ‖ ciphertext)` with AAD domain separation; `ENCRYPTION_KEY_VERSION` 1..255. Seals `oauth_tx`. Planned to seal stored API keys |
| `auth.StartSessionCleanup` | Sweeps expired sessions at startup, then every 24 h |
| Server timeouts | Hardcoded in `main.go`: ReadHeader 10 s, Read 15 s, Write 90 s, Idle 120 s. The YAML `server` block is unused |

## 5. Configuration

`config.Load()` reads the embedded `{APP_ENV}.yaml` (`development` by default), then applies environment variables.

| Env var | Meaning / default |
|---|---|
| `APP_ENV` | `development` \| `staging` \| `production`. Only `production` turns on Secure cookies, `__Host-`/`__Secure-` prefixes, cookie Domain and HSTS |
| `PORT` | Overrides YAML (dev 9200, staging/prod 5001; the Dockerfile exposes 9200) |
| `DATABASE_URL` or `DB_HOST` / `DB_PORT` / `DB_USER` / `DB_PASSWORD` / `DB_NAME` / `DB_SSLMODE` | Postgres |
| `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET` | Required |
| `SESSION_TTL` (12h), `SESSION_IDLE_TTL` (30m) | Startup fails if idle > absolute |
| `ENCRYPTION_KEY` (base64, 32 bytes), `ENCRYPTION_KEY_VERSION` (1) | Required for `secret.Box` |
| `ENV_IMAGE` | Overrides the image tag stamped at build (shown by `/health`) |
| `BASE_URL`, `FRONTEND_URL` | ⚠️ `BASE_URL` is read but unused. `FRONTEND_URL` is no longer read (replaced by YAML `app_base_url.frontend`) but is still in `.env.example` and the FE README |

YAML-only values:
- `auth.google_oauth_redirect_url`: `https://be.mvip-league.com/api/v1/auth/google/callback` in staging and prod.
- `app_base_url.frontend`: `https://www.mvip-league.com`.
- DB pool: max 20 / min 4 in prod, 10 / 2 in dev.

`staging.yaml` and `production.yaml` are currently identical.

## 6. 📐 Planned `internal/league` module (restore per plan-3)

| File | Contents |
|---|---|
| `models.go` | Row structs: Season, Division, TeamMatch, IndividualMatch, RosterPlayer, AvailablePlayer, Player, SkillLevelChange |
| `model_handlers.go` | camelCase request/response shapes (match `league-fe/src/types/league.ts`) |
| `repositories.go` | SQL over tables, the views `player_division_stats` and `team_standings`, and the functions `can_put_up()`, `put_up_block_reason()` and `change_skill_level()` |
| `services.go` | Role checks; the **captain-owns-this-night** helper; mapping `PUT_UP_REJECTED`/`UNPAID_MEMBER`; submit-only-when-complete |
| `handlers.go` + `router/league.go` | The 13 routes in [07 §2](07-api-design.md#2-resource-map), with `RequireAuth` + a role middleware per route |
| `league_integration_test.go` | Runs against a seeded DB (`LEAGUE_TEST_DATABASE_URL`) |

The `/me` update adds `role` (ADMIN > CAPTAIN > PLAYER precedence from `users_roles`; no row → PLAYER) and `playerId`.

**The business rules are not in Go.** Services call the Postgres functions and trust the trigger results (decision ADR-004). Go only enforces *who* may act, not *what* the score is.

## 7. 🎯 Phase 2 additions

| Addition | Purpose |
|---|---|
| `internal/scoring` + Redis | Event log, lease, live snapshot, pub/sub, WebSocket hub ([08](08-scorekeeping-engine.md)). Scoring still finishes in the Postgres functions, or moves to a pure Go engine shared with TS if live scoring needs per-event validation (ADR-004 revisit) |
| Outbox table + worker (`cmd/worker`) | Notifications, fees, SL suggestions after submit |
| `log/slog` JSON + request ID middleware | `ContextKeyRequestID` already exists but is unused |
| Rate limiter (`42901`) | Redis token bucket |
| `/readyz` with a DB ping | Today `/health` is liveness only |
| Migration runner | `golang-migrate` or `goose`, run as a k8s Job before rollout |

## 8. Testing (🏗 / 📐)

| Level | Today | Target |
|---|---|---|
| Unit | `handlers_cookie_test.go` (cookie names, prefixes, paths, domain, CSRF read), `config/model_test.go`, `router/router_test.go` | Service tests with fake repositories |
| SQL rules | — | 📐 Integration test against a seeded Postgres: snapshot, points (3/0, 2/1, 2/0), roll-up, `can_put_up` reasons, `change_skill_level`, stats |
| CI | golangci-lint, `gofmt` check, `go test -race ./...`, `go build ./...` | Add `govulncheck`, swagger drift check |
