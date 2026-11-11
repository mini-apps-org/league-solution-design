# F54 — Championship qualification tracking

> [Feature specs](../README.md) › [E12 — Growth](README.md) › **F54** · Phase 3

| Phase | Status | Rules |
|---|---|---|
| 3 | 🎯 outline | [04 §12 championship lowest attainable SL](../../04-domain-rules.md) |

## Requirements

| ID | Requirement |
|---|---|
| FR-54.1 | Admins define qualification rules per championship: for example, the top 2 teams per division, a minimum number of matches played per player (e.g. ≥ 6 in the session), paid membership, and an SL rule |
| FR-54.2 | The system shows each team's and player's qualification status live during the session: Qualified · On track · At risk · Not eligible, with the reason |
| FR-54.3 | **Championship lowest attainable SL**: the lowest SL a player has held over the last N sessions is used for tournament handicap |
| FR-54.4 | At the end of the session, the qualified list is frozen and feeds tournament registration (F48) |

## Key rules and assumptions

- Uses standings (F35), per-player MP (F34) and SL history (F18).
- Rules are data (`qualification_rules jsonb`) so they can change per championship.

## Diagram

```mermaid
%%{init: {"theme": "base", "themeVariables": {"fontFamily": "Arial", "fontSize": "14px", "primaryColor": "#E8F1FF", "primaryBorderColor": "#1F6FEB", "primaryTextColor": "#0B1F3A", "lineColor": "#5B6B82", "secondaryColor": "#EAF7EF", "tertiaryColor": "#FFF6E5", "actorBkg": "#DCE9FF", "actorTextColor": "#0B1F3A", "actorBorder": "#1F6FEB", "actorLineColor": "#8A9BB3", "signalColor": "#3B4A5E", "signalTextColor": "#0B1F3A", "noteBkgColor": "#FFF6E5", "noteBorderColor": "#E0A100", "noteTextColor": "#3D2E00", "activationBkgColor": "#C7DBFF", "activationBorderColor": "#1F6FEB", "sequenceNumberColor": "#FFFFFF", "labelBoxBkgColor": "#1F6FEB", "labelBoxBorderColor": "#1F6FEB", "labelTextColor": "#FFFFFF", "loopTextColor": "#0B1F3A", "clusterBkg": "#F7F9FC", "clusterBorder": "#C9D3E0", "edgeLabelBackground": "#FFFFFF", "transitionLabelColor": "#0B1F3A", "cScale0": "#1F6FEB", "cScaleLabel0": "#FFFFFF", "cScale1": "#1E8E3E", "cScaleLabel1": "#FFFFFF", "cScale2": "#7E57C2", "cScaleLabel2": "#FFFFFF"}}}%%
flowchart TD
  S(["player or team"]):::start --> R1{"rank within<br/>top N?"}
  R1 -- no --> NE["not eligible"]:::bad
  R1 -- yes --> R2{"matches played<br/>≥ minimum?"}
  R2 -- no --> AR["at risk · show games needed"]:::warn
  R2 -- yes --> R3{"membership paid?"}
  R3 -- no --> AR
  R3 -- yes --> Q["qualified<br/>championship SL = min over N sessions"]:::ok
  Q --> T["F48 registration"]:::fe
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

- The exact qualification rules for the national or city championship.

---

[← F53](F53-venue-dashboard.md) · [E12 overview](README.md)
