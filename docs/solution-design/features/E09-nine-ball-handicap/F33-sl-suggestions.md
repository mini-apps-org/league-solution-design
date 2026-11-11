# F33 — Skill-level suggestions

> [Feature specs](../README.md) › [E09 — 9-Ball & Handicap](README.md) › **F33** · Phase 2

| Phase | Status | Rules | Repo refs |
|---|---|---|---|
| 2 | 🎯 | R-120–R-126 · [04 §10](../../04-domain-rules.md) | Phase 1: manual change via `change_skill_level()` ([E05-F18](../E05-roster-admin/F18-skill-level-change.md)) |

## Requirements

*As an admin, after each night the system tells me whose skill level looks wrong, why, and lets me apply the change in one tap with the same history and audit as a manual change.*

| ID | Requirement |
|---|---|
| FR-33.1 | After each finalized night (outbox `TeamMatchFinalized`), the worker recomputes the suggested SL for every player who played |
| FR-33.2 | **8-Ball basis (R-121):** over the last 10 won matches, `avg(effective innings per game won)`, where effective innings = innings − DS |
| FR-33.3 | **9-Ball basis (R-122):** over the last 10 matches, `PPI = Σ points ÷ Σ (innings − DS)` |
| FR-33.4 | Thresholds map the basis to an SL. They're stored in `sl_thresholds (format, sl, min_value, max_value)` and configurable; R-123 says the sources don't give them, so defaults are seeded and marked ⚠️ |
| FR-33.5 | A suggestion is created only when `suggested ≠ current` **and** the player has at least 5 qualifying matches (configurable). An existing pending suggestion for the same player and format is replaced |
| FR-33.6 | The admin queue shows the player, format, current → suggested, the basis (window, values) and a sparkline. Actions: **Apply** (calls `change_skill_level` with reason "Suggested: {basis}"), **Dismiss** (reason required), **Snooze 2 weeks** |
| FR-33.7 | Applied changes follow R-050/R-125: matches already started keep their snapshot; later put-ups use the new SL |
| FR-33.8 | No auto-apply in Phase 2 (R-123); every change needs an admin |

## Logic

