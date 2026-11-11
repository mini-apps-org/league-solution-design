# F46 — Load testing

> [Feature specs](../README.md) › [E06 — Platform & Delivery](README.md) › **F46** · Phase 2

| Phase | Status | Rules | Repo refs |
|---|---|---|---|
| 2 | 🎯 | NFR-01, NFR-11 · [13 §5](../../13-nfr-and-testing.md) | new `league-be/loadtest/league-night.js` |

## Requirements

*As the owner, I know the platform holds up on our busiest night, plus headroom, before we sign up more venues.*

| ID | Requirement |
|---|---|
| FR-46.1 | A k6 scenario "league night": 200 concurrent team matches starting over 15 min. Each runs 10 put-ups, 5 results and 1 submit over 3 h (compressed ×12 to 15 min in CI) |
| FR-46.2 | Background readers: 2,000 virtual players polling the schedule and night view every 30 s; Phase 2 adds 20 live viewers per match over WebSocket |
| FR-46.3 | Auth uses pre-seeded sessions (as in F45); CSRF tokens are read from the cookie |
| FR-46.4 | Thresholds: `http_req_duration{p(95)} < 300 ms`, `http_req_failed < 0.1 %`, WS fan-out p95 < 1 s (NFR-11) |
| FR-46.5 | Runs against staging, scaled like production, before each minor release. Results (HTML summary + JSON) are archived as CI artifacts and trended |
| FR-46.6 | A soak variant: 1× load for 3 h to catch leaks and pool exhaustion |

## Load model

```mermaid
%%{init: {"theme": "base", "themeVariables": {"fontFamily": "Arial", "fontSize": "14px", "primaryColor": "#E8F1FF", "primaryBorderColor": "#1F6FEB", "primaryTextColor": "#0B1F3A", "lineColor": "#5B6B82", "secondaryColor": "#EAF7EF", "tertiaryColor": "#FFF6E5", "actorBkg": "#DCE9FF", "actorTextColor": "#0B1F3A", "actorBorder": "#1F6FEB", "actorLineColor": "#8A9BB3", "signalColor": "#3B4A5E", "signalTextColor": "#0B1F3A", "noteBkgColor": "#FFF6E5", "noteBorderColor": "#E0A100", "noteTextColor": "#3D2E00", "activationBkgColor": "#C7DBFF", "activationBorderColor": "#1F6FEB", "sequenceNumberColor": "#FFFFFF", "labelBoxBkgColor": "#1F6FEB", "labelBoxBorderColor": "#1F6FEB", "labelTextColor": "#FFFFFF", "loopTextColor": "#0B1F3A", "clusterBkg": "#F7F9FC", "clusterBorder": "#C9D3E0", "edgeLabelBackground": "#FFFFFF", "transitionLabelColor": "#0B1F3A", "cScale0": "#1F6FEB", "cScaleLabel0": "#FFFFFF", "cScale1": "#1E8E3E", "cScaleLabel1": "#FFFFFF", "cScale2": "#7E57C2", "cScaleLabel2": "#FFFFFF"}}}%%
flowchart LR
  subgraph K6["🧪 k6 scenarios"]
    direction TB
    S1["<b>captains</b><br/>400 VUs · ramping arrival"]:::fe
    S2["<b>viewers</b><br/>2,000 VUs · constant"]:::fe
    S3["<b>live viewers</b><br/>WS · Phase 2"]:::fe
  end
  subgraph SUT["⚙️ staging"]
    direction TB
    API["API pods<br/>HPA 2–6"]:::api
    PG[("Cloud SQL")]:::db
    RD[("Redis")]:::db
  end
  S1 == "writes" ==> API
  S2 --> API
  S3 -.-> API
  API --> PG
  API -.-> RD
  class S3,RD planned
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

## Flow: one virtual captain

```mermaid
%%{init: {"theme": "base", "themeVariables": {"fontFamily": "Arial", "fontSize": "14px", "primaryColor": "#E8F1FF", "primaryBorderColor": "#1F6FEB", "primaryTextColor": "#0B1F3A", "lineColor": "#5B6B82", "secondaryColor": "#EAF7EF", "tertiaryColor": "#FFF6E5", "actorBkg": "#DCE9FF", "actorTextColor": "#0B1F3A", "actorBorder": "#1F6FEB", "actorLineColor": "#8A9BB3", "signalColor": "#3B4A5E", "signalTextColor": "#0B1F3A", "noteBkgColor": "#FFF6E5", "noteBorderColor": "#E0A100", "noteTextColor": "#3D2E00", "activationBkgColor": "#C7DBFF", "activationBorderColor": "#1F6FEB", "sequenceNumberColor": "#FFFFFF", "labelBoxBkgColor": "#1F6FEB", "labelBoxBorderColor": "#1F6FEB", "labelTextColor": "#FFFFFF", "loopTextColor": "#0B1F3A", "clusterBkg": "#F7F9FC", "clusterBorder": "#C9D3E0", "edgeLabelBackground": "#FFFFFF", "transitionLabelColor": "#0B1F3A", "cScale0": "#1F6FEB", "cScaleLabel0": "#FFFFFF", "cScale1": "#1E8E3E", "cScaleLabel1": "#FFFFFF", "cScale2": "#7E57C2", "cScaleLabel2": "#FFFFFF"}}}%%
sequenceDiagram
  autonumber
  participant V as 🧪 VU captain
  participant API as ⚙️ league-be
  rect rgb(247,249,252)
  V->>API: GET /team-matches/{id}
  loop 5 slots
    V->>API: GET available players
    V->>API: POST put-up
    V->>V: think time 20–60 s
    V->>API: PUT result
  end
  V->>API: POST submit
  end
```

## Edge cases

| ID | Situation | Expected |
|---|---|---|
| EC-46.1 | DB pool exhaustion shows up first | Tune the pool and `max_connections`, or add PgBouncer, before adding pods |
| EC-46.2 | Hot rows (same team match updated by both captains) | Check lock waits in traces; the rule functions must keep transactions short |
| EC-46.3 | Rate limiter trips the test | Test users get a higher bucket via a staging-only config |

## Acceptance criteria

- **AC-46.1** Given the league-night scenario on staging, then all thresholds pass and the report is attached to the release.
- **AC-46.2** Given the 3 h soak, then memory per pod stays flat (± 10 %).

## Open questions

- What's the growth target: 200 concurrent nights, or more?

---

[← F45](F45-playwright-e2e.md) · [E06 overview](README.md)
