# F32 — 9-Ball scoring + per-format SL

> [Feature specs](../README.md) › [E09 — 9-Ball & Handicap](README.md) › **F32** · Phase 2

| Phase | Status | Rules | Repo refs |
|---|---|---|---|
| 2 | 🎯 | R-080–R-085, R-090, R-091 · [04 §6](../../04-domain-rules.md) · [08 §4.2](../../08-scorekeeping-engine.md) | — |

## Requirements

*As a scorekeeper in a 9-Ball division, I tap each ball as it's pocketed. The app keeps both players' points against their SL targets and splits 20 team points correctly at the end.*

| ID | Requirement |
|---|---|
| FR-32.1 | Divisions have `format`. A player has one current SL **per format** (8-Ball 2–7, 9-Ball 1–9); SL history is kept per format |
| FR-32.2 | Targets by SL: 1→14, 2→19, 3→25, 4→31, 5→38, 6→46, 7→55, 8→65, 9→75 |
| FR-32.3 | Live screen: a 9-ball rack grid (balls 1–9). Tapping a ball credits the **active** player: 1 point, or 2 for the 9 (R-080) |
| FR-32.4 | **Dead ball** (`DEAD_BALL {ball}`): balls 1–8 pocketed on a foul count for nobody. The 9 is never dead; on a foul it's re-spotted and nothing is recorded (R-081, R-082) |
| FR-32.5 | A rack closes when the 9 is credited. Unaccounted balls are offered as "mark as dead?" so that points A + points B + dead = 10 (R-085) |
| FR-32.6 | The match ends the moment a player reaches their target; the recorded score is **capped** at the target (R-083) |
| FR-32.7 | Team points: `loserPts = lookup(loserSL, loserScore)` from the 20-point table; `winnerPts = 20 − loserPts`. PA = 20 per match (R-091) |
| FR-32.8 | Accolades: `9OB` (9 on a legal break) and `BR` (R-084); ball points still count |
| FR-32.9 | Innings, DS and time-outs work as in 8-Ball (F27) |
| FR-32.10 | The 23 SL cap and the put-up rules use the 9-Ball SL in 9-Ball divisions |

## Logic

### Ball event reducer

```mermaid
%%{init: {"theme": "base", "themeVariables": {"fontFamily": "Arial", "fontSize": "14px", "primaryColor": "#E8F1FF", "primaryBorderColor": "#1F6FEB", "primaryTextColor": "#0B1F3A", "lineColor": "#5B6B82", "secondaryColor": "#EAF7EF", "tertiaryColor": "#FFF6E5", "actorBkg": "#DCE9FF", "actorTextColor": "#0B1F3A", "actorBorder": "#1F6FEB", "actorLineColor": "#8A9BB3", "signalColor": "#3B4A5E", "signalTextColor": "#0B1F3A", "noteBkgColor": "#FFF6E5", "noteBorderColor": "#E0A100", "noteTextColor": "#3D2E00", "activationBkgColor": "#C7DBFF", "activationBorderColor": "#1F6FEB", "sequenceNumberColor": "#FFFFFF", "labelBoxBkgColor": "#1F6FEB", "labelBoxBorderColor": "#1F6FEB", "labelTextColor": "#FFFFFF", "loopTextColor": "#0B1F3A", "clusterBkg": "#F7F9FC", "clusterBorder": "#C9D3E0", "edgeLabelBackground": "#FFFFFF", "transitionLabelColor": "#0B1F3A", "cScale0": "#1F6FEB", "cScaleLabel0": "#FFFFFF", "cScale1": "#1E8E3E", "cScaleLabel1": "#FFFFFF", "cScale2": "#7E57C2", "cScaleLabel2": "#FFFFFF"}}}%%
flowchart TD
  E(["tap ball b · active p"]):::start --> A{"ball already<br/>accounted for?"}
  A -- yes --> X["reject 40950"]:::bad
  A -- no --> F{"foul?"}
  F -- "yes and b = 9" --> RS["re-spot · record nothing"]:::warn
  F -- "yes and b < 9" --> DB["dead ball · no points"]:::warn
  F -- no --> P["points[p] + 1<br/>or + 2 when b = 9"]:::api
  P --> C["cap at target"]:::api --> T{"target reached?"}
  T -- yes --> M["complete match<br/>20-point split"]:::ok
  T -- no --> N{"b = 9?"}
  N -- yes --> D["mark rest dead?<br/>close rack · open next"]:::fe
  N -- no --> K["continue rack"]:::fe
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

### 20-point split lookup

```text
points9(loserSL, loserScore):
  row = nine_ball_points where loser_sl = loserSL
                           and loserScore between min_score and max_score
  return (20 - row.loser_pts, row.loser_pts)

