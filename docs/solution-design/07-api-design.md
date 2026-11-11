# 07 — API Design

> 🏗 **Built** = served by `league-be` on `master` today.
> 📐 **Planned MVP** = specified in `league-fe/plans/.../plan-3-league-api-endpoints.md` and already called by `league-fe/src/api/leagueAPI.ts`. The Go code (`internal/league`) **is not in the repo** (see [15](15-as-built-vs-target.md)).
> 🎯 **Target** = later phases.

## 1. Conventions (as-built)

| Topic | Convention | Source |
|---|---|---|
| Base URL | `https://be.mvip-league.com/api/v1` (prod and staging); `http://localhost:9200/api/v1` (dev) | `internal/platform/config/*.yaml` |
| Router | gorilla/mux subrouter `/api/v1` | `internal/platform/router/router.go` |
| Auth | **Cookie session** (`sid`). The browser sends it with `credentials: 'include'` / axios `withCredentials: true`. No bearer tokens | `internal/auth/middleware.go` |
| CSRF | Double-submit. Every non-GET/HEAD/OPTIONS/TRACE request sends header `X-CSRF-Token` = value of the `csrf` cookie | `internal/platform/middleware/csrf.go` |
| CORS | Exactly one origin, `app_base_url.frontend`. Credentials allowed. Headers `Accept`, `Content-Type`, `Origin`, `X-CSRF-Token` | `cmd/server/main.go` |
| No custom headers on GET | Keeps GETs "CORS-simple", so the browser skips the preflight. Adding a header means updating the allow-list in the same commit | plan-3 notes |
| Request bodies | JSON, **camelCase**. `DecodeJSON` caps the body at 1 MiB, **rejects unknown fields**, and requires a single object | `internal/platform/handler/handlers.go` |
| Query params | **snake_case** (`season_id`, `division_id`, `week_no`, `member_id`) | `league-fe/src/api/leagueAPI.ts` |
| Success envelope | `{ "session_id", "count", "data", "metadata" }`. `count` = item count for lists, 1 otherwise | `config.SuccessResponse` |
| Error envelope | `{ "error": { "code": "40401", "message": "…" } }`. The reason slug goes to logs only | `internal/platform/handler/error.go` |
| Pagination | Keyset cursor: default limit 50, max 200, cursor = `base64url("p1:" + id)` | `internal/platform/model/cursor.go` (⚠️ assumes integer ids; see [Q37](14-open-questions.md)) |
| Docs | Swagger 2.0 via swaggo, served at `/swagger/index.html`. Regenerate with `make swagger` | `docs/swagger/` |
| FE types | Today hand-written in `league-fe/src/types/league.ts` (TEMPORARY). Target: generated from swagger with `openapi-typescript` | |

### 1.1 Success envelope example

```json
{
  "session_id": "<session-id>",
  "count": 2,
  "data": [
    { "id": "<season-uuid-1>", "name": "Fall 2026", "isActive": true },
    { "id": "<season-uuid-2>", "name": "Summer 2026", "isActive": false }
  ],
  "metadata": {}
}
```

### 1.2 Error envelope example

```json
{
  "error": {
    "code": "40004",
    "message": "That player can't be put up."
  }
}
```

### 1.3 Error code registry

Codes are 5-digit strings; the first three digits are the HTTP status. **Never renumber or reuse a shipped code.** The FE maps each code to the i18n key `apiError.<code>`.

| Code | Reason | Status | Meaning |
|---|---|---|---|
| 40001 | `VALIDATION_FAILED` | 🏗 | Invalid body or params (also unknown JSON fields) |
| 40002 | — | retired | Was the `app-id` header check. Never reuse |
| 40003 | `UNPAID_MEMBER` | 📐 | Roster add of an unpaid player |
| 40004 | `PUT_UP_REJECTED` | 📐 | `can_put_up()` said no (cap, already played, not on roster, side complete) |
| 40005–40007 | (FE registry) | 📐 | Reserved by the FE registry for league validation. Confirm the meaning when `internal/league` is restored |
| 40101 | `SESSION_COOKIE_ABSENT` | 🏗 | No `sid` cookie |
| 40102 | `SESSION_INVALID` | 🏗 | Session expired, idle or unknown |
| 40103 | `USER_NOT_IN_CONTEXT` | 🏗 | Handler ran without `RequireAuth` |
| 40104 | `UNAUTHENTICATED` | 🏗 | Generic 401 |
| 40301 | `CSRF_COOKIE_ABSENT` | 🏗 | |
| 40302 | `CSRF_TOKEN_MISMATCH` | 🏗 | |
| 40303 | — | retired | Was the `app-id` mismatch. Never reuse |
| 40304 | `FORBIDDEN` | 🏗 | Role or ownership check failed |
| 40401 | `NOT_FOUND` | 🏗 | |
| 42901 | `RATE_LIMITED` | 🏗 code / 🎯 limiter | Code defined, no limiter yet |
| 50001 | `INTERNAL` | 🏗 | Any non-`APIError` failure |
| 50201 | `UPSTREAM_ERROR` | 🏗 | Google or another upstream failed |

