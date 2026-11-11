# F12 — Night view and scoresheet

> [Feature specs](../README.md) › [E03 — Schedule & Night View](README.md) › **F12** · Phase 1

| Phase | Status | Repo refs |
|---|---|---|
| 1 | 🅿️ | `_parked/src/pages/MatchPage.tsx`, `components/league/{ScoreStrip,RosterPanel,RosterTable,NightScoresheet,DesktopScoresheet,NightActionBar}.tsx`, `lib/night.ts` |

## Requirements
*As a captain, I open tonight's match and see both rosters, the five match slots, and the one thing I need to do next.*

| ID | Requirement |
|---|---|
| FR-12.1 | Header: back link, "{homeNo} vs {awayNo}", venue · date, status badge |
| FR-12.2 | Score strip (30 px numerals) once any result exists |
| FR-12.3 | Rosters from `player_division_stats`: name + member ID (+ "· Unpaid"), SL square, MW/MP "3/5", points. A new player shows 0/0 and 0, never blank |
| FR-12.4 | Mobile: Home/Away tabs, defaulting to `viewerSide ?? 'home'`. ≥ 1024 px: both rosters side by side |
| FR-12.5 | Scoresheet with always five rows "Match n": SL square, name and games per side; "Not played" when empty; winner highlighted. Desktop is a real table with a "Night summary" footer |
| FR-12.6 | Action bar only when `viewerCanManage`. It's driven by `nextAction()` |
| FR-12.7 | After submit: the bar shows "Submitted by {name} · {time}"; captains see no edit controls; admins still do |

## Logic: `nextAction`

