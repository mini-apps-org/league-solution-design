# Appendix — Machine-Readable Rule Tables

This JSON is the **reference copy** of every rule table in [04](04-domain-rules.md). Corrections from [14-open-questions.md](14-open-questions.md) Q1 and Q6 are already applied.

**Where the live tables are.** Rules run in Postgres (ADR-004), so the JSON isn't loaded by the apps today. Whenever any copy changes, all of them must still agree:

| Copy | Location | Covers |
|---|---|---|
| 🏗 Source of truth | `league-be/db/migrations/00001_init.sql`, table `race_chart` (36 rows) | 8-Ball race chart |
| 📐 Source of truth | `00002_business_rules.sql`, `fn_score_individual_match()` | 8-Ball points (3/0, 2/1, 2/0) |
| 🅿️ Preview mirror | `league-fe/_parked/src/lib/rules.ts` (`RACE_CHART`, `pointsFor`) + `rules.test.ts` | Race chart, points |
| 🎯 Phase 2 | New migration rows/functions for 9-Ball targets and the 20-point matrix; optionally a shared JSON fixture for a Go/TS live-scoring engine | Everything below |

Tests that must pass against this file: the league-be SQL rule tests ([13 §2.1](13-nfr-and-testing.md#21-rule-tests-single-source--postgres)) and the FE `rules.test.ts`.

## How to read the tables

| Key | Shape | Meaning |
|---|---|---|
| `eightBall.race[A][B]` | `[needA, needB]` | Games each player needs when SL A plays SL B. Example: `race["5"]["3"]` = `[4, 2]` → the SL5 player needs 4, the SL3 player needs 2 |
| `eightBall.points` | `{winner, loser}` | Team points for each way an 8-Ball match can end ([04 §5.3](04-domain-rules.md#53-8-ball-points-per-individual-match-3-point-system)) |
| `eightBall.rackOutcomes` | object per code | `result` is for the shooter. `firstTurnOnly` = only allowed before the first turn-over of the rack (R-060) |
| `nineBall.targets[SL]` | number | Points a 9-Ball player needs |
| `nineBall.loserPoints[SL][i]` | `[minScore, maxScore]` | If the loser (with that SL) finished with a score in this inclusive range, the loser gets **i** team points and the winner gets **20 − i**. `i` runs 0–8 |
| `timeoutsPerRack` | `{maxSLForTwo, low, high}` | SL ≤ `maxSLForTwo` gets `low` timeouts per rack; higher SLs get `high` |

Example: a 9-Ball SL3 loser with 21 points falls in `loserPoints["3"][7]` = `[20, 21]`, so the loser gets 7 and the winner gets 13.

## `tables.json`

```json
{
  "version": "2026-11-09.1",

  "eightBall": {
    "skillLevels": [2, 3, 4, 5, 6, 7],
    "newPlayerDefaultSL": 3,

    "race": {
      "2": { "2": [2, 2], "3": [2, 3], "4": [2, 4], "5": [2, 5], "6": [2, 6], "7": [2, 7] },
      "3": { "2": [3, 2], "3": [2, 2], "4": [2, 3], "5": [2, 4], "6": [2, 5], "7": [2, 6] },
      "4": { "2": [4, 2], "3": [3, 2], "4": [3, 3], "5": [3, 4], "6": [3, 5], "7": [2, 5] },
      "5": { "2": [5, 2], "3": [4, 2], "4": [4, 3], "5": [4, 4], "6": [4, 5], "7": [3, 5] },
      "6": { "2": [6, 2], "3": [5, 2], "4": [5, 3], "5": [5, 4], "6": [5, 5], "7": [4, 5] },
      "7": { "2": [7, 2], "3": [6, 2], "4": [5, 2], "5": [5, 3], "6": [5, 4], "7": [5, 5] }
    },

    "points": {
      "shutout":  { "winner": 3, "loser": 0 },
      "standard": { "winner": 2, "loser": 0 },
      "hill":     { "winner": 2, "loser": 1 }
    },

    "pointsAvailablePerMatch": 3,
    "verificationBonus": 1,
    "forfeitPoints": 3,

    "rackOutcomes": {
      "MAKE_8":         { "result": "WIN",  "accolade": null,  "firstTurnOnly": false },
      "BREAK_AND_RUN":  { "result": "WIN",  "accolade": "BR",  "firstTurnOnly": true  },
      "EIGHT_ON_BREAK": { "result": "WIN",  "accolade": "8OB", "firstTurnOnly": true  },
      "EARLY_8":        { "result": "LOSS", "accolade": null,  "firstTurnOnly": false },
      "SCRATCH_8":      { "result": "LOSS", "accolade": null,  "firstTurnOnly": false },
      "WRONG_POCKET_8": { "result": "LOSS", "accolade": null,  "firstTurnOnly": false }
    },

    "timeoutsPerRack": { "maxSLForTwo": 3, "low": 2, "high": 1 }
  },

  "nineBall": {
    "skillLevels": [1, 2, 3, 4, 5, 6, 7, 8, 9],
    "newPlayerDefaultSL": 3,

    "ballValues": { "1": 1, "2": 1, "3": 1, "4": 1, "5": 1, "6": 1, "7": 1, "8": 1, "9": 2 },
    "pointsPerRack": 10,

    "targets": { "1": 14, "2": 19, "3": 25, "4": 31, "5": 38, "6": 46, "7": 55, "8": 65, "9": 75 },

    "loserPoints": {
      "1": [[0,  2], [3,  3], [4,  4], [5,  6], [7,  7], [8,  8], [9, 10], [11, 11], [12, 13]],
      "2": [[0,  3], [4,  5], [6,  7], [8,  8], [9, 10], [11, 12], [13, 14], [15, 16], [17, 18]],
      "3": [[0,  4], [5,  6], [7,  9], [10, 11], [12, 14], [15, 16], [17, 19], [20, 21], [22, 24]],
      "4": [[0,  5], [6,  8], [9, 11], [12, 14], [15, 18], [19, 21], [22, 24], [25, 27], [28, 30]],
      "5": [[0,  6], [7, 10], [11, 14], [15, 18], [19, 22], [23, 26], [27, 29], [30, 33], [34, 37]],
      "6": [[0,  8], [9, 12], [13, 17], [18, 22], [23, 27], [28, 31], [32, 36], [37, 40], [41, 45]],
      "7": [[0, 10], [11, 15], [16, 21], [22, 26], [27, 32], [33, 37], [38, 43], [44, 49], [50, 54]],
      "8": [[0, 13], [14, 19], [20, 26], [27, 32], [33, 39], [40, 45], [46, 52], [53, 58], [59, 64]],
      "9": [[0, 17], [18, 24], [25, 31], [32, 38], [39, 46], [47, 53], [54, 60], [61, 67], [68, 74]]
    },

    "pointsAvailablePerMatch": 20,
    "verificationBonus": 10,
    "forfeitPoints": 20,

    "timeoutsPerRack": { "maxSLForTwo": 3, "low": 2, "high": 1 }
  },

  "team": {
    "matchesPerNight": 5,
    "slCap": { "EIGHT_BALL": 23, "NINE_BALL": 23, "MASTER": null },
    "rosterLockWeek": 4,
    "verificationWindowHours": 24
  },

  "ids": {
    "member": {
      "pattern": "^[0-9]{2}(0[1-9]|1[0-2])[0-9]{4}$",
      "seqDigits": 4
    },
    "team": {
      "pattern": "^[0-9]{5}$",
      "maxTeamsPerVenueCode": 10
    }
  }
}
```

The blank lines and column alignment above are for reading only; they are valid JSON. Formatting tools such as Prettier may re-flow the file, but the values stay the same.

## Invariants to assert in tests

1. `race[a][b] == reverse(race[b][a])` for all SL pairs.
2. For every 9-Ball SL: ranges are contiguous from 0, non-overlapping, and the last max equals `targets[sl] − 1`.
3. `pointsPerRack == Σ ballValues`.
4. Every `rackOutcomes` key exists in the DB enum `rack_outcome`.
