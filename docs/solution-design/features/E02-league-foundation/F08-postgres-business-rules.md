# F8 — Postgres business rules

> [Feature specs](../README.md) › [E02 — League Data Foundation](README.md) › **F8** · Phase 1

| Phase | Status | Rules | Repo refs |
|---|---|---|---|
| 1 | ❌ | R-034/035/036, R-050, R-120, R-125, §5.3 | spec: `plan-2-database-rules-and-seed.md` · mirror: `league-fe/_parked/src/lib/rules.ts` |

## Requirements

| ID | Requirement |
|---|---|
| FR-8.1 | `fn_snapshot_put_up()` BEFORE INSERT/UPDATE on `individual_matches`: when both players are set and `home_skill_level IS NULL`, copy both `players.skill_level` values and look up `race_chart`. Never overwrite |
| FR-8.2 | `fn_score_individual_match()` BEFORE INSERT/UPDATE: derive `status` and points. Raise if games exceed a race or both players reached their race |
| FR-8.3 | `fn_roll_up_team_points()` AFTER INSERT/UPDATE/DELETE: `team_matches.home_points/away_points = Σ` of the 5 rows |
| FR-8.4 | `fn_recompute_player_stats()` (trigger `trg_40_sync_player_stats`): **full recompute** per affected player and division, not a delta |
| FR-8.5 | `put_up_block_reason(team_match_id, side, player_id)` returns `would_break_23 \| already_put_up \| not_on_roster \| side_complete` or NULL. `can_put_up()` is `reason IS NULL` |
| FR-8.6 | `change_skill_level(player_id, new_sl, reason, changed_by)` validates, updates `players.skill_level`, inserts history, and returns the history id |
| FR-8.7 | Views `individual_match_sides`, `player_division_stats` (zeros for unplayed players), `team_standings` (submitted nights only) |
| FR-8.8 | Trigger names are numbered (`trg_10_…`, `trg_20_…`, `trg_40_…`) because Postgres fires same-event triggers in name order |
| FR-8.9 | Functions read `divisions.skill_level_cap`, never a literal 23 |

## Logic: points (`fn_score_individual_match`)

```mermaid
%%{init: {"theme": "base", "themeVariables": {"fontFamily": "Arial", "fontSize": "14px", "primaryColor": "#E8F1FF", "primaryBorderColor": "#1F6FEB", "primaryTextColor": "#0B1F3A", "lineColor": "#5B6B82", "secondaryColor": "#EAF7EF", "tertiaryColor": "#FFF6E5", "actorBkg": "#DCE9FF", "actorTextColor": "#0B1F3A", "actorBorder": "#1F6FEB", "actorLineColor": "#8A9BB3", "signalColor": "#3B4A5E", "signalTextColor": "#0B1F3A", "noteBkgColor": "#FFF6E5", "noteBorderColor": "#E0A100", "noteTextColor": "#3D2E00", "activationBkgColor": "#C7DBFF", "activationBorderColor": "#1F6FEB", "sequenceNumberColor": "#FFFFFF", "labelBoxBkgColor": "#1F6FEB", "labelBoxBorderColor": "#1F6FEB", "labelTextColor": "#FFFFFF", "loopTextColor": "#0B1F3A", "clusterBkg": "#F7F9FC", "clusterBorder": "#C9D3E0", "edgeLabelBackground": "#FFFFFF", "transitionLabelColor": "#0B1F3A", "cScale0": "#1F6FEB", "cScaleLabel0": "#FFFFFF", "cScale1": "#1E8E3E", "cScaleLabel1": "#FFFFFF", "cScale2": "#7E57C2", "cScaleLabel2": "#FFFFFF"}}}%%
flowchart TD
  A["NEW row: home/away games,<br/>home/away race"]:::db --> B{"games > race<br/>on either side?"}
  B -- yes --> E1["RAISE → 400 · 40001"]:::bad
  B -- no --> C{"both reached<br/>their race?"}
  C -- yes --> E1
  C -- no --> D{"either reached<br/>its race?"}
  D -- no --> P["status pending<br/>points 0 / 0"]:::warn
  D -- yes --> W["winner = side at race<br/>loser = other side"]:::api
  W --> F{"loser games = 0"}
  F -- yes --> S30["3 / 0 · shutout"]:::ok
  F -- no --> G{"loser games ≥<br/>loser race − 1"}
  G -- "yes · hill" --> S21["2 / 1"]:::ok
  G -- no --> S20["2 / 0"]:::ok
  classDef fe fill:#E8F1FF,stroke:#1F6FEB,stroke-width:1.5px,color:#0B1F3A
  classDef api fill:#EAF7EF,stroke:#1E8E3E,stroke-width:1.5px,color:#0B2E16
  classDef db fill:#FFF6E5,stroke:#E0A100,stroke-width:1.5px,color:#3D2E00
  classDef ext fill:#F3EDFF,stroke:#7E57C2,stroke-width:1.5px,color:#25124A
  classDef gap fill:#FDECEC,stroke:#D93025,stroke-width:1.5px,color:#5C0B06
  classDef actor fill:#DCE9FF,stroke:#1F6FEB,stroke-width:2px,color:#0B1F3A,font-weight:bold
  classDef ok fill:#EAF7EF,stroke:#1E8E3E,color:#0B2E16
  classDef warn fill:#FFF6E5,stroke:#E0A100,color:#3D2E00
  classDef bad fill:#FDECEC,stroke:#D93025,color:#5C0B06
  classDef start fill:#E8F1FF,stroke:#1F6FEB,color:#0B1F3A
  classDef planned stroke-dasharray:5 4
```

