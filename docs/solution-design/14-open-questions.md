# 14 — Open Questions and Source-Document Defects

Owner: Product / League Operations. Each item has a **default** that engineering uses until it is answered, so no work is blocked.

## A. Defects found in the Notion sources

| # | Source page | Issue | Default adopted |
|---|---|---|---|
| Q1 ✅ | Score keeper → 8-Ball race chart | Cell **SL6 vs SL4 = `5/6`** contradicts its mirror cell SL4 vs SL6 = `3/5` | **Resolved:** `league-be` `race_chart` and FE `rules.ts` already use **5/3**. Fix the Notion page |
| Q2 | ID Generation Rules → Member ID | Format is 8 chars `xxYYaabb` (4-digit sequence), but the examples show 3 digits (`001`, `042`). Labels are inconsistent (`xx` = year, `YY` = month) | `YYMM` + 4-digit zero-padded sequence → `26110042`; capacity 9,999/month |
| Q3 | ID Generation Rules → Team ID | Region example "for SaiGon, **YY** = {41/(50-59)}" mislabels the field (`XX` is region) and conflicts with Vietnam's 2025 postal codes (HCMC = 70xxx). DEMO and scoresheet team numbers (`03209`, `04306`) follow the APA *division + team* pattern, not region + venue | **Partly decided by the repo:** `teams.team_number` is free TEXT and the seed uses APA-style `03209`. Keep that for the MVP. **Decision needed** before generators are built (Phase 2): APA-style or region + venue |
| Q4 | DEMO → Rack End Rules | Text says "4 rack-completion buttons" but the table lists **6**. `win_reason_code` lists only `MAKE_8, EARLY_8, SCRATCH_8, UNMARKED_POCKET_8` (no BR / 8OB; 8WP named differently) | 6 outcomes: `MAKE_8, BREAK_AND_RUN, EIGHT_ON_BREAK, EARLY_8, SCRATCH_8, WRONG_POCKET_8` |
| Q5 | Dictionary → Double-strike | "within a single league **session**" vs "BR and golden break on the **same night**" | Same night (team match). Confirm |
| Q6 | Score keeper → 9-Ball matrix | Loser SL3 at 12-8: Notion `22-24`, APA flyer `23&24` (leaves 22 unmapped) | `22–24` |
| Q7 | Foundation DB → points rule | Wording "Winning the last match will get the winner another point" is ambiguous (game vs match) | Interpreted per the Score keeper 3-point table (3-0 / 2-0 / 2-1) |
| Q8 | Player profile | Mentions "South Bay APA" and APA trademarks (Equalizer®). Product brand is MViP | Neutral naming in product: "Handicap engine", league names configurable |
| Q9 | DEMO → PLAYERS table | `team_id` on the player implies one team per player, which conflicts with multi-division play | Many-to-many via `team_rosters` |

## B. Rules missing from the sources (need business decisions)

| # | Topic | Question | Default until decided |
|---|---|---|---|
| Q10 | Timeouts | How many per rack, by SL? | 8B/9B: SL ≤ 3 → 2, SL ≥ 4 → 1 (APA) |
| Q11 | Break after rack 1 | Winner breaks or alternate? | Winner breaks |
| Q12 | 9-Ball starting SL / cap | New player SL for 9B? Same 23 cap? | SL 3; cap 23 (per Division Difference table) |
| Q13 | 8-Ball SL thresholds | Mapping from avg effective innings (last 10 wins) → SL 2–7 | Manual SL only in Phase 1; show the metric to the LO |
| Q14 | 9-Ball PPI thresholds and window | PPI → SL 1–9 mapping, number of matches considered | Manual SL in Phase 1–2; window = last 10 matches |
| Q15 | Forfeit points (9-Ball) | Opponent gets 20? 15? | 20 |
| Q16 | Forfeit / no-show timing | Grace period before a slot can be forfeited | 15 min after scheduled start, LO-configurable |
| Q17 | Verification window | How long captains have to verify | 24 h |
| Q18 | One confirm, one silent | Bonus for the confirming team only? | No bonus for either team (FINALIZED_NO_BONUS) |
| Q19 | Standings tie-breakers | Order of tie-breakers | Total points → team matches won → head-to-head → bonus points |
| Q20 | Playoffs | Format, qualification count | Phase 2 design spike |
| Q21 | Master division | Scoring format, race length | Phase 3 design spike |
| Q22 | Shot clock | Is the "7 sec" timer enforced? | Informational only |
| Q23 | Fees | Who collects weekly fees (venue, captain, app)? Refund policy? | Phase 1 manual flag; Phase 2 in-app e-wallet |
| Q24 | Multi-division same night | Allowed in MViP? | Disallowed by default (bylaw flag) |
| Q25 | Roster size | Min/max players per team roster | Min 5, max 8 (APA typical) |
| Q26 | Championship lowest attainable | Definition for the profile stat | Phase 3 with tournaments |
| Q27 | Hosting region / data residency | Is Singapore (`asia-southeast1`) acceptable under PDPD for this business? | Yes, with a cross-border transfer impact assessment |
| Q28 ✅ | Go framework | Gin vs Echo vs Fiber vs chi | **Resolved by the repo:** `net/http` + gorilla/mux (ADR-001) |