```mermaid
%%{init: {"theme": "base", "themeVariables": {"fontFamily": "Arial", "fontSize": "14px", "primaryColor": "#E8F1FF", "primaryBorderColor": "#1F6FEB", "primaryTextColor": "#0B1F3A", "lineColor": "#5B6B82", "secondaryColor": "#EAF7EF", "tertiaryColor": "#FFF6E5", "actorBkg": "#DCE9FF", "actorTextColor": "#0B1F3A", "actorBorder": "#1F6FEB", "actorLineColor": "#8A9BB3", "signalColor": "#3B4A5E", "signalTextColor": "#0B1F3A", "noteBkgColor": "#FFF6E5", "noteBorderColor": "#E0A100", "noteTextColor": "#3D2E00", "activationBkgColor": "#C7DBFF", "activationBorderColor": "#1F6FEB", "sequenceNumberColor": "#FFFFFF", "labelBoxBkgColor": "#1F6FEB", "labelBoxBorderColor": "#1F6FEB", "labelTextColor": "#FFFFFF", "loopTextColor": "#0B1F3A", "clusterBkg": "#F7F9FC", "clusterBorder": "#C9D3E0", "edgeLabelBackground": "#FFFFFF", "transitionLabelColor": "#0B1F3A", "cScale0": "#1F6FEB", "cScaleLabel0": "#FFFFFF", "cScale1": "#1E8E3E", "cScaleLabel1": "#FFFFFF", "cScale2": "#7E57C2", "cScaleLabel2": "#FFFFFF"}}}%%
flowchart TD
  E(["night finalized"]):::start --> P["for each player who played"]:::api
  P --> F{"format"}
  F -- "8-Ball" --> B8["last 10 wins<br/>avg (innings − DS) per game won"]:::api
  F -- "9-Ball" --> B9["last 10 matches<br/>PPI = points ÷ (innings − DS)"]:::api
  B8 --> T["map via sl_thresholds"]:::db
  B9 --> T
  T --> Q{"≥ 5 matches and<br/>suggested ≠ current?"}
  Q -- no --> X["no suggestion"]:::fe
  Q -- yes --> S["upsert pending suggestion<br/>notify admins"]:::warn
  S --> A{"admin decision"}
  A -- apply --> AP["change_skill_level<br/>history + audit"]:::ok
  A -- dismiss --> DM["dismissed + reason"]:::bad
  A -- snooze --> SN["hidden 2 weeks"]:::fe
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

## Flow

```mermaid
%%{init: {"theme": "base", "themeVariables": {"fontFamily": "Arial", "fontSize": "14px", "primaryColor": "#E8F1FF", "primaryBorderColor": "#1F6FEB", "primaryTextColor": "#0B1F3A", "lineColor": "#5B6B82", "secondaryColor": "#EAF7EF", "tertiaryColor": "#FFF6E5", "actorBkg": "#DCE9FF", "actorTextColor": "#0B1F3A", "actorBorder": "#1F6FEB", "actorLineColor": "#8A9BB3", "signalColor": "#3B4A5E", "signalTextColor": "#0B1F3A", "noteBkgColor": "#FFF6E5", "noteBorderColor": "#E0A100", "noteTextColor": "#3D2E00", "activationBkgColor": "#C7DBFF", "activationBorderColor": "#1F6FEB", "sequenceNumberColor": "#FFFFFF", "labelBoxBkgColor": "#1F6FEB", "labelBoxBorderColor": "#1F6FEB", "labelTextColor": "#FFFFFF", "loopTextColor": "#0B1F3A", "clusterBkg": "#F7F9FC", "clusterBorder": "#C9D3E0", "edgeLabelBackground": "#FFFFFF", "transitionLabelColor": "#0B1F3A", "cScale0": "#1F6FEB", "cScaleLabel0": "#FFFFFF", "cScale1": "#1E8E3E", "cScaleLabel1": "#FFFFFF", "cScale2": "#7E57C2", "cScaleLabel2": "#FFFFFF"}}}%%
sequenceDiagram
  autonumber
  participant W as ⚙️ worker
  participant DB as 🗄️ Postgres
  participant ADM as 👤 Admin
  participant API as ⚙️ league-be
  rect rgb(247,249,252)
  W->>DB: claim TeamMatchFinalized
  W->>DB: read last 10 matches per player
  W->>DB: upsert sl_suggestions Nam 8-Ball 4 → 5
  ADM->>API: GET /sl-suggestions?status=pending
  API-->>ADM: queue with basis
  ADM->>API: POST /sl-suggestions/{id}:apply
  API->>DB: change_skill_level(Nam, 8-Ball, 5, reason) · suggestion applied · audit
  API-->>ADM: 200 · new SL 5
  end
```

## API & data

```json
{
  "id": "<suggestion-uuid>",
  "playerId": "<player-uuid>",
  "format": "8_ball",
  "currentSl": 4,
  "suggestedSl": 5,
  "basis": { "window": 10, "metric": "effective_innings_per_win", "value": 3.1 },
  "status": "pending"
}
```

## Edge cases

| ID | Situation | Expected |
|---|---|---|
| EC-33.1 | New player with 2 matches | No suggestion yet |
| EC-33.2 | Admin changes the SL manually while a suggestion is pending | The suggestion is marked superseded |
| EC-33.3 | Matches finished by manual entry (no innings data) | Excluded from the basis |
| EC-33.4 | Suggestion swings back and forth every week | Snooze; consider a hysteresis band in the thresholds |

## Acceptance criteria

- **AC-33.1** Given a fixture of 10 wins with known innings and DS, then the computed basis matches the expected value to 2 decimals.
- **AC-33.2** Given Apply, then `player_skill_levels` has a new row, `audit_log` records it, and the suggestion is `applied`.

## Open questions

- The real threshold values (R-123) must come from the league.

---

[← F32](F32-nine-ball-scoring.md) · [E09 overview](README.md)
