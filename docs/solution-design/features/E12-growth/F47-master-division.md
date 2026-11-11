# F47 — Master division

> [Feature specs](../README.md) › [E12 — Growth](README.md) › **F47** · Phase 3

| Phase | Status | Rules |
|---|---|---|
| 3 | 🎯 outline | [04 §2](../../04-domain-rules.md) · [Q5](../../14-open-questions.md) |

## Requirements

| ID | Requirement |
|---|---|
| FR-47.1 | A division format "Master" that mixes 8-Ball and 9-Ball in one team night (for example, matches 1, 3, 5 in 8-Ball and 2, 4 in 9-Ball, set by bylaw) |
| FR-47.2 | Each slot uses the player's SL **for that slot's format**; the team cap applies per format or as a combined index (to be decided) |
| FR-47.3 | Team points are normalised so both formats weigh the same (for example, 8-Ball points × 20/3) or are kept separate in standings |
| FR-47.4 | Accolades (including DOUBLE_STRIKE) count across formats in the same night |

## Key rules and assumptions

- Builds directly on per-format SL (F32). No new scoring engine, only a slot → format map.
- The put-up cap check must run with the format of the slot being filled.

## Diagram

```mermaid
%%{init: {"theme": "base", "themeVariables": {"fontFamily": "Arial", "fontSize": "14px", "primaryColor": "#E8F1FF", "primaryBorderColor": "#1F6FEB", "primaryTextColor": "#0B1F3A", "lineColor": "#5B6B82", "secondaryColor": "#EAF7EF", "tertiaryColor": "#FFF6E5", "actorBkg": "#DCE9FF", "actorTextColor": "#0B1F3A", "actorBorder": "#1F6FEB", "actorLineColor": "#8A9BB3", "signalColor": "#3B4A5E", "signalTextColor": "#0B1F3A", "noteBkgColor": "#FFF6E5", "noteBorderColor": "#E0A100", "noteTextColor": "#3D2E00", "activationBkgColor": "#C7DBFF", "activationBorderColor": "#1F6FEB", "sequenceNumberColor": "#FFFFFF", "labelBoxBkgColor": "#1F6FEB", "labelBoxBorderColor": "#1F6FEB", "labelTextColor": "#FFFFFF", "loopTextColor": "#0B1F3A", "clusterBkg": "#F7F9FC", "clusterBorder": "#C9D3E0", "edgeLabelBackground": "#FFFFFF", "transitionLabelColor": "#0B1F3A", "cScale0": "#1F6FEB", "cScaleLabel0": "#FFFFFF", "cScale1": "#1E8E3E", "cScaleLabel1": "#FFFFFF", "cScale2": "#7E57C2", "cScaleLabel2": "#FFFFFF"}}}%%
flowchart LR
  N(["Master night"]):::start --> S1["slot 1 · 8-Ball"]:::fe
  N --> S2["slot 2 · 9-Ball"]:::api
  N --> S3["slot 3 · 8-Ball"]:::fe
  N --> S4["slot 4 · 9-Ball"]:::api
  N --> S5["slot 5 · 8-Ball"]:::fe
  S1 --> P["normalise points<br/>per bylaw"]:::warn
  S2 --> P
  S3 --> P
  S4 --> P
  S5 --> P
  P --> T[("team_standings")]:::db
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

- Slot-to-format pattern, cap rule, and normalisation: all need the league's bylaw.

---

[E12 overview](README.md) · [F48 →](F48-tournaments.md)
