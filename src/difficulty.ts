/**
 * difficulty.ts — how hard is a multiplication problem, really?
 * =============================================================================
 *
 * The guiding idea: **difficulty is the cognitive cost of computing the product
 * in your head — not the size of the numbers.** That single reframe explains
 * the cases that feel contradictory at first:
 *
 *   • 64 × 10 is *easy* even though 64 is a two-digit number, because
 *     "append a zero" is almost free.
 *   • 7 × 8 is *medium* even though both operands are single digits, because it
 *     has no shortcut and is the worst-recalled fact in the times table
 *     (the well-documented "problem-size effect").
 *   • 25 × 4 is *easy* even though the product (100) is large, because doubling
 *     twice (25 → 50 → 100) reuses one running value and produces clean carries.
 *
 * We model the cost of the *cheapest sensible mental strategy* for a problem and
 * then bucket that cost into four tiers. Concretely:
 *
 *   1. Trivial gate — multiplying by 0 or 1 is excluded from every tier.
 *   2. Place value is free — strip trailing zeros; if a stripped operand becomes
 *      1 (i.e. it was a power of ten such as 10) the problem collapses to
 *      "append zeros" and is Easy.
 *   3. Score = min over a small set of named strategies of that strategy's cost.
 *      Each strategy's cost is the sum of its elementary steps (single-digit
 *      recalls, additions, doublings) plus a working-memory "hold" penalty for
 *      juggling intermediate results. Doubling has no hold penalty (it keeps one
 *      running value), which is why chains like ×4 and ×8 stay cheap.
 *   4. Tier = which score band the problem falls into.
 *
 * The module is pure and side-effect free, which makes every piece individually
 * unit-testable. The weights and thresholds below were calibrated empirically
 * against the full 0–99 × 0–99 space; see DIFFICULTY.md for the derivation,
 * the validation table, and the resulting tier distribution.
 */

import { DifficultyLevel, Problem } from './types';

// -----------------------------------------------------------------------------
// Tunable cost weights (abstract "effort units"). See DIFFICULTY.md.
// -----------------------------------------------------------------------------
const RECALL_BASE = 0.3; // floor cost of recalling any single-digit fact
const ADD_BASE = 0.6; // cost of one addition/subtraction of partial products
const CARRY = 0.5; // cost per carry (or borrow)
const HOLD = 1.2; // working-memory cost per intermediate result held
const DOUBLE_BASE = 0.7; // cost of one doubling step
const FIVE_BASE = 1.0; // base cost of the ×5 (halve-of-×10) strategy
const NINE_BASE = 1.3; // base cost of the ×9 (×10 minus once) strategy
const ELEVEN_BASE = 1.0; // base cost of the ×11 (×10 plus once) strategy
const ZERO_COST = 0.3; // cost per stripped trailing zero
const TIMES_TEN_COST = 0.2; // flat cost when a stripped operand is 1

/**
 * Score band edges. A problem with score `s` is:
 *   Easy   if s ≤ easy
 *   Medium if easy < s ≤ medium
 *   Hard   if medium < s ≤ hard
 *   Expert if s > hard
 */
export const DIFFICULTY_THRESHOLDS = {
  easy: 2.5,
  medium: 5.5,
  hard: 13,
} as const;

// -----------------------------------------------------------------------------
// Numeric primitives
// -----------------------------------------------------------------------------
const digitCount = (n: number): number => (n < 10 ? 1 : 2);
const trailingZeros = (n: number): number => (n !== 0 && n % 10 === 0 ? 1 : 0);
const strip = (n: number): number => (trailingZeros(n) ? n / 10 : n);

/**
 * Number of carries produced when adding a list of non-negative integers with
 * the standard right-to-left algorithm. Used as a proxy for the arithmetic
 * friction of combining partial products.
 */
function additionCarries(values: readonly number[]): number {
  const columns = values.slice();
  let carry = 0;
  let carries = 0;
  while (carry > 0 || columns.some((v) => v > 0)) {
    let columnSum = carry;
    for (let i = 0; i < columns.length; i++) {
      columnSum += columns[i] % 10;
      columns[i] = Math.floor(columns[i] / 10);
    }
    carry = Math.floor(columnSum / 10);
    if (carry > 0) carries += 1;
  }
  return carries;
}

