# F31 — Dual-captain verification, bonus, disputes, admin resolution

> [Feature specs](../README.md) › [E08 — Score Verification & Disputes](README.md) › **F31** · Phase 2

| Phase | Status | Rules | Repo refs |
|---|---|---|---|
| 2 | 🎯 | R-110, R-111, R-112, R-113 · [08 §6](../../08-scorekeeping-engine.md) | Phase 1 analogue: `SubmitNightSheet` (parked) and `POST /team-matches/{id}/submit` |

## Requirements

*As a captain, after the last match I check the night's summary and confirm it. When both teams confirm the same record, we each get a bonus. If something's wrong, I reject it with a reason and an admin sorts it out.*

| ID | Requirement |
|---|---|
| FR-31.1 | **Submit** (all 5 slots complete or forfeit) builds a canonical snapshot: per match the member ID, SL, games won/needed (or points/target), points, innings, DS; plus team totals. Keys sorted, no whitespace; `snapshot_hash = sha256(json)` |
| FR-31.2 | Status → `awaiting_verification`, `verification_deadline = ended_at + 24 h` (R-112, configurable per division) |
| FR-31.3 | Each team's captain (or co-captain) sees the summary and sends `VERIFY {decision: confirm|reject, snapshotHash, comment}`. Confirm must carry the current hash; reject needs a comment of ≥ 10 characters |
| FR-31.4 | **Both confirm with the server hash** → `finalized`, and each team gets the bonus: +1 (8-Ball) or +10 (9-Ball) (R-110) |
| FR-31.5 | **Any reject** → `disputed` with a dispute row. **Dual-device mode** (each team scored its own stream): the server diffs the two projections field by field and a mismatch opens a dispute automatically (R-111) |
| FR-31.6 | **Deadline passes** with fewer than two confirms → `finalized_no_bonus` for both teams (worker sweep every 5 min) |
| FR-31.7 | **Admin resolution:** the admin sees the snapshot, the diff, the comments and the event log; applies corrections (as `ADMIN_CORRECTION` events, re-scored by the same rules); chooses whether to grant the bonus; the result is `finalized_no_bonus` or `finalized` (if the bonus is granted). All audited (F41) |
| FR-31.8 | Any correction **before** finalization (by an admin) changes the hash and clears earlier confirms; both captains are asked again |
| FR-31.9 | Notifications (F40): "Please verify tonight's result", "Result disputed", "Dispute resolved" |

## Logic: verification state machine

