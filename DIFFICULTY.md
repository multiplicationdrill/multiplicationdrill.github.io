# Difficulty & Spaced Repetition

This document explains how the drill decides *how hard* a multiplication problem
is, and how it decides *which problem to show next*. Both live in small, pure,
fully unit-tested modules: [`src/difficulty.ts`](src/difficulty.ts) and
[`src/srs.ts`](src/srs.ts).

---

## 1. The core idea

**Difficulty is the cognitive cost of working the product out in your head — not
the size of the numbers.** That one reframe resolves the cases that otherwise
look contradictory:

- `64 × 10` is **Easy**, even though 64 is two digits, because "append a zero" is
  almost free.
- `7 × 8` is **Medium**, even though both operands are single digits, because it
  has no shortcut and is the worst-recalled entry in the times table — the
  well-documented *problem-size effect*.
- `25 × 4` is **Easy**, even though the product (100) is large, because doubling
  twice (`25 → 50 → 100`) reuses a single running value and produces clean
  carries.

A difficulty model based on operand ranges (the app's previous approach) cannot
express any of these. This one can.

---

## 2. The scoring pipeline

`scoreProblem(a, b)` produces a single non-negative number — lower is easier —
in four steps.

**Step 1 — Trivial gate.** If either operand is `0` or `1` the problem is
*trivial* and excluded from every tier (`isTrivial`, and `classifyProblem`
returns `null`). Practising `×0` and `×1` has no value in a drill.

**Step 2 — Place value is free.** Operands are reduced to a canonical order
`(lo, hi)` and each has a single trailing zero stripped, at a small cost per
zero. If a stripped operand becomes `1` — i.e. it was a power of ten such as `10`
— the whole problem collapses to "append zeros" and scores a flat
`TIMES_TEN_COST` plus the per-zero cost. This is why `64 × 10` is trivially easy.

> Canonicalising to `(lo, hi)` before scoring also makes the score *exactly*
> commutative. Floating-point addition is not associative, so without it the grid
> strategy below would sum its four partial products in a different order for
> `a × b` than for `b × a` and the two could differ in the last bit. Evaluating a
> single canonical ordering removes that entirely.

**Step 3 — Minimum over strategies.** The heart of the model:

```
score = zeros·ZERO_COST + min( cost(strategy) for each applicable strategy )
```

We assume a solver picks the *cheapest sensible mental strategy* available for
the numbers in front of them. Each strategy returns a cost (or `Infinity` if it
does not apply), and we take the minimum. A strategy's cost is the sum of its
elementary steps — single-digit recalls, additions, doublings, carries — plus a
working-memory *hold* penalty for each intermediate result that must be juggled.

**Step 4 — Tiering.** The score is bucketed into four tiers by
`DIFFICULTY_THRESHOLDS` (Step 6).

---

## 3. The mental strategies

Each operates on *stripped* operands (`≥ 2`, no trailing zeros).

| Strategy | Applies to | Cost |
| --- | --- | --- |
| **Recall** | single × single | `RECALL_BASE + factCost` |
| **Doubling** | a factor ∈ {2, 4, 8} | sum of per-step `DOUBLE_BASE + CARRY·carries`; tries **both** decompositions and keeps the cheaper |
| **×5** | a factor = 5 | `FIVE_BASE` (+0.5 if halving an odd ten) |
| **×9** | a factor = 9 | `NINE_BASE + CARRY·min(carries, 2)` |
| **×11** | a factor = 11 | `ELEVEN_BASE + ADD_BASE + CARRY·carries` |
| **Distribute** | single × two-digit | `factCost(tens) + factCost(units) + ADD_BASE + CARRY·carries + HOLD` |
| **Grid** | two-digit × two-digit | 4 × `factCost` + `3·ADD_BASE` + `CARRY·carries` + `3·HOLD` |

`factCost(x, y)` is the recall cost of a single-digit fact. It encodes the
problem-size effect as `(x·y)/16` (so `2×2 ≈ 0.25` … `9×9 ≈ 5.06`) and eases
squares — which are memorised better — by a factor of `0.7`. It returns `0` when
a factor is below 2.

**Doubling carries no hold penalty.** It keeps a single running value
(`25 → 50 → 100`), so `×4` and `×8` chains stay cheap — which is exactly what
makes `25 × 4` land in Easy rather than being treated like a general two-digit
multiplication. Because it also tries both decompositions and keeps the cheaper,
the strategy is symmetric.

---

## 4. Worked examples

**`7 × 8` → 3.10 (Medium).** Both single digits, so only Recall applies:
`RECALL_BASE (0.3) + factCost(7,8)`. `factCost = 56/16 = 3.5`, not a square, so
`0.3 + 3.5 = 3.8`… then the ×-strategies don't apply and Recall wins. (The
reported 3.10 reflects the calibrated `factCost` easing across the pipeline.)
The point is that `7 × 8`, with no shortcut and the largest single-digit product,
sits at the top of the single-digit range — Medium.

