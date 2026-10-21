# Difficulty & Spaced Repetition

Implemented in [`src/difficulty.ts`](src/difficulty.ts) and [`src/srs.ts`](src/srs.ts). Both are pure and unit-tested.

## Model

Difficulty is the cost of the cheapest mental strategy, not operand size. `64 × 10` is Easy (append a zero), `7 × 8` is Medium (no good shortcut), `25 × 4` is Easy (double twice).

`scoreProblem(a, b)`:

1. **Trivial gate.** A `0` or `1` operand is excluded (`classifyProblem` returns `null`).
2. **Place value.** Operands are ordered `(lo, hi)` and one trailing zero is stripped from each at `ZERO_COST`. If a stripped operand is `1`, the score is `TIMES_TEN_COST + zeros · ZERO_COST`. Fixing the order also makes scores exactly commutative.
3. **Strategies.** `score = zeros · ZERO_COST + min(strategy costs)`.
4. **Tier** from `DIFFICULTY_THRESHOLDS`.

| Strategy | Applies to | Cost |
| --- | --- | --- |
| Recall | single × single | `RECALL_BASE + factCost` |
| Doubling | factor ∈ {2, 4, 8} | per step `DOUBLE_BASE + CARRY · carries`; cheaper decomposition wins |
| ×5 | factor 5 | `FIVE_BASE` (+0.5 for odd partner) |
| ×9 | factor 9 | `NINE_BASE + CARRY · min(carries, 2)` |
| ×11 | factor 11 | `ELEVEN_BASE + ADD_BASE + CARRY · carries` |
| Distribute | single × two-digit | 2 × `factCost` + `ADD_BASE` + `CARRY · carries` + `HOLD` |
| Grid | two-digit × two-digit | 4 × `factCost` + `3 · ADD_BASE` + `CARRY · carries` + `3 · HOLD` |

`factCost(x, y) = x·y / 16`, × 0.7 for squares, 0 if a factor is below 2. Doubling has no `HOLD` cost because it carries a single running value.

| Constant | Value |
| --- | --- |
| `RECALL_BASE` | 0.3 |
| `ADD_BASE` | 0.6 |
| `CARRY` | 0.5 |
| `HOLD` | 1.2 |
| `DOUBLE_BASE` | 0.7 |
| `FIVE_BASE` | 1.0 |
| `NINE_BASE` | 1.3 |
| `ELEVEN_BASE` | 1.0 |
| `ZERO_COST` | 0.3 |
| `TIMES_TEN_COST` | 0.2 |

## Worked examples

- **`7 × 8` → 3.10, Medium.** Recall costs `0.3 + 56/16 = 3.8`. Doubling 7 three times is cheaper: `7→14` (carry, 1.2), `14→28` (0.7), `28→56` (carry, 1.2).
- **`25 × 4` → 2.40, Easy.** Doubling 25 twice: `25→50` and `50→100`, one carry each, 1.2 + 1.2.
- **`47 × 63` → 11.59, Hard.** Only Grid applies: four recalls, three additions, carries and three held partials.

## Tiers

| Tier | Level | Score | Problems |
| --- | --- | --- | --- |
| Easy | 1 | `s ≤ 2.5` | 852 |
| Medium | 2 | `2.5 < s ≤ 5.5` | 569 |
| Hard | 3 | `5.5 < s ≤ 13` | 2,350 |
| Expert | 4 | `s > 13` | 1,080 |

4,851 non-trivial canonical pairs (`a ≤ b`), 199 trivial pairs excluded.

| Problem | Score | Tier |
| --- | --- | --- |
| 64 × 10 | 0.50 | Easy |
| 2 × 3 | 0.68 | Easy |
| 5 × 8 | 1.00 | Easy |
| 20 × 20 | 1.07 | Easy |
| 7 × 9 | 1.30 | Easy |
| 11 × 11 | 1.60 | Easy |
| 25 × 4 | 2.40 | Easy |
| 6 × 7 | 2.92 | Medium |
| 7 × 8 | 3.10 | Medium |
| 13 × 7 | 3.11 | Medium |
| 8 × 47 | 4.10 | Medium |
| 12 × 12 | 5.57 | Hard |
| 47 × 63 | 11.59 | Hard |
| 99 × 99 | 20.57 | Expert |
| 78 × 89 | 21.14 | Expert |

Tests assert commutativity over the whole space, tier partition, monotonicity and pool membership.

## Spaced repetition

Leitner boxes `0–5`. ✓ promotes one box; ✗ resets to box 0.

| Box | Interval |
| --- | --- |
| 0 | 45 s |
| 1 | 5 min |
| 2 | 30 min |
| 3 | 4 h |
| 4 | 1 day |
| 5 | 4 days |

An ungraded showing keeps its box and is held back for 30 s.

`selectNext(pool, store, recentKeys, now, rng)`:

1. Drop the last 8 problems shown, unless that empties the pool.
2. If anything is due, rank by lowest box (unseen first), then most overdue. Otherwise rank by soonest due.
3. Pick randomly among the top 4. `rng() === 0` picks the top one.

The store is saved under `mathQuizProgress` with `SRS_VERSION`. Records are keyed by `problemKey` (`7x8`), so `a × b` and `b × a` share one. Invalid or outdated data is discarded on load.
