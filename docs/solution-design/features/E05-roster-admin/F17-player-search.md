# F17 — Player search (admin)

> [Feature specs](../README.md) › [E05 — Roster & Player Admin](README.md) › **F17** · Phase 1

| Phase | Status | Repo refs |
|---|---|---|
| 1 | 🅿️ | `_parked/src/pages/admin/PlayersPage.tsx` · `usePlayerSearch` |

## Requirements

| ID | Requirement |
|---|---|
| FR-17.1 | `/admin/players` is behind `RequireAdmin`. Non-admins see the `40304` empty state. The server also refuses them |
| FR-17.2 | Search input "Name or member ID" with a clear (X) button. The query runs at ≥ 2 trimmed chars, **debounced 300 ms** |
| FR-17.3 | `GET /players?q=` matches `full_name ILIKE` or a `member_id` prefix. `LIKE` input is escaped (`\ % _`) |
| FR-17.4 | Rows (≥ 56 px): SL square, name, member ID, team number or "No team". Tap → player drawer (F18, F19) |
| FR-17.5 | States: under 2 chars "Type at least two characters." · no match "No players match that search." · loading skeleton · error banner |
| FR-17.6 | Results are bounded (limit 50) with keyset paging (fix [Q37](../../14-open-questions.md) first) |
| FR-17.7 | At ≥ 1024 px: a table (Name, Member ID, SL, Team, Points) with a 400 px side rail for the drawer |

## Acceptance criteria
- **AC-17.1** A partial name and a partial member ID both find the seeded player.
- **AC-17.2** Searching `100%` matches the literal text only.

## Implementation gaps (`_parked`)
- No debounce.
- The desktop table layout isn't built.
- The 403 copy uses the generic `40304` text instead of "You don't have permission to do that."

---

[← F16](F16-add-paid-member.md) · [E05 overview](README.md) · [F18 →](F18-skill-level-change.md)
