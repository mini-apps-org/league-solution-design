# F39b — Forfeits

> [Feature specs](../README.md) › [E04 — Night Operations: Put-up, Result, Submit](README.md) › **F39b** · Phase 2

| Phase | Status | Rules |
|---|---|---|
| 2 | 🎯 | R-037, [Q15/Q16](../../14-open-questions.md) |

## Requirements

| ID | Requirement |
|---|---|
| FR-39b.1 | A captain or admin can forfeit a slot when their side has no eligible player (after a 15 min grace period from the scheduled start) |
| FR-39b.2 | The opponent's player is still put up and recorded, and gets the maximum points: 3 (8-Ball) or 20 (9-Ball). The forfeiting side gets 0. No match counts as played for either player's MP |
| FR-39b.3 | New columns: `individual_matches.forfeit_side`; `fn_score_individual_match` handles it |
| FR-39b.4 | Both teams still owe weekly fees (F36) |

## Flow

```mermaid
%%{init: {"theme": "base", "themeVariables": {"fontFamily": "Arial", "fontSize": "14px", "primaryColor": "#E8F1FF", "primaryBorderColor": "#1F6FEB", "primaryTextColor": "#0B1F3A", "lineColor": "#5B6B82", "secondaryColor": "#EAF7EF", "tertiaryColor": "#FFF6E5", "actorBkg": "#DCE9FF", "actorTextColor": "#0B1F3A", "actorBorder": "#1F6FEB", "actorLineColor": "#8A9BB3", "signalColor": "#3B4A5E", "signalTextColor": "#0B1F3A", "noteBkgColor": "#FFF6E5", "noteBorderColor": "#E0A100", "noteTextColor": "#3D2E00", "activationBkgColor": "#C7DBFF", "activationBorderColor": "#1F6FEB", "sequenceNumberColor": "#FFFFFF", "labelBoxBkgColor": "#1F6FEB", "labelBoxBorderColor": "#1F6FEB", "labelTextColor": "#FFFFFF", "loopTextColor": "#0B1F3A", "clusterBkg": "#F7F9FC", "clusterBorder": "#C9D3E0", "edgeLabelBackground": "#FFFFFF", "transitionLabelColor": "#0B1F3A", "cScale0": "#1F6FEB", "cScaleLabel0": "#FFFFFF", "cScale1": "#1E8E3E", "cScaleLabel1": "#FFFFFF", "cScale2": "#7E57C2", "cScaleLabel2": "#FFFFFF"}}}%%
sequenceDiagram
  autonumber
  participant C as Captain (short-handed)
  participant FE as league-fe
  participant API as league-be
  participant DB as Postgres
  rect rgb(247,249,252)
  C->>FE: Put-up shows no selectable player
  FE-->>C: offer Forfeit match {k}
  C->>FE: confirm in drawer
  FE->>API: POST /team-matches/{id}/forfeit {matchOrder, side}
  API->>DB: guard · grace period passed · no eligible player
  API->>DB: row forfeit_side = home · points 0 / 3
  API-->>FE: row · next action
  end
```

## Acceptance criteria
- **AC-39b.1** A forfeited slot shows "Forfeit" in the scoresheet, awards the maximum points to the opponent, and doesn't change either player's MP.

---

[← F15](F15-submit-night.md) · [E04 overview](README.md)