const doublingCarries = (n: number): number => additionCarries([n, n]);

/**
 * Recall cost of a single-digit × single-digit fact, capturing the problem-size
 * effect (bigger products are recalled more slowly) with an easing for squares,
 * which are memorised better. Returns 0 when a factor is 0 or 1 (trivial).
 */
function factCost(x: number, y: number): number {
  if (x < 2 || y < 2) return 0;
  const base = (x * y) / 16; // 2×2 ≈ 0.25 … 9×9 ≈ 5.06
  return x === y ? base * 0.7 : base;
}

// -----------------------------------------------------------------------------
// Mental strategies. Each returns a cost, or Infinity if it does not apply.
// They operate on *stripped* operands (≥ 2, no trailing zeros).
// -----------------------------------------------------------------------------
const POWERS_OF_TWO = [2, 4, 8] as const;

/** Straight recall — only for single-digit × single-digit. */
function costRecall(m: number, n: number): number {
  if (digitCount(m) === 1 && digitCount(n) === 1) return RECALL_BASE + factCost(m, n);
  return Infinity;
}

/** Cost of doubling `value` exactly `times` times. */
function doublingChainCost(value: number, times: number): number {
  let cost = 0;
  let v = value;
  for (let i = 0; i < times; i++) {
    cost += DOUBLE_BASE + CARRY * doublingCarries(v);
    v *= 2;
  }
  return cost;
}

/**
 * Repeated doubling when a factor is 2, 4, or 8. If *both* factors are powers of
 * two we try both decompositions and keep the cheaper one, which also makes the
 * strategy commutative.
 */
function costDoubling(m: number, n: number): number {
  let best = Infinity;
  if ((POWERS_OF_TWO as readonly number[]).includes(m)) {
    best = Math.min(best, doublingChainCost(n, Math.log2(m)));
  }
  if ((POWERS_OF_TWO as readonly number[]).includes(n)) {
    best = Math.min(best, doublingChainCost(m, Math.log2(n)));
  }
  return best;
}

/** ×5 as half of ×10. */
function costFive(m: number, n: number): number {
  const other = m === 5 ? n : n === 5 ? m : NaN;
  if (Number.isNaN(other)) return Infinity;
  return FIVE_BASE + (other % 2 === 1 ? 0.5 : 0); // halving an odd ten needs care
}

/** ×9 as (×10 − itself). */
function costNine(m: number, n: number): number {
  const other = m === 9 ? n : n === 9 ? m : NaN;
  if (Number.isNaN(other)) return Infinity;
  return NINE_BASE + CARRY * Math.min(additionCarries([other * 10, other]), 2);
}

/** ×11 as (×10 + itself). */
function costEleven(m: number, n: number): number {
  const other = m === 11 ? n : n === 11 ? m : NaN;
  if (Number.isNaN(other)) return Infinity;
  return ELEVEN_BASE + ADD_BASE + CARRY * additionCarries([other * 10, other]);
}

/** Split the two-digit factor into tens + units; multiply the single-digit
 *  factor by each and add. Applies to (single digit) × (two digit). */
function costDistribute(m: number, n: number): number {
  const small = Math.min(m, n);
  const large = Math.max(m, n);
  if (digitCount(small) !== 1 || digitCount(large) !== 2) return Infinity;
  const tens = Math.floor(large / 10);
  const units = large % 10;
  const partials = [small * tens * 10, small * units];
  return (
    factCost(small, tens) +
    factCost(small, units) +
    ADD_BASE +
    CARRY * additionCarries(partials) +
    HOLD
  );
}

/** The full grid: four partial products plus their additions. Applies to
 *  (two digit) × (two digit) — the general worst case. */