## 2. Resource map

| Endpoint | Method | Who | Status |
|---|---|---|---|
| `/api/v1`, `/api/v1/health` | GET | public | 🏗 Liveness only (`{ok, env, image}`), no DB check |
| `/auth/google/login` | GET | public | 🏗 302 to Google (PKCE + state + nonce) |
| `/auth/google/callback` | GET | Google redirect | 🏗 Sets `sid` + `csrf`; 302 to the FE (`/onboarding` for new users) |
| `/auth/logout` | POST | any (CSRF) | 🏗 204; clears cookies |
| `/me` | GET | session | 🏗 `{user:{id,email,name,avatarUrl}}`. 📐 adds `role` (ADMIN > CAPTAIN > PLAYER from `users_roles`) and `playerId` |
| `/members/preview?member_id=` | GET | session | 📐 Onboarding: what the server reveals about a member before claiming (`MemberPreview`) |
| `/me/link` | POST | session (CSRF) | 📐 Link the signed-in user to a `players` row |
| `/seasons` | GET | session | 📐 Session select |
| `/divisions?season_id=` | GET | session | 📐 |
| `/team-matches?division_id=&week_no=` | GET | session | 📐 Fixture cards. `week_no` is optional; the FE derives week chips |
| `/team-matches/{id}` | GET | session | 📐 One night: both rosters (`player_division_stats`), 5 matches, `viewerCanManage`, `viewerSide` |
| `/team-matches/{id}/available?side=&match_order=` | GET | captain/admin | 📐 Put-up list with `canPutUp` + `blockReason` |
| `/team-matches/{id}/put-up` | POST | captain (own night)/admin | 📐 Re-checks `can_put_up()`; 400 `40004` if blocked |
| `/individual-matches/{id}/result` | PUT | captain (own night)/admin | 📐 Triggers compute the points; returns the row |
| `/team-matches/{id}/submit` | POST | captain (own night)/admin | 📐 `status = submitted`; refused if incomplete |
| `/teams?division_id=` | GET | admin | 📐 For the transfer control |
| `/teams/{id}/roster` | POST | captain/admin | 📐 Add an existing **paid** member; unpaid → `40003` |
| `/players?q=` | GET | admin | 📐 Search by name or `member_id` (`LIKE` input escaped) |
| `/players/{id}/skill-level` | POST | admin | 📐 Calls `change_skill_level()` |
| `/players/{id}/skill-level-history` | GET | admin | 📐 |
| `/team-matches/{id}/events`, `/live`, `/lease`, `/summary`, `/verifications` | — | — | 🎯 Phase 2 live scoring and verification ([08](08-scorekeeping-engine.md)) |
| `/standings?division_id=` | GET | public | 🎯 Over the `team_standings` view |
| `/players/{id}/stats` | GET | session | 🎯 Profile Stats tab |
| `/fees`, `/payments/webhooks/{provider}` | — | — | 🎯 Phase 2 |
| `/tournaments/*` | — | — | 🎯 Phase 3 |
| `/ws` | WS | — | 🎯 Phase 2 |

**Authorization rule (📐):** "captain owns this night" means the user's role is CAPTAIN **and** `players.user_id` is the `captain_player_id` of the home or away team of that team match. It is implemented once as a helper and reused for put-up, result and submit. The server returns the answer as `viewerCanManage` / `viewerSide`, so the UI never re-derives it.

## 3. 📐 Critical MVP flows: request/response examples

### 3.1 `GET /api/v1/me`

```json
{
  "session_id": "<session-id>",
  "count": 1,
  "data": {
    "user": {
      "id": "<user-uuid>",
      "email": "captain@example.com",
      "name": "Thomas Dinh",
      "avatarUrl": "https://lh3.googleusercontent.com/<path>",
      "role": "CAPTAIN",
      "playerId": "<player-uuid>"
    }
  },
  "metadata": {}
}
```

