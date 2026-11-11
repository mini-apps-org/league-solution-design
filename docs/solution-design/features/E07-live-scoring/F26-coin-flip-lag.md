# F26 — Coin flip & lag

> [Feature specs](../README.md) › [E07 — Live Scoring](README.md) › **F26** · Phase 2

| Phase | Status | Rules | Repo refs |
|---|---|---|---|
| 2 | 🎯 | R-030, R-031, R-100 · [08 §2–§3](../../08-scorekeeping-engine.md) | Phase 1 analogue: `firstPutUpFor(order)` in `_parked/src/lib/night.ts` (odd → home) |

## Requirements

*As a scorekeeper, I record who won the coin flip (that decides who puts up first) and, for each match, who won the lag (that decides who breaks and how innings are counted).*

| ID | Requirement |
|---|---|
| FR-26.1 | Before match 1, the night records a **coin flip**: `{winnerTeamId, choice: "put_up_first" | "respond_first"}`. It can be recorded once, and corrected by an admin only before put-up 1 |
| FR-26.2 | The coin flip replaces the Phase 1 fixed rule (odd orders home). After it, put-up order alternates: the starting team puts up in orders 1, 3, 5 and the other team in 2, 4 (R-030/R-031) |
| FR-26.3 | After both players of a slot are up, the match enters **Lag**: the scorer taps the lag winner, then the lag winner's choice of breaker (usually themselves) |
| FR-26.4 | `LAG_RECORDED {winnerPlayerId, breakerPlayerId}` sets `breaker`, `activePlayer = breaker`, and `secondShooter = lag loser` (innings increment when the lag loser's turn ends, R-100) |
| FR-26.5 | Rack-to-rack break rule per division bylaw: `winner_breaks` (APA 8-Ball default) or `alternate` |
| FR-26.6 | The scorekeeper's name is recorded per individual match (R-105), prefilled with the device user's name |
| FR-26.7 | Undo is allowed for the lag until the first shot event of rack 1 |

## Logic

### Coin flip → put-up order

```mermaid
%%{init: {"theme": "base", "themeVariables": {"fontFamily": "Arial", "fontSize": "14px", "primaryColor": "#E8F1FF", "primaryBorderColor": "#1F6FEB", "primaryTextColor": "#0B1F3A", "lineColor": "#5B6B82", "secondaryColor": "#EAF7EF", "tertiaryColor": "#FFF6E5", "actorBkg": "#DCE9FF", "actorTextColor": "#0B1F3A", "actorBorder": "#1F6FEB", "actorLineColor": "#8A9BB3", "signalColor": "#3B4A5E", "signalTextColor": "#0B1F3A", "noteBkgColor": "#FFF6E5", "noteBorderColor": "#E0A100", "noteTextColor": "#3D2E00", "activationBkgColor": "#C7DBFF", "activationBorderColor": "#1F6FEB", "sequenceNumberColor": "#FFFFFF", "labelBoxBkgColor": "#1F6FEB", "labelBoxBorderColor": "#1F6FEB", "labelTextColor": "#FFFFFF", "loopTextColor": "#0B1F3A", "clusterBkg": "#F7F9FC", "clusterBorder": "#C9D3E0", "edgeLabelBackground": "#FFFFFF", "transitionLabelColor": "#0B1F3A", "cScale0": "#1F6FEB", "cScaleLabel0": "#FFFFFF", "cScale1": "#1E8E3E", "cScaleLabel1": "#FFFFFF", "cScale2": "#7E57C2", "cScaleLabel2": "#FFFFFF"}}}%%
flowchart TD
  CF(["coin flip"]):::start --> W{"winner's choice"}
  W -- "put up first" --> A["starter = winner"]:::fe
  W -- "respond first" --> B["starter = other team"]:::fe
  A --> O{"slot order odd?"}
  B --> O
  O -- yes --> S1["starter puts up"]:::api
  O -- no --> S2["other team puts up"]:::api
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

### Lag → breaker and innings side

```text
on LAG_RECORDED(winner, breaker):
  assert status == LAG and breaker in {home, away}
  lagWinner     = side(winner)
  secondShooter = other(lagWinner)            # R-100, innings side
  rack          = { no: 1, breaker: side(breaker), firstTurnLive: true,
                    timeoutsLeft: timeouts(SL) }  # R-104
  activePlayer  = side(breaker)
  status        = IN_PROGRESS
```

## Flow

```mermaid
%%{init: {"theme": "base", "themeVariables": {"fontFamily": "Arial", "fontSize": "14px", "primaryColor": "#E8F1FF", "primaryBorderColor": "#1F6FEB", "primaryTextColor": "#0B1F3A", "lineColor": "#5B6B82", "secondaryColor": "#EAF7EF", "tertiaryColor": "#FFF6E5", "actorBkg": "#DCE9FF", "actorTextColor": "#0B1F3A", "actorBorder": "#1F6FEB", "actorLineColor": "#8A9BB3", "signalColor": "#3B4A5E", "signalTextColor": "#0B1F3A", "noteBkgColor": "#FFF6E5", "noteBorderColor": "#E0A100", "noteTextColor": "#3D2E00", "activationBkgColor": "#C7DBFF", "activationBorderColor": "#1F6FEB", "sequenceNumberColor": "#FFFFFF", "labelBoxBkgColor": "#1F6FEB", "labelBoxBorderColor": "#1F6FEB", "labelTextColor": "#FFFFFF", "loopTextColor": "#0B1F3A", "clusterBkg": "#F7F9FC", "clusterBorder": "#C9D3E0", "edgeLabelBackground": "#FFFFFF", "transitionLabelColor": "#0B1F3A", "cScale0": "#1F6FEB", "cScaleLabel0": "#FFFFFF", "cScale1": "#1E8E3E", "cScaleLabel1": "#FFFFFF", "cScale2": "#7E57C2", "cScaleLabel2": "#FFFFFF"}}}%%
sequenceDiagram
  autonumber
  participant S as 👤 Scorekeeper
  participant FE as 📱 league-fe
  participant API as ⚙️ scoring API
  participant DB as 🗄️ Postgres
  rect rgb(247,249,252)
  S->>FE: Start night · Coin flip · 03209 wins · put up first
  FE->>API: POST /team-matches/{id}/coin-flip
  API->>DB: COIN_FLIP_RECORDED · status in_progress
  API-->>FE: put-up side for order 1 = home
  Note over FE,API: put-up and respond as in E04-F13
  S->>FE: Lag won by Nam · Nam breaks
  FE->>API: POST events [LAG_RECORDED]
  API->>DB: seq n · breaker home · secondShooter away
  API-->>FE: state IN_PROGRESS · rack 1 · active home
  end
```

## UI

| Screen | Content |
|---|---|
| Coin flip sheet | Two big team buttons ("Who won the toss?"), then two choices ("Put up first" / "Let them put up first"). Confirm |
| Lag sheet | The two put-up players as large cards with SL and race ("needs 4"); tap the lag winner, then "Who breaks?" defaulting to the winner |
| Header after lag | A "LAG" badge on the lag winner (R-144) and a break icon on the current breaker |

## API & data

```json
{
  "idempotencyKey": "<uuid>",
  "teamMatchId": "<team-match-uuid>",
  "expectedSeq": 12,
  "deviceId": "<device-uuid>",
  "clientTs": "2026-11-10T19:41:03+07:00",
  "type": "LAG_RECORDED",
  "payload": { "winnerPlayerId": "<player-uuid>", "breakerPlayerId": "<player-uuid>" }
}
```

| Error | When |
|---|---|
| `40910` | Coin flip already recorded |
| `40911` | Lag sent while the slot isn't in `LAG` |
| `40003` | The winner or breaker isn't one of the two players |

## Edge cases

| ID | Situation | Expected |
|---|---|---|
| EC-26.1 | Coin flip skipped (old client or Phase 1 fallback) | Default to Phase 1 alternation (odd → home) |
| EC-26.2 | Lag winner chooses the opponent to break | Allowed: `breaker = other(lagWinner)`; `secondShooter` stays the lag loser |
| EC-26.3 | Wrong lag winner tapped | Undo before the first shot; after that, an admin correction only |
| EC-26.4 | Forfeited slot (F39b) | No lag; the slot goes straight to `MATCH_DONE` |

## Acceptance criteria

- **AC-26.1** Given away wins the toss and chooses to put up first, then the put-up order is away in 1, 3, 5 and home in 2, 4.
- **AC-26.2** Given home wins the lag, when the away player's turn ends, then innings = 1, and when the home player's turn ends first, innings stays 0.
- **AC-26.3** Given a recorded lag and no shot yet, when Undo is tapped, then the slot returns to `LAG`.

## Open questions

- Does the league use "winner breaks" or "alternate break" for 8-Ball? (Bylaw per division; default winner breaks.)

---

[E07 overview](README.md) · [F27 →](F27-live-8ball-scoring.md)
