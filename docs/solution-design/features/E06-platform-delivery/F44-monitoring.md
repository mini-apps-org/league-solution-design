# F44 — Monitoring and error tracking

> [Feature specs](../README.md) › [E06 — Platform & Delivery](README.md) › **F44** · Phase 2

| Phase | Status | Rules | Repo refs |
|---|---|---|---|
| 2 | 🎯 | NFR-01, NFR-02, NFR-11 · [12 §6](../../12-infra-devops.md) | new `league-be/internal/telemetry` · `league-fe/src/lib/monitoring.ts` |

## Requirements

*As the on-call engineer, I know something is wrong on league night before a captain calls me, and I can see exactly which request failed.*

| ID | Requirement |
|---|---|
| FR-44.1 | OpenTelemetry SDK in the API and worker: HTTP server spans (route templates, not raw paths), pgx spans, outgoing HTTP spans. Export to Cloud Trace; sample 10 %, plus 100 % of errors |
| FR-44.2 | Metrics to Managed Prometheus: `http_server_duration` (route, status), `db_pool_in_use`, `outbox_lag_seconds`, `outbox_dead_letters`, `ws_connections` (E07), business counters `putups_total`, `results_total`, `nights_submitted_total` |
| FR-44.3 | Dashboards: **Golden signals** (rate, errors, p50/p95/p99, saturation) and **League night** (active nights, put-ups and results per minute, submit funnel, slowest routes) |
| FR-44.4 | Alerts, routed to Zalo/Telegram for the on-call: p95 > 500 ms for 5 min · 5xx > 1 % for 5 min · outbox lag > 60 s · any dead letter · DB CPU > 80 % for 10 min · uptime check failing 2 of 3 regions |
| FR-44.5 | Sentry for the FE (React error boundary, unhandled rejections) and the BE (panics, 5xx). Release = git tag; FE source maps uploaded in CD and not served publicly |
| FR-44.6 | PII: no emails, names or member IDs in spans, metrics labels or Sentry events. User = hashed user ID |
| FR-44.7 | Uptime checks: `https://www.mvip-league.com/` and `https://be.mvip-league.com/api/v1/health` every minute |

## Components

```mermaid
%%{init: {"theme": "base", "themeVariables": {"fontFamily": "Arial", "fontSize": "14px", "primaryColor": "#E8F1FF", "primaryBorderColor": "#1F6FEB", "primaryTextColor": "#0B1F3A", "lineColor": "#5B6B82", "secondaryColor": "#EAF7EF", "tertiaryColor": "#FFF6E5", "actorBkg": "#DCE9FF", "actorTextColor": "#0B1F3A", "actorBorder": "#1F6FEB", "actorLineColor": "#8A9BB3", "signalColor": "#3B4A5E", "signalTextColor": "#0B1F3A", "noteBkgColor": "#FFF6E5", "noteBorderColor": "#E0A100", "noteTextColor": "#3D2E00", "activationBkgColor": "#C7DBFF", "activationBorderColor": "#1F6FEB", "sequenceNumberColor": "#FFFFFF", "labelBoxBkgColor": "#1F6FEB", "labelBoxBorderColor": "#1F6FEB", "labelTextColor": "#FFFFFF", "loopTextColor": "#0B1F3A", "clusterBkg": "#F7F9FC", "clusterBorder": "#C9D3E0", "edgeLabelBackground": "#FFFFFF", "transitionLabelColor": "#0B1F3A", "cScale0": "#1F6FEB", "cScaleLabel0": "#FFFFFF", "cScale1": "#1E8E3E", "cScaleLabel1": "#FFFFFF", "cScale2": "#7E57C2", "cScaleLabel2": "#FFFFFF"}}}%%
flowchart LR
  subgraph APP["⚙️ Workloads"]
    direction TB
    API["<b>API</b><br/>otelhttp · otelpgx"]:::api
    WRK["<b>worker</b>"]:::api
  end
  FE["<b>league-fe</b><br/>Sentry React SDK"]:::fe
  subgraph GCP["☁️ Google Cloud"]
    direction TB
    CT["Cloud Trace"]:::ext
    MP["Managed Prometheus"]:::ext
    CL["Cloud Logging"]:::ext
    AL["Alerting policies"]:::ext
    UP["Uptime checks"]:::ext
  end
  SEN["<b>Sentry</b>"]:::ext
  ONC(["👤 On-call"]):::actor
  API --> CT
  API --> MP
  API --> CL
  WRK --> MP
  API --> SEN
  FE --> SEN
  MP --> AL
  UP --> AL
  AL == "page" ==> ONC
  SEN -. "issue alert" .-> ONC
  class API,WRK,FE,CT,MP,CL,AL,UP,SEN planned
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

## Flow: from alert to fix

```mermaid
%%{init: {"theme": "base", "themeVariables": {"fontFamily": "Arial", "fontSize": "14px", "primaryColor": "#E8F1FF", "primaryBorderColor": "#1F6FEB", "primaryTextColor": "#0B1F3A", "lineColor": "#5B6B82", "secondaryColor": "#EAF7EF", "tertiaryColor": "#FFF6E5", "actorBkg": "#DCE9FF", "actorTextColor": "#0B1F3A", "actorBorder": "#1F6FEB", "actorLineColor": "#8A9BB3", "signalColor": "#3B4A5E", "signalTextColor": "#0B1F3A", "noteBkgColor": "#FFF6E5", "noteBorderColor": "#E0A100", "noteTextColor": "#3D2E00", "activationBkgColor": "#C7DBFF", "activationBorderColor": "#1F6FEB", "sequenceNumberColor": "#FFFFFF", "labelBoxBkgColor": "#1F6FEB", "labelBoxBorderColor": "#1F6FEB", "labelTextColor": "#FFFFFF", "loopTextColor": "#0B1F3A", "clusterBkg": "#F7F9FC", "clusterBorder": "#C9D3E0", "edgeLabelBackground": "#FFFFFF", "transitionLabelColor": "#0B1F3A", "cScale0": "#1F6FEB", "cScaleLabel0": "#FFFFFF", "cScale1": "#1E8E3E", "cScaleLabel1": "#FFFFFF", "cScale2": "#7E57C2", "cScaleLabel2": "#FFFFFF"}}}%%
sequenceDiagram
  autonumber
  participant M as ☁️ Monitoring
  participant O as 👤 On-call
  participant S as ☁️ Sentry
  participant T as ☁️ Trace + Logs
  rect rgb(247,249,252)
  M->>O: 5xx above 1 % on PUT /individual-matches
  O->>S: open the grouped issue for release 0.3.1
  S-->>O: stack trace · request_id
  O->>T: find the trace by request_id
  T-->>O: slow pgx span · lock wait on team_matches
  O->>O: roll back (helm rollback) or hot-fix
  end
```

## Edge cases

| ID | Situation | Expected |
|---|---|---|
| EC-44.1 | Alert storm during an outage | Alerts group by policy; one page per incident |
| EC-44.2 | High-cardinality labels (IDs) | Forbidden in metrics; IDs belong in traces and logs only |
| EC-44.3 | Sentry quota | Sample FE errors at 50 % and drop known browser-extension noise |

## Acceptance criteria

- **AC-44.1** Given an injected 500 on staging, then a Sentry issue with the release tag appears within 1 minute and the trace is linked by request ID.
- **AC-44.2** Given the worker is stopped for 2 minutes, then the outbox-lag alert fires.

## Open questions

- Who is on call during league nights, and through which channel?

---

[← F42](F42-worker-outbox-redis.md) · [E06 overview](README.md) · [F45 →](F45-playwright-e2e.md)
