# F41 — Audit log

> [Feature specs](../README.md) › [E05 — Roster & Player Admin](README.md) › **F41** · Phase 2

| Phase | Status | Rules |
|---|---|---|
| 2 | 🎯 | [11 §5](../../11-security-and-roles.md), NFR-10 |

## Requirements

| ID | Requirement |
|---|---|
| FR-41.1 | Table `audit_log (id, actor_user_id, action, entity_type, entity_id, before jsonb, after jsonb, reason, ip, created_at)`. Append-only (no UPDATE/DELETE grants) |
| FR-41.2 | Logged actions: SL change, roster add / transfer / remove, admin result correction, post-submit edits, dispute resolution, role grants, payment overrides |
| FR-41.3 | Written in the **same transaction** as the change |
| FR-41.4 | Admin UI: filter by entity, actor and date; show a before/after diff |
| FR-41.5 | Retention 5 years (NFR-14) |

## Flow

```mermaid
%%{init: {"theme": "base", "themeVariables": {"fontFamily": "Arial", "fontSize": "14px", "primaryColor": "#E8F1FF", "primaryBorderColor": "#1F6FEB", "primaryTextColor": "#0B1F3A", "lineColor": "#5B6B82", "secondaryColor": "#EAF7EF", "tertiaryColor": "#FFF6E5", "actorBkg": "#DCE9FF", "actorTextColor": "#0B1F3A", "actorBorder": "#1F6FEB", "actorLineColor": "#8A9BB3", "signalColor": "#3B4A5E", "signalTextColor": "#0B1F3A", "noteBkgColor": "#FFF6E5", "noteBorderColor": "#E0A100", "noteTextColor": "#3D2E00", "activationBkgColor": "#C7DBFF", "activationBorderColor": "#1F6FEB", "sequenceNumberColor": "#FFFFFF", "labelBoxBkgColor": "#1F6FEB", "labelBoxBorderColor": "#1F6FEB", "labelTextColor": "#FFFFFF", "loopTextColor": "#0B1F3A", "clusterBkg": "#F7F9FC", "clusterBorder": "#C9D3E0", "edgeLabelBackground": "#FFFFFF", "transitionLabelColor": "#0B1F3A", "cScale0": "#1F6FEB", "cScaleLabel0": "#FFFFFF", "cScale1": "#1E8E3E", "cScaleLabel1": "#FFFFFF", "cScale2": "#7E57C2", "cScaleLabel2": "#FFFFFF"}}}%%
sequenceDiagram
  autonumber
  participant A as Admin
  participant S as service
  participant DB as Postgres
  rect rgb(247,249,252)
  A->>S: correct result of match 3 after submit
  S->>DB: BEGIN
  S->>DB: SELECT row (before)
  S->>DB: UPDATE individual_matches (triggers re-score)
  S->>DB: INSERT audit_log {action result.correct, before, after, reason}
  S->>DB: COMMIT
  end
```

## Acceptance criteria
- **AC-41.1** Every privileged action in FR-41.2 produces exactly one audit row, with before and after values.

---

[← F39c](F39c-roster-lock.md) · [E05 overview](README.md)
