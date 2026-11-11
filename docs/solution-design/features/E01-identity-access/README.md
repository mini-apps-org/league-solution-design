# E01 — Identity & Access

> [Feature specs](../README.md) › **E01**

| | |
|---|---|
| **Goal** | Every person signs in with one identity, is linked to their league membership, and can only do what their role allows |
| **Phase** | 1 (F1–F6) · 2 (F37) |
| **Status** | 🏗 Google sign-in, sessions, CSRF · ❌ `/me` role + `playerId`, member-link API, role enforcement |
| **Actors** | Player, Captain, Admin, Google |
| **Related** | [05 §3 cookie topology](../../05-architecture.md) · [07 error codes](../../07-api-design.md) · [11 security](../../11-security-and-roles.md) |

## Features by phase

### Phase 1

| # | Feature | Status |
|---|---|---|
| F1 | [Google sign-in](F01-google-sign-in.md) | 🏗 |
| F2 | [Sessions & logout](F02-sessions-logout.md) | 🏗 |
| F3 | [CSRF protection](F03-csrf.md) | 🏗 |
| F4 | [`/me` with role + playerId](F04-me-role-player.md) | 🏗 / ❌ |
| F5 | [Onboarding: link member ID](F05-onboarding-member-link.md) | 🏗 UI / ❌ API |
| F6 | [Role checks + captain-owns-night](F06-rbac-captain-owns-night.md) | ❌ |

### Phase 2

| # | Feature | Status |
|---|---|---|
| F37 | [Zalo login & Mini App](F37-zalo-login-mini-app.md) | 🎯 |

## Phase 1 deep dive

### Components

```mermaid
%%{init: {"theme": "base", "themeVariables": {"fontFamily": "Arial", "fontSize": "14px", "primaryColor": "#E8F1FF", "primaryBorderColor": "#1F6FEB", "primaryTextColor": "#0B1F3A", "lineColor": "#5B6B82", "secondaryColor": "#EAF7EF", "tertiaryColor": "#FFF6E5", "actorBkg": "#DCE9FF", "actorTextColor": "#0B1F3A", "actorBorder": "#1F6FEB", "actorLineColor": "#8A9BB3", "signalColor": "#3B4A5E", "signalTextColor": "#0B1F3A", "noteBkgColor": "#FFF6E5", "noteBorderColor": "#E0A100", "noteTextColor": "#3D2E00", "activationBkgColor": "#C7DBFF", "activationBorderColor": "#1F6FEB", "sequenceNumberColor": "#FFFFFF", "labelBoxBkgColor": "#1F6FEB", "labelBoxBorderColor": "#1F6FEB", "labelTextColor": "#FFFFFF", "loopTextColor": "#0B1F3A", "clusterBkg": "#F7F9FC", "clusterBorder": "#C9D3E0", "edgeLabelBackground": "#FFFFFF", "transitionLabelColor": "#0B1F3A", "cScale0": "#1F6FEB", "cScaleLabel0": "#FFFFFF", "cScale1": "#1E8E3E", "cScaleLabel1": "#FFFFFF", "cScale2": "#7E57C2", "cScaleLabel2": "#FFFFFF"}}}%%
flowchart LR
  U(["👤 User"]):::actor
  subgraph FE["📱 league-fe"]
    direction TB
    LP["<b>LoginPage</b><br/>GoogleSignInButton · ?error banner"]:::fe
    RA["<b>RequireAuth</b><br/>session gate · link gate"]:::fe
    OB["<b>OnboardingPage</b><br/>MemberPreviewCard"]:::fe
    AX["<b>src/api/axios.ts</b><br/>withCredentials · X-CSRF-Token · 401"]:::fe
  end
  subgraph BE["⚙️ league-be"]
    direction TB
    CSRF["<b>middleware/csrf.go</b><br/>double-submit"]:::api
    AH["<b>auth/handlers.go</b><br/>login · callback · logout · me"]:::api
    MWA["<b>auth/middleware.go</b><br/>RequireAuth"]:::api
    ROLE["<b>role resolver</b><br/>ADMIN > CAPTAIN > PLAYER"]:::api
    LINK["<b>members preview / me/link</b>"]:::api
  end
  subgraph DB["🗄️ Postgres"]
    direction TB
    USERS[("users · sessions")]:::db
    RBAC[("roles · permissions<br/>users_roles")]:::db
    PL[("players.user_id")]:::db
  end
  G["Google OIDC"]:::ext
  U ==> LP
  LP == "full-page GET /auth/google/login" ==> AH
  AH <--> G
  AH --> USERS
  RA --> AX --> CSRF --> MWA --> AH
  OB --> AX
  AX --> LINK
  MWA --> ROLE --> RBAC
  LINK --> PL
  class ROLE,LINK gap
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

*Red = specified in plan-3 but not in league-be. Everything else is built.*

### Main flow: first sign-in to a linked account

```mermaid
%%{init: {"theme": "base", "themeVariables": {"fontFamily": "Arial", "fontSize": "14px", "primaryColor": "#E8F1FF", "primaryBorderColor": "#1F6FEB", "primaryTextColor": "#0B1F3A", "lineColor": "#5B6B82", "secondaryColor": "#EAF7EF", "tertiaryColor": "#FFF6E5", "actorBkg": "#DCE9FF", "actorTextColor": "#0B1F3A", "actorBorder": "#1F6FEB", "actorLineColor": "#8A9BB3", "signalColor": "#3B4A5E", "signalTextColor": "#0B1F3A", "noteBkgColor": "#FFF6E5", "noteBorderColor": "#E0A100", "noteTextColor": "#3D2E00", "activationBkgColor": "#C7DBFF", "activationBorderColor": "#1F6FEB", "sequenceNumberColor": "#FFFFFF", "labelBoxBkgColor": "#1F6FEB", "labelBoxBorderColor": "#1F6FEB", "labelTextColor": "#FFFFFF", "loopTextColor": "#0B1F3A", "clusterBkg": "#F7F9FC", "clusterBorder": "#C9D3E0", "edgeLabelBackground": "#FFFFFF", "transitionLabelColor": "#0B1F3A", "cScale0": "#1F6FEB", "cScaleLabel0": "#FFFFFF", "cScale1": "#1E8E3E", "cScaleLabel1": "#FFFFFF", "cScale2": "#7E57C2", "cScaleLabel2": "#FFFFFF"}}}%%
sequenceDiagram
  autonumber
  participant U as 👤 User
  participant FE as 📱 league-fe
  participant API as ⚙️ league-be
  participant G as Google
  participant DB as 🗄️ Postgres
  rect rgb(247,249,252)
  U->>FE: open /login, tap Continue with Google
  FE->>API: full-page GET /api/v1/auth/google/login
  API-->>U: Set-Cookie oauth_tx · 302 to Google
  U->>G: consent
  G-->>API: GET /auth/google/callback?code&state
  API->>G: exchange code + PKCE verifier, verify id_token
  API->>DB: upsert users by google_sub, insert session
  API-->>FE: Set-Cookie sid + csrf · 302 /onboarding (new user)
  FE->>API: GET /me
  API-->>FE: user, role PLAYER, playerId null
  U->>FE: type member ID 95007620
  FE->>API: GET /members/preview?member_id=95007620
  API-->>FE: displayName, team, alreadyLinked false
  U->>FE: This is me · continue
  FE->>API: POST /me/link with X-CSRF-Token
  API->>DB: UPDATE players SET user_id
  FE->>API: GET /me (refetch, awaited)
  API-->>FE: playerId set, role from users_roles
  FE-->>U: navigate to / (schedule)
  end
