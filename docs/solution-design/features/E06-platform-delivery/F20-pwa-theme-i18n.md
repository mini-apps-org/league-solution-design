# F20 — PWA, theme, i18n, error copy

> [Feature specs](../README.md) › [E06 — Platform & Delivery](README.md) › **F20** · Phase 1

| Phase | Status | Rules | Repo refs |
|---|---|---|---|
| 1 | 🏗 | NFR-03, NFR-05, NFR-06 | `league-fe/public/{manifest.webmanifest,sw.js}` · `src/lib/register-sw.ts` · `src/index.css` · `src/components/ThemeToggle.tsx` · `src/i18n/{index.ts,en.json,vi.json}` · `src/lib/errors.ts` |

## Requirements

*As a captain at a pool hall, I add the app to my home screen, read it in my language, in light or dark, and every error tells me what to do.*

| ID | Requirement |
|---|---|
| FR-20.1 | Installable PWA named "Billiard League" (short name "Bida"): `display: standalone`, `orientation: portrait`, `theme_color #1F6FEB`, icons 192, 512 and maskable 512 |
| FR-20.2 | The service worker registers **only in production builds**. It caches `/assets/*` (hashed), icons and the manifest. It **never caches HTML or `/api/v1/*`**, so a signed-in page can't be replayed on a shared phone |
| FR-20.3 | Cache name `bida-static-v<n>`. On `activate`, delete every other `bida-static-*` cache |
| FR-20.4 | The theme toggle cycles `system → light → dark`. An explicit choice is saved in `localStorage.theme`, and `system` follows `prefers-color-scheme` live |
| FR-20.5 | A pre-paint inline script sets `data-theme` before React mounts (no flash of the wrong theme) |
| FR-20.6 | Design tokens on `:root` (15 colours, radius, spacing). Disabled = chip fill + muted text, never opacity. Tap targets ≥ 44 px. Focus ring 2 px accent. Motion 150/200 ms, 0 under `prefers-reduced-motion` |
| FR-20.7 | i18n `en` + `vi`: every user-visible string, including `aria-label`, `placeholder` and `alt`, comes from a key. Typecheck fails on key drift between the two files |
| FR-20.8 | Errors display `t('apiError.<code>')` only, never the backend `message`. An unknown code falls back to `apiError.50001` |

## Logic

### Service-worker fetch decision

```mermaid
%%{init: {"theme": "base", "themeVariables": {"fontFamily": "Arial", "fontSize": "14px", "primaryColor": "#E8F1FF", "primaryBorderColor": "#1F6FEB", "primaryTextColor": "#0B1F3A", "lineColor": "#5B6B82", "secondaryColor": "#EAF7EF", "tertiaryColor": "#FFF6E5", "actorBkg": "#DCE9FF", "actorTextColor": "#0B1F3A", "actorBorder": "#1F6FEB", "actorLineColor": "#8A9BB3", "signalColor": "#3B4A5E", "signalTextColor": "#0B1F3A", "noteBkgColor": "#FFF6E5", "noteBorderColor": "#E0A100", "noteTextColor": "#3D2E00", "activationBkgColor": "#C7DBFF", "activationBorderColor": "#1F6FEB", "sequenceNumberColor": "#FFFFFF", "labelBoxBkgColor": "#1F6FEB", "labelBoxBorderColor": "#1F6FEB", "labelTextColor": "#FFFFFF", "loopTextColor": "#0B1F3A", "clusterBkg": "#F7F9FC", "clusterBorder": "#C9D3E0", "edgeLabelBackground": "#FFFFFF", "transitionLabelColor": "#0B1F3A", "cScale0": "#1F6FEB", "cScaleLabel0": "#FFFFFF", "cScale1": "#1E8E3E", "cScaleLabel1": "#FFFFFF", "cScale2": "#7E57C2", "cScaleLabel2": "#FFFFFF"}}}%%
flowchart TD
  R(["fetch event"]):::start --> A{"GET and<br/>same origin?"}
  A -- no --> N1["network only"]:::api
  A -- yes --> B{"/assets/*, icon<br/>or manifest?"}
  B -- no --> N2["<b>network only</b><br/>HTML and /api/v1 are never cached"]:::bad
  B -- yes --> C{"in cache<br/>bida-static-vN?"}
  C -- yes --> H["serve from cache"]:::ok
  C -- no --> F["fetch · put in cache · serve"]:::ok
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

*Red is the security rule. Hashed assets are immutable, so cache-first is safe for them only.*

### Theme resolution

```mermaid
%%{init: {"theme": "base", "themeVariables": {"fontFamily": "Arial", "fontSize": "14px", "primaryColor": "#E8F1FF", "primaryBorderColor": "#1F6FEB", "primaryTextColor": "#0B1F3A", "lineColor": "#5B6B82", "secondaryColor": "#EAF7EF", "tertiaryColor": "#FFF6E5", "actorBkg": "#DCE9FF", "actorTextColor": "#0B1F3A", "actorBorder": "#1F6FEB", "actorLineColor": "#8A9BB3", "signalColor": "#3B4A5E", "signalTextColor": "#0B1F3A", "noteBkgColor": "#FFF6E5", "noteBorderColor": "#E0A100", "noteTextColor": "#3D2E00", "activationBkgColor": "#C7DBFF", "activationBorderColor": "#1F6FEB", "sequenceNumberColor": "#FFFFFF", "labelBoxBkgColor": "#1F6FEB", "labelBoxBorderColor": "#1F6FEB", "labelTextColor": "#FFFFFF", "loopTextColor": "#0B1F3A", "clusterBkg": "#F7F9FC", "clusterBorder": "#C9D3E0", "edgeLabelBackground": "#FFFFFF", "transitionLabelColor": "#0B1F3A", "cScale0": "#1F6FEB", "cScaleLabel0": "#FFFFFF", "cScale1": "#1E8E3E", "cScaleLabel1": "#FFFFFF", "cScale2": "#7E57C2", "cScaleLabel2": "#FFFFFF"}}}%%
flowchart LR
  S(["page load"]):::start --> L{"localStorage.theme"}
  L -- "light" --> LT["data-theme = light"]:::fe
  L -- "dark" --> DK["data-theme = dark"]:::fe
  L -- "missing or system" --> M{"prefers-color-scheme<br/>dark?"}
  M -- yes --> DK
  M -- no --> LT
  T(["toggle tap"]):::actor -. "system → light → dark" .-> L
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

