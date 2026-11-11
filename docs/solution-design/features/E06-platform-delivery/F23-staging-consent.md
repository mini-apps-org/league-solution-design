# F23 — Staging and Google consent screen

> [Feature specs](../README.md) › [E06 — Platform & Delivery](README.md) › **F23** · Phase 1

| Phase | Status | Rules | Repo refs |
|---|---|---|---|
| 1 | ⬜ | ADR-003 | `league-be/config/{development,production}.yaml` · `internal/auth/cookies.go` (`isSecure`) · `league-fe/.env.*` |

## Requirements

*As the league owner, I try every release with real captains on staging before it reaches league night, and players see a verified Google consent screen, not an "unverified app" warning.*

| ID | Requirement |
|---|---|
| FR-23.1 | Staging hosts `staging.mvip-league.com` (FE) and `be-staging.mvip-league.com` (BE), with their own Vercel project or environment, GKE namespace `league-staging`, and Cloud SQL database `league_staging` |
| FR-23.2 | A separate Google OAuth client for staging, with redirect `https://be-staging.mvip-league.com/api/v1/auth/google/callback` |
| FR-23.3 | `config/staging.yaml` with `APP_ENV=staging`. Cookies are `Secure` and `SameSite=None`, without the `__Host-`/`__Secure-` prefixes so they can't collide with production |
| FR-23.4 | Merges to `master` deploy staging automatically; tags deploy production (F21) |
| FR-23.5 | Seed staging with the beta division (F9 seed + anonymised player names) |
| FR-23.6 | Publish the Google OAuth consent screen (it's in Testing mode, capped at 100 test users): app name "MViP League", logo, support email, privacy policy and terms URLs on `www.mvip-league.com`, verified domain `mvip-league.com`, scopes `openid email profile` only |
| FR-23.7 | A visible "STAGING" ribbon in the FE when `VITE_APP_ENV=staging` |

## Logic: which config wins

```mermaid
%%{init: {"theme": "base", "themeVariables": {"fontFamily": "Arial", "fontSize": "14px", "primaryColor": "#E8F1FF", "primaryBorderColor": "#1F6FEB", "primaryTextColor": "#0B1F3A", "lineColor": "#5B6B82", "secondaryColor": "#EAF7EF", "tertiaryColor": "#FFF6E5", "actorBkg": "#DCE9FF", "actorTextColor": "#0B1F3A", "actorBorder": "#1F6FEB", "actorLineColor": "#8A9BB3", "signalColor": "#3B4A5E", "signalTextColor": "#0B1F3A", "noteBkgColor": "#FFF6E5", "noteBorderColor": "#E0A100", "noteTextColor": "#3D2E00", "activationBkgColor": "#C7DBFF", "activationBorderColor": "#1F6FEB", "sequenceNumberColor": "#FFFFFF", "labelBoxBkgColor": "#1F6FEB", "labelBoxBorderColor": "#1F6FEB", "labelTextColor": "#FFFFFF", "loopTextColor": "#0B1F3A", "clusterBkg": "#F7F9FC", "clusterBorder": "#C9D3E0", "edgeLabelBackground": "#FFFFFF", "transitionLabelColor": "#0B1F3A", "cScale0": "#1F6FEB", "cScaleLabel0": "#FFFFFF", "cScale1": "#1E8E3E", "cScaleLabel1": "#FFFFFF", "cScale2": "#7E57C2", "cScaleLabel2": "#FFFFFF"}}}%%
flowchart LR
  E(["APP_ENV"]):::start --> D{"value"}
  D -- "development" --> DV["<b>development.yaml</b><br/>http · no prefix · not Secure"]:::fe
  D -- "staging" --> ST["<b>staging.yaml</b><br/>Secure · SameSite None · no prefix"]:::warn
  D -- "production" --> PR["<b>production.yaml</b><br/>__Host-sid · __Secure-csrf"]:::ok
  DV --> C["cookie writer"]:::api
  ST --> C
  PR --> C
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

## Flow: release through staging

```mermaid
%%{init: {"theme": "base", "themeVariables": {"fontFamily": "Arial", "fontSize": "14px", "primaryColor": "#E8F1FF", "primaryBorderColor": "#1F6FEB", "primaryTextColor": "#0B1F3A", "lineColor": "#5B6B82", "secondaryColor": "#EAF7EF", "tertiaryColor": "#FFF6E5", "actorBkg": "#DCE9FF", "actorTextColor": "#0B1F3A", "actorBorder": "#1F6FEB", "actorLineColor": "#8A9BB3", "signalColor": "#3B4A5E", "signalTextColor": "#0B1F3A", "noteBkgColor": "#FFF6E5", "noteBorderColor": "#E0A100", "noteTextColor": "#3D2E00", "activationBkgColor": "#C7DBFF", "activationBorderColor": "#1F6FEB", "sequenceNumberColor": "#FFFFFF", "labelBoxBkgColor": "#1F6FEB", "labelBoxBorderColor": "#1F6FEB", "labelTextColor": "#FFFFFF", "loopTextColor": "#0B1F3A", "clusterBkg": "#F7F9FC", "clusterBorder": "#C9D3E0", "edgeLabelBackground": "#FFFFFF", "transitionLabelColor": "#0B1F3A", "cScale0": "#1F6FEB", "cScaleLabel0": "#FFFFFF", "cScale1": "#1E8E3E", "cScaleLabel1": "#FFFFFF", "cScale2": "#7E57C2", "cScaleLabel2": "#FFFFFF"}}}%%
sequenceDiagram
  autonumber
  participant E as 👤 Engineer
  participant GH as ☁️ GitHub Actions
  participant S as ⚙️ staging
  participant Q as 👤 Beta captains
  participant P as ⚙️ production
  rect rgb(247,249,252)
  E->>GH: merge PR to master
  GH->>S: deploy BE + FE to staging
  Q->>S: run a practice night on phones
  Q-->>E: feedback · bugs
  E->>GH: tag x.y.z when staging is green
  GH->>P: production deploy outside the freeze window
  end
```

## Consent screen checklist

| Item | Value |
|---|---|
| App name | MViP League |
| User support email | league owner's address |
| App logo | 120 × 120 PNG, same mark as the PWA icon |
| Authorized domains | `mvip-league.com` |
| Links | `/privacy`, `/terms` (static pages in league-fe) |
| Scopes | `openid`, `email`, `profile` (non-sensitive, so no security review) |
| Publishing status | Testing → **In production** |

## Edge cases

| ID | Situation | Expected |
|---|---|---|
| EC-23.1 | Someone signs in on staging with the same Google account as production | Separate DB and session tables, so two independent users exist |
| EC-23.2 | Staging is down during a demo | No impact on production; nothing is shared except Artifact Registry |
| EC-23.3 | Google verification takes days | Start in week 1. Until then, add beta testers as test users (≤ 100) |

## Acceptance criteria

- **AC-23.1** Given a session on staging, when the user opens production, then they are signed out there.
- **AC-23.2** Given the consent screen is published, when a new Google user signs in, then no "unverified app" screen appears.
- **AC-23.3** Given a merge to `master`, then staging runs the new build within 15 minutes.

## Implementation gaps

- No `staging.yaml`, no staging hosts, and no privacy or terms pages.

## Open questions

- Should staging share the production Cloud SQL instance (a separate database) to save cost? Default: yes, a separate database on the same small instance.

---

[← F22](F22-gke-deployment.md) · [E06 overview](README.md) · [F24 →](F24-api-types-integration.md)