```

### API surface

| Endpoint | Feature | Status |
|---|---|---|
| `GET /auth/google/login` | F1 | 🏗 |
| `GET /auth/google/callback` | F1 | 🏗 |
| `POST /auth/logout` | F2 | 🏗 |
| `GET /me` | F2, F4 | 🏗 basic · ❌ `role`, `playerId` |
| `GET /members/preview?member_id=` | F5 | ❌ |
| `POST /me/link` | F5 | ❌ |

## Phase 2 deep dive

**Scope:** [F37 Zalo login & Mini App](F37-zalo-login-mini-app.md). Most Vietnamese players live in Zalo, so Phase 2 adds Zalo as a second identity provider and runs the app inside a Zalo Mini App. Sessions, CSRF, RBAC and the member link from Phase 1 stay the same. Only the *front door* changes.

### Components: what Phase 2 adds

```mermaid
%%{init: {"theme": "base", "themeVariables": {"fontFamily": "Arial", "fontSize": "14px", "primaryColor": "#E8F1FF", "primaryBorderColor": "#1F6FEB", "primaryTextColor": "#0B1F3A", "lineColor": "#5B6B82", "secondaryColor": "#EAF7EF", "tertiaryColor": "#FFF6E5", "actorBkg": "#DCE9FF", "actorTextColor": "#0B1F3A", "actorBorder": "#1F6FEB", "actorLineColor": "#8A9BB3", "signalColor": "#3B4A5E", "signalTextColor": "#0B1F3A", "noteBkgColor": "#FFF6E5", "noteBorderColor": "#E0A100", "noteTextColor": "#3D2E00", "activationBkgColor": "#C7DBFF", "activationBorderColor": "#1F6FEB", "sequenceNumberColor": "#FFFFFF", "labelBoxBkgColor": "#1F6FEB", "labelBoxBorderColor": "#1F6FEB", "labelTextColor": "#FFFFFF", "loopTextColor": "#0B1F3A", "clusterBkg": "#F7F9FC", "clusterBorder": "#C9D3E0", "edgeLabelBackground": "#FFFFFF", "transitionLabelColor": "#0B1F3A", "cScale0": "#1F6FEB", "cScaleLabel0": "#FFFFFF", "cScale1": "#1E8E3E", "cScaleLabel1": "#FFFFFF", "cScale2": "#7E57C2", "cScaleLabel2": "#FFFFFF"}}}%%
flowchart LR
  U(["👤 Player in Zalo"]):::actor
  subgraph ZA["☁️ Zalo"]
    direction TB
    ZMA["<b>Zalo Mini App</b><br/>zmp-sdk · getAccessToken"]:::ext
    ZOA["<b>Zalo OAuth v4</b><br/>PKCE · /me Graph API"]:::ext
  end
  subgraph FE["📱 league-fe"]
    direction TB
    LP["<b>LoginPage</b><br/>Google + Zalo buttons"]:::fe
    LNK["<b>Settings › Linked accounts</b>"]:::fe
  end
  subgraph BE["⚙️ league-be · internal/auth"]
    direction TB
    ZL["GET /auth/zalo/login · /callback"]:::api
    ZX["POST /auth/zalo/exchange<br/>Mini App token → session"]:::api
    IDS["identity service<br/>find-or-link by provider subject"]:::api
  end
  DB[("<b>user_identities</b><br/>provider · subject · user_id")]:::db
  U ==> ZMA == "access token" ==> ZX
  LP --> ZL <--> ZOA
  ZX --> ZOA
  ZL --> IDS
  ZX --> IDS
  LNK -.-> IDS
  IDS --> DB
  class ZMA,ZOA,LP,LNK,ZL,ZX,IDS,DB planned
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