### Error copy resolution

```text
messageFor(error):
  code = error.response?.data?.error?.code      // 5-digit, e.g. 40004
  if !code and network error  → t('apiError.network')
  if i18n.exists('apiError.' + code) → t('apiError.' + code)
  else → t('apiError.50001')
```

## Flow: install and first load

```mermaid
%%{init: {"theme": "base", "themeVariables": {"fontFamily": "Arial", "fontSize": "14px", "primaryColor": "#E8F1FF", "primaryBorderColor": "#1F6FEB", "primaryTextColor": "#0B1F3A", "lineColor": "#5B6B82", "secondaryColor": "#EAF7EF", "tertiaryColor": "#FFF6E5", "actorBkg": "#DCE9FF", "actorTextColor": "#0B1F3A", "actorBorder": "#1F6FEB", "actorLineColor": "#8A9BB3", "signalColor": "#3B4A5E", "signalTextColor": "#0B1F3A", "noteBkgColor": "#FFF6E5", "noteBorderColor": "#E0A100", "noteTextColor": "#3D2E00", "activationBkgColor": "#C7DBFF", "activationBorderColor": "#1F6FEB", "sequenceNumberColor": "#FFFFFF", "labelBoxBkgColor": "#1F6FEB", "labelBoxBorderColor": "#1F6FEB", "labelTextColor": "#FFFFFF", "loopTextColor": "#0B1F3A", "clusterBkg": "#F7F9FC", "clusterBorder": "#C9D3E0", "edgeLabelBackground": "#FFFFFF", "transitionLabelColor": "#0B1F3A", "cScale0": "#1F6FEB", "cScaleLabel0": "#FFFFFF", "cScale1": "#1E8E3E", "cScaleLabel1": "#FFFFFF", "cScale2": "#7E57C2", "cScaleLabel2": "#FFFFFF"}}}%%
sequenceDiagram
  autonumber
  participant U as 👤 Captain
  participant B as 📱 Browser
  participant SW as ⚙️ sw.js
  participant V as ☁️ Vercel
  rect rgb(247,249,252)
  U->>B: open www.mvip-league.com
  B->>V: GET / (HTML, never cached)
  V-->>B: index.html + hashed assets
  B->>SW: register (production only)
  SW->>SW: install · precache icons + manifest
  SW->>SW: activate · delete old bida-static-*
  U->>B: Add to Home Screen
  B-->>U: standalone app, theme #1F6FEB
  end
```

## UI

| Surface | Detail |
|---|---|
| Header menu | Theme toggle (`aria-label` = `theme.toggle`, announces the next mode); language switcher (F25) |
| Install hint | None in Phase 1. Rely on the browser's own prompt |
| Error banner | `ErrorBanner` with `role="alert"`, the copy from `messageFor`, and a Retry button when the query can retry |
| Toasts | Write errors use `sonner` toasts with the same copy |

## API & data

| Item | Value |
|---|---|
| Error envelope | `{"error": {"code": 40004, "message": "<internal>"}}` · only `code` is used |
| Key count | 140 keys per locale today, parity enforced by `src/i18n/index.ts` types |
| Storage | `localStorage.theme`, `localStorage.locale` (F25), wrapped in try/catch |

## Edge cases

| ID | Situation | Expected |
|---|---|---|
| EC-20.1 | New release deployed while the app is open | New hashed assets miss the cache and load fresh. The old cache is removed on the next activate |
| EC-20.2 | Logout on a shared device, then Back | The HTML and API calls are network-only, so the session-less API returns 401 and the app redirects to `/login` |
| EC-20.3 | Private browsing (storage throws) | The theme falls back to `system` and nothing crashes |
| EC-20.4 | The backend adds a new error code before the FE ships its copy | The generic `50001` copy shows; no raw backend text |
| EC-20.5 | iOS Safari standalone | `apple-touch-icon` and the status-bar meta are present; safe-area insets pad the sticky action bar |

## Acceptance criteria

- **AC-20.1** Given a production build, when Lighthouse runs, then the PWA is installable and axe reports 0 critical issues on every screen.
- **AC-20.2** Given a signed-in user who logs out, when another person opens the app offline, then no previous page or data is shown.
- **AC-20.3** Given `vi.json` misses a key that `en.json` has, when `pnpm typecheck` runs, then it fails.
- **AC-20.4** Given an API error `40004`, when it's displayed, then the text equals `t('apiError.40004')` in the current locale.

## Implementation gaps

- No language switcher yet; the default is still `en` (both in F25).
- Lighthouse, axe and real-device QA (iOS Safari; Android with the keyboard over the steppers) haven't been run (plan-9).
- Error copy for codes added by the missing league API (`40004`, `40901`, `40902`) must be added with E02.

## Open questions

- Should the app show its own "Install" hint after the second visit? (Default: no.)

---

[E06 overview](README.md) · [F21 →](F21-ci-cd.md)
