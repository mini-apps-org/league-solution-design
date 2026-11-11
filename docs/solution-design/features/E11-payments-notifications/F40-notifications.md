# F40 — Notifications

> [Feature specs](../README.md) › [E11 — Payments & Notifications](README.md) › **F40** · Phase 2

| Phase | Status | Rules | Repo refs |
|---|---|---|---|
| 2 | 🎯 | [08 §7](../../08-scorekeeping-engine.md) | — |

## Requirements

*As a player, I'm told about my matches, results, fees and skill changes in Zalo, in Vietnamese, without spam. I can turn off what I don't want.*

| ID | Requirement |
|---|---|
| FR-40.1 | Channels: **Zalo OA / ZNS** (primary, needs the user's Zalo ID from F37 and OA follow, or a ZNS template with a phone number), **email** (fallback), **in-app inbox** (always) |
| FR-40.2 | Kinds and triggers: below. Each kind has a template per locale (vi, en) and a channel default |
| FR-40.3 | Preferences per user and kind; transactional kinds (payment receipt, dispute) can't be fully disabled; they fall back to in-app |
| FR-40.4 | Sending only from the worker (F42), keyed by `(event_id, user_id, kind)` so retries never duplicate |
| FR-40.5 | Quiet hours 23:00–08:00 ICT for non-urgent kinds; queued until the morning |
| FR-40.6 | ZNS templates must be pre-approved by Zalo; template IDs live in config |
| FR-40.7 | In-app inbox: bell icon with unread count, list, mark as read |

## Kinds

| Kind | Trigger | Who | Urgent |
|---|---|---|---|
| `match_reminder` | 10:00 on match day (scheduler) | Both rosters | No |
| `verify_request` | `TeamMatchSubmitted` (E08) | Both captains | Yes |
| `result_posted` | `TeamMatchFinalized` | Both rosters | No |
| `dispute_update` | `DisputeOpened` / `Resolved` | Captains, admins | Yes |
| `fee_due` | Charge created (F36) | The player | No |
| `payment_receipt` | `PaymentSucceeded` | The payer | Yes |
| `sl_changed` | `SkillLevelChanged` | The player | No |
| `roster_request` | Late add pending (F39c) | Admins | Yes |

## Logic: dispatch

```mermaid
%%{init: {"theme": "base", "themeVariables": {"fontFamily": "Arial", "fontSize": "14px", "primaryColor": "#E8F1FF", "primaryBorderColor": "#1F6FEB", "primaryTextColor": "#0B1F3A", "lineColor": "#5B6B82", "secondaryColor": "#EAF7EF", "tertiaryColor": "#FFF6E5", "actorBkg": "#DCE9FF", "actorTextColor": "#0B1F3A", "actorBorder": "#1F6FEB", "actorLineColor": "#8A9BB3", "signalColor": "#3B4A5E", "signalTextColor": "#0B1F3A", "noteBkgColor": "#FFF6E5", "noteBorderColor": "#E0A100", "noteTextColor": "#3D2E00", "activationBkgColor": "#C7DBFF", "activationBorderColor": "#1F6FEB", "sequenceNumberColor": "#FFFFFF", "labelBoxBkgColor": "#1F6FEB", "labelBoxBorderColor": "#1F6FEB", "labelTextColor": "#FFFFFF", "loopTextColor": "#0B1F3A", "clusterBkg": "#F7F9FC", "clusterBorder": "#C9D3E0", "edgeLabelBackground": "#FFFFFF", "transitionLabelColor": "#0B1F3A", "cScale0": "#1F6FEB", "cScaleLabel0": "#FFFFFF", "cScale1": "#1E8E3E", "cScaleLabel1": "#FFFFFF", "cScale2": "#7E57C2", "cScaleLabel2": "#FFFFFF"}}}%%
flowchart TD
  E(["outbox event"]):::start --> K["map to kind + recipients"]:::api
  K --> U["for each user"]:::api --> D{"already sent<br/>event + user + kind?"}
  D -- yes --> SK["skip"]:::ok
  D -- no --> IA["write in-app inbox"]:::fe
  IA --> PR{"pref enabled?"}
  PR -- no --> DN["done"]:::ok
  PR -- yes --> Q{"quiet hours and<br/>not urgent?"}
  Q -- yes --> DL["delay to 08:00"]:::warn
  Q -- no --> CH{"Zalo ID linked?"}
  CH -- yes --> ZA["send Zalo OA / ZNS"]:::ext
  CH -- no --> EM["send email"]:::ext
  ZA --> DN
  EM --> DN
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

## Flow

```mermaid
%%{init: {"theme": "base", "themeVariables": {"fontFamily": "Arial", "fontSize": "14px", "primaryColor": "#E8F1FF", "primaryBorderColor": "#1F6FEB", "primaryTextColor": "#0B1F3A", "lineColor": "#5B6B82", "secondaryColor": "#EAF7EF", "tertiaryColor": "#FFF6E5", "actorBkg": "#DCE9FF", "actorTextColor": "#0B1F3A", "actorBorder": "#1F6FEB", "actorLineColor": "#8A9BB3", "signalColor": "#3B4A5E", "signalTextColor": "#0B1F3A", "noteBkgColor": "#FFF6E5", "noteBorderColor": "#E0A100", "noteTextColor": "#3D2E00", "activationBkgColor": "#C7DBFF", "activationBorderColor": "#1F6FEB", "sequenceNumberColor": "#FFFFFF", "labelBoxBkgColor": "#1F6FEB", "labelBoxBorderColor": "#1F6FEB", "labelTextColor": "#FFFFFF", "loopTextColor": "#0B1F3A", "clusterBkg": "#F7F9FC", "clusterBorder": "#C9D3E0", "edgeLabelBackground": "#FFFFFF", "transitionLabelColor": "#0B1F3A", "cScale0": "#1F6FEB", "cScaleLabel0": "#FFFFFF", "cScale1": "#1E8E3E", "cScaleLabel1": "#FFFFFF", "cScale2": "#7E57C2", "cScaleLabel2": "#FFFFFF"}}}%%
sequenceDiagram
  autonumber
  participant W as ⚙️ worker
  participant DB as 🗄️ Postgres
  participant Z as ☁️ Zalo OA
  participant P as 👤 Player
  rect rgb(247,249,252)
  W->>DB: claim TeamMatchFinalized
  W->>DB: recipients = both rosters · prefs
  loop each player
    W->>DB: insert notifications (unique event, user, kind)
    W->>Z: send template result_posted vi
    Z-->>P: "03209 thắng 03214 9–5"
    W->>DB: status sent
  end
  end
```

## Edge cases

| ID | Situation | Expected |
|---|---|---|
| EC-40.1 | Zalo rejects (user unfollowed the OA) | Mark the channel unreachable; fall back to email next time |
| EC-40.2 | 200 players in one finalize | Batched with a rate limit per Zalo's quota |
| EC-40.3 | Player has no Zalo and no email | In-app only |

## Acceptance criteria

- **AC-40.1** Given a worker retry after sending, then the player gets one message, not two.
- **AC-40.2** Given `sl_changed` at 23:30, then it's delivered at 08:00; `dispute_update` at 23:30 is sent at once.

## Open questions

- Zalo OA account ownership, ZNS budget, and template approval timeline.

---

[← F36](F36-fees-payments.md) · [E11 overview](README.md)
