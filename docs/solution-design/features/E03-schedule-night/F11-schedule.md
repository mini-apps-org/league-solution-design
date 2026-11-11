# F11 — Schedule

> [Feature specs](../README.md) › [E03 — Schedule & Night View](README.md) › **F11** · Phase 1

| Phase | Status | Repo refs |
|---|---|---|
| 1 | 🅿️ | `league-fe/_parked/src/pages/SchedulePage.tsx`, `components/league/{WeekChips,FixtureCard,StatusBadge,EmptyState,ErrorBanner}.tsx`, `hooks/useLeague.ts`, `lib/format.ts` |

## Requirements
*As a player, I open the app and immediately see this week's fixtures for my division.*

| ID | Requirement |
|---|---|
| FR-11.1 | Load seasons; the active season is the one with `isActive`, falling back to the first |
| FR-11.2 | One native select lists every division of the active season as "{season} · {division}" (44 px) |
| FR-11.3 | Fetch all fixtures of the division once (`['fixtures', divisionId]`) and filter by week on the client |
| FR-11.4 | Default week = the earliest week that has a fixture not yet `submitted`. If all are submitted, the last week |
| FR-11.5 | Week chips "W{n}" in a `role=group` with `aria-pressed`, horizontally scrollable. The selected chip scrolls into view on mount |
| FR-11.6 | A fixture card (the whole card is a link, at least 88 px) shows home `{number} {name}`, a screen-reader "vs", away, the venue, "Tue 10 Nov, 19:30", a status badge, and the score once the night isn't `scheduled` |
| FR-11.7 | Status badge: `scheduled` → chip "Scheduled", `in_progress` → accent "In progress", `submitted` → ok "Submitted" |
| FR-11.8 | Changing division resets the chosen week |
| FR-11.9 | At ≥ 1024 px: 2-column card grid, max width 960 |

## Logic

```text
currentWeek(fixtures):
  weeks = sorted unique fixtures.weekNo
  return first w in weeks where any fixture(w).status != 'submitted'
         else last(weeks)
```

## UI states

| State | Shown |
|---|---|
| Loading | Select skeleton + chip skeleton + three 88 px card skeletons |
| Error | `ErrorBanner` + Retry (refetches seasons, divisions and fixtures) |
| No active season | "No active season" · "An admin needs to create a season and a division first." |
| Empty week | `CalendarOff` · "No fixtures this week" · "Try another week or session." |

## Edge cases

| ID | Situation | Expected |
|---|---|---|
| EC-11.1 | Fixture `scheduled_at` is invalid or missing | Date text is empty; the card still renders |
| EC-11.2 | Division has no fixtures at all | No chips; empty state |
| EC-11.3 | 390 px wide phone | No horizontal page scroll; only the chips scroll |
| EC-11.4 | User is on two teams in different divisions (Phase 2) | Default the division to the user's next fixture |

## Acceptance criteria
- **AC-11.1** With the seed, "8-Ball Open" defaults to W10 and shows 2 fixtures.
- **AC-11.2** Switching chips changes the list without a spinner on the whole page.

## Implementation gaps (`_parked`)
- The selected chip isn't scrolled into view on mount.
- The chip label "W10" vs "Week 10" is undecided; the key `schedule.week` exists but is unused.
- Still on parked conventions (default exports, `react-router-dom`, inline query keys). Follow `RESTORE.md`.

---

[E03 overview](README.md) · [F12 →](F12-night-view-scoresheet.md)