function costGrid(m: number, n: number): number {
  if (digitCount(m) !== 2 || digitCount(n) !== 2) return Infinity;
  const [aTens, aUnits] = [Math.floor(m / 10), m % 10];
  const [bTens, bUnits] = [Math.floor(n / 10), n % 10];
  const partials = [aTens * bTens * 100, aTens * bUnits * 10, aUnits * bTens * 10, aUnits * bUnits];
  return (
    factCost(aTens, bTens) +
    factCost(aTens, bUnits) +
    factCost(aUnits, bTens) +
    factCost(aUnits, bUnits) +
    ADD_BASE * 3 +
    CARRY * additionCarries(partials) +
    HOLD * 3
  );
}

function coreScore(m: number, n: number): number {
  return Math.min(
    costRecall(m, n),
    costDoubling(m, n),
    costFive(m, n),
    costNine(m, n),
    costEleven(m, n),
    costDistribute(m, n),
    costGrid(m, n),
  );
}

// -----------------------------------------------------------------------------
// Public API
// -----------------------------------------------------------------------------

/** True when either operand is 0 or 1 — a trivial problem excluded from all tiers. */
export function isTrivial(a: number, b: number): boolean {
  return Math.min(a, b) <= 1;
}

/**
 * Canonical, order-independent key for a problem (`"7x8"`), so that 7 × 8 and
 * 8 × 7 share one spaced-repetition record.
 */
export function problemKey(a: number, b: number): string {
  return `${Math.min(a, b)}x${Math.max(a, b)}`;
}

/**
 * Cognitive-difficulty score for a × b. Lower is easier. Commutative:
 * `scoreProblem(a, b) === scoreProblem(b, a)`. Intended for non-trivial
 * operands (≥ 2); callers should gate with {@link isTrivial} first.
 */
export function scoreProblem(a: number, b: number): number {
  // Evaluate on a canonical ordering so the score is exactly commutative:
  // floating-point addition is not associative, and the grid strategy would
  // otherwise sum its partial products in a different order for a×b vs b×a.
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  const zeros = trailingZeros(lo) + trailingZeros(hi);
  const sa = strip(lo);
  const sb = strip(hi);
  if (sa === 1 || sb === 1) return TIMES_TEN_COST + zeros * ZERO_COST;
  return zeros * ZERO_COST + coreScore(sa, sb);
}

/**
 * Difficulty tier for a × b, or `null` if the problem is trivial (×0 or ×1).
 */
export function classifyProblem(a: number, b: number): DifficultyLevel | null {
  if (isTrivial(a, b)) return null;
  const s = scoreProblem(a, b);
  if (s <= DIFFICULTY_THRESHOLDS.easy) return 1;
  if (s <= DIFFICULTY_THRESHOLDS.medium) return 2;
  if (s <= DIFFICULTY_THRESHOLDS.hard) return 3;
  return 4;
}

/** Operand bounds for the drill: 0 and 1 are excluded, so the range is 2..99. */
export const MIN_OPERAND = 2;
export const MAX_OPERAND = 99;

// Tier pools are computed once on demand and cached — ~4.8k pairs is cheap.
const tierPoolCache = new Map<DifficultyLevel, readonly Problem[]>();

/**
 * All non-trivial canonical problems (a ≤ b) that fall in the given tier.
 * Memoised per level.
 */
export function getTierPool(level: DifficultyLevel): readonly Problem[] {
  const cached = tierPoolCache.get(level);
  if (cached) return cached;

  const pool: Problem[] = [];
  for (let a = MIN_OPERAND; a <= MAX_OPERAND; a++) {
    for (let b = a; b <= MAX_OPERAND; b++) {
      if (classifyProblem(a, b) === level) pool.push({ a, b });
    }
  }
  tierPoolCache.set(level, pool);
  return pool;
}

/**
 * A uniformly random problem from the given tier. `rng` is injectable for
 * deterministic tests and defaults to `Math.random`.
 */
export function randomProblemForLevel(
  level: DifficultyLevel,
  rng: () => number = Math.random,
): Problem {
  const pool = getTierPool(level);
  const index = Math.min(pool.length - 1, Math.floor(rng() * pool.length));
  return pool[index] ?? { a: MIN_OPERAND, b: MIN_OPERAND };
}
