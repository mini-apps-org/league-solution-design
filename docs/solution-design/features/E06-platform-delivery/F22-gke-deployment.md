# F22 — GKE deployment

> [Feature specs](../README.md) › [E06 — Platform & Delivery](README.md) › **F22** · Phase 1

| Phase | Status | Rules | Repo refs |
|---|---|---|---|
| 1 | ⬜ | NFR-02, NFR-08 · [12 §4](../../12-infra-devops.md) | `league-be/Dockerfile` (EXPOSE 9200) · `config/*.yaml` (port 5001) · new `league-be/deploy/` |

## Requirements

*As an engineer, my backend tag becomes running pods behind `be.mvip-league.com`, with the schema migrated first and an automatic rollback if anything fails.*

| ID | Requirement |
|---|---|
| FR-22.1 | Helm chart in `league-be/deploy/helm/league-be`: Deployment (≥ 2 replicas, spread across zones), Service, HPA (CPU 70 %, 2–6 pods), PodDisruptionBudget (`minAvailable: 1`), Gateway HTTPRoute for `be.mvip-league.com` |
| FR-22.2 | One container port. Align the Dockerfile `EXPOSE 9200` and the YAML `5001` ([Q38](../../14-open-questions.md)). Default: `8080` everywhere |
| FR-22.3 | Probes: liveness `GET /api/v1/health` (no DB); readiness `GET /readyz` (new, pings the DB with a 1 s timeout); startup probe with a 30 s budget |
| FR-22.4 | Secrets (`GOOGLE_OAUTH_CLIENT_ID/SECRET`, `ENCRYPTION_KEY`, `DATABASE_URL`) come from Secret Manager through the Secret Store CSI driver and Workload Identity. Nothing secret in YAML or images |
| FR-22.5 | Cloud SQL Postgres 16 with private IP, automated daily backups, PITR 7 days, `max_connections` sized to pods × pool |
| FR-22.6 | `release.yaml` gains `deploy`: `get-gke-credentials` → run the `migrate` Job and wait → `helm upgrade --install --atomic --timeout 5m --set image.tag=<tag>` |
| FR-22.7 | Graceful shutdown: on SIGTERM, fail readiness, drain for 10 s, then `server.Shutdown` with a 20 s budget |
| FR-22.8 | Freeze window: no production deploy Mon–Fri 17:00–23:30 ICT (league nights). The job checks the time and fails unless `force_deploy` is set |
| FR-22.9 | Resources: requests 100m CPU / 128 Mi, limits 500m / 256 Mi. `securityContext` non-root, read-only root filesystem |

## Topology

```mermaid
%%{init: {"theme": "base", "themeVariables": {"fontFamily": "Arial", "fontSize": "14px", "primaryColor": "#E8F1FF", "primaryBorderColor": "#1F6FEB", "primaryTextColor": "#0B1F3A", "lineColor": "#5B6B82", "secondaryColor": "#EAF7EF", "tertiaryColor": "#FFF6E5", "actorBkg": "#DCE9FF", "actorTextColor": "#0B1F3A", "actorBorder": "#1F6FEB", "actorLineColor": "#8A9BB3", "signalColor": "#3B4A5E", "signalTextColor": "#0B1F3A", "noteBkgColor": "#FFF6E5", "noteBorderColor": "#E0A100", "noteTextColor": "#3D2E00", "activationBkgColor": "#C7DBFF", "activationBorderColor": "#1F6FEB", "sequenceNumberColor": "#FFFFFF", "labelBoxBkgColor": "#1F6FEB", "labelBoxBorderColor": "#1F6FEB", "labelTextColor": "#FFFFFF", "loopTextColor": "#0B1F3A", "clusterBkg": "#F7F9FC", "clusterBorder": "#C9D3E0", "edgeLabelBackground": "#FFFFFF", "transitionLabelColor": "#0B1F3A", "cScale0": "#1F6FEB", "cScaleLabel0": "#FFFFFF", "cScale1": "#1E8E3E", "cScaleLabel1": "#FFFFFF", "cScale2": "#7E57C2", "cScaleLabel2": "#FFFFFF"}}}%%
flowchart LR
  CF["<b>Cloudflare</b><br/>be.mvip-league.com · proxied"]:::ext --> GW["<b>GKE Gateway</b><br/>HTTPS LB · managed cert"]:::api
  subgraph NS["⚙️ namespace league-prod"]
    direction TB
    P1["<b>pod</b> league-be #1<br/>zone a"]:::api
    P2["<b>pod</b> league-be #2<br/>zone b"]:::api
    HPA["HPA 2–6 · PDB min 1"]:::api
    J["<b>Job</b> migrate<br/>per release"]:::api
  end
  GW --> P1
  GW --> P2
  HPA -.-> P1
  HPA -.-> P2
  P1 --> SQL[("<b>Cloud SQL</b><br/>private IP · PITR")]:::db
  P2 --> SQL
  J --> SQL
  P1 -. "WI + CSI" .-> SM["<b>Secret Manager</b>"]:::ext
  P2 -. "WI + CSI" .-> SM
  class GW,P1,P2,HPA,J,SQL,SM gap
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

*Everything here is red: none of it exists yet. It is the go-live blocker next to E02.*

## Logic: deploy job

```mermaid
%%{init: {"theme": "base", "themeVariables": {"fontFamily": "Arial", "fontSize": "14px", "primaryColor": "#E8F1FF", "primaryBorderColor": "#1F6FEB", "primaryTextColor": "#0B1F3A", "lineColor": "#5B6B82", "secondaryColor": "#EAF7EF", "tertiaryColor": "#FFF6E5", "actorBkg": "#DCE9FF", "actorTextColor": "#0B1F3A", "actorBorder": "#1F6FEB", "actorLineColor": "#8A9BB3", "signalColor": "#3B4A5E", "signalTextColor": "#0B1F3A", "noteBkgColor": "#FFF6E5", "noteBorderColor": "#E0A100", "noteTextColor": "#3D2E00", "activationBkgColor": "#C7DBFF", "activationBorderColor": "#1F6FEB", "sequenceNumberColor": "#FFFFFF", "labelBoxBkgColor": "#1F6FEB", "labelBoxBorderColor": "#1F6FEB", "labelTextColor": "#FFFFFF", "loopTextColor": "#0B1F3A", "clusterBkg": "#F7F9FC", "clusterBorder": "#C9D3E0", "edgeLabelBackground": "#FFFFFF", "transitionLabelColor": "#0B1F3A", "cScale0": "#1F6FEB", "cScaleLabel0": "#FFFFFF", "cScale1": "#1E8E3E", "cScaleLabel1": "#FFFFFF", "cScale2": "#7E57C2", "cScaleLabel2": "#FFFFFF"}}}%%
flowchart TD
  S(["image pushed"]):::start --> F{"inside league-night<br/>freeze window?"}
  F -- "yes, no force" --> X0["stop · try after 23:30"]:::bad
  F -- no --> M["run migrate Job"]:::api
  M --> MO{"Job succeeded?"}
  MO -- no --> X1["stop · old pods keep serving"]:::bad
  MO -- yes --> H["helm upgrade --atomic"]:::api
  H --> R{"new pods ready<br/>within 5 min?"}
  R -- no --> RB["helm auto-rollback"]:::warn
  R -- yes --> OK["live · post summary"]:::ok
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

