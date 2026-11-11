# F50 — Multi-league & LO roles

> [Feature specs](../README.md) › [E12 — Growth](README.md) › **F50** · Phase 3

| Phase | Status | Rules |
|---|---|---|
| 3 | 🎯 outline | [04 §1](../../04-domain-rules.md) · [11 RBAC](../../11-security-and-roles.md) |

## Requirements

| ID | Requirement |
|---|---|
| FR-50.1 | A `leagues` tenant: name, region, bylaws (`jsonb`), fee schedule, branding |
| FR-50.2 | Roles become scoped: **Platform admin** (all leagues), **League Operator** (one league), Captain (team), Player |
| FR-50.3 | Every query is filtered by `league_id`; Postgres row-level security as a second guard |
| FR-50.4 | A player can belong to several leagues with one account and one member ID |
| FR-50.5 | League switcher in the header; the URL carries the league slug (`/l/hcm/...`) |
| FR-50.6 | Platform admins can create a league and invite its LO |

## Key rules and assumptions

- Phase 1 has a single implicit league. Migration: create one `leagues` row and backfill `league_id`.
- Member IDs stay global (R-132); team IDs are already region-coded (R-131).

## Diagram

```mermaid
%%{init: {"theme": "base", "themeVariables": {"fontFamily": "Arial", "fontSize": "14px", "primaryColor": "#E8F1FF", "primaryBorderColor": "#1F6FEB", "primaryTextColor": "#0B1F3A", "lineColor": "#5B6B82", "secondaryColor": "#EAF7EF", "tertiaryColor": "#FFF6E5", "actorBkg": "#DCE9FF", "actorTextColor": "#0B1F3A", "actorBorder": "#1F6FEB", "actorLineColor": "#8A9BB3", "signalColor": "#3B4A5E", "signalTextColor": "#0B1F3A", "noteBkgColor": "#FFF6E5", "noteBorderColor": "#E0A100", "noteTextColor": "#3D2E00", "activationBkgColor": "#C7DBFF", "activationBorderColor": "#1F6FEB", "sequenceNumberColor": "#FFFFFF", "labelBoxBkgColor": "#1F6FEB", "labelBoxBorderColor": "#1F6FEB", "labelTextColor": "#FFFFFF", "loopTextColor": "#0B1F3A", "clusterBkg": "#F7F9FC", "clusterBorder": "#C9D3E0", "edgeLabelBackground": "#FFFFFF", "transitionLabelColor": "#0B1F3A", "cScale0": "#1F6FEB", "cScaleLabel0": "#FFFFFF", "cScale1": "#1E8E3E", "cScaleLabel1": "#FFFFFF", "cScale2": "#7E57C2", "cScaleLabel2": "#FFFFFF"}}}%%
flowchart TD
  U(["request with session"]):::start --> R["resolve league<br/>from URL slug"]:::api
  R --> M{"user has a role<br/>in this league?"}
  M -- no --> X["403"]:::bad
  M -- yes --> S["SET app.league_id"]:::api --> Q[("queries with<br/>row-level security")]:::db
  PA(["platform admin"]):::actor -. "all leagues" .-> S
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

- Shared or separate player SLs across leagues? Billing per league?

---

[← F49](F49-sandbagging-detection.md) · [E12 overview](README.md) · [F51 →](F51-sponsors.md)
