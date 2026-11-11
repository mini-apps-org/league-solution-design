# E06 — Platform & Delivery

> [Feature specs](../README.md) › **E06**

| | |
|---|---|
| **Goal** | The app installs like a native app, works in English and Vietnamese, ships safely on a tag, and is observable and tested end to end |
| **Phase** | 1 (F20–F25) · 2 (F42, F44, F45, F46) |
| **Status** | 🏗 PWA, theme, i18n, both CI pipelines, Vercel deploy, image push · ⬜ GKE runtime, staging, generated types, rate limits, logs, worker, monitoring, E2E, load tests |
| **Actors** | Engineer, DevOps, every end user (indirectly) |
| **Related** | [12 infra & DevOps](../../12-infra-devops.md) · [13 NFR & testing](../../13-nfr-and-testing.md) · [09 frontend](../../09-frontend-design.md) · [11 security](../../11-security-and-roles.md) |

## Features by phase

### Phase 1: ship the MVP safely

| # | Feature | Status |
|---|---|---|
| F20 | [PWA, theme, i18n, error copy](F20-pwa-theme-i18n.md) | 🏗 |
| F21 | [CI/CD](F21-ci-cd.md) | 🏗 |
| F22 | [GKE deployment](F22-gke-deployment.md) | ⬜ |
| F23 | [Staging + Google consent screen](F23-staging-consent.md) | ⬜ |
| F24 | [Generated API types + FE/BE integration test](F24-api-types-integration.md) | ⬜ |
| F25 | [Rate limiting, structured logs, vi default](F25-rate-limit-logs-locale.md) | ⬜ |

### Phase 2: run it at league scale

| # | Feature | Status |
|---|---|---|
| F42 | [Worker, outbox, Redis](F42-worker-outbox-redis.md) | 🎯 |
| F44 | [Monitoring & error tracking](F44-monitoring.md) | 🎯 |
| F45 | [Playwright E2E](F45-playwright-e2e.md) | 🎯 |
| F46 | [Load testing](F46-load-testing.md) | 🎯 |

## Phase 1 deep dive

Phase 1 puts the two repos into production on GCP + Vercel behind Cloudflare. The front end ships today. The backend builds an image but has **no runtime yet** (F22), which blocks go-live together with E02.

### Components

