# 02 — Glossary

Use these exact terms in code, UI copy, and tickets. The last column gives the **identifier used in the repos** (DB column / JSON field). 🎯 marks identifiers for Phase 2 features that aren't built yet.

| Term | Vietnamese | Definition | Format | Code identifier |
|---|---|---|---|---|
| **SL** — Skill Level | Hạng | Player handicap. 8-Ball SL 2–7, 9-Ball SL 1–9. Determines race / target | All | DB `skill_level`, JSON `skillLevel`; snapshot `home_skill_level` |
| **Race** / GW/GN | — | Games Won / Games Needed (8-Ball), e.g. `4/4 – 1/4` | 8B | DB `home_games` / `home_race`, JSON `homeGames` / `homeRace` |
| **Target points** | — | Points a 9-Ball player must reach (14…75) | 9B | `needed` |
| **Lag** | Giành quyền phá bi | Preliminary shot to decide who breaks; winner chooses breaker | 8B, 9B | `lagWinner` |
| **Break** | Phá bi | Opening shot of a rack | All | `breaker` |
| **Inning** | Lượt | One turn for each player; counted when the player who lost the lag ends a turn. MVP stores the match total | All | `innings` |
| **Turn Over** | Hết lượt | Shooter's turn ends without a legal pocket | All | `TURN_OVER` |
| **DS** — Defensive Shot | Đánh phòng thủ | Shot with no intent to pocket a ball (safety) | All | DB `home_def_shots`, JSON `homeDefShots`; 🎯 event `DEFENSIVE_SHOT` |
| **Time-out** | Hội ý | Coaching pause; limited per rack by SL | All | `TIMEOUT` |
| **BR** — Break and Run | Đi chấm! | Breaker clears the rack without the opponent shooting | 8B, 9B | `BREAK_AND_RUN` |
| **8OB** — 8 on the Break | Đề pa Chết 8 | Golden break: 8 pocketed legally on break = instant win | 8B | `EIGHT_ON_BREAK` |
| **9OB** — 9 on the Break | Đề pa Chết 9 | Golden break: 9 pocketed legally on break | 9B | `NINE_ON_BREAK` |
| **E8** — Early 8 | Chết 8 Sớm | 8 pocketed before own group is cleared → loss | 8B | `EARLY_8` |
| **S8** — Scratch on 8 | Chết 8 | 8 and cue ball both pocketed → loss | 8B | `SCRATCH_8` |
| **8WP** — 8 Wrong Pocket | Chết 8 Sai Lỗ | 8 pocketed into an un-called pocket → loss | 8B | `WRONG_POCKET_8` |
| **DB** — Dead Ball | Bi chết | Ball pocketed on a foul; credited to nobody. The 9 is never dead (re-spotted) | 9B | `DEAD_BALL` |
| **Hill** | Đứng "hill" | One game short of the race | 8B | `onHill` |
| **Hill-Hill** | — | Both players one game short | 8B | — |
| **Shutout** | — | Winner wins without the loser winning any game → 3-0 | 8B | — |
| **Rackless** | — | Won the lag and the match without losing a rack | 8B | `RACKLESS` |
| **Double-strike** | Cú Đúp | BR + golden break on the same night (MViP's version of APA "mini-slam") | All | `DOUBLE_STRIKE` |
| **PA** — Points Available | — | Max team points per match: 3 (8B), 20 (9B) | All | `pointsAvailable` |
| **PPM** — Points Per Match | — | Team points ÷ matches played | All | `ppm` |
| **PPI** — Points Per Inning | — | 9-Ball points ÷ effective innings; 9-Ball SL basis | 9B | `ppi` |
| **Put-up** | — | Team nominating its player for the next match slot | All | `POST /team-matches/{id}/put-up`; `first_put_up`; block reasons `would_break_23`, `already_put_up`, `not_on_roster`, `side_complete` |
| **23-SL cap** | — | Max sum of SL of the 5 players a team uses in one night | 8B, 9B | DB `divisions.skill_level_cap`, JSON `skillLevelCap` |
| **Score matching / Verification** | — | Both captains confirm results → bonus +1 (8B) / +10 (9B) | All | 🎯 Phase 2. MVP equivalent: **Submit** (`status = submitted`) |
| **Forfeit** | Xử thua | Slot not played; opponent gets max points; fees still due | All | `FORFEIT_SLOT` |
| **Bye** | Nghỉ | Week with no opponent | All | `BYE` |
| **No Play** | Nghỉ lễ | Holiday week | All | `NO_PLAY` |
| **Session** = **Season** | Mùa giải | Seasonal block (Spring/Summer/Fall) of 10–17 weeks. The business docs say "session"; **the code says `season`** (`seasons` table, `/seasons`) | All | `season` |
| **Division** | Bảng đấu | Teams of one format playing the same night in one area | All | `division` |
| **LO** — League Operator | Nhà điều hành giải | Runs a league territory; admin power user | — | Today: role `ADMIN`. 🎯 `LEAGUE_OPERATOR` when multi-league tenancy arrives |
| **Host Location** | Câu lạc bộ chủ nhà | Partner billiard club / venue | — | `venue` |
| **Member ID** | Mã hội viên | 8 digits (e.g. `95007620`); generated `YYMMNNNN` in Phase 2 | — | DB `member_id`, JSON `memberId` |
| **Team ID** | Mã đội | 5 digits, APA-style today (`03209`); generated `RRVVT` is TBD | — | DB `team_number`, JSON `teamNumber` |
| **Master division** | Bảng Master | Open, uncapped, international rules, jump shots allowed | Master | `MASTER` |
| **Sandbagging** | Giấu hạng | Deliberately playing worse to lower SL | — | — |
| **Night** | Đêm thi đấu | One team match (5 individual matches) on a league night | All | `team_match`; FE `night.ts` |
| **Submit** | Nộp kết quả | Captain finalizes a complete night; standings count only submitted nights | All | `team_matches.status = 'submitted'` |
| **Paid member** | Hội viên đã đóng phí | Member whose dues are paid; only these can be added to a roster | All | `players.is_paid` |
