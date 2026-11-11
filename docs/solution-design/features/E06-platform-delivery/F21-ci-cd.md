# F21 — CI/CD

> [Feature specs](../README.md) › [E06 — Platform & Delivery](README.md) › **F21** · Phase 1

| Phase | Status | Rules | Repo refs |
|---|---|---|---|
| 1 | 🏗 | ADR-010 | `league-fe/.github/workflows/{ci,cd}.yaml`, `vercel.json` · `league-be/.github/workflows/{ci,release}.yaml`, `Dockerfile`, `Makefile` |

## Requirements

*As an engineer, I open a PR and get a clear pass or fail. I push a tag and the release goes out without anyone holding a cloud key.*

| ID | Requirement |
|---|---|
| FR-21.1 | **FE CI** on every PR and push to `master`: `pnpm install --frozen-lockfile`, `format:check`, `lint --max-warnings 0`, `typecheck`, `test`, `build` (with a dummy `VITE_API_URL`) |
| FR-21.2 | **FE CD** on a `*.*.*` tag: re-run CI → `guard` (the tag commit is an ancestor of `origin/master`) → `vercel pull` + `vercel build --prod` → fail if the bundle contains `localhost` → `vercel deploy --prebuilt --prod` |
| FR-21.3 | **BE CI** on PRs and pushes: `golangci-lint`, `gofmt -l` empty, `go vet`, `go test -race ./...`, `go build ./...` |
| FR-21.4 | **BE release** on a `*.*.*` tag: tests → Workload Identity Federation → `docker buildx --platform linux/amd64` → push `asia-southeast1-docker.pkg.dev/vincent-mini-apps-project/<repo>/league-service:<tag>` and `:latest` |
| FR-21.5 | No long-lived keys. GCP via WIF only. The Vercel token, org ID and project ID live in the GitHub `production` environment, which needs approval |
| FR-21.6 | Workflows pin third-party actions to a commit SHA |
| FR-21.7 | Concurrency: one release per repo at a time (`concurrency: release-${{ github.repository }}`) |

## Logic: FE release gate

