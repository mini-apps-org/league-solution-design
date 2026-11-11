# F29 — Offline scoring sync

> [Feature specs](../README.md) › [E07 — Live Scoring](README.md) › **F29** · Phase 2

| Phase | Status | Rules | Repo refs |
|---|---|---|---|
| 2 | 🎯 | NFR-04 · [08 §5](../../08-scorekeeping-engine.md) | new `league-fe/src/lib/scoring/{queue,sync}.ts` |

## Requirements

*As a scorekeeper in a basement pool hall with bad signal, I keep scoring without waiting. Nothing I tap is lost or counted twice when the connection comes back.*

| ID | Requirement |
|---|---|
| FR-29.1 | Every event gets a client `idempotencyKey` (UUIDv7) and the `expectedSeq` the client believed was current |
| FR-29.2 | Events are applied to the local state at once (TS reducer) and written to an IndexedDB queue **before** any network call |
| FR-29.3 | A sync loop sends up to 50 queued events per request, in order. It runs on enqueue, on `online`, on visibility change, and every 5 s while the queue isn't empty |
| FR-29.4 | Server: duplicate `idempotencyKey` → 200 with the original `seq` (no-op). Events are processed in order in one transaction; the first invalid event stops the batch and is reported |
| FR-29.5 | `409 stale` → the client fetches `events?after=<serverSeq>`, applies them, re-applies its still-pending events on top (**rebase**), and retries. Pending events that become invalid after the rebase are dropped with a visible notice |
| FR-29.6 | The UI shows sync status: ✓ synced · ↻ syncing n · ⚠ offline n pending. Submitting the night (F15) needs an empty queue |
| FR-29.7 | The queue survives reloads and app restarts. It's keyed by team match and cleared after submit |
| FR-29.8 | The service worker still never caches `/api/v1` (F20). Offline support lives in app code, not in SW caching |

## Logic: sync loop

