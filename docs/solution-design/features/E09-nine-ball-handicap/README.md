# E09 — 9-Ball & Handicap

> [Feature specs](../README.md) › **E09**

| | |
|---|---|
| **Goal** | Run 9-Ball divisions with point-based scoring and the 20-point split, and keep every player's skill level honest with data-driven suggestions |
| **Phase** | 2 |
| **Status** | 🎯 Not started. Phase 1 is 8-Ball only, with manual SL changes ([E05-F18](../E05-roster-admin/F18-skill-level-change.md)) |
| **Actors** | Scorekeeper, Captains, Admin |
| **Related** | [04 §6, §10](../../04-domain-rules.md) · [08 §4.2](../../08-scorekeeping-engine.md) · [appendix rule tables](../../appendix-rule-tables.md) |

## Features by phase

### Phase 1

Nothing. `divisions.format` is `8_ball` only; SL is one number per player.

### Phase 2

| # | Feature | Status |
|---|---|---|
| F32 | [9-Ball scoring + per-format SL](F32-nine-ball-scoring.md) | 🎯 |
| F33 | [Skill-level suggestions](F33-sl-suggestions.md) | 🎯 |

## Phase 2 deep dive

### 8-Ball vs 9-Ball at a glance

| | 8-Ball (Phase 1) | 9-Ball (F32) |
|---|---|---|
| SL range | 2–7 | 1–9 |
| Match goal | Race in games (race chart) | Target in points (14…75 by SL) |
| Rack | Win or lose the rack | Balls 1–8 = 1 point, 9 = 2 points, 10 per rack |
| Team points per match | 3/0 · 2/1 · 2/0 | 20-point split from the loser's SL and score |
| Max per night | 15 + 1 bonus | 100 + 10 bonus |
| Team SL cap | 23 | 23 (bylaw) |
| SL basis (F33) | Effective innings per won game, last 10 wins | Points per inning (PPI), last 10 matches |

### Components

```mermaid
%%{init: {"theme": "base", "themeVariables": {"fontFamily": "Arial", "fontSize": "14px", "primaryColor": "#E8F1FF", "primaryBorderColor": "#1F6FEB", "primaryTextColor": "#0B1F3A", "lineColor": "#5B6B82", "secondaryColor": "#EAF7EF", "tertiaryColor": "#FFF6E5", "actorBkg": "#DCE9FF", "actorTextColor": "#0B1F3A", "actorBorder": "#1F6FEB", "actorLineColor": "#8A9BB3", "signalColor": "#3B4A5E", "signalTextColor": "#0B1F3A", "noteBkgColor": "#FFF6E5", "noteBorderColor": "#E0A100", "noteTextColor": "#3D2E00", "activationBkgColor": "#C7DBFF", "activationBorderColor": "#1F6FEB", "sequenceNumberColor": "#FFFFFF", "labelBoxBkgColor": "#1F6FEB", "labelBoxBorderColor": "#1F6FEB", "labelTextColor": "#FFFFFF", "loopTextColor": "#0B1F3A", "clusterBkg": "#F7F9FC", "clusterBorder": "#C9D3E0", "edgeLabelBackground": "#FFFFFF", "transitionLabelColor": "#0B1F3A", "cScale0": "#1F6FEB", "cScaleLabel0": "#FFFFFF", "cScale1": "#1E8E3E", "cScaleLabel1": "#FFFFFF", "cScale2": "#7E57C2", "cScaleLabel2": "#FFFFFF"}}}%%
flowchart LR
  subgraph FE["📱 league-fe"]
    direction TB
    LS9["<b>LiveScore9Page</b><br/>ball rack · dead balls"]:::fe
    R9["<b>reducer9.ts</b>"]:::fe
    SLQ["<b>Admin › SL review</b><br/>suggestions queue"]:::fe
  end
  subgraph BE["⚙️ league-be"]
    direction TB
    EV["POST /events<br/>BALL_POCKETED · DEAD_BALL"]:::api
    G9["<b>reducer9.go</b>"]:::api
    SUG["<b>worker</b><br/>SL suggestion job"]:::api
    AP["POST /sl-suggestions/{id}:apply"]:::api
  end
  subgraph DB["🗄️ Postgres"]
    direction TB
    PSL[("<b>player_skill_levels</b><br/>+ format")]:::db
    T20[("<b>nine_ball_points</b><br/>20-point split table")]:::db
    SS[("<b>sl_suggestions</b>")]:::db
  end
  LS9 --> R9
  LS9 ==> EV ==> G9 --> T20
  G9 --> PSL
  SUG --> SS
  SLQ ==> AP --> PSL
  AP --> SS
  class LS9,R9,SLQ,EV,G9,SUG,AP,T20,SS planned
  class PSL db
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

### Data delta

| Object | Change |
|---|---|
| `divisions.format` | `8_ball` · `9_ball` |
| `player_skill_levels` | + `format`; current SL is per `(player_id, format)` |
| `individual_matches` | + `target_home`, `target_away`, `points_scored_home/away` (9-Ball) |
| `nine_ball_targets (sl, target)`, `nine_ball_points (loser_sl, min_score, max_score, loser_pts)` | Seeded reference tables, tested for contiguity |
| `racks` | + `balls jsonb`, `dead_balls int` (9-Ball) |
| `sl_suggestions (id, player_id, format, current_sl, suggested_sl, basis jsonb, status, decided_by, decided_at)` | F33 |
