# F19 — Player transfer

> [Feature specs](../README.md) › [E05 — Roster & Player Admin](README.md) › **F19** · Phase 1

| Phase | Status | Rules | Repo refs |
|---|---|---|---|
| 1 | 🅿️ | R-020, FR-7.6 | `_parked/src/pages/admin/PlayersPage.tsx` (transfer) · `useTransferPlayer` |

## Requirements

| ID | Requirement |
|---|---|
| FR-19.1 | In the player drawer, a select lists "No team" plus the teams of **the player's division** (not just the first division) |
| FR-19.2 | "Transfer" calls `POST /teams/{toTeamId}/roster {playerId}` as admin. The server closes the old active row (`left_at = now()`) and opens the new one in **one transaction** |
| FR-19.3 | "No team" closes the active row without opening a new one |
| FR-19.4 | Success shows a toast "Moved to {team}"; the player list and rosters refetch |
| FR-19.5 | Played matches keep the old team context (they reference the player, not the roster) |

## Flow

```mermaid
%%{init: {"theme": "base", "themeVariables": {"fontFamily": "Arial", "fontSize": "14px", "primaryColor": "#E8F1FF", "primaryBorderColor": "#1F6FEB", "primaryTextColor": "#0B1F3A", "lineColor": "#5B6B82", "secondaryColor": "#EAF7EF", "tertiaryColor": "#FFF6E5", "actorBkg": "#DCE9FF", "actorTextColor": "#0B1F3A", "actorBorder": "#1F6FEB", "actorLineColor": "#8A9BB3", "signalColor": "#3B4A5E", "signalTextColor": "#0B1F3A", "noteBkgColor": "#FFF6E5", "noteBorderColor": "#E0A100", "noteTextColor": "#3D2E00", "activationBkgColor": "#C7DBFF", "activationBorderColor": "#1F6FEB", "sequenceNumberColor": "#FFFFFF", "labelBoxBkgColor": "#1F6FEB", "labelBoxBorderColor": "#1F6FEB", "labelTextColor": "#FFFFFF", "loopTextColor": "#0B1F3A", "clusterBkg": "#F7F9FC", "clusterBorder": "#C9D3E0", "edgeLabelBackground": "#FFFFFF", "transitionLabelColor": "#0B1F3A", "cScale0": "#1F6FEB", "cScaleLabel0": "#FFFFFF", "cScale1": "#1E8E3E", "cScaleLabel1": "#FFFFFF", "cScale2": "#7E57C2", "cScaleLabel2": "#FFFFFF"}}}%%
sequenceDiagram
  autonumber
  participant A as Admin
  participant API as league-be
  participant DB as Postgres
  rect rgb(247,249,252)
  A->>API: POST /teams/03214/roster {playerId}
  API->>DB: BEGIN
  API->>DB: UPDATE team_rosters SET left_at = now() WHERE player AND left_at IS NULL
  API->>DB: INSERT team_rosters (03214, player)
  API->>DB: COMMIT
  API-->>A: 200 · roster row
  end
```

## Acceptance criteria
- **AC-19.1** After a transfer, the player appears on the new roster for future nights, and past nights are unchanged.

## Implementation gaps (`_parked`)
- The team list is taken from the first division only.
- No success feedback.

---

[← F18](F18-skill-level-change.md) · [E05 overview](README.md) · [F39c →](F39c-roster-lock.md)
