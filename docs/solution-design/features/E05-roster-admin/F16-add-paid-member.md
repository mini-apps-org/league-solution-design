# F16 — Add paid member to roster

> [Feature specs](../README.md) › [E05 — Roster & Player Admin](README.md) › **F16** · Phase 1

| Phase | Status | Rules | Repo refs |
|---|---|---|---|
| 1 | 🅿️ | R-014, R-017 | `_parked/src/components/league/AddPaidMemberSheet.tsx`, `RosterPanel.tsx` · `useAddRosterPlayer` |

## Requirements
*As a captain, I add a paid member to my roster before the night starts.*

| ID | Requirement |
|---|---|
| FR-16.1 | "Add paid member" appears on the captain's own roster panel only while the night isn't submitted. Admins always see it |
| FR-16.2 | A drawer searches players (≥ 2 chars): SL, name, member ID, and an "Unpaid" flag |
| FR-16.3 | Unpaid members stay visible but their Add button is disabled, so the refusal makes sense |
| FR-16.4 | `POST /teams/{teamId}/roster {playerId}`. The server refuses unpaid players with `40003` "That member has not paid dues for this division yet." |
| FR-16.5 | The server refuses a player who already has an active roster (F7 index) with `40001` |
| FR-16.6 | On success the drawer closes and the roster refetches |

## Logic

```mermaid
%%{init: {"theme": "base", "themeVariables": {"fontFamily": "Arial", "fontSize": "14px", "primaryColor": "#E8F1FF", "primaryBorderColor": "#1F6FEB", "primaryTextColor": "#0B1F3A", "lineColor": "#5B6B82", "secondaryColor": "#EAF7EF", "tertiaryColor": "#FFF6E5", "actorBkg": "#DCE9FF", "actorTextColor": "#0B1F3A", "actorBorder": "#1F6FEB", "actorLineColor": "#8A9BB3", "signalColor": "#3B4A5E", "signalTextColor": "#0B1F3A", "noteBkgColor": "#FFF6E5", "noteBorderColor": "#E0A100", "noteTextColor": "#3D2E00", "activationBkgColor": "#C7DBFF", "activationBorderColor": "#1F6FEB", "sequenceNumberColor": "#FFFFFF", "labelBoxBkgColor": "#1F6FEB", "labelBoxBorderColor": "#1F6FEB", "labelTextColor": "#FFFFFF", "loopTextColor": "#0B1F3A", "clusterBkg": "#F7F9FC", "clusterBorder": "#C9D3E0", "edgeLabelBackground": "#FFFFFF", "transitionLabelColor": "#0B1F3A", "cScale0": "#1F6FEB", "cScaleLabel0": "#FFFFFF", "cScale1": "#1E8E3E", "cScaleLabel1": "#FFFFFF", "cScale2": "#7E57C2", "cScaleLabel2": "#FFFFFF"}}}%%
flowchart TD
  A["POST /teams/{t}/roster {p}"]:::api --> B{"caller is admin, or<br/>captain of team t"}
  B -- no --> X1["403 · 40304"]:::bad
  B -- yes --> C{"players.is_paid?"}
  C -- no --> X2["400 · 40003"]:::bad
  C -- yes --> D{"p already active<br/>on t?"}
  D -- yes --> OK0["200 · no-op"]:::ok
  D -- no --> E{"p active on<br/>another team?"}
  E -- "yes · captain" --> X3["400 · 40001 · ask admin to transfer"]:::bad
  E -- "yes · admin" --> T["close old row · open new<br/>(transfer F19)"]:::ok
  E -- no --> I["INSERT team_rosters"]:::ok
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

## Edge cases

| ID | Situation | Expected |
|---|---|---|
| EC-16.1 | Member pays during the night | Admin flips `is_paid`; the captain retries |
| EC-16.2 | Captain adds a player during match 3 | Allowed in the MVP (the R-017 "before match 1" rule is Phase 2, F39c) |
| EC-16.3 | Captain tries to poach a player from another team | 400; only an admin can transfer |

## Acceptance criteria
- **AC-16.1** A player-role user doesn't see "Add paid member"; the captain does.
- **AC-16.2** Adding a seeded unpaid player returns `40003` with the copy above.

## Implementation gaps (`_parked`)
- The button isn't hidden after the night is submitted.

---

[E05 overview](README.md) · [F17 →](F17-player-search.md)
