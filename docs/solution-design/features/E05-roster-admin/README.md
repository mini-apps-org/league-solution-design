# E05 — Roster & Player Admin

> [Feature specs](../README.md) › **E05**

| | |
|---|---|
| **Goal** | Captains keep rosters filled with paid members. Admins find players, change skill levels with a reason, and move players between teams, all traceable |
| **Phase** | 1 (F16–F19) · 2 (F39c roster lock + one team per division, F41 audit log) |
| **Status** | 🅿️ Screens parked · ❌ endpoints and `change_skill_level()` missing (E02) |
| **Actors** | Captain, Admin |
| **Related** | [04 §3, §10](../../04-domain-rules.md) · [06 B.1](../../06-data-model.md) · [11 §2](../../11-security-and-roles.md) |

## Features by phase

### Phase 1

| # | Feature | Status |
|---|---|---|
| F16 | [Add paid member](F16-add-paid-member.md) | 🅿️ |
| F17 | [Player search](F17-player-search.md) | 🅿️ |
| F18 | [Skill-level change & history](F18-skill-level-change.md) | 🅿️ |
| F19 | [Player transfer](F19-player-transfer.md) | 🅿️ |

### Phase 2

| # | Feature | Status |
|---|---|---|
| F39c | [Roster lock](F39c-roster-lock.md) | 🎯 |
| F41 | [Audit log](F41-audit-log.md) | 🎯 |

## Phase 1 deep dive

### Components

```mermaid
%%{init: {"theme": "base", "themeVariables": {"fontFamily": "Arial", "fontSize": "14px", "primaryColor": "#E8F1FF", "primaryBorderColor": "#1F6FEB", "primaryTextColor": "#0B1F3A", "lineColor": "#5B6B82", "secondaryColor": "#EAF7EF", "tertiaryColor": "#FFF6E5", "actorBkg": "#DCE9FF", "actorTextColor": "#0B1F3A", "actorBorder": "#1F6FEB", "actorLineColor": "#8A9BB3", "signalColor": "#3B4A5E", "signalTextColor": "#0B1F3A", "noteBkgColor": "#FFF6E5", "noteBorderColor": "#E0A100", "noteTextColor": "#3D2E00", "activationBkgColor": "#C7DBFF", "activationBorderColor": "#1F6FEB", "sequenceNumberColor": "#FFFFFF", "labelBoxBkgColor": "#1F6FEB", "labelBoxBorderColor": "#1F6FEB", "labelTextColor": "#FFFFFF", "loopTextColor": "#0B1F3A", "clusterBkg": "#F7F9FC", "clusterBorder": "#C9D3E0", "edgeLabelBackground": "#FFFFFF", "transitionLabelColor": "#0B1F3A", "cScale0": "#1F6FEB", "cScaleLabel0": "#FFFFFF", "cScale1": "#1E8E3E", "cScaleLabel1": "#FFFFFF", "cScale2": "#7E57C2", "cScaleLabel2": "#FFFFFF"}}}%%
flowchart LR
  CAP(["Captain"]):::actor
  ADM(["Admin"]):::actor
  subgraph FE["league-fe"]
    direction TB
    APM["<b>AddPaidMemberSheet</b><br/>on RosterPanel"]:::fe
    PP["<b>PlayersPage</b> /admin/players<br/>search · drawer"]:::fe
    SLP["<b>SkillLevelPanel</b><br/>2–7 · reason · history"]:::fe
    TR["<b>Transfer</b> select + button"]:::fe
    RA["<b>RequireAdmin</b>"]:::fe
  end
  subgraph BE["league-be"]
    direction TB
    E1["POST /teams/{id}/roster"]:::api
    E2["GET /players?q"]:::api
    E3["POST /players/{id}/skill-level<br/>GET …/skill-level-history"]:::api
    E4["GET /teams?division_id"]:::api
  end
  subgraph DB["🗄️ Postgres"]
    direction TB
    R[("team_rosters<br/>close-then-open")]:::db
    P[("players · is_paid")]:::db
    F[("change_skill_level()<br/>skill_level_history")]:::db
    AU[("audit_log · Phase 2")]:::db
  end
  CAP ==> APM --> E1 --> R
  ADM ==> RA --> PP --> E2 --> P
  PP --> SLP --> E3 --> F
  PP --> TR --> E1
  TR --> E4
  E1 -.-> AU
  E3 -.-> AU
  class E1,E2,E3,E4,F gap
  class AU planned
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

### Main flow: admin changes a skill level

```mermaid
%%{init: {"theme": "base", "themeVariables": {"fontFamily": "Arial", "fontSize": "14px", "primaryColor": "#E8F1FF", "primaryBorderColor": "#1F6FEB", "primaryTextColor": "#0B1F3A", "lineColor": "#5B6B82", "secondaryColor": "#EAF7EF", "tertiaryColor": "#FFF6E5", "actorBkg": "#DCE9FF", "actorTextColor": "#0B1F3A", "actorBorder": "#1F6FEB", "actorLineColor": "#8A9BB3", "signalColor": "#3B4A5E", "signalTextColor": "#0B1F3A", "noteBkgColor": "#FFF6E5", "noteBorderColor": "#E0A100", "noteTextColor": "#3D2E00", "activationBkgColor": "#C7DBFF", "activationBorderColor": "#1F6FEB", "sequenceNumberColor": "#FFFFFF", "labelBoxBkgColor": "#1F6FEB", "labelBoxBorderColor": "#1F6FEB", "labelTextColor": "#FFFFFF", "loopTextColor": "#0B1F3A", "clusterBkg": "#F7F9FC", "clusterBorder": "#C9D3E0", "edgeLabelBackground": "#FFFFFF", "transitionLabelColor": "#0B1F3A", "cScale0": "#1F6FEB", "cScaleLabel0": "#FFFFFF", "cScale1": "#1E8E3E", "cScaleLabel1": "#FFFFFF", "cScale2": "#7E57C2", "cScaleLabel2": "#FFFFFF"}}}%%
sequenceDiagram
  autonumber
  participant A as Admin
  participant FE as PlayersPage
  participant API as league-be
  participant DB as Postgres
  rect rgb(247,249,252)
  A->>FE: search "Wheeler"
  FE->>API: GET /players?q=Wheeler
  API-->>FE: players with SL, team
  A->>FE: open player, choose SL 6, reason "Consistent 4-inning wins"
  FE->>FE: preview vs SL 5 · races to 5 (was 4)
  A->>FE: Save skill level
  FE->>API: POST /players/{id}/skill-level {newSkillLevel 6, reason}
  API->>DB: change_skill_level(player, 6, reason, admin)
  DB-->>API: history id · players.skill_level = 6
  API-->>FE: history row
  FE->>API: GET /players/{id}/skill-level-history
  FE-->>A: "4 → 6 · reason · by Admin · 10 Nov"
  Note over API,DB: played matches keep their snapshot SL and race
  end
