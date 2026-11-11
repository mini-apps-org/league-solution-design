# E12 — Growth

> [Feature specs](../README.md) › **E12**

| | |
|---|---|
| **Goal** | Grow from one league to many: more formats and divisions, tournaments, venue and sponsor value, and protection of the handicap system |
| **Phase** | 3 (outline level: requirements, key rules, one diagram, open questions; no acceptance criteria yet) |
| **Status** | 🎯 Not started. Each item needs a discovery pass before it gets a full spec |
| **Actors** | League Operator (LO), Venue owner, Sponsor, Player, Admin |
| **Related** | [03 scope & phases](../../03-scope-and-phases.md) · [04 §1, §10, §12](../../04-domain-rules.md) · [14 open questions](../../14-open-questions.md) |

## Features by phase

### Phase 1–2

Nothing. Phase 1–2 decisions that keep these doors open: UUID keys everywhere, `format` on divisions (F32), the event log (E07), the outbox (F42), and RBAC tables (F6).

### Phase 3

| # | Feature | Depends on | Status |
|---|---|---|---|
| F47 | [Master division](F47-master-division.md) | F32 | 🎯 |
| F48 | [Tournaments & brackets](F48-tournaments.md) | E07, F54 | 🎯 |
| F49 | [Sandbagging detection](F49-sandbagging-detection.md) | E07, F33 | 🎯 |
| F50 | [Multi-league & LO roles](F50-multi-league.md) | F6 | 🎯 |
| F51 | [Sponsor placements](F51-sponsors.md) | F35 | 🎯 |
| F52 | [10-Ball & 3-Cushion Carom](F52-ten-ball-carom.md) | F32, E07 | 🎯 |
| F53 | [Venue dashboard](F53-venue-dashboard.md) | F50, F36 | 🎯 |
| F54 | [Championship qualification tracking](F54-championship-qualification.md) | F35, F34 | 🎯 |

## Phase 3 deep dive

### How Phase 3 builds on earlier phases

```mermaid
%%{init: {"theme": "base", "themeVariables": {"fontFamily": "Arial", "fontSize": "14px", "primaryColor": "#E8F1FF", "primaryBorderColor": "#1F6FEB", "primaryTextColor": "#0B1F3A", "lineColor": "#5B6B82", "secondaryColor": "#EAF7EF", "tertiaryColor": "#FFF6E5", "actorBkg": "#DCE9FF", "actorTextColor": "#0B1F3A", "actorBorder": "#1F6FEB", "actorLineColor": "#8A9BB3", "signalColor": "#3B4A5E", "signalTextColor": "#0B1F3A", "noteBkgColor": "#FFF6E5", "noteBorderColor": "#E0A100", "noteTextColor": "#3D2E00", "activationBkgColor": "#C7DBFF", "activationBorderColor": "#1F6FEB", "sequenceNumberColor": "#FFFFFF", "labelBoxBkgColor": "#1F6FEB", "labelBoxBorderColor": "#1F6FEB", "labelTextColor": "#FFFFFF", "loopTextColor": "#0B1F3A", "clusterBkg": "#F7F9FC", "clusterBorder": "#C9D3E0", "edgeLabelBackground": "#FFFFFF", "transitionLabelColor": "#0B1F3A", "cScale0": "#1F6FEB", "cScaleLabel0": "#FFFFFF", "cScale1": "#1E8E3E", "cScaleLabel1": "#FFFFFF", "cScale2": "#7E57C2", "cScaleLabel2": "#FFFFFF"}}}%%
flowchart LR
  subgraph BASE["Phase 1–2 foundations"]
    direction TB
    EV["<b>event log</b><br/>E07"]:::api
    FMT["<b>division format</b><br/>F32"]:::api
    SLS["<b>SL suggestions</b><br/>F33"]:::api
    RB["<b>RBAC</b><br/>F6"]:::api
    ST["<b>standings · profile</b><br/>E10"]:::api
    PAY["<b>payments</b><br/>F36"]:::api
  end
  subgraph P3["Phase 3"]
    direction TB
    F47["F47 Master"]:::fe
    F52["F52 10-Ball · Carom"]:::fe
    F49["F49 Sandbagging"]:::fe
    F50["F50 Multi-league"]:::fe
    F53["F53 Venue dashboard"]:::fe
    F51["F51 Sponsors"]:::fe
    F54["F54 Qualification"]:::fe
    F48["F48 Tournaments"]:::fe
  end
  FMT --> F47
  FMT --> F52
  EV --> F52
  EV --> F49
  SLS --> F49
  RB --> F50 --> F53
  PAY --> F53
  ST --> F51
  ST --> F54 --> F48
  EV --> F48
  class F47,F52,F49,F50,F53,F51,F54,F48 planned
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

*Suggested order: F50 first (it changes tenancy for everything else), then F54 → F48, then the rest as the business asks.*

### Cross-cutting changes

| Change | Why |
|---|---|
| `league_id` on every top-level table + row-level filter in every query | Multi-league (F50) |
| Formats become data: `formats (code, scoring_kind, sl_range, rules jsonb)` | New games (F52) without schema changes |
| `tournaments`, `brackets`, `bracket_slots` | F48 |
| `anomaly_flags` review queue | F49 |
| `placements` + impression counters | F51 |