example: loser SL3 scored 21 → band 20–21 → 13 / 7
```

## Flow

```mermaid
%%{init: {"theme": "base", "themeVariables": {"fontFamily": "Arial", "fontSize": "14px", "primaryColor": "#E8F1FF", "primaryBorderColor": "#1F6FEB", "primaryTextColor": "#0B1F3A", "lineColor": "#5B6B82", "secondaryColor": "#EAF7EF", "tertiaryColor": "#FFF6E5", "actorBkg": "#DCE9FF", "actorTextColor": "#0B1F3A", "actorBorder": "#1F6FEB", "actorLineColor": "#8A9BB3", "signalColor": "#3B4A5E", "signalTextColor": "#0B1F3A", "noteBkgColor": "#FFF6E5", "noteBorderColor": "#E0A100", "noteTextColor": "#3D2E00", "activationBkgColor": "#C7DBFF", "activationBorderColor": "#1F6FEB", "sequenceNumberColor": "#FFFFFF", "labelBoxBkgColor": "#1F6FEB", "labelBoxBorderColor": "#1F6FEB", "labelTextColor": "#FFFFFF", "loopTextColor": "#0B1F3A", "clusterBkg": "#F7F9FC", "clusterBorder": "#C9D3E0", "edgeLabelBackground": "#FFFFFF", "transitionLabelColor": "#0B1F3A", "cScale0": "#1F6FEB", "cScaleLabel0": "#FFFFFF", "cScale1": "#1E8E3E", "cScaleLabel1": "#FFFFFF", "cScale2": "#7E57C2", "cScaleLabel2": "#FFFFFF"}}}%%
sequenceDiagram
  autonumber
  participant S as 👤 Scorekeeper
  participant FE as 📱 LiveScore9Page
  participant API as ⚙️ scoring API
  participant DB as 🗄️ Postgres
  rect rgb(247,249,252)
  Note over S,FE: SL5 Lan (target 38) at 37 vs SL3 Minh (target 25) at 21
  S->>FE: tap 9 (Lan)
  FE->>API: BALL_POCKETED ball 9
  API->>API: 37 + 2 = 39 → capped 38 · target reached
  API->>DB: lookup loser SL3 score 21 → 7
  API->>DB: points Lan 13 · Minh 7 · match complete
  API-->>FE: final card 38/38 vs 21/25 · 13–7
  end
```

## UI

| Element | Detail |
|---|---|
| Ball grid | Nine round buttons (56 px) with standard ball colours and numbers. A pocketed ball shows the scorer's initial; a dead ball is struck through |
| Score bar | `31 / 38` with a progress bar per player and the points still needed |
| Rack close | When the 9 is tapped, a sheet lists unaccounted balls: "Mark 3 and 6 as dead?" |
| Breakdown (R-144) | Points/target per player, e.g. `38/38 – 21/25`, and team points |

## Edge cases

| ID | Situation | Expected |
|---|---|---|
| EC-32.1 | 9 pocketed on a foul | Not dead; re-spot; no points; the rack continues ([08 §8 #4](../../08-scorekeeping-engine.md)) |
| EC-32.2 | Player at 37/38 makes the 9 | Recorded 38, the match ends ([08 §8 #5](../../08-scorekeeping-engine.md)) |
| EC-32.3 | Loser scored 0 | 20/0 |
| EC-32.4 | Player has no 9-Ball SL yet | Put-up blocked with "No 9-Ball skill level"; admin sets one |
| EC-32.5 | Forfeit in 9-Ball | 20/0, no MP (F39b) |

## Acceptance criteria

- **AC-32.1** Given the 20-point table, then every SL row covers `0 … target − 1` with no gaps or overlaps (unit test).
- **AC-32.2** Given a rack where A scores 6, B scores 2 and 2 balls are dead, then the rack is valid (6 + 2 + 2 = 10).
- **AC-32.3** Given loser SL3 with 21 points, then team points are 13–7.

## Open questions

- Time-outs per rack for 9-Ball (R-104 default).
- Is the team SL cap also 23 for 9-Ball?

---

[E09 overview](README.md) · [F33 →](F33-sl-suggestions.md)
