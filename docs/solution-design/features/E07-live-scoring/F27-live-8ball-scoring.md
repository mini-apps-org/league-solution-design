# F27 — Live 8-Ball scoring

> [Feature specs](../README.md) › [E07 — Live Scoring](README.md) › **F27** · Phase 2

| Phase | Status | Rules | Repo refs |
|---|---|---|---|
| 2 | 🎯 | R-060–R-062, R-100–R-106, R-050 · [08 §4.1](../../08-scorekeeping-engine.md) | Phase 1 analogue: `pointsFor()` in `_parked/src/lib/rules.ts` |

## Requirements

*As a scorekeeper, I tap through each turn of an 8-Ball match on one screen, and the app tracks games, innings, defensive shots and time-outs exactly as the paper scoresheet would.*

| ID | Requirement |
|---|---|
| FR-27.1 | The live screen shows both players (name, SL, games won / needed, DS count, time-outs left), the **active player** highlighted, rack number, match innings and a shot timer (informational, R-106) |
| FR-27.2 | Actions for the active player: **Turn Over**, **Defensive Shot**, **Time-out**, **End Rack…** |
| FR-27.3 | `TURN_OVER(p)`: `p` must be active. Sets `firstTurnLive = false`. If `p == secondShooter`, then `innings++`. Switches the active player (R-100, R-101) |
| FR-27.4 | `DEFENSIVE_SHOT(p)`: `ds[p]++`, then the same effect as Turn Over (R-102) |
| FR-27.5 | `TIMEOUT(p)`: only if `timeoutsLeft[p] > 0`; resets every rack. SL ≤ 3 → 2, SL ≥ 4 → 1 (R-104, configurable) |
| FR-27.6 | The match completes when a player reaches their race. Points use the same `points8` as Phase 1: 3/0 shutout, 2/1 hill-hill (loser = race − 1), otherwise 2/0 |
| FR-27.7 | **Undo** reverts only the last non-undone event of the match (`UNDO {revertsSeq}`); the projection is re-reduced. Undo after the match-ending rack re-opens the match and clears its points |
| FR-27.8 | **Switch active player** in the ⋮ menu corrects a wrong state without undoing (R-062) |
| FR-27.9 | Races come from the SL **snapshot** taken at put-up (R-125). An SL change mid-night affects later slots only (R-050) |

## Logic: turn reducer

```mermaid
%%{init: {"theme": "base", "themeVariables": {"fontFamily": "Arial", "fontSize": "14px", "primaryColor": "#E8F1FF", "primaryBorderColor": "#1F6FEB", "primaryTextColor": "#0B1F3A", "lineColor": "#5B6B82", "secondaryColor": "#EAF7EF", "tertiaryColor": "#FFF6E5", "actorBkg": "#DCE9FF", "actorTextColor": "#0B1F3A", "actorBorder": "#1F6FEB", "actorLineColor": "#8A9BB3", "signalColor": "#3B4A5E", "signalTextColor": "#0B1F3A", "noteBkgColor": "#FFF6E5", "noteBorderColor": "#E0A100", "noteTextColor": "#3D2E00", "activationBkgColor": "#C7DBFF", "activationBorderColor": "#1F6FEB", "sequenceNumberColor": "#FFFFFF", "labelBoxBkgColor": "#1F6FEB", "labelBoxBorderColor": "#1F6FEB", "labelTextColor": "#FFFFFF", "loopTextColor": "#0B1F3A", "clusterBkg": "#F7F9FC", "clusterBorder": "#C9D3E0", "edgeLabelBackground": "#FFFFFF", "transitionLabelColor": "#0B1F3A", "cScale0": "#1F6FEB", "cScaleLabel0": "#FFFFFF", "cScale1": "#1E8E3E", "cScaleLabel1": "#FFFFFF", "cScale2": "#7E57C2", "cScaleLabel2": "#FFFFFF"}}}%%
flowchart TD
  E(["event from<br/>active player p"]):::start --> T{"type"}
  T -- "turn over" --> F["firstTurnLive = false"]:::api
  T -- "defensive shot" --> DS["ds[p] + 1"]:::api --> F
  T -- "time-out" --> TO{"timeoutsLeft[p]<br/>> 0?"}
  TO -- no --> X["reject 40912"]:::bad
  TO -- yes --> TD["timeoutsLeft[p] − 1<br/>active unchanged"]:::ok
  F --> SS{"p is the<br/>second shooter?"}
  SS -- yes --> IN["innings + 1"]:::warn --> SW["active = other(p)"]:::ok
  SS -- no --> SW
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

### Match completion (shared with Phase 1)

```text
on rack won by w:
  won[w] += 1
  if won[w] == needed[w]:
     l = other(w)
     pts = won[l] == 0             ? (3,0)
         : won[l] == needed[l] - 1 ? (2,1)     # hill wins over standard (needed 2, won 1)
         :                           (2,0)
     status = COMPLETED
