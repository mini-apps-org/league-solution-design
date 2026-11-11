# F42 — Worker, outbox, Redis

> [Feature specs](../README.md) › [E06 — Platform & Delivery](README.md) › **F42** · Phase 2

| Phase | Status | Rules | Repo refs |
|---|---|---|---|
| 2 | 🎯 | ADR-006 · [10 §7](../../10-backend-design.md) | new `league-be/cmd/worker`, `internal/outbox`, `migrations/*_outbox.sql` |

## Requirements

*As an engineer, side effects (messages, fees, suggestions) happen reliably after a change commits. They are never lost and never sent twice, even if a pod dies.*

| ID | Requirement |
|---|---|
| FR-42.1 | Table `outbox (id uuid, type text, aggregate_id text, payload jsonb, created_at, available_at, attempts int, last_error text, done_at)` |
| FR-42.2 | Domain writes insert outbox rows **in the same transaction** (e.g. `TeamMatchSubmitted`, `SkillLevelChanged`, `RosterChanged`, `PaymentSucceeded`, `DisputeOpened`) |
| FR-42.3 | `cmd/worker` (its own Deployment, 1–2 replicas) loops: claim up to 100 rows `WHERE done_at IS NULL AND available_at <= now() ORDER BY created_at FOR UPDATE SKIP LOCKED`, dispatch by `type`, then mark done |
| FR-42.4 | Failure → `attempts + 1`, `available_at = now() + backoff(attempts)` (10 s × 2ⁿ, max 1 h). After 10 attempts, it's dead-lettered (`done_at` stays null, `type` flagged) and alerts (F44) |
| FR-42.5 | Handlers are idempotent: table `processed_events (handler, event_id) PRIMARY KEY` is checked and inserted in the handler's own transaction |
| FR-42.6 | Redis (Memorystore, Standard tier) for: live-scoring state and pub/sub (E07), scoring leases (F30), rate-limit buckets (F25), short caches. **Postgres stays the source of truth** |
| FR-42.7 | Housekeeping: delete done outbox rows older than 14 days, nightly |

## Logic: worker loop

```mermaid
%%{init: {"theme": "base", "themeVariables": {"fontFamily": "Arial", "fontSize": "14px", "primaryColor": "#E8F1FF", "primaryBorderColor": "#1F6FEB", "primaryTextColor": "#0B1F3A", "lineColor": "#5B6B82", "secondaryColor": "#EAF7EF", "tertiaryColor": "#FFF6E5", "actorBkg": "#DCE9FF", "actorTextColor": "#0B1F3A", "actorBorder": "#1F6FEB", "actorLineColor": "#8A9BB3", "signalColor": "#3B4A5E", "signalTextColor": "#0B1F3A", "noteBkgColor": "#FFF6E5", "noteBorderColor": "#E0A100", "noteTextColor": "#3D2E00", "activationBkgColor": "#C7DBFF", "activationBorderColor": "#1F6FEB", "sequenceNumberColor": "#FFFFFF", "labelBoxBkgColor": "#1F6FEB", "labelBoxBorderColor": "#1F6FEB", "labelTextColor": "#FFFFFF", "loopTextColor": "#0B1F3A", "clusterBkg": "#F7F9FC", "clusterBorder": "#C9D3E0", "edgeLabelBackground": "#FFFFFF", "transitionLabelColor": "#0B1F3A", "cScale0": "#1F6FEB", "cScaleLabel0": "#FFFFFF", "cScale1": "#1E8E3E", "cScaleLabel1": "#FFFFFF", "cScale2": "#7E57C2", "cScaleLabel2": "#FFFFFF"}}}%%
flowchart TD
  S(["tick · 1 s"]):::start --> C["claim batch<br/>FOR UPDATE SKIP LOCKED"]:::db
  C --> E{"rows?"}
  E -- no --> S
  E -- yes --> H["dispatch by type"]:::api
  H --> P{"already in<br/>processed_events?"}
  P -- yes --> D["mark done"]:::ok
  P -- no --> R{"handler ok?"}
  R -- yes --> D
  R -- no --> A{"attempts ≥ 10?"}
  A -- no --> B["retry later<br/>backoff 10 s × 2ⁿ"]:::warn
  A -- yes --> DL["dead letter · alert"]:::bad
  D --> S
  B --> S
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
  participant S as ⚙️ API service
  participant DB as 🗄️ Postgres
  participant W as ⚙️ worker
  participant N as ☁️ Zalo OA
  rect rgb(247,249,252)
  S->>DB: BEGIN · UPDATE team_matches submitted · INSERT outbox · COMMIT
  W->>DB: claim batch (SKIP LOCKED)
  W->>N: send message, idempotency key = event id
  alt sent
    rect rgb(234,247,239)
    W->>DB: INSERT processed_events · mark done
    end
  else provider error
    rect rgb(253,236,236)
    W->>DB: attempts + 1 · available_at later · last_error
    end
  end
  end
```

## Event catalogue

| Type | Produced by | Handlers |
|---|---|---|
| `TeamMatchSubmitted` | F15 submit | notify both teams (F40), standings cache bust (F35), SL suggestion check (F33) |
| `SkillLevelChanged` | F18 | notify the player (F40), audit (F41) |
| `RosterChanged` | F16, F19 | fee line for a new member (F36) |
| `PaymentSucceeded` | F36 webhook | mark member paid, receipt message (F40) |
| `DisputeOpened` / `DisputeResolved` | F31 | notify the admin and both captains (F40) |

## Edge cases

| ID | Situation | Expected |
|---|---|---|
| EC-42.1 | Worker killed mid-batch | The row locks release on disconnect; another worker reclaims them. `processed_events` prevents a double send |
| EC-42.2 | A transaction rolls back | No outbox row exists, so nothing is sent |
| EC-42.3 | Redis lost | Live views degrade to polling Postgres (E07). Rate limits fall back to in-memory |
| EC-42.4 | Event order for one aggregate | Handlers must not depend on order. Where they must, they read current state from Postgres |

## Acceptance criteria

- **AC-42.1** Given the worker is killed after the send but before marking done, when it restarts, then the message is not sent again.
- **AC-42.2** Given Zalo returns 500 three times, then the row is retried with growing delays and then succeeds.
- **AC-42.3** Given 10 failures, then the row is dead-lettered and an alert fires.

## Open questions

- Use LISTEN/NOTIFY to wake the worker instantly? Default: no; 1 s polling is enough.

---

[← F25](F25-rate-limit-logs-locale.md) · [E06 overview](README.md) · [F44 →](F44-monitoring.md)
