# F13 — Put-up with 23-SL cap

> [Feature specs](../README.md) › [E04 — Night Operations: Put-up, Result, Submit](README.md) › **F13** · Phase 1

| Phase | Status | Rules | Repo refs |
|---|---|---|---|
| 1 | 🅿️ | R-030/031 (MVP order), R-034, R-035, R-036, R-050 | `_parked/src/pages/PutUpPage.tsx`, `components/league/PutUpCandidateList.tsx`, `lib/night.ts`, `lib/rules.ts` (`skillLevelUsed`, `raceFor`) |

## Requirements
*As a captain, I pick my player for the next match and can't accidentally break the 23 cap.*

| ID | Requirement |
|---|---|
| FR-13.1 | The screen is active only when `nextAction = put-up`, which supplies `order` and `side` |
| FR-13.2 | Order: home puts up first in odd matches, away in even matches. The second picker sees the first pick (the opponent panel) |
| FR-13.3 | Candidates come from `GET /available?side&match_order` (`staleTime 0`), each with `canPutUp` and `blockReason` |
| FR-13.4 | Block reasons and copy: `would_break_23` "Would break 23" · `already_put_up` "Already playing tonight" · `not_on_roster` "Not on this roster" · `side_complete` "Five players already put up" |
| FR-13.5 | Blocked rows stay visible **and focusable** (`aria-disabled`), muted, with a warn badge. Tapping one does nothing |
| FR-13.6 | Badge "SL used {used}/{cap}" sums the side's snapshot SLs; the badge turns warn when `used = cap` |
| FR-13.7 | Once the opponent is known, each selectable row previews the race "mine–theirs" (`raceFor`) |
| FR-13.8 | Confirm posts the put-up. The server re-checks `can_put_up()`. A refusal returns `40004`, which clears the selection and refetches the list |
| FR-13.9 | After success: if both sides are now up, go to result entry; otherwise stay on the same screen for the other side |
| FR-13.10 | Accessibility: `role=radiogroup` "Select a player", rows are `role=radio` with `aria-checked`, at least 56 px tall |

## Rules & logic

```mermaid
%%{init: {"theme": "base", "themeVariables": {"fontFamily": "Arial", "fontSize": "14px", "primaryColor": "#E8F1FF", "primaryBorderColor": "#1F6FEB", "primaryTextColor": "#0B1F3A", "lineColor": "#5B6B82", "secondaryColor": "#EAF7EF", "tertiaryColor": "#FFF6E5", "actorBkg": "#DCE9FF", "actorTextColor": "#0B1F3A", "actorBorder": "#1F6FEB", "actorLineColor": "#8A9BB3", "signalColor": "#3B4A5E", "signalTextColor": "#0B1F3A", "noteBkgColor": "#FFF6E5", "noteBorderColor": "#E0A100", "noteTextColor": "#3D2E00", "activationBkgColor": "#C7DBFF", "activationBorderColor": "#1F6FEB", "sequenceNumberColor": "#FFFFFF", "labelBoxBkgColor": "#1F6FEB", "labelBoxBorderColor": "#1F6FEB", "labelTextColor": "#FFFFFF", "loopTextColor": "#0B1F3A", "clusterBkg": "#F7F9FC", "clusterBorder": "#C9D3E0", "edgeLabelBackground": "#FFFFFF", "transitionLabelColor": "#0B1F3A", "cScale0": "#1F6FEB", "cScaleLabel0": "#FFFFFF", "cScale1": "#1E8E3E", "cScaleLabel1": "#FFFFFF", "cScale2": "#7E57C2", "cScaleLabel2": "#FFFFFF"}}}%%
flowchart TD
  P["candidate player p<br/>side s · order k"]:::fe --> R1{"p on active roster<br/>of side s?"}
  R1 -- no --> B1["not_on_roster"]:::bad
  R1 -- yes --> R2{"p already played<br/>tonight?"}
  R2 -- yes --> B2["already_put_up"]:::bad
  R2 -- no --> R3{"side s already<br/>has 5?"}
  R3 -- yes --> B3["side_complete"]:::bad
  R3 -- no --> R4{"used(s) + SL(p)<br/>> skill_level_cap"}
  R4 -- yes --> B4["would_break_23 · R-034"]:::bad
  R4 -- no --> OK["canPutUp = true"]:::ok
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

Worked example (seed): 03209 has used SL 5 + 6 + 5 + 4 = 20 after 4 matches. With cap 23, match 5 allows SL 2 and 3, and greys out SL 4+ with "Would break 23". The badge reads `20/23`.

## UI states

| State | Shown |
|---|---|
| Loading | List skeleton |
| Error | `ErrorBanner` + Retry (refetch available) |
| Empty | "No players available" · "Every player on this roster is already playing or would break 23." |
| Rejected (`40004`) | "That player can no longer be put up. The list has changed." Selection cleared, list refetched |
| Not my turn / not my night | Route shows read-only "Waiting for {other side}" (server is authoritative) |

## Edge cases

| ID | Situation | Expected |
|---|---|---|
| EC-13.1 | Both captains confirm at the same moment for the same side | One insert wins; the other gets `40004` |
| EC-13.2 | Admin changes a player's SL while the list is open | The server uses the new SL; a stale list may be refused (`40004`) |
| EC-13.3 | Team has fewer than 5 eligible players | Forfeit path (F39b) |
| EC-13.4 | Captain opens put-up for the side that isn't next | Server refuses (`40004`); UI shows the waiting state |

## Acceptance criteria
- **AC-13.1** Given 20 SL used, then SL 4+ rows are greyed "Would break 23", SL 2–3 are selectable, and the badge reads `20/23`.
- **AC-13.2** Match 1 asks home first; match 2 asks away first.
- **AC-13.3** After both sides are up, the row has `home/away_skill_level` and `home/away_race` filled by the trigger.

## Implementation gaps (`_parked`)
- The badge never turns warn at the cap.
- The selection isn't cleared on error.
- The second picker's subtitle is wrong (away picking second sees "Away puts up first").
- No `viewerCanManage` check on the route.
- The copy key `putUp.staleList` is unused (two different wordings exist).

---

[E04 overview](README.md) · [F14 →](F14-result-entry.md)