```mermaid
%%{init: {"theme": "base", "themeVariables": {"fontFamily": "Arial", "fontSize": "14px", "primaryColor": "#E8F1FF", "primaryBorderColor": "#1F6FEB", "primaryTextColor": "#0B1F3A", "lineColor": "#5B6B82", "secondaryColor": "#EAF7EF", "tertiaryColor": "#FFF6E5", "actorBkg": "#DCE9FF", "actorTextColor": "#0B1F3A", "actorBorder": "#1F6FEB", "actorLineColor": "#8A9BB3", "signalColor": "#3B4A5E", "signalTextColor": "#0B1F3A", "noteBkgColor": "#FFF6E5", "noteBorderColor": "#E0A100", "noteTextColor": "#3D2E00", "activationBkgColor": "#C7DBFF", "activationBorderColor": "#1F6FEB", "sequenceNumberColor": "#FFFFFF", "labelBoxBkgColor": "#1F6FEB", "labelBoxBorderColor": "#1F6FEB", "labelTextColor": "#FFFFFF", "loopTextColor": "#0B1F3A", "clusterBkg": "#F7F9FC", "clusterBorder": "#C9D3E0", "edgeLabelBackground": "#FFFFFF", "transitionLabelColor": "#0B1F3A", "cScale0": "#1F6FEB", "cScaleLabel0": "#FFFFFF", "cScale1": "#1E8E3E", "cScaleLabel1": "#FFFFFF", "cScale2": "#7E57C2", "cScaleLabel2": "#FFFFFF"}}}%%
flowchart TD
  T(["trigger · enqueue, online, 5 s"]):::start --> E{"queue empty?"}
  E -- yes --> OK["status ✓ synced"]:::ok
  E -- no --> N{"online?"}
  N -- no --> OFF["status ⚠ offline n"]:::warn
  N -- yes --> P["POST batch ≤ 50"]:::api
  P --> R{"response"}
  R -- "200" --> D["remove acked · set seq"]:::ok --> E
  R -- "409 stale" --> RB["fetch events after serverSeq<br/>rebase pending"]:::warn --> P
  R -- "400 invalid at k" --> DR["drop event k · notify<br/>keep the rest"]:::bad --> P
  R -- "network error" --> BO["backoff 2 s × 2ⁿ"]:::warn --> T
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

## Flow: offline then reconnect

```mermaid
%%{init: {"theme": "base", "themeVariables": {"fontFamily": "Arial", "fontSize": "14px", "primaryColor": "#E8F1FF", "primaryBorderColor": "#1F6FEB", "primaryTextColor": "#0B1F3A", "lineColor": "#5B6B82", "secondaryColor": "#EAF7EF", "tertiaryColor": "#FFF6E5", "actorBkg": "#DCE9FF", "actorTextColor": "#0B1F3A", "actorBorder": "#1F6FEB", "actorLineColor": "#8A9BB3", "signalColor": "#3B4A5E", "signalTextColor": "#0B1F3A", "noteBkgColor": "#FFF6E5", "noteBorderColor": "#E0A100", "noteTextColor": "#3D2E00", "activationBkgColor": "#C7DBFF", "activationBorderColor": "#1F6FEB", "sequenceNumberColor": "#FFFFFF", "labelBoxBkgColor": "#1F6FEB", "labelBoxBorderColor": "#1F6FEB", "labelTextColor": "#FFFFFF", "loopTextColor": "#0B1F3A", "clusterBkg": "#F7F9FC", "clusterBorder": "#C9D3E0", "edgeLabelBackground": "#FFFFFF", "transitionLabelColor": "#0B1F3A", "cScale0": "#1F6FEB", "cScaleLabel0": "#FFFFFF", "cScale1": "#1E8E3E", "cScaleLabel1": "#FFFFFF", "cScale2": "#7E57C2", "cScaleLabel2": "#FFFFFF"}}}%%
sequenceDiagram
  autonumber
  participant S as 👤 Scorekeeper
  participant FE as 📱 reducer + queue
  participant API as ⚙️ scoring API
  participant DB as 🗄️ Postgres
  rect rgb(247,249,252)
  Note over FE,API: signal lost
  S->>FE: Turn Over · DS · End Rack
  FE->>FE: apply locally · queue 3 events (expectedSeq 20, 21, 22)
  Note over FE,API: signal back
  FE->>API: POST events [3]
  alt nobody else wrote
    rect rgb(234,247,239)
    API->>DB: insert seq 21, 22, 23
    API-->>FE: 200 acked
    end
  else an admin correction landed at seq 21
    rect rgb(255,246,229)
    API-->>FE: 409 serverSeq 21
    FE->>API: GET events?after=20
    FE->>FE: apply seq 21 · re-apply pending
    FE->>API: POST events [3] expectedSeq 21
    API-->>FE: 200 acked
    end
  end
  end
```

## API & data

```json
{
  "error": { "code": 40920, "message": "stale expectedSeq" },
  "data": { "serverSeq": 21 }
}
```

| IndexedDB store | Key | Value |
|---|---|---|
| `pending` | `[teamMatchId, idempotencyKey]` | event + `enqueuedAt` |
| `snapshot` | `teamMatchId` | last server state + `seq` |

## Edge cases

| ID | Situation | Expected |
|---|---|---|
| EC-29.1 | The same batch is sent twice (timeout, then retry) | The second is an idempotent no-op ([08 §8 #9](../../08-scorekeeping-engine.md)) |
| EC-29.2 | Two devices write at the same seq | The one without the lease is rejected (F30); otherwise, 409 and rebase |
| EC-29.3 | Phone storage full | Show a blocking error; offer "Enter final score instead" |
| EC-29.4 | App killed mid-sync | Events not acked stay queued; resent on next open |
| EC-29.5 | Offline for the whole night | Scoring works; submit waits for sync with a clear "Connect to submit" state |

## Acceptance criteria

- **AC-29.1** Given airplane mode for 20 events, when the network returns, then the server holds exactly those 20 events in order.
- **AC-29.2** Given a 409, then after rebase the client state equals the server state plus the pending events.
- **AC-29.3** Given a non-empty queue, then "Submit night" is disabled with the pending count.

## Open questions

- Should pending events older than 24 h be discarded? Default: no; ask the user.

---

[← F28](F28-racks-accolades.md) · [E07 overview](README.md) · [F30 →](F30-scoring-lease-viewers.md)
