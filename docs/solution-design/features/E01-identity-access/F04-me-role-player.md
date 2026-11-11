# F4 — `/me` with role and playerId

> [Feature specs](../README.md) › [E01 — Identity & Access](README.md) › **F4** · Phase 1

| Phase | Status | Rules | Repo refs |
|---|---|---|---|
| 1 | 🏗 basic · ❌ `role`, `playerId` | ADR-006 | `league-be/internal/auth/handlers.go` (`Me`) · `league-fe/src/types/auth.ts` (`roleOf`, `needsMemberLink`), `src/hooks/useRole.ts` |

## Requirements

| ID | Requirement |
|---|---|
| FR-4.1 | `GET /me` returns `{user: {id, email, name, avatarUrl, role, playerId}}` |
| FR-4.2 | `role` comes from `users_roles`, taking the highest by **ADMIN > CAPTAIN > PLAYER**. A user with no row is `PLAYER` |
| FR-4.3 | `playerId` is the `players.id` where `players.user_id = users.id`, or `null` |
| FR-4.4 | The FE treats only `playerId === null` as "needs link". `undefined` (an older backend) leaves the gate inactive |

## Logic

```sql
SELECT r.code
FROM users_roles ur
JOIN roles r ON r.id = ur.role_id
WHERE ur.user_id = $1
ORDER BY CASE r.code WHEN 'ADMIN' THEN 1 WHEN 'CAPTAIN' THEN 2 ELSE 3 END
LIMIT 1;  -- no row → 'PLAYER'
```

## Edge cases

| ID | Situation | Expected |
|---|---|---|
| EC-4.1 | User has both ADMIN and CAPTAIN | `role = ADMIN`. Captain-owns-night still applies through `players.user_id` |
| EC-4.2 | User has the CAPTAIN role but isn't `captain_player_id` of any team | `role = CAPTAIN`, but `viewerCanManage` is false on every night |
| EC-4.3 | Linked player is deleted | `user_id` FK is `ON DELETE SET NULL` → `playerId` becomes `null` → onboarding again |

## Acceptance criteria
- **AC-4.1** Given the seeded `captain@example.test`, `/me` returns `role: "CAPTAIN"` and the `playerId` of member 95007620.
- **AC-4.2** Given a user with no `users_roles` row, `role` is `"PLAYER"`.

---

[← F3](F03-csrf.md) · [E01 overview](README.md) · [F5 →](F05-onboarding-member-link.md)
