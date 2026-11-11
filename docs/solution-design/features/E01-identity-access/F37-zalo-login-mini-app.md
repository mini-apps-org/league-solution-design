# F37 — Zalo login & Mini App

> [Feature specs](../README.md) › [E01 — Identity & Access](README.md) › **F37** · Phase 2

| Phase | Status | Rules | Repo refs |
|---|---|---|---|
| 2 | 🎯 | ADR-009 revisit | new `internal/auth/services_zalo.go`, FE platform adapter |

## Requirements

| ID | Requirement |
|---|---|
| FR-37.1 | Add Zalo as a second identity provider behind the existing `IdentityProvider` interface. Sessions and cookies stay unchanged |
| FR-37.2 | New table `user_identities (user_id, provider, subject, UNIQUE(provider, subject))`. Google rows migrate from `users.google_sub` |
| FR-37.3 | Account linking: a signed-in user can attach Zalo to their account. Accounts are never merged by phone or email automatically |
| FR-37.4 | The Mini App build wraps the same React app. A `platform` adapter provides `login`, `share` and `storage` |
| FR-37.5 | Inside the Mini App, Zalo login runs automatically; on the web, Google stays the default |

## Flow

```mermaid
%%{init: {"theme": "base", "themeVariables": {"fontFamily": "Arial", "fontSize": "14px", "primaryColor": "#E8F1FF", "primaryBorderColor": "#1F6FEB", "primaryTextColor": "#0B1F3A", "lineColor": "#5B6B82", "secondaryColor": "#EAF7EF", "tertiaryColor": "#FFF6E5", "actorBkg": "#DCE9FF", "actorTextColor": "#0B1F3A", "actorBorder": "#1F6FEB", "actorLineColor": "#8A9BB3", "signalColor": "#3B4A5E", "signalTextColor": "#0B1F3A", "noteBkgColor": "#FFF6E5", "noteBorderColor": "#E0A100", "noteTextColor": "#3D2E00", "activationBkgColor": "#C7DBFF", "activationBorderColor": "#1F6FEB", "sequenceNumberColor": "#FFFFFF", "labelBoxBkgColor": "#1F6FEB", "labelBoxBorderColor": "#1F6FEB", "labelTextColor": "#FFFFFF", "loopTextColor": "#0B1F3A", "clusterBkg": "#F7F9FC", "clusterBorder": "#C9D3E0", "edgeLabelBackground": "#FFFFFF", "transitionLabelColor": "#0B1F3A", "cScale0": "#1F6FEB", "cScaleLabel0": "#FFFFFF", "cScale1": "#1E8E3E", "cScaleLabel1": "#FFFFFF", "cScale2": "#7E57C2", "cScaleLabel2": "#FFFFFF"}}}%%
sequenceDiagram
  autonumber
  participant MA as 📱 Zalo Mini App
  participant API as ⚙️ league-be
  participant Z as Zalo Platform
  participant DB as 🗄️ Postgres
  rect rgb(247,249,252)
  MA->>Z: zmp getAccessToken
  Z-->>MA: access token
  MA->>API: POST /auth/zalo with token and X-CSRF-Token
  API->>Z: verify token, get Zalo user id
  API->>DB: find user_identities provider zalo
  alt found
    API->>DB: insert session
  else new
    API->>DB: insert users + user_identities, insert session
  end
  API-->>MA: Set-Cookie sid + csrf · user
  end
```

## Edge cases and open points
- **Cookies inside the Zalo WebView:** third-party and SameSite behaviour must be verified. If cookies fail, a header-token fallback would need a new ADR.
- **Same person on Google and Zalo:** resolved by explicit linking from the profile (FR-37.3).

## Acceptance criteria
- **AC-37.1** A Mini App user is signed in without a Google prompt, and `/me` works with the cookie session.

---

[← F6](F06-rbac-captain-owns-night.md) · [E01 overview](README.md)