## Flow: rolling update

```mermaid
%%{init: {"theme": "base", "themeVariables": {"fontFamily": "Arial", "fontSize": "14px", "primaryColor": "#E8F1FF", "primaryBorderColor": "#1F6FEB", "primaryTextColor": "#0B1F3A", "lineColor": "#5B6B82", "secondaryColor": "#EAF7EF", "tertiaryColor": "#FFF6E5", "actorBkg": "#DCE9FF", "actorTextColor": "#0B1F3A", "actorBorder": "#1F6FEB", "actorLineColor": "#8A9BB3", "signalColor": "#3B4A5E", "signalTextColor": "#0B1F3A", "noteBkgColor": "#FFF6E5", "noteBorderColor": "#E0A100", "noteTextColor": "#3D2E00", "activationBkgColor": "#C7DBFF", "activationBorderColor": "#1F6FEB", "sequenceNumberColor": "#FFFFFF", "labelBoxBkgColor": "#1F6FEB", "labelBoxBorderColor": "#1F6FEB", "labelTextColor": "#FFFFFF", "loopTextColor": "#0B1F3A", "clusterBkg": "#F7F9FC", "clusterBorder": "#C9D3E0", "edgeLabelBackground": "#FFFFFF", "transitionLabelColor": "#0B1F3A", "cScale0": "#1F6FEB", "cScaleLabel0": "#FFFFFF", "cScale1": "#1E8E3E", "cScaleLabel1": "#FFFFFF", "cScale2": "#7E57C2", "cScaleLabel2": "#FFFFFF"}}}%%
sequenceDiagram
  autonumber
  participant GH as ☁️ release.yaml
  participant K as ⚙️ GKE API
  participant N as ⚙️ new pod
  participant O as ⚙️ old pod
  participant LB as ☁️ Gateway
  rect rgb(247,249,252)
  GH->>K: helm upgrade image 0.3.0
  K->>N: start · startup probe
  N-->>K: /readyz 200
  K->>LB: add new pod
  K->>O: SIGTERM
  O->>O: readiness fails · drain 10 s · Shutdown
  LB-->>O: no new requests
  K-->>GH: rollout complete
  end
```

## API & data

| Item | Value |
|---|---|
| `GET /api/v1/health` | `200 {"status":"ok"}` with no DB call |
| `GET /readyz` | `200` when the DB ping succeeds, `503` otherwise. Not under `/api/v1`, not exposed via the Gateway |
| Pool | `pgxpool` max 10 per pod → 6 pods × 10 + migrate + admin < 100 connections |
| Config | `APP_ENV=production`, `PORT=8080`, `ALLOWED_ORIGINS=https://www.mvip-league.com` |

## Edge cases

| ID | Situation | Expected |
|---|---|---|
| EC-22.1 | A migration takes a long table lock | Migrations follow expand/contract (F43). Use `lock_timeout = 5s` so the Job fails rather than blocking traffic |
| EC-22.2 | Cloud SQL failover | Readiness fails briefly; pods stay alive (liveness doesn't touch the DB) and recover |
| EC-22.3 | A node is drained during a league night | The PDB keeps one pod serving |
| EC-22.4 | Cookie domain | `__Host-sid` has no Domain and is bound to `be.mvip-league.com`. The FE calls it cross-site with `withCredentials` (see [05 §3](../../05-architecture.md)) |

## Acceptance criteria

- **AC-22.1** Given a new tag, when release finishes, then two pods run the new image and `/readyz` returns 200 through port-forward.
- **AC-22.2** Given a failing migration, when release runs, then the deploy stops and the previous pods still serve 200.
- **AC-22.3** Given a k6 smoke test during a rollout, then no request fails with 5xx.
- **AC-22.4** Given 18:00 ICT on a Tuesday, when a tag is pushed, then the deploy job refuses.

## Open questions

- GKE Autopilot vs Standard? Default: **Autopilot**, for less ops at this scale.
- [Q38](../../14-open-questions.md) port alignment.

---

[← F21](F21-ci-cd.md) · [E06 overview](README.md) · [F23 →](F23-staging-consent.md)
