# F18 — Skill-level change and history

> [Feature specs](../README.md) › [E05 — Roster & Player Admin](README.md) › **F18** · Phase 1

| Phase | Status | Rules | Repo refs |
|---|---|---|---|
| 1 | 🅿️ | R-050, R-120, R-125 | `_parked/src/components/league/SkillLevelPanel.tsx`, `lib/schemas.ts` (`skillLevelChangeSchema`) |

## Requirements
*As an admin, I change a player's skill level with a reason, and anyone with access can see why it changed.*

| ID | Requirement |
|---|---|
| FR-18.1 | Six toggle buttons, SL 2–7 (44 px, `aria-pressed`). The current level is accent; the pending choice is primary |
| FR-18.2 | Preview: "vs SL 5: races to {now} (was {before})", shown only when the level changed |
| FR-18.3 | Static note: "Applies from the next match. Played matches keep their snapshot." |
| FR-18.4 | Reason is required (trimmed, ≥ 1 char): "Required. Shown in this player's history." |
| FR-18.5 | Save is enabled only if valid **and** changed. Calls `change_skill_level()` via `POST /players/{id}/skill-level` |
| FR-18.6 | History is append-only: "old → new", reason, "by {admin} · {date}". Empty: "No changes yet." With loading and error states |
| FR-18.7 | After saving: invalidate the player list and history; reset the form |

## Logic

```mermaid
%%{init: {"theme": "base", "themeVariables": {"fontFamily": "Arial", "fontSize": "14px", "primaryColor": "#E8F1FF", "primaryBorderColor": "#1F6FEB", "primaryTextColor": "#0B1F3A", "lineColor": "#5B6B82", "secondaryColor": "#EAF7EF", "tertiaryColor": "#FFF6E5", "actorBkg": "#DCE9FF", "actorTextColor": "#0B1F3A", "actorBorder": "#1F6FEB", "actorLineColor": "#8A9BB3", "signalColor": "#3B4A5E", "signalTextColor": "#0B1F3A", "noteBkgColor": "#FFF6E5", "noteBorderColor": "#E0A100", "noteTextColor": "#3D2E00", "activationBkgColor": "#C7DBFF", "activationBorderColor": "#1F6FEB", "sequenceNumberColor": "#FFFFFF", "labelBoxBkgColor": "#1F6FEB", "labelBoxBorderColor": "#1F6FEB", "labelTextColor": "#FFFFFF", "loopTextColor": "#0B1F3A", "clusterBkg": "#F7F9FC", "clusterBorder": "#C9D3E0", "edgeLabelBackground": "#FFFFFF", "transitionLabelColor": "#0B1F3A", "cScale0": "#1F6FEB", "cScaleLabel0": "#FFFFFF", "cScale1": "#1E8E3E", "cScaleLabel1": "#FFFFFF", "cScale2": "#7E57C2", "cScaleLabel2": "#FFFFFF"}}}%%
flowchart TD
  A["change_skill_level(p, new, reason, by)"]:::db --> B{"new in 2..7"}
  B -- no --> X["RAISE → 40001"]:::bad
  B -- yes --> C{"trim(reason) ≠ ''"}
  C -- no --> X
  C -- yes --> D{"player exists"}
  D -- no --> X4["→ 40401"]:::bad
  D -- yes --> E{"new ≠ current"}
  E -- no --> X
  E -- yes --> F["UPDATE players.skill_level<br/>INSERT skill_level_history"]:::ok
  F --> G["future put-ups snapshot the new SL<br/>played rows unchanged"]:::ok
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
| EC-18.1 | Player is put up but the opponent isn't yet (no snapshot) | The snapshot is taken when both sides are up, so the new SL applies. Acceptable; documented |
| EC-18.2 | Two admins change the same player at once | Both succeed in order; history shows both |
| EC-18.3 | 9-Ball SL | Phase 2 (F32): per-format SL table |

## Acceptance criteria
- **AC-18.1** Save stays disabled for an empty or whitespace-only reason.
- **AC-18.2** 4 → 6 adds a history row "4 → 6" with the reason and the admin's name; played matches still show SL 4.
- **AC-18.3** The preview for SL 6 vs SL 5 reads 5–4.

## Implementation gaps (`_parked`)
- The preview renders even when the level is unchanged.
- History has no loading or error state.

---

[← F17](F17-player-search.md) · [E05 overview](README.md) · [F19 →](F19-player-transfer.md)