```

## Phase 2 deep dive

**Scope:** [F39c Roster lock and one team per division](F39c-roster-lock.md) and [F41 Audit log](F41-audit-log.md). Phase 1 lets admins and captains change rosters at any time. Phase 2 enforces the league bylaws (per-division membership, lock after week 4, no adds mid-night) and records every sensitive change.

### Components: what Phase 2 adds

```mermaid
%%{init: {"theme": "base", "themeVariables": {"fontFamily": "Arial", "fontSize": "14px", "primaryColor": "#E8F1FF", "primaryBorderColor": "#1F6FEB", "primaryTextColor": "#0B1F3A", "lineColor": "#5B6B82", "secondaryColor": "#EAF7EF", "tertiaryColor": "#FFF6E5", "actorBkg": "#DCE9FF", "actorTextColor": "#0B1F3A", "actorBorder": "#1F6FEB", "actorLineColor": "#8A9BB3", "signalColor": "#3B4A5E", "signalTextColor": "#0B1F3A", "noteBkgColor": "#FFF6E5", "noteBorderColor": "#E0A100", "noteTextColor": "#3D2E00", "activationBkgColor": "#C7DBFF", "activationBorderColor": "#1F6FEB", "sequenceNumberColor": "#FFFFFF", "labelBoxBkgColor": "#1F6FEB", "labelBoxBorderColor": "#1F6FEB", "labelTextColor": "#FFFFFF", "loopTextColor": "#0B1F3A", "clusterBkg": "#F7F9FC", "clusterBorder": "#C9D3E0", "edgeLabelBackground": "#FFFFFF", "transitionLabelColor": "#0B1F3A", "cScale0": "#1F6FEB", "cScaleLabel0": "#FFFFFF", "cScale1": "#1E8E3E", "cScaleLabel1": "#FFFFFF", "cScale2": "#7E57C2", "cScaleLabel2": "#FFFFFF"}}}%%
flowchart LR
  C(["👤 Captain"]):::actor
  ADM(["👤 Admin"]):::actor
  subgraph FE["📱 league-fe"]
    direction TB
    AM["<b>AddMemberSheet</b><br/>+ pending state"]:::fe
    AQ["<b>Admin › Approvals</b>"]:::fe
    AL["<b>Admin › Audit log</b><br/>filter by entity · actor"]:::fe
  end
  subgraph BE["⚙️ league-be"]
    direction TB
    RR["POST /teams/{id}/roster<br/>→ roster rules"]:::api
    RA["POST /roster-requests/{id}:approve"]:::api
    AU["audit writer<br/>same transaction"]:::api
    AG["GET /audit-log"]:::api
  end
  subgraph DB["🗄️ Postgres"]
    direction TB
    TR[("<b>team_rosters</b><br/>+ division_id · unique per division")]:::db
    RQ[("<b>roster_requests</b>")]:::db
    LG[("<b>audit_log</b><br/>append-only")]:::db
  end
  C ==> AM ==> RR
  RR --> TR
  RR -. "after lock week" .-> RQ
  ADM ==> AQ --> RA --> TR
  ADM --> AL --> AG --> LG
  RR --> AU
  RA --> AU
  AU --> LG
  class AQ,AL,RA,AU,AG,RQ,LG planned
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

