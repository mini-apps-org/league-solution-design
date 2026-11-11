# F39a — Bye and No-Play weeks

> [Feature specs](../README.md) › [E03 — Schedule & Night View](README.md) › **F39a** · Phase 2

| Phase | Status | Rules |
|---|---|---|
| 2 | 🎯 | R-004, R-142 |

## Requirements

| ID | Requirement |
|---|---|
| FR-39a.1 | Add a `schedule_weeks` table (`division_id`, `week_no`, `play_date`, `kind REGULAR\|NO_PLAY\|PLAYOFF`) |
| FR-39a.2 | Allow `team_matches.away_team_id NULL` meaning **BYE** for the home team; a CHECK keeps `status = 'bye'` consistent |
| FR-39a.3 | Schedule renders Bye and No-Play as neutral, **non-clickable** banners ("Bye · 03207", "No play · public holiday") |
| FR-39a.4 | Standings: a bye counts as neither win nor loss (policy decision; default: no points) |
| FR-39a.5 | An admin schedule generator: round-robin with automatic byes for odd team counts |

## Logic: round-robin with bye

```mermaid
%%{init: {"theme": "base", "themeVariables": {"fontFamily": "Arial", "fontSize": "14px", "primaryColor": "#E8F1FF", "primaryBorderColor": "#1F6FEB", "primaryTextColor": "#0B1F3A", "lineColor": "#5B6B82", "secondaryColor": "#EAF7EF", "tertiaryColor": "#FFF6E5", "actorBkg": "#DCE9FF", "actorTextColor": "#0B1F3A", "actorBorder": "#1F6FEB", "actorLineColor": "#8A9BB3", "signalColor": "#3B4A5E", "signalTextColor": "#0B1F3A", "noteBkgColor": "#FFF6E5", "noteBorderColor": "#E0A100", "noteTextColor": "#3D2E00", "activationBkgColor": "#C7DBFF", "activationBorderColor": "#1F6FEB", "sequenceNumberColor": "#FFFFFF", "labelBoxBkgColor": "#1F6FEB", "labelBoxBorderColor": "#1F6FEB", "labelTextColor": "#FFFFFF", "loopTextColor": "#0B1F3A", "clusterBkg": "#F7F9FC", "clusterBorder": "#C9D3E0", "edgeLabelBackground": "#FFFFFF", "transitionLabelColor": "#0B1F3A", "cScale0": "#1F6FEB", "cScaleLabel0": "#FFFFFF", "cScale1": "#1E8E3E", "cScaleLabel1": "#FFFFFF", "cScale2": "#7E57C2", "cScaleLabel2": "#FFFFFF"}}}%%
flowchart TD
  A["teams n"]:::db --> B{"n odd?"}
  B -- yes --> C["add virtual team BYE"]:::warn
  B -- no --> D["circle method<br/>n−1 rounds"]:::api
  C --> D
  D --> E["round r → fixtures<br/>pair with BYE → bye row"]:::api
  E --> F["skip NO_PLAY weeks<br/>shift dates"]:::api
  F --> G[("team_matches")]:::db
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

## Acceptance criteria
- **AC-39a.1** A 5-team division produces exactly one bye per round, and each team gets the same number of byes ± 1.

---

[← F12](F12-night-view-scoresheet.md) · [E03 overview](README.md)
