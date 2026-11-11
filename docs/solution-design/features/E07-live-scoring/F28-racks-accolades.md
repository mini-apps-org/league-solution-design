# F28 — Racks & accolades

> [Feature specs](../README.md) › [E07 — Live Scoring](README.md) › **F28** · Phase 2

| Phase | Status | Rules | Repo refs |
|---|---|---|---|
| 2 | 🎯 | R-060, R-061, R-062, R-084, R-144 · [04 §5.2, §9](../../04-domain-rules.md) | — |

## Requirements

*As a scorekeeper, I end a rack with the exact outcome. As a player, my break-and-runs and golden breaks are counted on my profile.*

| ID | Requirement |
|---|---|
| FR-28.1 | **End Rack…** opens a sheet with the six 8-Ball outcomes for the active player: Make 8 Ball, Break and Run, 8 on the Break (wins); Early 8, Scratch on 8, 8 in the Wrong Pocket (losses) |
| FR-28.2 | Break and Run and 8 on the Break are shown **only while** `rack.firstTurnLive` is true and the shooter is the breaker (R-060) |
| FR-28.3 | A win outcome gives +1 game to the shooter. A loss outcome gives +1 game to the opponent (R-061) |
| FR-28.4 | Accolades are derived **on the server** from events and written to `player_accolades`: `BR`, `8OB`, `RACKLESS` (won the lag and the match without losing a rack), `DOUBLE_STRIKE` (BR + golden break on the same league night, once per night) |
| FR-28.5 | A new rack opens with `breaker` per bylaw, `firstTurnLive = true`, time-outs reset, and rack DS = 0 |
| FR-28.6 | The match breakdown (R-144) lists racks: number, breaker, winner, outcome code, innings |
| FR-28.7 | Undo of a rack end also removes the accolades it created |

## Logic: end-of-rack decision