*A match totals 3, 3 or 2 points ([Q29](../../14-open-questions.md)).*

## Logic: put-up block reason

```text
put_up_block_reason(tm, side, player):
  if player not in active team_rosters of tm.<side>_team        → 'not_on_roster'
  if player already in any individual_matches of tm (either side) → 'already_put_up'
  if count(<side>_player_id set in tm) = 5                        → 'side_complete'
  used := Σ snapshot <side>_skill_level of tm rows  (+ live SL of a put-up not yet snapshotted)
  if used + player.skill_level > division.skill_level_cap        → 'would_break_23'
  return NULL
```

> Phase 2 refinement (R-035): also block a pick that leaves the remaining slots impossible to fill within the cap. The MVP checks only the sum including this pick.

## Logic: trigger chain

```mermaid
%%{init: {"theme": "base", "themeVariables": {"fontFamily": "Arial", "fontSize": "14px", "primaryColor": "#E8F1FF", "primaryBorderColor": "#1F6FEB", "primaryTextColor": "#0B1F3A", "lineColor": "#5B6B82", "secondaryColor": "#EAF7EF", "tertiaryColor": "#FFF6E5", "actorBkg": "#DCE9FF", "actorTextColor": "#0B1F3A", "actorBorder": "#1F6FEB", "actorLineColor": "#8A9BB3", "signalColor": "#3B4A5E", "signalTextColor": "#0B1F3A", "noteBkgColor": "#FFF6E5", "noteBorderColor": "#E0A100", "noteTextColor": "#3D2E00", "activationBkgColor": "#C7DBFF", "activationBorderColor": "#1F6FEB", "sequenceNumberColor": "#FFFFFF", "labelBoxBkgColor": "#1F6FEB", "labelBoxBorderColor": "#1F6FEB", "labelTextColor": "#FFFFFF", "loopTextColor": "#0B1F3A", "clusterBkg": "#F7F9FC", "clusterBorder": "#C9D3E0", "edgeLabelBackground": "#FFFFFF", "transitionLabelColor": "#0B1F3A", "cScale0": "#1F6FEB", "cScaleLabel0": "#FFFFFF", "cScale1": "#1E8E3E", "cScaleLabel1": "#FFFFFF", "cScale2": "#7E57C2", "cScaleLabel2": "#FFFFFF"}}}%%
sequenceDiagram
  autonumber
  participant S as service
  participant IM as individual_matches
  participant T10 as trg_10 snapshot
  participant T20 as trg_20 score
  participant RU as roll-up
  participant T40 as trg_40 stats
  rect rgb(247,249,252)
  S->>IM: UPDATE … SET away_player_id
  IM->>T10: BEFORE
  T10-->>IM: home/away skill_level + race filled once
  IM->>T20: BEFORE
  T20-->>IM: status pending, points 0
  S->>IM: PUT result → UPDATE games, innings, DS
  IM->>T20: BEFORE
  T20-->>IM: status complete, points 2/1
  IM->>RU: AFTER
  RU->>RU: team_matches points = Σ rows
  IM->>T40: AFTER
  T40->>T40: recompute players_stats for both players
  end
```

## Edge cases

| ID | Situation | Expected |
|---|---|---|
| EC-8.1 | Admin changes SL 4 → 6 after match 2 was played | Match 2 keeps SL 4 and race; the next put-up uses 6 |
| EC-8.2 | Result corrected from 3–0 to 3–2 | Points recomputed (3/0 → 2/1); roll-up and stats recomputed |
| EC-8.3 | Row deleted by an admin | Roll-up and stats recompute (the AFTER DELETE path) |
| EC-8.4 | `change_skill_level` with SL 9, a blank reason, or the same SL | Raises; nothing changes |
| EC-8.5 | Loser race 2, loser won 1 | Hill → 2/1 |

## Acceptance criteria
- **AC-8.1** 3–0, winner race 3 → `3/0 complete`. 4–3, both race 4 → `2/1`. 4–1, loser race 3 → `2/0`. 5–2, both race 5 → `2/0`.
- **AC-8.2** With 20 SL used and cap 23: SL 6 → `would_break_23`; SL 3 → NULL.
- **AC-8.3** `team_standings` lists all teams at 0 until a night is `submitted`.

---

[← F7](F07-schema-restore.md) · [E02 overview](README.md) · [F9 →](F09-seed-migrate.md)