```

## Flow

```mermaid
%%{init: {"theme": "base", "themeVariables": {"fontFamily": "Arial", "fontSize": "14px", "primaryColor": "#E8F1FF", "primaryBorderColor": "#1F6FEB", "primaryTextColor": "#0B1F3A", "lineColor": "#5B6B82", "secondaryColor": "#EAF7EF", "tertiaryColor": "#FFF6E5", "actorBkg": "#DCE9FF", "actorTextColor": "#0B1F3A", "actorBorder": "#1F6FEB", "actorLineColor": "#8A9BB3", "signalColor": "#3B4A5E", "signalTextColor": "#0B1F3A", "noteBkgColor": "#FFF6E5", "noteBorderColor": "#E0A100", "noteTextColor": "#3D2E00", "activationBkgColor": "#C7DBFF", "activationBorderColor": "#1F6FEB", "sequenceNumberColor": "#FFFFFF", "labelBoxBkgColor": "#1F6FEB", "labelBoxBorderColor": "#1F6FEB", "labelTextColor": "#FFFFFF", "loopTextColor": "#0B1F3A", "clusterBkg": "#F7F9FC", "clusterBorder": "#C9D3E0", "edgeLabelBackground": "#FFFFFF", "transitionLabelColor": "#0B1F3A", "cScale0": "#1F6FEB", "cScaleLabel0": "#FFFFFF", "cScale1": "#1E8E3E", "cScaleLabel1": "#FFFFFF", "cScale2": "#7E57C2", "cScaleLabel2": "#FFFFFF"}}}%%
sequenceDiagram
  autonumber
  participant S as 👤 Scorekeeper
  participant FE as 📱 LiveScorePage
  participant API as ⚙️ scoring API
  participant DB as 🗄️ Postgres
  rect rgb(247,249,252)
  Note over S,FE: SL5 Nam (needs 4) vs SL3 Huy (needs 2) · Nam breaks
  S->>FE: Turn Over (Nam)
  FE->>API: TURN_OVER seq 13
  S->>FE: Defensive Shot (Huy)
  FE->>API: DEFENSIVE_SHOT seq 14
  Note over FE: Huy is second shooter → innings 1
  S->>FE: End Rack · Make 8 Ball (Nam)
  FE->>API: RACK_END MAKE_8 seq 15
  API->>DB: won Nam 1/4 · rack 2 opens · Nam breaks
  rect rgb(253,236,236)
  S->>FE: Undo
  FE->>API: UNDO revertsSeq 15
  API->>DB: mark seq 15 undone · re-reduce · back to rack 1
  end
  end
```

## UI

```mermaid
%%{init: {"theme": "base", "themeVariables": {"fontFamily": "Arial", "fontSize": "14px", "primaryColor": "#E8F1FF", "primaryBorderColor": "#1F6FEB", "primaryTextColor": "#0B1F3A", "lineColor": "#5B6B82", "secondaryColor": "#EAF7EF", "tertiaryColor": "#FFF6E5", "actorBkg": "#DCE9FF", "actorTextColor": "#0B1F3A", "actorBorder": "#1F6FEB", "actorLineColor": "#8A9BB3", "signalColor": "#3B4A5E", "signalTextColor": "#0B1F3A", "noteBkgColor": "#FFF6E5", "noteBorderColor": "#E0A100", "noteTextColor": "#3D2E00", "activationBkgColor": "#C7DBFF", "activationBorderColor": "#1F6FEB", "sequenceNumberColor": "#FFFFFF", "labelBoxBkgColor": "#1F6FEB", "labelBoxBorderColor": "#1F6FEB", "labelTextColor": "#FFFFFF", "loopTextColor": "#0B1F3A", "clusterBkg": "#F7F9FC", "clusterBorder": "#C9D3E0", "edgeLabelBackground": "#FFFFFF", "transitionLabelColor": "#0B1F3A", "cScale0": "#1F6FEB", "cScaleLabel0": "#FFFFFF", "cScale1": "#1E8E3E", "cScaleLabel1": "#FFFFFF", "cScale2": "#7E57C2", "cScaleLabel2": "#FFFFFF"}}}%%
flowchart TB
  subgraph SCR["📱 Live score · portrait"]
    direction TB
    H["Header · Match 2 of 5 · Rack 3 · Innings 7 · ⋮"]:::fe
    P1["<b>Nam · SL5</b> · 2 / 4 · DS 1 · ⏱ 1 left · ACTIVE"]:::ok
    P2["<b>Huy · SL3</b> · 1 / 2 · DS 0 · ⏱ 2 left"]:::fe
    A["Turn Over · Defensive Shot · Time-out"]:::api
    ER["End Rack… (sheet with outcomes)"]:::warn
    U["Undo last · Enter final score instead"]:::fe
    H --> P1 --> P2 --> A --> ER --> U
  end
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

*Buttons are at least 56 px tall for one-handed use at the table. The active player's card uses the green ok style; a haptic tick confirms each tap.*

## Edge cases

| ID | Situation | Expected |
|---|---|---|
| EC-27.1 | Rack ends during the first shooter's turn | Innings unchanged ([08 §8 #6](../../08-scorekeeping-engine.md)) |
| EC-27.2 | SL2 vs SL2, the loser wins 1 | Hill → 2/1 |
| EC-27.3 | Undo after the match-ending rack | The match re-opens and its points are cleared |
| EC-27.4 | Event from a player who isn't active | Rejected `40913`; the UI offers "Switch active player" |
| EC-27.5 | The scorer gives up on live scoring | "Enter final score instead" opens E04-F14 with the games so far prefilled; the event log is closed with `MANUAL_RESULT` |

## Acceptance criteria

- **AC-27.1** Given the shared fixture set `fixtures/8ball/*.json`, when both the TS and Go reducers run, then their final states are byte-identical.
- **AC-27.2** Given SL5 vs SL3 with a final of 4–1, then points = 2/1 (the loser needed 2 and won 1).
- **AC-27.3** Given an SL4 player with 1 time-out left, when a second time-out is tapped in the same rack, then it's rejected.

## Open questions

- Is the time-out count by SL (R-104) correct for this league?

---

[← F26](F26-coin-flip-lag.md) · [E07 overview](README.md) · [F28 →](F28-racks-accolades.md)