```mermaid
%%{init: {"theme": "base", "themeVariables": {"fontFamily": "Arial", "fontSize": "14px", "primaryColor": "#E8F1FF", "primaryBorderColor": "#1F6FEB", "primaryTextColor": "#0B1F3A", "lineColor": "#5B6B82", "secondaryColor": "#EAF7EF", "tertiaryColor": "#FFF6E5", "actorBkg": "#DCE9FF", "actorTextColor": "#0B1F3A", "actorBorder": "#1F6FEB", "actorLineColor": "#8A9BB3", "signalColor": "#3B4A5E", "signalTextColor": "#0B1F3A", "noteBkgColor": "#FFF6E5", "noteBorderColor": "#E0A100", "noteTextColor": "#3D2E00", "activationBkgColor": "#C7DBFF", "activationBorderColor": "#1F6FEB", "sequenceNumberColor": "#FFFFFF", "labelBoxBkgColor": "#1F6FEB", "labelBoxBorderColor": "#1F6FEB", "labelTextColor": "#FFFFFF", "loopTextColor": "#0B1F3A", "clusterBkg": "#F7F9FC", "clusterBorder": "#C9D3E0", "edgeLabelBackground": "#FFFFFF", "transitionLabelColor": "#0B1F3A", "cScale0": "#1F6FEB", "cScaleLabel0": "#FFFFFF", "cScale1": "#1E8E3E", "cScaleLabel1": "#FFFFFF", "cScale2": "#7E57C2", "cScaleLabel2": "#FFFFFF"}}}%%
flowchart TD
  S(["submit night"]):::start --> AW["<b>awaiting verification</b><br/>hash H · deadline +24 h"]:::warn
  AW --> V{"event"}
  V -- "confirm with H" --> C{"other team<br/>confirmed H?"}
  C -- no --> AW
  C -- yes --> F["<b>finalized</b><br/>bonus to both teams"]:::ok
  V -- "confirm with old hash" --> X["reject 40940<br/>reload summary"]:::bad
  V -- "reject + reason" --> D["<b>disputed</b>"]:::bad
  V -- "deadline passed" --> NB["<b>finalized · no bonus</b>"]:::api
  V -- "admin correction" --> RH["new hash H′<br/>confirms cleared"]:::warn --> AW
  D -- "admin resolves" --> R{"grant bonus?"}
  R -- yes --> F
  R -- no --> NB
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

## Flow: happy path and dispute

```mermaid
%%{init: {"theme": "base", "themeVariables": {"fontFamily": "Arial", "fontSize": "14px", "primaryColor": "#E8F1FF", "primaryBorderColor": "#1F6FEB", "primaryTextColor": "#0B1F3A", "lineColor": "#5B6B82", "secondaryColor": "#EAF7EF", "tertiaryColor": "#FFF6E5", "actorBkg": "#DCE9FF", "actorTextColor": "#0B1F3A", "actorBorder": "#1F6FEB", "actorLineColor": "#8A9BB3", "signalColor": "#3B4A5E", "signalTextColor": "#0B1F3A", "noteBkgColor": "#FFF6E5", "noteBorderColor": "#E0A100", "noteTextColor": "#3D2E00", "activationBkgColor": "#C7DBFF", "activationBorderColor": "#1F6FEB", "sequenceNumberColor": "#FFFFFF", "labelBoxBkgColor": "#1F6FEB", "labelBoxBorderColor": "#1F6FEB", "labelTextColor": "#FFFFFF", "loopTextColor": "#0B1F3A", "clusterBkg": "#F7F9FC", "clusterBorder": "#C9D3E0", "edgeLabelBackground": "#FFFFFF", "transitionLabelColor": "#0B1F3A", "cScale0": "#1F6FEB", "cScaleLabel0": "#FFFFFF", "cScale1": "#1E8E3E", "cScaleLabel1": "#FFFFFF", "cScale2": "#7E57C2", "cScaleLabel2": "#FFFFFF"}}}%%
sequenceDiagram
  autonumber
  participant H as 👤 Home captain
  participant A as 👤 Away captain
  participant API as ⚙️ league-be
  participant DB as 🗄️ Postgres
  participant ADM as 👤 Admin
  rect rgb(247,249,252)
  H->>API: POST submit
  API->>DB: snapshot + hash H · awaiting · deadline · outbox VerifyRequested
  H->>API: VERIFY confirm H
  API->>DB: verifications home confirm
  alt away confirms
    rect rgb(234,247,239)
    A->>API: VERIFY confirm H
    API->>DB: finalized · bonus +1 each · outbox TeamMatchFinalized
    end
  else away rejects
    rect rgb(253,236,236)
    A->>API: VERIFY reject "match 3 was 3-1 not 3-2"
    API->>DB: disputed · disputes row
    ADM->>API: GET dispute · snapshot · events
    ADM->>API: resolve · correction match 3 · no bonus
    API->>DB: ADMIN_CORRECTION · re-score · finalized_no_bonus · audit
    end
  end
  end
```

## UI

| Screen | Content |
|---|---|
| Verify sheet (captain) | Totals with a crown on the winner, five match rows (players, SL, games, points), the bonus at stake, the deadline countdown, buttons **Confirm** (primary) and **Something's wrong** |
| Reject form | Pick the match(es) affected, free-text reason, submit |
| Night page | Badge: "Waiting for {team} to verify" · "Verified ✓ +1" · "Disputed" · "Final (no bonus)" |
| Admin › Disputes | Queue sorted by age; detail with a side-by-side diff (red cells), comments, event timeline, correction form, "Grant bonus" toggle, required resolution note |

## API & data

```json
{
  "teamId": "<team-uuid>",
  "decision": "confirm",
  "snapshotHash": "9f2c<…>e1",
  "comment": null
}
```

| Error | When |
|---|---|
| `40301` | The caller isn't a captain of that team or an admin |
| `40940` | The hash doesn't match the current snapshot |
| `40941` | The night isn't awaiting verification |
| `40942` | The team has already confirmed this hash |

## Edge cases

| ID | Situation | Expected |
|---|---|---|
| EC-31.1 | Deadline passes with one confirm | `finalized_no_bonus` for **both** teams ([08 §8 #13](../../08-scorekeeping-engine.md)) |
| EC-31.2 | A captain plays for both teams (impossible by roster rules) | Guarded by F39c; verification needs a distinct captain per team |
| EC-31.3 | Captain confirms, then spots an error before the other confirms | They can change to reject until finalized |
| EC-31.4 | Admin edits a finalized night | A post-final correction re-scores and audits; the bonus stays as decided |
| EC-31.5 | Forfeit slots | Included in the snapshot as `forfeit: home|away` |

## Acceptance criteria

- **AC-31.1** Given both captains confirm the same hash, then the night is finalized and each team's standings rise by its points plus 1 (8-Ball).
- **AC-31.2** Given an admin correction after one confirm, then the hash changes and both confirms are needed again.
- **AC-31.3** Given 24 h pass with one confirm, then the status is `finalized_no_bonus` and neither team gets a bonus.
- **AC-31.4** Given a dispute is resolved, then `audit_log` has the corrections, the bonus decision and the note.

## Open questions

- [Q30](../../14-open-questions.md): who may submit, and can co-captains verify?
- Is 24 h the right window for this league?

---

[E08 overview](README.md)
