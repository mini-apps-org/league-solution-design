# F10 — League API

> [Feature specs](../README.md) › [E02 — League Data Foundation](README.md) › **F10** · Phase 1

| Phase | Status | Repo refs |
|---|---|---|
| 1 | ❌ | spec: `plan-3-league-api-endpoints.md` · client: `league-fe/src/api/leagueAPI.ts`, `src/types/league.ts` |

## Requirements

| ID | Requirement |
|---|---|
| FR-10.1 | Implement the routes in [07 §2](../../07-api-design.md) under `internal/league` with the repo layering (handlers → services → repositories) |
| FR-10.2 | Responses use `{session_id, count, data, metadata}`. Lists set `count`. Bodies are camelCase; query params are snake_case |
| FR-10.3 | Writes re-check rules server-side (`can_put_up`) even if the UI already blocked the action |
| FR-10.4 | New error codes `40003 UNPAID_MEMBER`, `40004 PUT_UP_REJECTED`, `40005–40007` (member link). Never renumber |
| FR-10.5 | `make swagger` regenerates `docs/swagger`, and the FE types are generated from it (F24) |
| FR-10.6 | An integration test runs every query against a seeded DB (`LEAGUE_TEST_DATABASE_URL`) |

## Endpoint map

```mermaid
%%{init: {"theme": "base", "themeVariables": {"fontFamily": "Arial", "fontSize": "14px", "primaryColor": "#E8F1FF", "primaryBorderColor": "#1F6FEB", "primaryTextColor": "#0B1F3A", "lineColor": "#5B6B82", "secondaryColor": "#EAF7EF", "tertiaryColor": "#FFF6E5", "actorBkg": "#DCE9FF", "actorTextColor": "#0B1F3A", "actorBorder": "#1F6FEB", "actorLineColor": "#8A9BB3", "signalColor": "#3B4A5E", "signalTextColor": "#0B1F3A", "noteBkgColor": "#FFF6E5", "noteBorderColor": "#E0A100", "noteTextColor": "#3D2E00", "activationBkgColor": "#C7DBFF", "activationBorderColor": "#1F6FEB", "sequenceNumberColor": "#FFFFFF", "labelBoxBkgColor": "#1F6FEB", "labelBoxBorderColor": "#1F6FEB", "labelTextColor": "#FFFFFF", "loopTextColor": "#0B1F3A", "clusterBkg": "#F7F9FC", "clusterBorder": "#C9D3E0", "edgeLabelBackground": "#FFFFFF", "transitionLabelColor": "#0B1F3A", "cScale0": "#1F6FEB", "cScaleLabel0": "#FFFFFF", "cScale1": "#1E8E3E", "cScaleLabel1": "#FFFFFF", "cScale2": "#7E57C2", "cScaleLabel2": "#FFFFFF"}}}%%
flowchart LR
  subgraph R["Read · session"]
    direction TB
    R1["GET /seasons"]:::api
    R2["GET /divisions?season_id"]:::api
    R3["GET /team-matches?division_id&week_no"]:::api
    R4["GET /team-matches/{id}"]:::api
  end
  subgraph W["Write · captain-owns-night or admin"]
    direction TB
    W1["GET /team-matches/{id}/available"]:::api
    W2["POST /team-matches/{id}/put-up"]:::api
    W3["PUT /individual-matches/{id}/result"]:::api
    W4["POST /team-matches/{id}/submit"]:::api
    W5["POST /teams/{id}/roster"]:::api
  end
  subgraph A["Admin"]
    direction TB
    A1["GET /players?q"]:::api
    A2["POST /players/{id}/skill-level"]:::api
    A3["GET /players/{id}/skill-level-history"]:::api
    A4["GET /teams?division_id"]:::api
  end
  DB[("rule functions · views")]:::db
  R --> DB
  W ==> DB
  A --> DB
  class R1,R2,R3,R4,W1,W2,W3,W4,W5,A1,A2,A3,A4 gap
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

## Edge cases

| ID | Situation | Expected |
|---|---|---|
| EC-10.1 | Request body has an unknown field (e.g. snake_case `match_order`) | 400 `40001` (`DecodeJSON` rejects unknown fields) |
| EC-10.2 | `LIKE` search for `100%` | Matched literally (input escaped) |
| EC-10.3 | Two captains put up at the same time | One succeeds; the other gets `40004`, and the FE refreshes the list |

## Acceptance criteria
- **AC-10.1** Swagger lists 18 paths.
- **AC-10.2** The integration test passes all plan-3 assertions.

---

[← F9](F09-seed-migrate.md) · [E02 overview](README.md) · [F38 →](F38-generated-ids.md)
