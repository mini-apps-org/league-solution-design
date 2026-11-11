# F52 — 10-Ball & 3-Cushion Carom

> [Feature specs](../README.md) › [E12 — Growth](README.md) › **F52** · Phase 3

| Phase | Status | Rules |
|---|---|---|
| 3 | 🎯 outline | [04 §2](../../04-domain-rules.md) |

## Requirements

| ID | Requirement |
|---|---|
| FR-52.1 | **10-Ball:** a call-shot game played as a race (like 8-Ball). Rack outcomes include legal 10, 10 on a foul (re-spot), break-and-run. Its own race chart and SL range |
| FR-52.2 | **3-Cushion Carom** (popular in Vietnam): points per carom, match to a target per handicap, innings limit; the average (points ÷ innings) is the skill metric |
| FR-52.3 | Formats are data: each format declares its scoring kind (`race`, `points_target`, `carom`), event types and reducer |
| FR-52.4 | The live engine (E07) loads the reducer by format; the TS and Go reducers share fixtures as for 8- and 9-Ball |

## Key rules and assumptions

- Carom doesn't fit the pool "rack" model: a match is a sequence of innings with points, so it gets its own reducer and UI.
- Handicap tables must come from the league.

## Diagram

```mermaid
%%{init: {"theme": "base", "themeVariables": {"fontFamily": "Arial", "fontSize": "14px", "primaryColor": "#E8F1FF", "primaryBorderColor": "#1F6FEB", "primaryTextColor": "#0B1F3A", "lineColor": "#5B6B82", "secondaryColor": "#EAF7EF", "tertiaryColor": "#FFF6E5", "actorBkg": "#DCE9FF", "actorTextColor": "#0B1F3A", "actorBorder": "#1F6FEB", "actorLineColor": "#8A9BB3", "signalColor": "#3B4A5E", "signalTextColor": "#0B1F3A", "noteBkgColor": "#FFF6E5", "noteBorderColor": "#E0A100", "noteTextColor": "#3D2E00", "activationBkgColor": "#C7DBFF", "activationBorderColor": "#1F6FEB", "sequenceNumberColor": "#FFFFFF", "labelBoxBkgColor": "#1F6FEB", "labelBoxBorderColor": "#1F6FEB", "labelTextColor": "#FFFFFF", "loopTextColor": "#0B1F3A", "clusterBkg": "#F7F9FC", "clusterBorder": "#C9D3E0", "edgeLabelBackground": "#FFFFFF", "transitionLabelColor": "#0B1F3A", "cScale0": "#1F6FEB", "cScaleLabel0": "#FFFFFF", "cScale1": "#1E8E3E", "cScaleLabel1": "#FFFFFF", "cScale2": "#7E57C2", "cScaleLabel2": "#FFFFFF"}}}%%
flowchart LR
  E(["event"]):::start --> F{"division format"}
  F -- "8-Ball · 10-Ball" --> R1["race reducer<br/>racks won"]:::api
  F -- "9-Ball" --> R2["points-target reducer<br/>ball points"]:::api
  F -- "carom" --> R3["carom reducer<br/>points per inning"]:::api
  R1 --> P[("projections")]:::db
  R2 --> P
  R3 --> P
  class R3 planned
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

## Open questions

- Is Carom in scope for this league, or a separate product? Which 10-Ball race chart?

---

[← F51](F51-sponsors.md) · [E12 overview](README.md) · [F53 →](F53-venue-dashboard.md)
