# F34 — Player profile

> [Feature specs](../README.md) › [E10 — Profile & Standings](README.md) › **F34** · Phase 2

| Phase | Status | Rules | Repo refs |
|---|---|---|---|
| 2 | 🎯 | [04 §9, §12](../../04-domain-rules.md) | Phase 1 data: `player_division_stats` view, `players_stats` (E02-F8) |

## Requirements

*As a player, I open my profile and see my current SL per format, my record this session and overall, my achievements, and my recent matches.*

| ID | Requirement |
|---|---|
| FR-34.1 | Route `/players/:memberId`; "My profile" in the header menu opens the signed-in user's own |
| FR-34.2 | Header: name, member ID, current SL per format, team(s) this session, paid status (own profile and admins only) |
| FR-34.3 | **Session** card (per division): MP, MW, Win % (2 decimals), total points, PPM, % points available (PA = 3 for 8-Ball, 20 for 9-Ball) |
| FR-34.4 | **Lifetime** card: MP, MW, Win %, DS average, matches in the last 2 years, last date played |
| FR-34.5 | **Achievements**: counters for BR, 8OB, 9OB, Rackless, Double-strike, with the date of the latest |
| FR-34.6 | **Recent matches**: last 10 individual matches with opponent, SLs, score (games or points/target), points, result chip; tap opens the night breakdown |
| FR-34.7 | **SL history** (own profile and admins): date, format, old → new, reason |
| FR-34.8 | Visibility: `league` (signed-in users) by default; the player can choose `public` or `private` (name and stats visible only to them and admins) |
| FR-34.9 | Forfeits are excluded from MP and Win % (04 §12) |

## Logic: metric formulas

| Metric | Formula | Example (04 §12) |
|---|---|---|
| Win % | `MW ÷ MP × 100` | 3 / 7 = 42.86 % |
| PPM | `total points ÷ MP` | 7 / 7 = 1.00 |
| % PA | `total points ÷ (MP × PA)` | 7 / 21 = 33 % |
| DS avg | `Σ DS ÷ MP` | — |

```mermaid
%%{init: {"theme": "base", "themeVariables": {"fontFamily": "Arial", "fontSize": "14px", "primaryColor": "#E8F1FF", "primaryBorderColor": "#1F6FEB", "primaryTextColor": "#0B1F3A", "lineColor": "#5B6B82", "secondaryColor": "#EAF7EF", "tertiaryColor": "#FFF6E5", "actorBkg": "#DCE9FF", "actorTextColor": "#0B1F3A", "actorBorder": "#1F6FEB", "actorLineColor": "#8A9BB3", "signalColor": "#3B4A5E", "signalTextColor": "#0B1F3A", "noteBkgColor": "#FFF6E5", "noteBorderColor": "#E0A100", "noteTextColor": "#3D2E00", "activationBkgColor": "#C7DBFF", "activationBorderColor": "#1F6FEB", "sequenceNumberColor": "#FFFFFF", "labelBoxBkgColor": "#1F6FEB", "labelBoxBorderColor": "#1F6FEB", "labelTextColor": "#FFFFFF", "loopTextColor": "#0B1F3A", "clusterBkg": "#F7F9FC", "clusterBorder": "#C9D3E0", "edgeLabelBackground": "#FFFFFF", "transitionLabelColor": "#0B1F3A", "cScale0": "#1F6FEB", "cScaleLabel0": "#FFFFFF", "cScale1": "#1E8E3E", "cScaleLabel1": "#FFFFFF", "cScale2": "#7E57C2", "cScaleLabel2": "#FFFFFF"}}}%%
flowchart TD
  R(["GET profile of m by viewer v"]):::start --> E{"player m exists?"}
  E -- no --> X1["404 · 40401"]:::bad
  E -- yes --> V{"visibility"}
  V -- "public" --> OK["full profile"]:::ok
  V -- "league" --> S{"v signed in?"}
  S -- yes --> OK
  S -- no --> X2["401 · sign in"]:::warn
  V -- "private" --> P{"v is m or admin?"}
  P -- yes --> OK
  P -- no --> X3["name only · stats hidden"]:::warn
  OK --> OWN{"v is m or admin?"}
  OWN -- yes --> PLUS["+ paid status<br/>+ SL history"]:::fe
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
  participant P as 👤 Player
  participant FE as 📱 ProfilePage
  participant API as ⚙️ league-be
  participant DB as 🗄️ Postgres
  rect rgb(247,249,252)
  P->>FE: Menu › My profile
  FE->>API: GET /players/26110042/profile
  API->>DB: player · player_division_stats · mv_player_lifetime · accolades · last 10 matches
  API-->>FE: profile DTO
  FE-->>P: header · session · lifetime · achievements · recent
  end
```

## API & data

```json
{
  "memberId": "26110042",
  "name": "<player name>",
  "skillLevels": [{ "format": "8_ball", "sl": 5 }],
  "session": { "divisionId": "<division-uuid>", "mp": 7, "mw": 3, "winPct": 42.86, "points": 7, "ppm": 1.0, "pctPointsAvailable": 33.33 },
  "lifetime": { "mp": 54, "mw": 29, "winPct": 53.7, "dsAvg": 0.8, "mpLast2y": 41, "lastPlayedAt": "2026-11-03" },
  "accolades": { "BR": 2, "8OB": 1, "9OB": 0, "RACKLESS": 3, "DOUBLE_STRIKE": 0 },
  "recent": []
}
```

## Edge cases

| ID | Situation | Expected |
|---|---|---|
| EC-34.1 | MP = 0 | Win %, PPM and % PA show "—", never NaN or 0 % |
| EC-34.2 | Player on two teams in different divisions | One session card per division |
| EC-34.3 | Lifetime view not yet refreshed after tonight | The session card is live; lifetime shows "Updated {time}" |

## Acceptance criteria

- **AC-34.1** Given 3 wins in 7 matches and 7 points in 8-Ball, then the session card shows 42.86 %, 1.00 and 33 %.
- **AC-34.2** Given a private profile, when another player opens it, then stats are hidden.

## Open questions

- Should lifetime stats include matches from before the app (paper records)?

---

[E10 overview](README.md) · [F35 →](F35-public-standings.md)