```mermaid
%%{init: {"theme": "base", "themeVariables": {"fontFamily": "Arial", "fontSize": "14px", "primaryColor": "#E8F1FF", "primaryBorderColor": "#1F6FEB", "primaryTextColor": "#0B1F3A", "lineColor": "#5B6B82", "secondaryColor": "#EAF7EF", "tertiaryColor": "#FFF6E5", "actorBkg": "#DCE9FF", "actorTextColor": "#0B1F3A", "actorBorder": "#1F6FEB", "actorLineColor": "#8A9BB3", "signalColor": "#3B4A5E", "signalTextColor": "#0B1F3A", "noteBkgColor": "#FFF6E5", "noteBorderColor": "#E0A100", "noteTextColor": "#3D2E00", "activationBkgColor": "#C7DBFF", "activationBorderColor": "#1F6FEB", "sequenceNumberColor": "#FFFFFF", "labelBoxBkgColor": "#1F6FEB", "labelBoxBorderColor": "#1F6FEB", "labelTextColor": "#FFFFFF", "loopTextColor": "#0B1F3A", "clusterBkg": "#F7F9FC", "clusterBorder": "#C9D3E0", "edgeLabelBackground": "#FFFFFF", "transitionLabelColor": "#0B1F3A", "cScale0": "#1F6FEB", "cScaleLabel0": "#FFFFFF", "cScale1": "#1E8E3E", "cScaleLabel1": "#FFFFFF", "cScale2": "#7E57C2", "cScaleLabel2": "#FFFFFF"}}}%%
flowchart TD
  S(["order = 1"]):::start --> R{"row for order<br/>exists?"}
  R -- no --> PF["<b>put-up</b><br/>side = firstPutUpFor(order)<br/>odd → home · even → away"]:::fe
  R -- yes --> B{"both players<br/>empty?"}
  B -- yes --> PF2["<b>put-up</b><br/>side = row.firstPutUp"]:::fe
  B -- no --> H{"home empty?"}
  H -- yes --> PH["<b>put-up</b> · home"]:::fe
  H -- no --> A{"away empty?"}
  A -- yes --> PA["<b>put-up</b> · away"]:::fe
  A -- no --> C{"status<br/>complete?"}
  C -- no --> RS["<b>result</b><br/>individualMatchId"]:::warn
  C -- yes --> N{"order < 5?"}
  N -- "yes · order + 1" --> R
  N -- no --> SB{"night<br/>submitted?"}
  SB -- no --> SUB["<b>submit</b>"]:::start
  SB -- yes --> DN["<b>done</b>"]:::ok
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

| `nextAction` | Bar shows | Goes to |
|---|---|---|
| `put-up {order, side}` | "Put up match {order}" | `/matches/:id/put-up` |
| `result {order, individualMatchId}` | "Enter result · match {order}" | `/matches/:id/result/:order` |
| `submit` | "Submit night" | `SubmitNightSheet` drawer |
| `done` | "Submitted by {name} · {time}" | — |

## UI: layout

```mermaid
%%{init: {"theme": "base", "themeVariables": {"fontFamily": "Arial", "fontSize": "14px", "primaryColor": "#E8F1FF", "primaryBorderColor": "#1F6FEB", "primaryTextColor": "#0B1F3A", "lineColor": "#5B6B82", "secondaryColor": "#EAF7EF", "tertiaryColor": "#FFF6E5", "actorBkg": "#DCE9FF", "actorTextColor": "#0B1F3A", "actorBorder": "#1F6FEB", "actorLineColor": "#8A9BB3", "signalColor": "#3B4A5E", "signalTextColor": "#0B1F3A", "noteBkgColor": "#FFF6E5", "noteBorderColor": "#E0A100", "noteTextColor": "#3D2E00", "activationBkgColor": "#C7DBFF", "activationBorderColor": "#1F6FEB", "sequenceNumberColor": "#FFFFFF", "labelBoxBkgColor": "#1F6FEB", "labelBoxBorderColor": "#1F6FEB", "labelTextColor": "#FFFFFF", "loopTextColor": "#0B1F3A", "clusterBkg": "#F7F9FC", "clusterBorder": "#C9D3E0", "edgeLabelBackground": "#FFFFFF", "transitionLabelColor": "#0B1F3A", "cScale0": "#1F6FEB", "cScaleLabel0": "#FFFFFF", "cScale1": "#1E8E3E", "cScaleLabel1": "#FFFFFF", "cScale2": "#7E57C2", "cScaleLabel2": "#FFFFFF"}}}%%
flowchart TB
  subgraph M["Mobile · /matches/:id"]
    direction TB
    H1["Header · 03209 vs 03214 · badge"]:::fe
    S1["ScoreStrip 5 – 2"]:::fe
    SH["NightScoresheet · 5 rows"]:::fe
    TB1["Tabs Home | Away → RosterTable"]:::fe
    AB["Sticky NightActionBar · safe-area"]:::api
    H1 --> S1 --> SH --> TB1 --> AB
  end
  subgraph D["🖥️ ≥ 1024 px"]
    direction TB
    H2["Header + ScoreStrip"]:::fe
    DS["DesktopScoresheet table · current row highlighted"]:::fe
    RR["Home RosterPanel | Away RosterPanel"]:::fe
    H2 --> DS --> RR
  end
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
| EC-12.1 | A player views another team's night | Read-only; no action bar |
| EC-12.2 | An admin views any night | `viewerCanManage: true`, `viewerSide: null`; the bar acts for whichever side is next |
| EC-12.3 | Night submitted | Captains: no "Add paid member", no bar actions. Admins keep both |
| EC-12.4 | Roster empty | `Users` icon · "No players on this roster" · "A captain can add a paid member of this division." |

## Acceptance criteria
- **AC-12.1** An empty night → `put-up, order 1, home`. Home picked → `put-up, order 1, away`. Both up → `result 1`. Match 1 complete → `put-up, order 2, away`. Five complete → `submit`. Submitted → `done`.
- **AC-12.2** A player-role user sees no action bar.

## Implementation gaps (`_parked`)
- The bar label is always "Start match", even for result entry.
- "Add paid member" isn't hidden after submit.
- `done` shows the home team's name instead of the submitter, and no time.
- The score strip shows when `status !== 'scheduled'` instead of "once a result exists".
- The ≥ 1024 px left rail (the week's fixtures) isn't built.

---

[← F11](F11-schedule.md) · [E03 overview](README.md) · [F39a →](F39a-bye-no-play.md)