```mermaid
%%{init: {"theme": "base", "themeVariables": {"fontFamily": "Arial", "fontSize": "14px", "primaryColor": "#E8F1FF", "primaryBorderColor": "#1F6FEB", "primaryTextColor": "#0B1F3A", "lineColor": "#5B6B82", "secondaryColor": "#EAF7EF", "tertiaryColor": "#FFF6E5", "actorBkg": "#DCE9FF", "actorTextColor": "#0B1F3A", "actorBorder": "#1F6FEB", "actorLineColor": "#8A9BB3", "signalColor": "#3B4A5E", "signalTextColor": "#0B1F3A", "noteBkgColor": "#FFF6E5", "noteBorderColor": "#E0A100", "noteTextColor": "#3D2E00", "activationBkgColor": "#C7DBFF", "activationBorderColor": "#1F6FEB", "sequenceNumberColor": "#FFFFFF", "labelBoxBkgColor": "#1F6FEB", "labelBoxBorderColor": "#1F6FEB", "labelTextColor": "#FFFFFF", "loopTextColor": "#0B1F3A", "clusterBkg": "#F7F9FC", "clusterBorder": "#C9D3E0", "edgeLabelBackground": "#FFFFFF", "transitionLabelColor": "#0B1F3A", "cScale0": "#1F6FEB", "cScaleLabel0": "#FFFFFF", "cScale1": "#1E8E3E", "cScaleLabel1": "#FFFFFF", "cScale2": "#7E57C2", "cScaleLabel2": "#FFFFFF"}}}%%
flowchart LR
  DEV(["👤 Engineer"]):::actor
  subgraph GH["☁️ GitHub · mini-apps-org"]
    direction TB
    FECI["<b>league-fe</b><br/>ci.yaml · cd.yaml"]:::ext
    BECI["<b>league-be</b><br/>ci.yaml · release.yaml"]:::ext
  end
  subgraph VER["☁️ Vercel"]
    VFE["<b>www.mvip-league.com</b><br/>static SPA · sw.js"]:::fe
  end
  subgraph GCP["☁️ GCP · asia-southeast1"]
    direction TB
    AR["<b>Artifact Registry</b><br/>league-service:tag"]:::ext
    GKE["<b>GKE</b><br/>league-be pods · migrate Job"]:::api
    SQL[("<b>Cloud SQL</b><br/>Postgres · PITR")]:::db
    SM["<b>Secret Manager</b>"]:::ext
  end
  CF["<b>Cloudflare</b><br/>DNS · WAF · rate rules"]:::ext
  DEV == "tag x.y.z" ==> FECI
  DEV == "tag x.y.z" ==> BECI
  FECI == "deploy --prebuilt" ==> VFE
  BECI == "WIF · push" ==> AR
  AR -. "helm upgrade · F22" .-> GKE
  GKE --> SQL
  GKE -. "Workload Identity" .-> SM
  CF --> VFE
  CF --> GKE
  class GKE,SQL,SM gap
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

*Green arrows exist today. Red boxes are the backend runtime still to build in F22. Cloudflare fronts both hosts.*

### Release sequence

```mermaid
%%{init: {"theme": "base", "themeVariables": {"fontFamily": "Arial", "fontSize": "14px", "primaryColor": "#E8F1FF", "primaryBorderColor": "#1F6FEB", "primaryTextColor": "#0B1F3A", "lineColor": "#5B6B82", "secondaryColor": "#EAF7EF", "tertiaryColor": "#FFF6E5", "actorBkg": "#DCE9FF", "actorTextColor": "#0B1F3A", "actorBorder": "#1F6FEB", "actorLineColor": "#8A9BB3", "signalColor": "#3B4A5E", "signalTextColor": "#0B1F3A", "noteBkgColor": "#FFF6E5", "noteBorderColor": "#E0A100", "noteTextColor": "#3D2E00", "activationBkgColor": "#C7DBFF", "activationBorderColor": "#1F6FEB", "sequenceNumberColor": "#FFFFFF", "labelBoxBkgColor": "#1F6FEB", "labelBoxBorderColor": "#1F6FEB", "labelTextColor": "#FFFFFF", "loopTextColor": "#0B1F3A", "clusterBkg": "#F7F9FC", "clusterBorder": "#C9D3E0", "edgeLabelBackground": "#FFFFFF", "transitionLabelColor": "#0B1F3A", "cScale0": "#1F6FEB", "cScaleLabel0": "#FFFFFF", "cScale1": "#1E8E3E", "cScaleLabel1": "#FFFFFF", "cScale2": "#7E57C2", "cScaleLabel2": "#FFFFFF"}}}%%
sequenceDiagram
  autonumber
  participant D as 👤 Engineer
  participant GH as ☁️ GitHub Actions
  participant AR as ☁️ Artifact Registry
  participant K as ⚙️ GKE
  participant V as ☁️ Vercel
  rect rgb(247,249,252)
  D->>GH: tag league-be 0.3.0
  GH->>GH: lint · go test -race · build
  GH->>AR: WIF auth · buildx amd64 · push league-service:0.3.0
  rect rgb(255,246,229)
  Note over GH,K: F22 · to build
  GH->>K: migrate Job, then helm upgrade --atomic
  K-->>GH: rollout ok · /readyz 200
  end
  D->>GH: tag league-fe 0.2.0
  GH->>GH: format · lint · typecheck · test · guard tag on master
  GH->>V: vercel build --prod · bundle check · deploy --prebuilt
  V-->>D: production URL in the job summary
  end
