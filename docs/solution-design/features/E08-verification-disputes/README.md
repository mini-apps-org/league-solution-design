# E08 — Score Verification & Disputes

> [Feature specs](../README.md) › **E08**

| | |
|---|---|
| **Goal** | Both teams agree on the night's record before it counts. Agreement earns a standings bonus; disagreement becomes a dispute that an admin resolves with an audit trail |
| **Phase** | 2 |
| **Status** | 🎯 Not started. Phase 1 has a single `submitted` status ([E04-F15](../E04-night-operations/F15-submit-night.md)) |
| **Actors** | Home captain, Away captain, Admin (League Operator) |
| **Related** | [04 §8](../../04-domain-rules.md) · [08 §6](../../08-scorekeeping-engine.md) · [Q30](../../14-open-questions.md) |

## Features by phase

### Phase 1

Nothing. A night is final as soon as one captain or an admin submits it; admins can still edit afterwards.

### Phase 2

| # | Feature | Status |
|---|---|---|
| F31 | [Dual-captain verification, bonus, disputes, admin resolution](F31-verification-disputes.md) | 🎯 |

## Phase 2 deep dive

### What changes from Phase 1

```mermaid
%%{init: {"theme": "base", "themeVariables": {"fontFamily": "Arial", "fontSize": "14px", "primaryColor": "#E8F1FF", "primaryBorderColor": "#1F6FEB", "primaryTextColor": "#0B1F3A", "lineColor": "#5B6B82", "secondaryColor": "#EAF7EF", "tertiaryColor": "#FFF6E5", "actorBkg": "#DCE9FF", "actorTextColor": "#0B1F3A", "actorBorder": "#1F6FEB", "actorLineColor": "#8A9BB3", "signalColor": "#3B4A5E", "signalTextColor": "#0B1F3A", "noteBkgColor": "#FFF6E5", "noteBorderColor": "#E0A100", "noteTextColor": "#3D2E00", "activationBkgColor": "#C7DBFF", "activationBorderColor": "#1F6FEB", "sequenceNumberColor": "#FFFFFF", "labelBoxBkgColor": "#1F6FEB", "labelBoxBorderColor": "#1F6FEB", "labelTextColor": "#FFFFFF", "loopTextColor": "#0B1F3A", "clusterBkg": "#F7F9FC", "clusterBorder": "#C9D3E0", "edgeLabelBackground": "#FFFFFF", "transitionLabelColor": "#0B1F3A", "cScale0": "#1F6FEB", "cScaleLabel0": "#FFFFFF", "cScale1": "#1E8E3E", "cScaleLabel1": "#FFFFFF", "cScale2": "#7E57C2", "cScaleLabel2": "#FFFFFF"}}}%%
flowchart TB
  subgraph P1["Phase 1"]
    direction LR
    A1["in_progress"]:::fe --> B1["<b>submitted</b><br/>counts at once"]:::ok
  end
  subgraph P2["Phase 2"]
    direction LR
    A2["in_progress"]:::fe --> B2["<b>awaiting verification</b><br/>24 h window"]:::warn
    B2 -- "both confirm · same hash" --> C2["<b>finalized</b><br/>+ bonus"]:::ok
    B2 -- "reject or mismatch" --> D2["<b>disputed</b>"]:::bad
    B2 -- "window expires" --> E2["<b>finalized · no bonus</b>"]:::api
    D2 -- "admin resolves" --> E2
  end
  P1 ~~~ P2
  class A2,B2,C2,D2,E2 planned
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

*Standings and stats count a night only from `finalized` or `finalized · no bonus`. In Phase 1 they count from `submitted`.*

### Components

```mermaid
%%{init: {"theme": "base", "themeVariables": {"fontFamily": "Arial", "fontSize": "14px", "primaryColor": "#E8F1FF", "primaryBorderColor": "#1F6FEB", "primaryTextColor": "#0B1F3A", "lineColor": "#5B6B82", "secondaryColor": "#EAF7EF", "tertiaryColor": "#FFF6E5", "actorBkg": "#DCE9FF", "actorTextColor": "#0B1F3A", "actorBorder": "#1F6FEB", "actorLineColor": "#8A9BB3", "signalColor": "#3B4A5E", "signalTextColor": "#0B1F3A", "noteBkgColor": "#FFF6E5", "noteBorderColor": "#E0A100", "noteTextColor": "#3D2E00", "activationBkgColor": "#C7DBFF", "activationBorderColor": "#1F6FEB", "sequenceNumberColor": "#FFFFFF", "labelBoxBkgColor": "#1F6FEB", "labelBoxBorderColor": "#1F6FEB", "labelTextColor": "#FFFFFF", "loopTextColor": "#0B1F3A", "clusterBkg": "#F7F9FC", "clusterBorder": "#C9D3E0", "edgeLabelBackground": "#FFFFFF", "transitionLabelColor": "#0B1F3A", "cScale0": "#1F6FEB", "cScaleLabel0": "#FFFFFF", "cScale1": "#1E8E3E", "cScaleLabel1": "#FFFFFF", "cScale2": "#7E57C2", "cScaleLabel2": "#FFFFFF"}}}%%
flowchart LR
  HC(["👤 Home captain"]):::actor
  AC(["👤 Away captain"]):::actor
  ADM(["👤 Admin"]):::actor
  subgraph FE["📱 league-fe"]
    direction TB
    VS["<b>VerifySheet</b><br/>summary · confirm · reject"]:::fe
    DQ["<b>Admin › Disputes</b><br/>diff · corrections · bonus"]:::fe
  end
  subgraph BE["⚙️ league-be"]
    direction TB
    SN["<b>snapshot builder</b><br/>canonical JSON · sha256"]:::api
    VF["POST /team-matches/{id}/verify"]:::api
    RS["POST /disputes/{id}:resolve"]:::api
    JOB["<b>worker</b><br/>deadline sweep"]:::api
  end
  subgraph DB["🗄️ Postgres"]
    direction TB
    TM[("<b>team_matches</b><br/>status · snapshot_hash · deadline")]:::db
    VR[("<b>verifications</b>")]:::db
    DS[("<b>disputes</b>")]:::db
    ST[("<b>team_standings</b><br/>+ bonus")]:::db
  end
  HC ==> VS
  AC ==> VS
  VS ==> VF --> VR
  SN --> TM
  VF --> TM
  VF -. "mismatch" .-> DS
  ADM ==> DQ ==> RS --> DS
  RS --> TM
  JOB -.-> TM
  TM --> ST
  class VS,DQ,SN,VF,RS,JOB,VR,DS planned
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

| Object | Change |
|---|---|
| `team_matches.status` | Adds `awaiting_verification`, `finalized`, `finalized_no_bonus`, `disputed` (Phase 1 `submitted` maps to `awaiting_verification`) |
| `team_matches` | + `snapshot_json jsonb`, `snapshot_hash text`, `verification_deadline timestamptz`, `bonus_home int`, `bonus_away int` |
| `verifications (team_match_id, team_id, decision, snapshot_hash, comment, user_id, at)` | One row per team; latest wins until finalized |
| `disputes (id, team_match_id, opened_by, reason, diff jsonb, status, resolution, corrections jsonb, grant_bonus, resolved_by, resolved_at)` | Admin queue |
| `team_standings` view | Sums only finalized nights and adds the bonus |