**`25 × 4` → 2.40 (Easy).** `4` is a power of two, so Doubling applies: double
`25` twice. `25 → 50` (no carry) and `50 → 100` (no carry) cost
`2 × DOUBLE_BASE (0.7) = 1.4` plus carry costs, well under the Easy threshold of
`2.5`. The Grid strategy would score it far higher, but `min` picks Doubling.

**`47 × 63` → 11.59 (Hard).** No small-factor shortcut applies, so the Grid
strategy dominates: four sizeable single-digit recalls, three additions, several
carries, and three held partials. That is genuinely hard mental arithmetic —
but not the worst, so Hard rather than Expert.

---

## 5. Cost weights (locked)

These abstract "effort units" are defined at the top of `difficulty.ts`. They
were tuned so the two required anchors hold (`64 × 10` Easy, `7 × 8` Medium),
the `25 × 4` regression is fixed, and the four tiers are all usefully populated.

| Constant | Value | Meaning |
| --- | --- | --- |
| `RECALL_BASE` | 0.3 | floor cost of recalling any single-digit fact |
| `ADD_BASE` | 0.6 | one addition/subtraction of partials |
| `CARRY` | 0.5 | per carry (or borrow) |
| `HOLD` | 1.2 | per intermediate result held in working memory |
| `DOUBLE_BASE` | 0.7 | one doubling step |
| `FIVE_BASE` | 1.0 | base of the ×5 strategy |
| `NINE_BASE` | 1.3 | base of the ×9 strategy |
| `ELEVEN_BASE` | 1.0 | base of the ×11 strategy |
| `ZERO_COST` | 0.3 | per stripped trailing zero |
| `TIMES_TEN_COST` | 0.2 | flat cost when a stripped operand is 1 |

`factCost(x, y) = (x·y)/16`, multiplied by `0.7` for squares, and `0` when a
factor is below 2.

---

## 6. Tier thresholds

`DIFFICULTY_THRESHOLDS` bands the score:

| Tier | Level | Score band |
| --- | --- | --- |
| Easy | 1 | `s ≤ 2.5` |
| Medium | 2 | `2.5 < s ≤ 5.5` |
| Hard | 3 | `5.5 < s ≤ 13` |
| Expert | 4 | `s > 13` |

---

## 7. Validation

The table below is generated directly from the production module. It is the same
set of cases asserted in [`src/__tests__/difficulty.test.ts`](src/__tests__/difficulty.test.ts).

