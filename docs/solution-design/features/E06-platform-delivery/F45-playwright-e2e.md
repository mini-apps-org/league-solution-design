# F45 — Playwright E2E

> [Feature specs](../README.md) › [E06 — Platform & Delivery](README.md) › **F45** · Phase 2

| Phase | Status | Rules | Repo refs |
|---|---|---|---|
| 2 | 🎯 (new dependency, needs approval) | [13 §4](../../13-nfr-and-testing.md) | new `league-fe/e2e/`, `playwright.config.ts`, `league-be/docker-compose.e2e.yaml` |

## Requirements

*As an engineer, every release proves that two captains can run a full night end to end, in a real browser, against the real backend and database.*

| ID | Requirement |
|---|---|
| FR-45.1 | Two browser contexts, home captain and away captain, run a full seeded night: 5 put-ups per side (including one blocked by the 23 cap), 5 results (one hill-hill 2/1), submit, then check the standings |
| FR-45.2 | A third context with a player role verifies read-only access (no action bar, direct URLs give 403 copy) |
| FR-45.3 | Auth without Google: a test-only `POST /api/v1/test/sessions {userId}` route compiled in only when `APP_ENV=e2e`, which sets the normal cookies. It must not exist in staging or production builds |
| FR-45.4 | Stack: `docker compose -f docker-compose.e2e.yaml up` (Postgres + migrations + seed + league-be) and `vite preview` |
| FR-45.5 | Runs on PRs that touch `src/pages/**` or league endpoints, and on every release. Chromium + WebKit, mobile viewport 390 × 844 |
| FR-45.6 | Traces, videos and screenshots kept as CI artifacts on failure |
| FR-45.7 | Selectors by role and accessible name only (`getByRole`), which also checks accessibility |

## Flow: the night scenario

```mermaid
%%{init: {"theme": "base", "themeVariables": {"fontFamily": "Arial", "fontSize": "14px", "primaryColor": "#E8F1FF", "primaryBorderColor": "#1F6FEB", "primaryTextColor": "#0B1F3A", "lineColor": "#5B6B82", "secondaryColor": "#EAF7EF", "tertiaryColor": "#FFF6E5", "actorBkg": "#DCE9FF", "actorTextColor": "#0B1F3A", "actorBorder": "#1F6FEB", "actorLineColor": "#8A9BB3", "signalColor": "#3B4A5E", "signalTextColor": "#0B1F3A", "noteBkgColor": "#FFF6E5", "noteBorderColor": "#E0A100", "noteTextColor": "#3D2E00", "activationBkgColor": "#C7DBFF", "activationBorderColor": "#1F6FEB", "sequenceNumberColor": "#FFFFFF", "labelBoxBkgColor": "#1F6FEB", "labelBoxBorderColor": "#1F6FEB", "labelTextColor": "#FFFFFF", "loopTextColor": "#0B1F3A", "clusterBkg": "#F7F9FC", "clusterBorder": "#C9D3E0", "edgeLabelBackground": "#FFFFFF", "transitionLabelColor": "#0B1F3A", "cScale0": "#1F6FEB", "cScaleLabel0": "#FFFFFF", "cScale1": "#1E8E3E", "cScaleLabel1": "#FFFFFF", "cScale2": "#7E57C2", "cScaleLabel2": "#FFFFFF"}}}%%
sequenceDiagram
  autonumber
  participant T as 🧪 Playwright
  participant H as 📱 home context
  participant A as 📱 away context
  participant API as ⚙️ league-be
  participant DB as 🗄️ Postgres
  rect rgb(247,249,252)
  T->>DB: reset + seed (division, teams, rosters)
  T->>API: create test sessions for both captains
  H->>API: open /matches/{id} · put up match 1
  A->>API: put up match 1
  loop matches 2 to 5
    H->>API: put-up or result
    A->>API: put-up
  end
  rect rgb(253,236,236)
  A->>API: try a player that breaks the 23 cap
  API-->>A: blocked · copy shown
  end
  H->>API: submit night
  T->>API: GET standings · assert 3/0, 2/1 totals
  end
```

## Logic: test-only auth guard

```mermaid
%%{init: {"theme": "base", "themeVariables": {"fontFamily": "Arial", "fontSize": "14px", "primaryColor": "#E8F1FF", "primaryBorderColor": "#1F6FEB", "primaryTextColor": "#0B1F3A", "lineColor": "#5B6B82", "secondaryColor": "#EAF7EF", "tertiaryColor": "#FFF6E5", "actorBkg": "#DCE9FF", "actorTextColor": "#0B1F3A", "actorBorder": "#1F6FEB", "actorLineColor": "#8A9BB3", "signalColor": "#3B4A5E", "signalTextColor": "#0B1F3A", "noteBkgColor": "#FFF6E5", "noteBorderColor": "#E0A100", "noteTextColor": "#3D2E00", "activationBkgColor": "#C7DBFF", "activationBorderColor": "#1F6FEB", "sequenceNumberColor": "#FFFFFF", "labelBoxBkgColor": "#1F6FEB", "labelBoxBorderColor": "#1F6FEB", "labelTextColor": "#FFFFFF", "loopTextColor": "#0B1F3A", "clusterBkg": "#F7F9FC", "clusterBorder": "#C9D3E0", "edgeLabelBackground": "#FFFFFF", "transitionLabelColor": "#0B1F3A", "cScale0": "#1F6FEB", "cScaleLabel0": "#FFFFFF", "cScale1": "#1E8E3E", "cScaleLabel1": "#FFFFFF", "cScale2": "#7E57C2", "cScaleLabel2": "#FFFFFF"}}}%%
flowchart TD
  B(["build league-be"]):::start --> T{"build tag e2e<br/>and APP_ENV = e2e?"}
  T -- no --> N["route not registered<br/>404"]:::ok
  T -- yes --> R["POST /api/v1/test/sessions"]:::warn
  R --> C["set sid + csrf cookies<br/>for the seeded user"]:::api
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

*The route exists only in a separate build tag. A unit test asserts that the production router doesn't have it.*

## Edge cases

| ID | Situation | Expected |
|---|---|---|
| EC-45.1 | Flaky waits | Use web-first assertions; no `waitForTimeout` |
| EC-45.2 | Tests run in parallel | One database per worker (`league_e2e_<n>`) or serial execution in one project |
| EC-45.3 | WebKit cookie differences | The stack serves FE and BE on `localhost` with different ports, matching production's cross-site setup |

## Acceptance criteria

- **AC-45.1** Given a regression that breaks submit, when the PR runs E2E, then it fails with a trace.
- **AC-45.2** Given a production build, then `/api/v1/test/sessions` returns 404.

## Open questions

- Approve adding `@playwright/test` as a dev dependency.

---

[← F44](F44-monitoring.md) · [E06 overview](README.md) · [F46 →](F46-load-testing.md)
