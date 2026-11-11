# 01 — Business Context

## 1. Product in one paragraph

**MViP (Mini Vietnamese Pool league)** is a centralized, **handicap-based amateur pool league** for Vietnam, modeled on the American Poolplayers Association (APA). Players join teams that play weekly at partner billiard clubs on off-peak weeknights. A skill-level (SL) handicap system lets beginners compete meaningfully against strong players. The software is the business: registration, rosters, schedules, **live digital scorekeeping**, handicap calculation, standings, player profiles, payments and tournaments.

## 2. Why this model works (APA reference)

| Aspect | APA reference | Implication for the software |
|---|---|---|
| Asset-light franchise | Corporate owns no venues; local **League Operators (LOs)** run territories | Multi-tenant by league/area; LO admin portal is a first-class product |
| Corporate role | Rulebook, **handicap algorithm**, national tournaments, brand, **software**, sponsors | Platform team owns rules engine, SL algorithm, app |
| Operator role | Local sales, venue recruitment, scheduling, scorekeeping enforcement, prize funds, weekly ops | Admin portal: schedule builder, roster mgmt, dispute queue, payments |
| Moat: handicap system | SL 2–7 (8-Ball); race-to tables; **23-SL team cap** forces teams to include novices | Rules engine must be exact, auditable, tamper-resistant |
| Retention | Social accountability (teams), official rating | Profiles, stats, achievements, notifications |

## 3. Stakeholders and actors

| Actor | Goals | Primary surface |
|---|---|---|
| **Super Admin / Corporate** | Configure leagues, rules, fees, sponsors; national view | Admin portal |
| **League Operator (LO)** (also called Referee / App Owner in DEMO) | Run divisions, approve SL, transfer players, resolve disputes, collect fees | Admin portal (desktop) |
| **Division Rep** | First contact for captains in a division | Admin portal (scoped) |
| **Host Venue** (billiard club) | Fill tables on slow nights, F&B revenue | Venue listing, schedule view (Phase 2: venue dashboard) |
| **Team Captain** | Register team, manage roster, run league night, submit scores | Player app (mobile web PWA; Zalo Mini App in Phase 2) |
| **Scorekeeper** (any team member) | Keep score accurately and fast | Player app — scoring screens |
| **Player** | Play, see stats/SL/standings, pay fees, enter tournaments | Player app |
| **Sponsor** | Brand exposure | Phase 3: sponsored placements |
| **Public / spectator** | See schedules, results, standings | Public web pages |

## 4. Revenue streams (to support in software)

| Stream | US APA | Vietnam target | Software needs |
|---|---|---|---|
| Annual membership | ~$30–40 | **100,000–150,000 VND** | Membership status, expiry, payment, block play if unpaid |
| Weekly match fee | $8–12 / match | **50,000–80,000 VND / player / week** | Per-match fee ledger; forfeits still pay |
| Franchise / royalties | Territorial fees + % of weekly | LO split (configurable) | Revenue reports per league |
| Tournaments | Entry fees, merch, vendors | Da Nang / Nha Trang finals; Saigon / Hanoi qualifiers | Tournament registration, brackets, entry fees |
| Sponsors & licensing | Cue / beverage brands | Local brands | Sponsor slots (Phase 3) |

**Unit economics (reference):** 10 teams/division × 5 players = 50 matches/night → at 60k VND ≈ 3M VND/night/division → 16 weeks ≈ 48M VND/division/session.

## 5. Vietnam localization

| Pillar | Decision | Software impact |
|---|---|---|
| Game variants | 8-Ball, 9-Ball first; 10-Ball / Carom later | Format is a pluggable strategy |
| Venues | Large clubs (15+ tables, AC) | One venue can host >10 teams → secondary venue codes |
| Scorekeeping | **100% mobile** | Phase 1: installable PWA "Billiard League / Bida" at `www.mvip-league.com`, Google sign-in. Phase 2: Zalo Mini App packaging + Zalo login |
| Payments | E-wallets (MoMo, ZaloPay) | Payment provider abstraction |
| Language | Vietnamese first, English second | i18n with glossary (see [02-glossary.md](02-glossary.md)) |

## 6. Risks addressed by design

| Risk | Mitigation in software |
|---|---|
| **Sandbagging** (deliberately losing / inflating innings to lower SL) | Mandatory DS tracking, effective innings, SL suggestions with audit, anomaly detection (Phase 3), LO-only SL changes |
| **Score disputes** | Event-sourced scoring, dual-captain verification with bonus incentive, dispute queue |
| **Venue disintermediation** | Cross-club mobility, national ranking, tournament qualification only via platform |
| **Bad connectivity in clubs** | Offline-first scorekeeping with queued events |

## 7. Phase-1 business roadmap (months 1–6)

1. Legal setup (HCMC sports/event licensing), relationships with cue sports federations.
2. **MVP software** (this design, Phase 1): profile registration, digital scoring, standings, manual handicapping.
3. Anchor clubs: 10 premier HCMC clubs.
4. **Beta league:** 10-week session, ~300 players → refine handicap thresholds and gather feedback.

Success metrics for the beta: ≥ 95% of team matches scored digitally; ≥ 80% verified within the window without LO intervention; < 2% disputes; median time to log an event < 1 s.
