# F1 — Google sign-in

> [Feature specs](../README.md) › [E01 — Identity & Access](README.md) › **F1** · Phase 1

| Phase | Status | Rules | Repo refs |
|---|---|---|---|
| 1 | 🏗 | ADR-003, ADR-009 | `league-be/internal/auth/{handlers,services,services_google,login_transaction}.go` · `league-fe/src/pages/auth/LoginPage.tsx`, `src/components/auth/GoogleSignInButton.tsx`, `src/hooks/useLoginError.ts` |

## Requirements
*As a player, I sign in with my Google account so I don't need a league password.*

| ID | Requirement |
|---|---|
| FR-1.1 | The sign-in control is an `<a href>` to `{VITE_API_URL}/api/v1/auth/google/login` with no query params. It is never an XHR, because the browser must follow the 302 and show Google's origin in the address bar |
| FR-1.2 | The backend uses Authorization Code + PKCE (S256) + `state` + `nonce`, scopes `openid email profile` |
| FR-1.3 | State, nonce and verifier are sealed with AES-256-GCM in the `oauth_tx` cookie (10 min, path `/api/v1/auth/google`), and the cookie is cleared as soon as the callback reads it |
| FR-1.4 | The callback accepts only a verified `id_token` (signature, iss, aud, exp), a matching nonce, a non-empty `sub` and `email_verified = true` |
| FR-1.5 | Users are upserted by `google_sub` only, never by email |
| FR-1.6 | A new user is redirected to `/onboarding`; a returning user to `/` |
| FR-1.7 | Failures redirect to `/login?error=cancelled\|login_failed\|server_error`. The FE shows a banner only for these three values |
| FR-1.8 | A signed-in user who opens `/login` is redirected to `/` |
| FR-1.9 | After the click the button shows a spinner and is disabled, without `preventDefault` |

## Rules & logic

```mermaid
%%{init: {"theme": "base", "themeVariables": {"fontFamily": "Arial", "fontSize": "14px", "primaryColor": "#E8F1FF", "primaryBorderColor": "#1F6FEB", "primaryTextColor": "#0B1F3A", "lineColor": "#5B6B82", "secondaryColor": "#EAF7EF", "tertiaryColor": "#FFF6E5", "actorBkg": "#DCE9FF", "actorTextColor": "#0B1F3A", "actorBorder": "#1F6FEB", "actorLineColor": "#8A9BB3", "signalColor": "#3B4A5E", "signalTextColor": "#0B1F3A", "noteBkgColor": "#FFF6E5", "noteBorderColor": "#E0A100", "noteTextColor": "#3D2E00", "activationBkgColor": "#C7DBFF", "activationBorderColor": "#1F6FEB", "sequenceNumberColor": "#FFFFFF", "labelBoxBkgColor": "#1F6FEB", "labelBoxBorderColor": "#1F6FEB", "labelTextColor": "#FFFFFF", "loopTextColor": "#0B1F3A", "clusterBkg": "#F7F9FC", "clusterBorder": "#C9D3E0", "edgeLabelBackground": "#FFFFFF", "transitionLabelColor": "#0B1F3A", "cScale0": "#1F6FEB", "cScaleLabel0": "#FFFFFF", "cScale1": "#1E8E3E", "cScaleLabel1": "#FFFFFF", "cScale2": "#7E57C2", "cScaleLabel2": "#FFFFFF"}}}%%
flowchart TD
  A["GET /auth/google/callback"]:::api --> B{"oauth_tx cookie<br/>opens?"}
  B -- no --> X1["redirect ?error=login_failed"]:::bad
  B -- yes --> C{"Google sent<br/>?error="}
  C -- yes --> X2["redirect ?error=cancelled"]:::bad
  C -- no --> D{"code and state<br/>present, state matches"}
  D -- no --> X1
  D -- yes --> E{"token exchange +<br/>id_token verify"}
  E -- fail --> X3["redirect ?error=server_error"]:::bad
  E -- ok --> F{"nonce ok · sub set ·<br/>email_verified"}
  F -- no --> X1
  F -- yes --> G[("UPSERT users<br/>INSERT sessions")]:::db
  G --> H{"new user?<br/>xmax = 0"}
  H -- yes --> O["302 /onboarding"]:::ok
  H -- no --> P["302 /"]:::ok
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

## UI

| Element | Spec |
|---|---|
| Mobile | 88 px app mark "8", "Billiard League", tagline, Google button pinned near the bottom (56 px, radius 14), legal line |
| ≥ 1024 px | Two columns: brand panel (headline + 3 check points + "Fall 2026 · 8-Ball Open") and a 400 px "Sign in" card |
| Google mark | Official four-colour G, 20 px. The only exception to the colour palette |
| Error banner | `loginError.cancelled` "You cancelled the sign-in." · `login_failed` "Sign-in did not complete. Please try again." · `server_error` "Something went wrong on our side. Please try again." |
| Legal line | One key with `<rules>` and `<privacy>` placeholders rendered via `<Trans>`. Links go to the public `/rules` and `/privacy` pages |

## Edge cases

| ID | Situation | Expected |
|---|---|---|
| EC-1.1 | `?error=teapot` or any other unknown value | No banner |
| EC-1.2 | User replays an old callback URL | `oauth_tx` is already cleared → `login_failed` |
| EC-1.3 | Google account with an unverified email | `login_failed` |
| EC-1.4 | Same Google account changes its email | Same user row (matched by `sub`), email updated |
| EC-1.5 | Login takes more than 10 min on Google's page | The transaction expires → `login_failed` |
| EC-1.6 | Consent screen still in Testing mode | Non-test users are refused by Google (F23) |

## Acceptance criteria
- **AC-1.1** Given a new Google account, when sign-in completes, then cookies `sid` and `csrf` are set and the browser lands on `/onboarding`.
- **AC-1.2** Given `/login?error=cancelled`, then the banner reads "You cancelled the sign-in."
- **AC-1.3** Given a signed-in user, when they open `/login`, then they are redirected to `/`.
- **AC-1.4** After sign-in, `localStorage` contains no token (only `locale`).

## Implementation gaps
- The deep link back to the page the user wanted (`next` path in sessionStorage, 24 validation tests) is marked done in login plan-3, but it isn't in `src/`. A stale comment in `src/router/index.tsx` still refers to it. Rebuild it or drop it from scope.
- The `ui-spec.md` error wording differs from `en.json`. Pick one.
- The league-be auth README describes a `hd` (Workspace domain) check and a `return_to` parameter, neither of which exists.

---

[E01 overview](README.md) · [F2 →](F02-sessions-logout.md)