```mermaid
%%{init: {"theme": "base", "themeVariables": {"fontFamily": "Arial", "fontSize": "14px", "primaryColor": "#E8F1FF", "primaryBorderColor": "#1F6FEB", "primaryTextColor": "#0B1F3A", "lineColor": "#5B6B82", "secondaryColor": "#EAF7EF", "tertiaryColor": "#FFF6E5", "actorBkg": "#DCE9FF", "actorTextColor": "#0B1F3A", "actorBorder": "#1F6FEB", "actorLineColor": "#8A9BB3", "signalColor": "#3B4A5E", "signalTextColor": "#0B1F3A", "noteBkgColor": "#FFF6E5", "noteBorderColor": "#E0A100", "noteTextColor": "#3D2E00", "activationBkgColor": "#C7DBFF", "activationBorderColor": "#1F6FEB", "sequenceNumberColor": "#FFFFFF", "labelBoxBkgColor": "#1F6FEB", "labelBoxBorderColor": "#1F6FEB", "labelTextColor": "#FFFFFF", "loopTextColor": "#0B1F3A", "clusterBkg": "#F7F9FC", "clusterBorder": "#C9D3E0", "edgeLabelBackground": "#FFFFFF", "transitionLabelColor": "#0B1F3A", "cScale0": "#1F6FEB", "cScaleLabel0": "#FFFFFF", "cScale1": "#1E8E3E", "cScaleLabel1": "#FFFFFF", "cScale2": "#7E57C2", "cScaleLabel2": "#FFFFFF"}}}%%
flowchart TD
  S(["End Rack by shooter p"]):::start --> O{"outcome"}
  O -- "BR or 8OB" --> G{"firstTurnLive and<br/>p is breaker?"}
  G -- no --> X["hidden in UI<br/>server rejects 40914"]:::bad
  G -- yes --> W["p wins rack"]:::ok
  O -- "make 8" --> W
  O -- "early 8 · scratch 8 · wrong pocket" --> L["opponent wins rack"]:::warn
  W --> AC["accolade for BR or 8OB"]:::api
  AC --> R{"race reached?"}
  L --> R
  R -- no --> N["open next rack"]:::fe
  R -- yes --> M["complete match · points8"]:::ok
  M --> RL{"winner won lag and<br/>lost no rack?"}
  RL -- yes --> RA["accolade RACKLESS"]:::api
  M --> DSK{"BR and golden break<br/>same night?"}
  DSK -- yes --> DB["accolade DOUBLE_STRIKE<br/>once per night"]:::api
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

## Outcomes

| Code | Label | Result for shooter | Accolade |
|---|---|---|---|
| `MAKE_8` | Make 8 Ball | Win | — |
| `BREAK_AND_RUN` | Break and Run | Win | `BR` |
| `EIGHT_ON_BREAK` | 8 on the Break | Win | `8OB` |
| `EARLY_8` | Make 8 Ball Early | Loss | — (E8 code kept for stats) |
| `SCRATCH_8` | Scratch on 8 Ball | Loss | — (S8) |
| `WRONG_POCKET_8` | 8 Ball Wrong Pocket | Loss | — (8WP) |

## Flow

```mermaid
%%{init: {"theme": "base", "themeVariables": {"fontFamily": "Arial", "fontSize": "14px", "primaryColor": "#E8F1FF", "primaryBorderColor": "#1F6FEB", "primaryTextColor": "#0B1F3A", "lineColor": "#5B6B82", "secondaryColor": "#EAF7EF", "tertiaryColor": "#FFF6E5", "actorBkg": "#DCE9FF", "actorTextColor": "#0B1F3A", "actorBorder": "#1F6FEB", "actorLineColor": "#8A9BB3", "signalColor": "#3B4A5E", "signalTextColor": "#0B1F3A", "noteBkgColor": "#FFF6E5", "noteBorderColor": "#E0A100", "noteTextColor": "#3D2E00", "activationBkgColor": "#C7DBFF", "activationBorderColor": "#1F6FEB", "sequenceNumberColor": "#FFFFFF", "labelBoxBkgColor": "#1F6FEB", "labelBoxBorderColor": "#1F6FEB", "labelTextColor": "#FFFFFF", "loopTextColor": "#0B1F3A", "clusterBkg": "#F7F9FC", "clusterBorder": "#C9D3E0", "edgeLabelBackground": "#FFFFFF", "transitionLabelColor": "#0B1F3A", "cScale0": "#1F6FEB", "cScaleLabel0": "#FFFFFF", "cScale1": "#1E8E3E", "cScaleLabel1": "#FFFFFF", "cScale2": "#7E57C2", "cScaleLabel2": "#FFFFFF"}}}%%
sequenceDiagram
  autonumber
  participant S as 👤 Scorekeeper
  participant FE as 📱 End rack sheet
  participant API as ⚙️ scoring API
  participant DB as 🗄️ Postgres
  rect rgb(247,249,252)
  S->>FE: End Rack… (Nam is breaker, no turn-over yet)
  FE-->>S: six outcomes incl. Break and Run
  S->>FE: Break and Run
  FE->>API: RACK_END BREAK_AND_RUN shooter Nam
  API->>DB: won Nam + 1 · racks row · player_accolades BR
  alt race reached
    rect rgb(234,247,239)
    API->>DB: complete match · points · RACKLESS check · DOUBLE_STRIKE check
    end
  else
    API->>DB: open rack n+1
  end
  API-->>FE: state · new accolades for a toast
  end
```

## Edge cases

| ID | Situation | Expected |
|---|---|---|
| EC-28.1 | 8 on the break after a turn-over in the same rack | Not offered; rejected if sent (R-060) |
| EC-28.2 | Early 8 by the breaker on the break | Loss for the breaker, opponent +1 |
| EC-28.3 | Same player gets BR in match 1 and 8OB in a later match the same night | One `DOUBLE_STRIKE` |
| EC-28.4 | Undo of a BR rack end | The rack and the BR accolade are both removed |
| EC-28.5 | Match finished by manual entry (fallback) | No rack-level accolades are inferred |

## Acceptance criteria

- **AC-28.1** Given a turn-over in rack 3, when End Rack opens, then Break and Run and 8 on the Break are hidden.
- **AC-28.2** Given Nam wins the lag and the match 4–0, then a `RACKLESS` accolade exists for Nam on that match.
- **AC-28.3** Given a Scratch on 8 by Huy, then Nam's games increase by 1.

## Open questions

- [Q5](../../14-open-questions.md): DOUBLE_STRIKE definition (BR + golden break, same night).

---

[← F27](F27-live-8ball-scoring.md) · [E07 overview](README.md) · [F29 →](F29-offline-sync.md)