`playerId: null` means the account isn't linked to a member yet, and the FE sends the user to `/onboarding`. `role` and `playerId` are 📐; the as-built `/me` returns only `id`, `email`, `name` and `avatarUrl`.

### 3.2 `GET /api/v1/team-matches/{id}/available?side=home&match_order=2`

```json
{
  "session_id": "<session-id>",
  "count": 3,
  "data": [
    {
      "playerId": "<player-uuid-1>",
      "memberId": "95007620",
      "fullName": "Somya Shah",
      "skillLevel": 5,
      "canPutUp": false,
      "blockReason": "already_put_up"
    },
    {
      "playerId": "<player-uuid-2>",
      "memberId": "95007633",
      "fullName": "Rip Wheeler",
      "skillLevel": 6,
      "canPutUp": false,
      "blockReason": "would_break_23"
    },
    {
      "playerId": "<player-uuid-3>",
      "memberId": "95007641",
      "fullName": "Bing Brennan",
      "skillLevel": 3,
      "canPutUp": true,
      "blockReason": null
    }
  ],
  "metadata": {}
}
```

### 3.3 `POST /api/v1/team-matches/{id}/put-up`

Request (header `X-CSRF-Token`):
```json
{
  "matchOrder": 2,
  "side": "home",
  "playerId": "<player-uuid-3>"
}
```

When both sides are up, the response is the `individual_matches` row with its snapshots filled in by `fn_snapshot_put_up`:
```json
{
  "session_id": "<session-id>",
  "count": 1,
  "data": {
    "id": "<individual-match-uuid>",
    "matchOrder": 2,
    "firstPutUp": "away",
    "status": "pending",
    "homePlayerId": "<player-uuid-3>",
    "awayPlayerId": "<player-uuid-9>",
    "homeSkillLevel": 3,
    "awaySkillLevel": 5,
    "homeRace": 2,
    "awayRace": 4,
    "homeGames": 0,
    "awayGames": 0,
    "innings": null,
    "homeDefShots": 0,
    "awayDefShots": 0,
    "homePoints": 0,
    "awayPoints": 0
  },
  "metadata": {}
}
```

A blocked player returns `400` with `{"error":{"code":"40004", …}}`, even if the GET said they were available, because another captain may have acted in the meantime.

### 3.4 `PUT /api/v1/individual-matches/{id}/result`

Request:
```json
{
  "homeGames": 2,
  "awayGames": 3,
  "innings": 21,
  "homeDefShots": 1,
  "awayDefShots": 0
}
```

Response: the row with points computed by `fn_score_individual_match`. Home (SL3, race 2) reached 2/2 and **wins**. Away (SL5, race 4) finished 3/4, which is on the hill (4 − 1 = 3), so the points are **2/1**:
```json
{
  "session_id": "<session-id>",
  "count": 1,
  "data": {
    "id": "<individual-match-uuid>",
    "status": "complete",
    "homeRace": 2,
    "awayRace": 4,
    "homeGames": 2,
    "awayGames": 3,
    "homePoints": 2,
    "awayPoints": 1
  },
  "metadata": {}
}
```

Games above a race, or both players at their race, are rejected by the trigger → `400 40001`.

### 3.5 `POST /api/v1/players/{id}/skill-level` (admin)

```json
{
  "newSkillLevel": 4,
  "reason": "Promoted after review"
}
```

This returns the new `skill_level_history` row. A played match keeps its snapshot; the new SL applies from the next put-up.

### 3.6 `POST /api/v1/team-matches/{id}/submit`

No body. The response is the team match with `"status": "submitted"`, `submittedAt` and the final `homePoints` / `awayPoints`. The request is refused (`400 40001`) unless all 5 individual matches are `complete`.

## 4. 🎯 Phase 2: live scoring API

The event-batch API, the scoring lease, the verification snapshot and the WebSocket channels are specified in [08 — Scorekeeping engine](08-scorekeeping-engine.md). When they are built they must follow the conventions in §1:
- camelCase bodies.
- The repo envelopes.
- 5-digit error codes allocated from the next free number per status.
- CSRF on writes.

The idempotency key is carried **in the body** (per event), not as a custom header, to keep the CORS allow-list small.

## 5. Rate limits (🎯)

There is no limiter today; only code `42901` exists. Target limits:

| Scope | Limit |
|---|---|
| `/auth/google/*` | 10 / IP / min |
| Writes | 60 / user / min, burst 120 |
| Public reads | Cached at Cloudflare (standings 60 s, schedule 300 s) |
