# F15 — Submit night

> [Feature specs](../README.md) › [E04 — Night Operations: Put-up, Result, Submit](README.md) › **F15** · Phase 1

| Phase | Status | Rules | Repo refs |
|---|---|---|---|
| 1 | 🅿️ | [04 §8 MVP note](../../04-domain-rules.md), [Q30](../../14-open-questions.md) | `_parked/src/components/league/SubmitNightSheet.tsx`, `hooks/useLeagueMutations.ts` (`useSubmitNight`) |

## Requirements

| ID | Requirement |
|---|---|
| FR-15.1 | Available only when all 5 matches are complete and the night isn't submitted |
| FR-15.2 | Confirmation is a vaul **drawer**, never `window.confirm`. "Submit this night?" · "Scores are final for captains after submitting. An admin can still make corrections." · Cancel (focused first) · Submit night |
| FR-15.3 | The server sets `status = submitted`, `submitted_by`, `submitted_at`. It refuses an incomplete night with `40001` |
| FR-15.4 | After submit: the night is read-only for captains; the bar shows "Submitted by {user name} · {time}"; the standings include the night |
| FR-15.5 | Who may submit: either captain of the night, or an admin (default for [Q30](../../14-open-questions.md)) |

## Logic

```mermaid
%%{init: {"theme": "base", "themeVariables": {"fontFamily": "Arial", "fontSize": "14px", "primaryColor": "#E8F1FF", "primaryBorderColor": "#1F6FEB", "primaryTextColor": "#0B1F3A", "lineColor": "#5B6B82", "secondaryColor": "#EAF7EF", "tertiaryColor": "#FFF6E5", "actorBkg": "#DCE9FF", "actorTextColor": "#0B1F3A", "actorBorder": "#1F6FEB", "actorLineColor": "#8A9BB3", "signalColor": "#3B4A5E", "signalTextColor": "#0B1F3A", "noteBkgColor": "#FFF6E5", "noteBorderColor": "#E0A100", "noteTextColor": "#3D2E00", "activationBkgColor": "#C7DBFF", "activationBorderColor": "#1F6FEB", "sequenceNumberColor": "#FFFFFF", "labelBoxBkgColor": "#1F6FEB", "labelBoxBorderColor": "#1F6FEB", "labelTextColor": "#FFFFFF", "loopTextColor": "#0B1F3A", "clusterBkg": "#F7F9FC", "clusterBorder": "#C9D3E0", "edgeLabelBackground": "#FFFFFF", "transitionLabelColor": "#0B1F3A", "cScale0": "#1F6FEB", "cScaleLabel0": "#FFFFFF", "cScale1": "#1E8E3E", "cScaleLabel1": "#FFFFFF", "cScale2": "#7E57C2", "cScaleLabel2": "#FFFFFF"}}}%%
stateDiagram-v2
  direction LR
  [*] --> scheduled
  scheduled --> in_progress: first put-up
  in_progress --> in_progress: put-up · result · correction
  in_progress --> submitted: submit · 5 complete
  submitted --> submitted: admin correction
  submitted --> [*]
  note right of submitted: captains read-only · counted in team_standings
  class scheduled start
  class in_progress warn
  class submitted ok
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
| EC-15.1 | Both captains tap Submit | The first succeeds; the second gets a 200 no-op, or `40001` "already submitted" (pick one: idempotent 200 recommended) |
| EC-15.2 | Admin corrects a result after submit | Points re-roll; standings update; audited in Phase 2 (F41) |
| EC-15.3 | Cancel in the drawer | Nothing changes |

## Acceptance criteria
- **AC-15.1** After submit, the captain sees no editable control and the admin still does.
- **AC-15.2** The score in the summary equals `team_matches.home_points–away_points`, and the halves add up to the sum of the 5 matches' 3, 3 or 2 points, **not** always 15.

## Implementation gaps (`_parked`)
- "Submitted by" shows the home team's name; the submitter and time aren't rendered, although `submittedAt` exists.
- The plan's check "halves sum to 15" contradicts the 3/3/2 rule. Correct the test.

---

[← F14](F14-result-entry.md) · [E04 overview](README.md) · [F39b →](F39b-forfeits.md)