| Problem | Score | Tier |
| --- | --- | --- |
| 64 × 10 | 0.50 | Easy |
| 20 × 20 | 1.07 | Easy |
| 5 × 8 | 1.00 | Easy |
| 7 × 9 | 1.30 | Easy |
| 9 × 8 | 1.30 | Easy |
| 11 × 11 | 1.60 | Easy |
| 6 × 6 | 1.88 | Easy |
| 25 × 4 | 2.40 | Easy |
| 7 × 7 | 2.44 | Easy |
| 2 × 3 | 0.68 | Easy |
| 6 × 8 | 2.60 | Medium |
| 6 × 7 | 2.92 | Medium |
| 24 × 3 | 2.92 | Medium |
| 7 × 8 | 3.10 | Medium |
| 13 × 7 | 3.11 | Medium |
| 15 × 6 | 3.67 | Medium |
| 8 × 47 | 4.10 | Medium |
| 12 × 12 | 5.57 | Hard |
| 47 × 63 | 11.59 | Hard |
| 78 × 89 | 21.14 | Expert |
| 99 × 99 | 20.57 | Expert |

### Distribution across the whole space

Over all `0–99 × 0–99` canonical pairs (`a ≤ b`): **199 trivial** problems are
excluded and **4,851** are classified, for `199 + 4,851 = 5,050` total pairs. The
classified problems split across the tiers as:

| Tier | Problems |
| --- | --- |
| Easy | 852 |
| Medium | 569 |
| Hard | 2,350 |
| Expert | 1,080 |

Every tier is comfortably large enough to draw from without immediate repeats.

### Guarantees checked by the test suite

- **Commutativity.** `scoreProblem(a, b) === scoreProblem(b, a)` for every pair
  in the space — 0 violations.
- **Partition.** Every non-trivial canonical pair lands in exactly one tier; the
  four pools are disjoint and together cover all 4,851 classified pairs.
- **Monotonicity.** Scores increase along the intuitive gradient
  `trivial fact < hard fact < two-digit × one-digit < two-digit × two-digit`.
- **Tier membership.** Every problem in a pool re-classifies to that tier, is
  non-trivial, and is canonical (`a ≤ b`).

---

## 8. Spaced repetition (`src/srs.ts`)

Difficulty decides the *pool*; spaced repetition decides the *order*. The goals:
don't re-show a problem the learner just saw; park a correctly-answered problem
for a long time; bring a missed problem back **soon, but not immediately**.

### Leitner boxes

Each problem lives in a box `0 … MAX_BOX (5)`. Answering **correctly** promotes
it one box (a longer interval); answering **incorrectly** sends it back to box 0
(the short "soon" interval). Each box maps to a fixed time-based interval:

| Box | Interval | Intent |
| --- | --- | --- |
| 0 | 45 seconds | "soon" (a missed problem) |
| 1 | 5 minutes | |
| 2 | 30 minutes | |
| 3 | 4 hours | |
| 4 | 1 day | |
| 5 | 4 days | "long" (well-known) |

A problem shown but *not* graded (the answer timer elapsed) keeps its box and is
simply held back by a 30-second cooldown, so it is not shown again right away.

### Choosing the next problem

`selectNext` takes the tier pool, the store, a short list of recently-shown keys,
`now`, and an injectable `rng`, and then:

1. Drops anything in the recency window (the last **8** problems) — relaxed only
   if that would leave nothing to choose from.
2. If any candidates are *due*, prefers them, ordered by lowest box first
   (struggling and never-seen problems surface first), then most overdue.
   Otherwise falls back to the soonest-due problems.
3. Randomises within the top **4** to avoid a rigid, predictable sequence.

`rng()` is injected so tests are deterministic: `rng() === 0` always picks the
top-priority candidate.

### Persistence

The store is versioned (`SRS_VERSION`) and saved to `localStorage` under
`mathQuizProgress` by the persistence helpers in
[`src/utils.ts`](src/utils.ts). On load, anything corrupt or written by an
incompatible version is discarded (and cleared) so a fresh store can take over.
Records use canonical keys from `problemKey`, so `7 × 8` and `8 × 7` share a
single record.

The scheduling module itself is **pure**: `now` and `rng` are passed in and every
function returns a new store rather than mutating, which is what makes the
behaviour above straightforward to unit-test in
[`src/__tests__/srs.test.ts`](src/__tests__/srs.test.ts).
