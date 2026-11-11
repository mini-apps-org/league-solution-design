# F39c — Roster lock and one team per division

> [Feature specs](../README.md) › [E05 — Roster & Player Admin](README.md) › **F39c** · Phase 2

| Phase | Status | Rules |
|---|---|---|
| 2 | 🎯 | R-011, R-012, R-013, R-016, R-017, [Q24](../../14-open-questions.md), [Q32](../../14-open-questions.md) |

## Requirements

| ID | Requirement |
|---|---|
| FR-39c.1 | Replace the single-active-roster index with **one active roster per division**: `UNIQUE (player_id, division_id) WHERE left_at IS NULL` (denormalize `division_id`) |
| FR-39c.2 | Same night, different divisions: allowed only if the league bylaw `allow_multi_division_same_night` is true |
| FR-39c.3 | Roster changes after week 4 (`roster_lock_week`) need admin approval: the captain's add becomes a pending request |
| FR-39c.4 | Captain adds during a night are allowed only before match 1 starts |

## Logic

```mermaid
%%{init: {"theme": "base", "themeVariables": {"fontFamily": "Arial", "fontSize": "14px", "primaryColor": "#E8F1FF", "primaryBorderColor": "#1F6FEB", "primaryTextColor": "#0B1F3A", "lineColor": "#5B6B82", "secondaryColor": "#EAF7EF", "tertiaryColor": "#FFF6E5", "actorBkg": "#DCE9FF", "actorTextColor": "#0B1F3A", "actorBorder": "#1F6FEB", "actorLineColor": "#8A9BB3", "signalColor": "#3B4A5E", "signalTextColor": "#0B1F3A", "noteBkgColor": "#FFF6E5", "noteBorderColor": "#E0A100", "noteTextColor": "#3D2E00", "activationBkgColor": "#C7DBFF", "activationBorderColor": "#1F6FEB", "sequenceNumberColor": "#FFFFFF", "labelBoxBkgColor": "#1F6FEB", "labelBoxBorderColor": "#1F6FEB", "labelTextColor": "#FFFFFF", "loopTextColor": "#0B1F3A", "clusterBkg": "#F7F9FC", "clusterBorder": "#C9D3E0", "edgeLabelBackground": "#FFFFFF", "transitionLabelColor": "#0B1F3A", "cScale0": "#1F6FEB", "cScaleLabel0": "#FFFFFF", "cScale1": "#1E8E3E", "cScaleLabel1": "#FFFFFF", "cScale2": "#7E57C2", "cScaleLabel2": "#FFFFFF"}}}%%
flowchart TD
  A["add p to team t in division d"]:::api --> B{"p active in d?"}
  B -- yes --> X1["refuse · R-011"]:::bad
  B -- no --> C{"p active in another division<br/>on the same night?"}
  C -- "yes and bylaw off" --> X2["refuse · R-012"]:::bad
  C -- "no, or bylaw on" --> D{"current week > lock week?"}
  D -- yes --> P["pending approval · R-016"]:::warn
  D -- no --> E{"night of t started?"}
  E -- yes --> X3["refuse · R-017"]:::bad
  E -- no --> OK["insert roster row"]:::ok
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
- **AC-39c.1** A player can be active on a Monday team and a Wednesday team, but not on two Wednesday teams in the same division.

---

[← F19](F19-player-transfer.md) · [E05 overview](README.md) · [F41 →](F41-audit-log.md)