*Everything is dashed (Phase 2). Both Zalo paths end in the same identity service, which creates the usual `__Host-sid` session.*

### Key flow: one person, two providers

```mermaid
%%{init: {"theme": "base", "themeVariables": {"fontFamily": "Arial", "fontSize": "14px", "primaryColor": "#E8F1FF", "primaryBorderColor": "#1F6FEB", "primaryTextColor": "#0B1F3A", "lineColor": "#5B6B82", "secondaryColor": "#EAF7EF", "tertiaryColor": "#FFF6E5", "actorBkg": "#DCE9FF", "actorTextColor": "#0B1F3A", "actorBorder": "#1F6FEB", "actorLineColor": "#8A9BB3", "signalColor": "#3B4A5E", "signalTextColor": "#0B1F3A", "noteBkgColor": "#FFF6E5", "noteBorderColor": "#E0A100", "noteTextColor": "#3D2E00", "activationBkgColor": "#C7DBFF", "activationBorderColor": "#1F6FEB", "sequenceNumberColor": "#FFFFFF", "labelBoxBkgColor": "#1F6FEB", "labelBoxBorderColor": "#1F6FEB", "labelTextColor": "#FFFFFF", "loopTextColor": "#0B1F3A", "clusterBkg": "#F7F9FC", "clusterBorder": "#C9D3E0", "edgeLabelBackground": "#FFFFFF", "transitionLabelColor": "#0B1F3A", "cScale0": "#1F6FEB", "cScaleLabel0": "#FFFFFF", "cScale1": "#1E8E3E", "cScaleLabel1": "#FFFFFF", "cScale2": "#7E57C2", "cScaleLabel2": "#FFFFFF"}}}%%
sequenceDiagram
  autonumber
  participant P as 👤 Player
  participant FE as 📱 league-fe
  participant API as ⚙️ league-be
  participant Z as ☁️ Zalo
  participant DB as 🗄️ Postgres
  rect rgb(247,249,252)
  P->>FE: Continue with Zalo
  FE->>API: GET /auth/zalo/login
  API->>Z: authorize with PKCE + state
  Z-->>API: callback code
  API->>Z: exchange code, GET /me
  API->>DB: find user_identities (zalo, subject)
  alt identity exists
    rect rgb(234,247,239)
    API->>DB: create session for its user
    end
  else new identity, user already signed in with Google
    rect rgb(234,247,239)
    API->>DB: link (zalo, subject) to the current user
    end
  else new identity, no session
    rect rgb(255,246,229)
    API->>DB: create user + identity · playerId null
    Note over FE,API: onboarding gate (F5) asks for the member ID
    end
  end
  API-->>FE: 302 to app · Set-Cookie session
  end
```

### Data delta

| Change | Why |
|---|---|
| New `user_identities (user_id, provider, subject, created_at)`, `UNIQUE (provider, subject)` | One user, many providers. Google moves here from `users.google_sub` |
| `users.email` becomes nullable | Zalo doesn't always return an email |
| `GET /me` adds `identities: ["google","zalo"]` | The Linked accounts screen |
| Errors `40008` identity already linked to another user, `40009` cannot unlink the last identity | Safe linking and unlinking |