## C. Questions raised by the repos (2026-11-10)

| # | Topic | Question | Default until decided |
|---|---|---|---|
| Q29 | Hill definition | Is "on the hill" `race − 1`? (The kickoff prompt's example "4–2 when loser race 5 = 2/1" contradicts it.) | `race − 1`, so matches total 3, 3 or 2 points. Matches the business docs |
| Q30 | Who may submit a night | Home captain only, either captain, or both? | Either captain of the night, or an admin |
| Q31 | Member preview disclosure | How much of a member's identity does `/members/preview` reveal before linking? IDs are guessable | Display name only (e.g. "Thomas D."), SL, team; rate-limited |
| Q32 | Roster uniqueness | The planned index allows **one active roster per player overall**; the business rule allows one per **division** | Keep the stricter index for the single-division MVP; change it in Phase 2 |
| Q33 | `member_id` source | League-assigned (`YYMMNNNN`) or APA-issued? Always 8 digits? | Admin-entered TEXT, 8 digits validated in the FE |
| Q34 | Default language | The FE defaults to `en`; the market is Vietnam | Switch the default to `vi` before the beta, and add a language switcher |

## D. Defects found in the repos

| # | Repo | Issue | Fix |
|---|---|---|---|
| Q35 | both | **Docs drift:** FE `CLAUDE.md`/README say `__Host-csrf`, but the code uses `__Secure-csrf`. The league-be auth README has stale paths (`/api/...`), JWT remnants, `logintx.go`, an `hd`/`ErrDomainNotAllowed` check that doesn't exist, and a missing test. `CLAUDE.md` points to `.claude/database.md` (the real path is `.claude/rules/database.md`). The FE router comment about the stored `next` path is stale (the feature was removed) | Update the docs |
| Q36 | league-be | **League module and `00002` missing** (see [15](15-as-built-vs-target.md)). The seed inserts into the non-existent `team_rosters` | Restore or rebuild (P0) |
| Q37 | league-be | `model/cursor.go` encodes an **int64** id, but every league PK is a UUID | Encode `(created_at, id)` or the UUID string |
| Q38 | league-be | The Dockerfile exposes **9200**; `staging.yaml`/`production.yaml` listen on **5001** | Pick one port; set it in the k8s manifest |
| Q39 | league-be | Swagger shows `UserResponse.id` as an integer (it is a string) | Fix the annotation, run `make swagger` |
| Q40 | league-be | Unused config: YAML `server` timeouts, `logger` (mentions logrus, which isn't a dependency), `domains.allowed_origins`; env `BASE_URL`; stale `FRONTEND_URL` in `.env.example` | Remove, or wire them up |
| Q41 | league-be | `staging.yaml` is identical to `production.yaml` (same hosts and OAuth redirect) | Create real staging hosts |
| Q42 | league-be | `make test` runs `go generate` for mocks, but there are no `//go:generate` directives or mock library | Remove the step or add mocks |
| Q43 | league-fe | The FE MVP plan says the phases are "done", but the FE and BE have never been run together in a browser | Joint integration test before the beta |
