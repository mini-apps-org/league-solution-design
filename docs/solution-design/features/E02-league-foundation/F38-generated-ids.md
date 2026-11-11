# F38 — Generated Member ID and Team ID

> [Feature specs](../README.md) › [E02 — League Data Foundation](README.md) › **F38** · Phase 2

| Phase | Status | Rules |
|---|---|---|
| 2 | 🎯 | [04 §11](../../04-domain-rules.md), [Q2/Q3/Q33](../../14-open-questions.md) |

## Requirements

| ID | Requirement |
|---|---|
| FR-38.1 | On player creation, generate `member_id = YYMM + 4-digit sequence for that month` (e.g. `26110042`). Admins can no longer type IDs |
| FR-38.2 | On team creation, generate `team_number = RR (region) + VV (venue code) + T (0–9)` **only if** the business confirms region + venue numbering. Otherwise keep the APA-style admin input |
| FR-38.3 | A venue code holds up to 10 teams. When full, a new venue code is allocated |
| FR-38.4 | Sequences are gap-free and safe under concurrency: `id_sequences(scope, last_value)` updated with `UPDATE … RETURNING` in the same transaction |
| FR-38.5 | Existing IDs are never changed |

## Logic

```mermaid
%%{init: {"theme": "base", "themeVariables": {"fontFamily": "Arial", "fontSize": "14px", "primaryColor": "#E8F1FF", "primaryBorderColor": "#1F6FEB", "primaryTextColor": "#0B1F3A", "lineColor": "#5B6B82", "secondaryColor": "#EAF7EF", "tertiaryColor": "#FFF6E5", "actorBkg": "#DCE9FF", "actorTextColor": "#0B1F3A", "actorBorder": "#1F6FEB", "actorLineColor": "#8A9BB3", "signalColor": "#3B4A5E", "signalTextColor": "#0B1F3A", "noteBkgColor": "#FFF6E5", "noteBorderColor": "#E0A100", "noteTextColor": "#3D2E00", "activationBkgColor": "#C7DBFF", "activationBorderColor": "#1F6FEB", "sequenceNumberColor": "#FFFFFF", "labelBoxBkgColor": "#1F6FEB", "labelBoxBorderColor": "#1F6FEB", "labelTextColor": "#FFFFFF", "loopTextColor": "#0B1F3A", "clusterBkg": "#F7F9FC", "clusterBorder": "#C9D3E0", "edgeLabelBackground": "#FFFFFF", "transitionLabelColor": "#0B1F3A", "cScale0": "#1F6FEB", "cScaleLabel0": "#FFFFFF", "cScale1": "#1E8E3E", "cScaleLabel1": "#FFFFFF", "cScale2": "#7E57C2", "cScaleLabel2": "#FFFFFF"}}}%%
sequenceDiagram
  autonumber
  participant A as Admin
  participant API as league-be
  participant DB as Postgres
  rect rgb(247,249,252)
  A->>API: POST /players {fullName, skillLevel}
  API->>DB: BEGIN
  API->>DB: INSERT id_sequences scope member:2611 ON CONFLICT UPDATE last_value+1 RETURNING
  DB-->>API: 42
  API->>DB: INSERT players member_id 26110042
  API->>DB: COMMIT
  API-->>A: 201 player with memberId 26110042
  end
```

## Edge cases
- **EC-38.1** The 10,000th registration in one month fails clearly (capacity 9,999).
- **EC-38.2** A rolled-back transaction leaves no gap, because the sequence row is updated in the same transaction.

---

[← F10](F10-league-api.md) · [E02 overview](README.md) · [F43 →](F43-migration-tool.md)