```mermaid
%%{init: {"theme": "base", "themeVariables": {"fontFamily": "Arial", "fontSize": "14px", "primaryColor": "#E8F1FF", "primaryBorderColor": "#1F6FEB", "primaryTextColor": "#0B1F3A", "lineColor": "#5B6B82", "secondaryColor": "#EAF7EF", "tertiaryColor": "#FFF6E5", "actorBkg": "#DCE9FF", "actorTextColor": "#0B1F3A", "actorBorder": "#1F6FEB", "actorLineColor": "#8A9BB3", "signalColor": "#3B4A5E", "signalTextColor": "#0B1F3A", "noteBkgColor": "#FFF6E5", "noteBorderColor": "#E0A100", "noteTextColor": "#3D2E00", "activationBkgColor": "#C7DBFF", "activationBorderColor": "#1F6FEB", "sequenceNumberColor": "#FFFFFF", "labelBoxBkgColor": "#1F6FEB", "labelBoxBorderColor": "#1F6FEB", "labelTextColor": "#FFFFFF", "loopTextColor": "#0B1F3A", "clusterBkg": "#F7F9FC", "clusterBorder": "#C9D3E0", "edgeLabelBackground": "#FFFFFF", "transitionLabelColor": "#0B1F3A", "cScale0": "#1F6FEB", "cScaleLabel0": "#FFFFFF", "cScale1": "#1E8E3E", "cScaleLabel1": "#FFFFFF", "cScale2": "#7E57C2", "cScaleLabel2": "#FFFFFF"}}}%%
flowchart TD
  T(["tag 0.2.0 pushed"]):::start --> CI{"CI jobs<br/>green?"}
  CI -- no --> X1["stop · no deploy"]:::bad
  CI -- yes --> G{"tag commit on<br/>origin/master?"}
  G -- no --> X2["stop · guard failed"]:::bad
  G -- yes --> B["vercel build --prod"]:::ext
  B --> L{"bundle contains<br/>localhost?"}
  L -- yes --> X3["stop · wrong API URL"]:::bad
  L -- no --> D["vercel deploy --prebuilt --prod"]:::ok
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

*Each red stop leaves production untouched. Prebuilt deploys mean Vercel ships exactly what CI built.*

## Flow: backend image release

```mermaid
%%{init: {"theme": "base", "themeVariables": {"fontFamily": "Arial", "fontSize": "14px", "primaryColor": "#E8F1FF", "primaryBorderColor": "#1F6FEB", "primaryTextColor": "#0B1F3A", "lineColor": "#5B6B82", "secondaryColor": "#EAF7EF", "tertiaryColor": "#FFF6E5", "actorBkg": "#DCE9FF", "actorTextColor": "#0B1F3A", "actorBorder": "#1F6FEB", "actorLineColor": "#8A9BB3", "signalColor": "#3B4A5E", "signalTextColor": "#0B1F3A", "noteBkgColor": "#FFF6E5", "noteBorderColor": "#E0A100", "noteTextColor": "#3D2E00", "activationBkgColor": "#C7DBFF", "activationBorderColor": "#1F6FEB", "sequenceNumberColor": "#FFFFFF", "labelBoxBkgColor": "#1F6FEB", "labelBoxBorderColor": "#1F6FEB", "labelTextColor": "#FFFFFF", "loopTextColor": "#0B1F3A", "clusterBkg": "#F7F9FC", "clusterBorder": "#C9D3E0", "edgeLabelBackground": "#FFFFFF", "transitionLabelColor": "#0B1F3A", "cScale0": "#1F6FEB", "cScaleLabel0": "#FFFFFF", "cScale1": "#1E8E3E", "cScaleLabel1": "#FFFFFF", "cScale2": "#7E57C2", "cScaleLabel2": "#FFFFFF"}}}%%
sequenceDiagram
  autonumber
  participant D as 👤 Engineer
  participant GH as ☁️ GitHub Actions
  participant STS as ☁️ Google STS
  participant AR as ☁️ Artifact Registry
  rect rgb(247,249,252)
  D->>GH: git tag 0.3.0 and push
  GH->>GH: go test -race ./...
  GH->>STS: exchange GitHub OIDC token (WIF)
  STS-->>GH: short-lived access token
  GH->>AR: docker buildx push league-service:0.3.0
  AR-->>GH: digest sha256
  GH-->>D: job summary with tag + digest
  end
```

## Pipelines at a glance

| Repo | Trigger | Jobs | Output |
|---|---|---|---|
| league-fe | PR, push `master` | format · lint · typecheck · test · build | status check |
| league-fe | tag `*.*.*` | ci → guard → build → bundle check → deploy | Vercel production |
| league-be | PR, push | lint · fmt · vet · test -race · build | status check |
| league-be | tag `*.*.*` | test → auth → build → push | image in Artifact Registry |
| league-be | tag `*.*.*` (F22) | + migrate Job → helm upgrade | GKE rollout |

## Edge cases

| ID | Situation | Expected |
|---|---|---|
| EC-21.1 | Tag pushed on a feature branch | FE `guard` fails. BE should add the same guard |
| EC-21.2 | Two tags pushed in a row | Concurrency queues them; the second runs after the first |
| EC-21.3 | Flaky test on release | Release fails; re-run the job. Never skip tests on tags |
| EC-21.4 | Need to roll back | Re-deploy the previous Vercel deployment (`vercel promote`) and `helm rollback` (F22) |

## Acceptance criteria

- **AC-21.1** Given a tag on a commit not on `master`, when FE CD runs, then `guard` fails and nothing deploys.
- **AC-21.2** Given a PR with a lint warning, when CI runs, then the PR is blocked.
- **AC-21.3** Given a BE tag, when release finishes, then the image with that tag exists and no JSON key was used.

## Implementation gaps

- league-be has no tag-on-master guard.
- No deploy job for the backend (F22).
- Actions aren't pinned to SHAs in either repo.

## Open questions

- Should merges to `master` deploy staging automatically (F23)? Default: yes.

---

[← F20](F20-pwa-theme-i18n.md) · [E06 overview](README.md) · [F22 →](F22-gke-deployment.md)