```

*Backend first, then front end: the FE never ships against an API that lacks its endpoints.*

### Environments

| | Local | Staging (F23) | Production |
|---|---|---|---|
| FE host | `localhost:5173` | `staging.mvip-league.com` | `www.mvip-league.com` |
| BE host | `localhost:9200` | `be-staging.mvip-league.com` | `be.mvip-league.com` |
| `APP_ENV` | `development` | `staging` | `production` |
| Cookies | no prefix, not Secure | Secure, no prefix | `__Host-sid`, `__Secure-csrf` |
| Google OAuth client | dev client | staging client | prod client |
| Database | docker-compose Postgres | Cloud SQL `league-staging` | Cloud SQL `league-prod` |
| Deploy trigger | — | merge to `master` | tag `x.y.z` |

## Phase 2 deep dive

Phase 2 adds asynchronous work (notifications, fees, SL suggestions, live scoring), so it needs a **worker**, an **outbox**, **Redis**, and the tooling to prove the system holds up on a league night.

### Components

```mermaid
%%{init: {"theme": "base", "themeVariables": {"fontFamily": "Arial", "fontSize": "14px", "primaryColor": "#E8F1FF", "primaryBorderColor": "#1F6FEB", "primaryTextColor": "#0B1F3A", "lineColor": "#5B6B82", "secondaryColor": "#EAF7EF", "tertiaryColor": "#FFF6E5", "actorBkg": "#DCE9FF", "actorTextColor": "#0B1F3A", "actorBorder": "#1F6FEB", "actorLineColor": "#8A9BB3", "signalColor": "#3B4A5E", "signalTextColor": "#0B1F3A", "noteBkgColor": "#FFF6E5", "noteBorderColor": "#E0A100", "noteTextColor": "#3D2E00", "activationBkgColor": "#C7DBFF", "activationBorderColor": "#1F6FEB", "sequenceNumberColor": "#FFFFFF", "labelBoxBkgColor": "#1F6FEB", "labelBoxBorderColor": "#1F6FEB", "labelTextColor": "#FFFFFF", "loopTextColor": "#0B1F3A", "clusterBkg": "#F7F9FC", "clusterBorder": "#C9D3E0", "edgeLabelBackground": "#FFFFFF", "transitionLabelColor": "#0B1F3A", "cScale0": "#1F6FEB", "cScaleLabel0": "#FFFFFF", "cScale1": "#1E8E3E", "cScaleLabel1": "#FFFFFF", "cScale2": "#7E57C2", "cScaleLabel2": "#FFFFFF"}}}%%
flowchart LR
  subgraph APP["⚙️ GKE · namespace league"]
    direction TB
    API["<b>league-be API</b><br/>HTTP + WS"]:::api
    WRK["<b>cmd/worker</b><br/>outbox poller · handlers"]:::api
  end
  subgraph DATA["🗄️ Data"]
    direction TB
    PG[("<b>Postgres</b><br/>domain tables + outbox")]:::db
    RD[("<b>Memorystore Redis</b><br/>live state · pub/sub · leases · rate limits")]:::db
  end
  subgraph OBS["☁️ Observability"]
    direction TB
    OT["<b>OpenTelemetry</b><br/>traces · metrics"]:::ext
    CM["<b>Cloud Monitoring</b><br/>dashboards · alerts"]:::ext
    SEN["<b>Sentry</b><br/>FE + BE errors"]:::ext
  end
  subgraph QA["🧪 Quality gates"]
    direction TB
    PW["<b>Playwright</b><br/>two-captain night"]:::fe
    K6["<b>k6</b><br/>league-night load"]:::fe
  end
  EXT["<b>Zalo OA · MoMo · ZaloPay</b>"]:::ext
  API == "same tx" ==> PG
  WRK == "SKIP LOCKED" ==> PG
  API --> RD
  WRK --> EXT
  API -.-> OT
  WRK -.-> OT
  OT -.-> CM
  API -.-> SEN
  PW -.-> API
  K6 -.-> API
  class API,WRK,PG,RD,OT,CM,SEN,PW,K6,EXT planned
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

### Event path, end to end

```mermaid
%%{init: {"theme": "base", "themeVariables": {"fontFamily": "Arial", "fontSize": "14px", "primaryColor": "#E8F1FF", "primaryBorderColor": "#1F6FEB", "primaryTextColor": "#0B1F3A", "lineColor": "#5B6B82", "secondaryColor": "#EAF7EF", "tertiaryColor": "#FFF6E5", "actorBkg": "#DCE9FF", "actorTextColor": "#0B1F3A", "actorBorder": "#1F6FEB", "actorLineColor": "#8A9BB3", "signalColor": "#3B4A5E", "signalTextColor": "#0B1F3A", "noteBkgColor": "#FFF6E5", "noteBorderColor": "#E0A100", "noteTextColor": "#3D2E00", "activationBkgColor": "#C7DBFF", "activationBorderColor": "#1F6FEB", "sequenceNumberColor": "#FFFFFF", "labelBoxBkgColor": "#1F6FEB", "labelBoxBorderColor": "#1F6FEB", "labelTextColor": "#FFFFFF", "loopTextColor": "#0B1F3A", "clusterBkg": "#F7F9FC", "clusterBorder": "#C9D3E0", "edgeLabelBackground": "#FFFFFF", "transitionLabelColor": "#0B1F3A", "cScale0": "#1F6FEB", "cScaleLabel0": "#FFFFFF", "cScale1": "#1E8E3E", "cScaleLabel1": "#FFFFFF", "cScale2": "#7E57C2", "cScaleLabel2": "#FFFFFF"}}}%%
sequenceDiagram
  autonumber
  participant C as 👤 Captain
  participant API as ⚙️ API
  participant DB as 🗄️ Postgres
  participant W as ⚙️ worker
  participant Z as ☁️ Zalo OA
  participant M as ☁️ Monitoring
  rect rgb(247,249,252)
  C->>API: POST /team-matches/{id}/submit
  API->>DB: BEGIN · UPDATE team_matches · INSERT outbox TeamMatchSubmitted · COMMIT
  API-->>C: 200
  W->>DB: claim batch FOR UPDATE SKIP LOCKED
  W->>Z: send result message to both teams
  W->>DB: mark done
  W-->>M: metric outbox_lag_seconds
  end
```

### Service-level targets

| Target | Phase 1 | Phase 2 |
|---|---|---|
| API p95 latency | < 300 ms (NFR-01) | < 300 ms, and live-score fan-out < 1 s (NFR-11) |
| Availability on league nights | 99.5 % | 99.9 % |
| Error rate | < 1 % | < 0.1 % |
| Outbox lag | — | < 60 s |
| Recovery point (RPO) | 24 h backup | 5 min PITR |
