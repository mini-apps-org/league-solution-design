# E10 — Profile & Standings

> [Feature specs](../README.md) › **E10**

| | |
|---|---|
| **Goal** | Players see their own record and achievements; everyone, signed in or not, sees division standings and results |
| **Phase** | 2 |
| **Status** | 🎯 Not started. Phase 1 already computes `player_division_stats` and `team_standings` (E02-F8) and shows per-session stats in the roster (E03-F12) |
| **Actors** | Player, Captain, Public visitor |
| **Related** | [04 §12, §13](../../04-domain-rules.md) · [06 views](../../06-data-model.md) · [08 §7](../../08-scorekeeping-engine.md) |

## Features by phase

### Phase 1

The data exists but no dedicated screen: roster rows show MW/MP and points for the session.

### Phase 2

| # | Feature | Status |
|---|---|---|
| F34 | [Player profile](F34-player-profile.md) | 🎯 |
| F35 | [Public standings](F35-public-standings.md) | 🎯 |

## Phase 2 deep dive

### Where the numbers come from

```mermaid
%%{init: {"theme": "base", "themeVariables": {"fontFamily": "Arial", "fontSize": "14px", "primaryColor": "#E8F1FF", "primaryBorderColor": "#1F6FEB", "primaryTextColor": "#0B1F3A", "lineColor": "#5B6B82", "secondaryColor": "#EAF7EF", "tertiaryColor": "#FFF6E5", "actorBkg": "#DCE9FF", "actorTextColor": "#0B1F3A", "actorBorder": "#1F6FEB", "actorLineColor": "#8A9BB3", "signalColor": "#3B4A5E", "signalTextColor": "#0B1F3A", "noteBkgColor": "#FFF6E5", "noteBorderColor": "#E0A100", "noteTextColor": "#3D2E00", "activationBkgColor": "#C7DBFF", "activationBorderColor": "#1F6FEB", "sequenceNumberColor": "#FFFFFF", "labelBoxBkgColor": "#1F6FEB", "labelBoxBorderColor": "#1F6FEB", "labelTextColor": "#FFFFFF", "loopTextColor": "#0B1F3A", "clusterBkg": "#F7F9FC", "clusterBorder": "#C9D3E0", "edgeLabelBackground": "#FFFFFF", "transitionLabelColor": "#0B1F3A", "cScale0": "#1F6FEB", "cScaleLabel0": "#FFFFFF", "cScale1": "#1E8E3E", "cScaleLabel1": "#FFFFFF", "cScale2": "#7E57C2", "cScaleLabel2": "#FFFFFF"}}}%%
flowchart LR
  IM[("<b>individual_matches</b><br/>games · points · innings · DS")]:::db --> V1[("<b>player_division_stats</b><br/>session view")]:::db
  IM --> MV1[("<b>mv_player_lifetime</b><br/>materialized")]:::db
  AC[("<b>player_accolades</b>")]:::db --> MV1
  TM[("<b>team_matches</b><br/>finalized + bonus")]:::db --> V2[("<b>team_standings</b>")]:::db
  W["<b>worker</b><br/>refresh on finalize"]:::api -.-> MV1
  V1 --> P["<b>ProfilePage</b><br/>F34"]:::fe
  MV1 --> P
  V2 --> S["<b>StandingsPage</b><br/>F35 · public"]:::fe
  class MV1,W,P,S planned
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

*Session numbers come from live views (always exact). Lifetime numbers come from a materialized view refreshed by the worker after each finalized night.*

### Components

```mermaid
%%{init: {"theme": "base", "themeVariables": {"fontFamily": "Arial", "fontSize": "14px", "primaryColor": "#E8F1FF", "primaryBorderColor": "#1F6FEB", "primaryTextColor": "#0B1F3A", "lineColor": "#5B6B82", "secondaryColor": "#EAF7EF", "tertiaryColor": "#FFF6E5", "actorBkg": "#DCE9FF", "actorTextColor": "#0B1F3A", "actorBorder": "#1F6FEB", "actorLineColor": "#8A9BB3", "signalColor": "#3B4A5E", "signalTextColor": "#0B1F3A", "noteBkgColor": "#FFF6E5", "noteBorderColor": "#E0A100", "noteTextColor": "#3D2E00", "activationBkgColor": "#C7DBFF", "activationBorderColor": "#1F6FEB", "sequenceNumberColor": "#FFFFFF", "labelBoxBkgColor": "#1F6FEB", "labelBoxBorderColor": "#1F6FEB", "labelTextColor": "#FFFFFF", "loopTextColor": "#0B1F3A", "clusterBkg": "#F7F9FC", "clusterBorder": "#C9D3E0", "edgeLabelBackground": "#FFFFFF", "transitionLabelColor": "#0B1F3A", "cScale0": "#1F6FEB", "cScaleLabel0": "#FFFFFF", "cScale1": "#1E8E3E", "cScaleLabel1": "#FFFFFF", "cScale2": "#7E57C2", "cScaleLabel2": "#FFFFFF"}}}%%
flowchart LR
  PL(["👤 Player"]):::actor
  PUB(["👤 Public visitor"]):::actor
  subgraph FE["📱 league-fe"]
    direction TB
    PP["<b>/players/:memberId</b><br/>ProfilePage"]:::fe
    SP["<b>/standings/:divisionId</b><br/>StandingsPage · no sign-in"]:::fe
  end
  subgraph BE["⚙️ league-be"]
    direction TB
    G1["GET /players/{memberId}/profile"]:::api
    G2["GET /public/divisions/{id}/standings"]:::api
    G3["GET /public/teams/{id}/results"]:::api
    CC["Cache-Control 60 s<br/>Cloudflare edge cache"]:::ext
  end
  DB[("🗄️ views · materialized views")]:::db
  PL ==> PP ==> G1 --> DB
  PUB ==> SP ==> CC --> G2 --> DB
  SP --> G3 --> DB
  class PP,SP,G1,G2,G3,CC planned
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

### Data delta

| Object | Purpose |
|---|---|
| `mv_player_lifetime (player_id, format, mp, mw, win_pct, ds_avg, br, eob, nob, rackless, double_strike, last_played_at, mp_2y)` | Lifetime profile metrics |
| `team_standings` view | + bonus, + tie-break columns (points, then match wins, then head-to-head) |
| `players.profile_visibility` | `league` (default) · `public` · `private` |
| Public routes under `/api/v1/public/*` | No cookie, no CSRF, cacheable, only public fields |
