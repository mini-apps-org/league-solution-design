# F6 — Role checks and captain-owns-night

> [Feature specs](../README.md) › [E01 — Identity & Access](README.md) › **F6** · Phase 1

| Phase | Status | Rules | Repo refs |
|---|---|---|---|
| 1 | 🏗 RBAC tables · ❌ enforcement | ADR-006, [11 §2](../../11-security-and-roles.md) | `league-be/db/migrations/00001_init.sql` (RBAC seed) · planned `internal/league/services.go` · `league-fe/_parked/src/components/RequireAdmin.tsx` |

## Requirements

| ID | Requirement |
|---|---|
| FR-6.1 | Every league write route is wrapped in `RequireAuth` plus a role check |
| FR-6.2 | **Captain-owns-night:** put-up, result and submit are allowed when the role is ADMIN, or when the role is CAPTAIN **and** the user's player is `captain_player_id` of the night's home or away team |
| FR-6.3 | The server returns `viewerCanManage` and `viewerSide` on the night payload. The FE never derives them itself |
| FR-6.4 | Admin-only routes: player search, SL change and history, transfer, `/teams` |
| FR-6.5 | Denials return 403 `40304` |
| FR-6.6 | FE `RequireAdmin` hides `/admin/*` from non-admins (cosmetic only) |

## Logic

```mermaid
%%{init: {"theme": "base", "themeVariables": {"fontFamily": "Arial", "fontSize": "14px", "primaryColor": "#E8F1FF", "primaryBorderColor": "#1F6FEB", "primaryTextColor": "#0B1F3A", "lineColor": "#5B6B82", "secondaryColor": "#EAF7EF", "tertiaryColor": "#FFF6E5", "actorBkg": "#DCE9FF", "actorTextColor": "#0B1F3A", "actorBorder": "#1F6FEB", "actorLineColor": "#8A9BB3", "signalColor": "#3B4A5E", "signalTextColor": "#0B1F3A", "noteBkgColor": "#FFF6E5", "noteBorderColor": "#E0A100", "noteTextColor": "#3D2E00", "activationBkgColor": "#C7DBFF", "activationBorderColor": "#1F6FEB", "sequenceNumberColor": "#FFFFFF", "labelBoxBkgColor": "#1F6FEB", "labelBoxBorderColor": "#1F6FEB", "labelTextColor": "#FFFFFF", "loopTextColor": "#0B1F3A", "clusterBkg": "#F7F9FC", "clusterBorder": "#C9D3E0", "edgeLabelBackground": "#FFFFFF", "transitionLabelColor": "#0B1F3A", "cScale0": "#1F6FEB", "cScaleLabel0": "#FFFFFF", "cScale1": "#1E8E3E", "cScaleLabel1": "#FFFFFF", "cScale2": "#7E57C2", "cScaleLabel2": "#FFFFFF"}}}%%
flowchart TD
  R["write request on team match T"]:::api --> A{"role = ADMIN?"}
  A -- yes --> OK["allow · viewerSide = null"]:::ok
  A -- no --> C{"role = CAPTAIN?"}
  C -- no --> NO["403 · 40304"]:::bad
  C -- yes --> P{"players.user_id = me<br/>AND id = home.captain_player_id"}
  P -- yes --> OKH["allow · viewerSide = home"]:::ok
  P -- no --> Q{"id = away.captain_player_id"}
  Q -- yes --> OKA["allow · viewerSide = away"]:::ok
  Q -- no --> NO
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

Permission codes (seeded): `player.read`, `match.put_up`, `match.enter_score`, `match.submit`, `roster.manage`, `player.change_skill_level`, `season.manage`. In the MVP, checks are by role and ownership; permission codes become checks when the LO and Rep roles arrive (F50).

## Edge cases

| ID | Situation | Expected |
|---|---|---|
| EC-6.1 | Captain of team A posts a put-up to a night between B and C | 403 `40304` |
| EC-6.2 | Captain puts up for the opposing side | 403. A captain may act only for `viewerSide` |
| EC-6.3 | A team has no `captain_player_id` | Only an admin can run that night |
| EC-6.4 | Admin edits a submitted night | Allowed (and audited in Phase 2, F41) |

## Acceptance criteria
- **AC-6.1** A PLAYER-role session gets 403 on every POST and PUT in the league API.
- **AC-6.2** The captain of 03209 gets `viewerCanManage: true, viewerSide: "home"` on 03209 vs 03214.

---

[← F5](F05-onboarding-member-link.md) · [E01 overview](README.md) · [F37 →](F37-zalo-login-mini-app.md)