### Key flow: a late roster add

```mermaid
%%{init: {"theme": "base", "themeVariables": {"fontFamily": "Arial", "fontSize": "14px", "primaryColor": "#E8F1FF", "primaryBorderColor": "#1F6FEB", "primaryTextColor": "#0B1F3A", "lineColor": "#5B6B82", "secondaryColor": "#EAF7EF", "tertiaryColor": "#FFF6E5", "actorBkg": "#DCE9FF", "actorTextColor": "#0B1F3A", "actorBorder": "#1F6FEB", "actorLineColor": "#8A9BB3", "signalColor": "#3B4A5E", "signalTextColor": "#0B1F3A", "noteBkgColor": "#FFF6E5", "noteBorderColor": "#E0A100", "noteTextColor": "#3D2E00", "activationBkgColor": "#C7DBFF", "activationBorderColor": "#1F6FEB", "sequenceNumberColor": "#FFFFFF", "labelBoxBkgColor": "#1F6FEB", "labelBoxBorderColor": "#1F6FEB", "labelTextColor": "#FFFFFF", "loopTextColor": "#0B1F3A", "clusterBkg": "#F7F9FC", "clusterBorder": "#C9D3E0", "edgeLabelBackground": "#FFFFFF", "transitionLabelColor": "#0B1F3A", "cScale0": "#1F6FEB", "cScaleLabel0": "#FFFFFF", "cScale1": "#1E8E3E", "cScaleLabel1": "#FFFFFF", "cScale2": "#7E57C2", "cScaleLabel2": "#FFFFFF"}}}%%
sequenceDiagram
  autonumber
  participant C as 👤 Captain
  participant API as ⚙️ league-be
  participant DB as 🗄️ Postgres
  participant A as 👤 Admin
  rect rgb(247,249,252)
  C->>API: POST /teams/03209/roster {playerId}
  API->>DB: check roster rules R-011, R-012, R-017
  Note over API,DB: week 6 > roster_lock_week 4 · R-016
  API->>DB: INSERT roster_requests pending · INSERT audit_log
  API-->>C: 202 pending approval
  A->>API: POST /roster-requests/{id}:approve
  API->>DB: BEGIN · re-check rules · INSERT team_rosters · UPDATE request approved · INSERT audit_log · COMMIT
  API-->>A: 200 roster row
  end
```

### Data delta

| Change | Why |
|---|---|
| `team_rosters.division_id` + `UNIQUE (player_id, division_id) WHERE left_at IS NULL` | Replaces the Phase 1 single-active-roster index |
| `leagues.bylaws jsonb` (`roster_lock_week`, `allow_multi_division_same_night`) | Rules are configured, not hard-coded |
| New `roster_requests (id, team_id, player_id, requested_by, status, decided_by, decided_at)` | Late adds wait for approval |
| New `audit_log (id, at, actor_user_id, action, entity, entity_id, before jsonb, after jsonb, reason)` with no UPDATE or DELETE grant | Tamper-evident history (F41) |
