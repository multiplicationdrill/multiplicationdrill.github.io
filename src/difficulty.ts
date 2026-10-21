import type { DifficultyLevel, Problem } from './types';

const RECALL_BASE = 0.3;
const ADD_BASE = 0.6;
const CARRY = 0.5;
const HOLD = 1.2;
const DOUBLE_BASE = 0.7;
const FIVE_BASE = 1.0;
const NINE_BASE = 1.3;
const ELEVEN_BASE = 1.0;
const ZERO_COST = 0.3;
const TIMES_TEN_COST = 0.2;

export const DIFFICULTY_THRESHOLDS = {
  easy: 2.5,
  medium: 5.5,
  hard: 13,
} as const;

export const MIN_OPERAND = 2;
export const MAX_OPERAND = 99;

const POWERS_OF_TWO: ReadonlySet<number> = new Set([2, 4, 8]);

const digitCount = (n: number): number => (n < 10 ? 1 : 2);
const trailingZeros = (n: number): number => (n !== 0 && n % 10 === 0 ? 1 : 0);
const strip = (n: number): number => (trailingZeros(n) ? n / 10 : n);
const tens = (n: number): number => Math.floor(n / 10);
const units = (n: number): number => n % 10;

function partnerOf(m: number, n: number, factor: number): number | undefined {
  if (m === factor) return n;
  if (n === factor) return m;
  return undefined;
}

function additionCarries(values: readonly number[]): number {
  let columns = [...values];
  let carry = 0;
  let carries = 0;
  while (carry > 0 || columns.some((v) => v > 0)) {
    const columnSum = columns.reduce((sum, v) => sum + units(v), carry);
    columns = columns.map(tens);
    carry = tens(columnSum);
    if (carry > 0) carries += 1;
  }
  return carries;
}

const doublingCarries = (n: number): number => additionCarries([n, n]);

function factCost(x: number, y: number): number {
  if (x < 2 || y < 2) return 0;
  const base = (x * y) / 16;
  return x === y ? base * 0.7 : base;
}

function costRecall(m: number, n: number): number {
  return digitCount(m) === 1 && digitCount(n) === 1 ? RECALL_BASE + factCost(m, n) : Infinity;
}

function doublingChainCost(value: number, times: number): number {
  let cost = 0;
  let v = value;
  for (let i = 0; i < times; i++) {
    cost += DOUBLE_BASE + CARRY * doublingCarries(v);
    v *= 2;
  }
  return cost;
}

function costDoubling(m: number, n: number): number {
  let best = Infinity;
  if (POWERS_OF_TWO.has(m)) best = Math.min(best, doublingChainCost(n, Math.log2(m)));
  if (POWERS_OF_TWO.has(n)) best = Math.min(best, doublingChainCost(m, Math.log2(n)));
  return best;
}

function costFive(m: number, n: number): number {
  const other = partnerOf(m, n, 5);
  if (other === undefined) return Infinity;
  return FIVE_BASE + (other % 2 === 1 ? 0.5 : 0);
}

function costNine(m: number, n: number): number {
  const other = partnerOf(m, n, 9);
  if (other === undefined) return Infinity;
  return NINE_BASE + CARRY * Math.min(additionCarries([other * 10, other]), 2);
}

function costEleven(m: number, n: number): number {
  const other = partnerOf(m, n, 11);
  if (other === undefined) return Infinity;
  return ELEVEN_BASE + ADD_BASE + CARRY * additionCarries([other * 10, other]);
}

function costDistribute(m: number, n: number): number {
  const small = Math.min(m, n);
  const large = Math.max(m, n);
  if (digitCount(small) !== 1 || digitCount(large) !== 2) return Infinity;
  const partials = [small * tens(large) * 10, small * units(large)];
  return (
    factCost(small, tens(large)) +
    factCost(small, units(large)) +
    ADD_BASE +
    CARRY * additionCarries(partials) +
    HOLD
  );
}

function costGrid(m: number, n: number): number {
  if (digitCount(m) !== 2 || digitCount(n) !== 2) return Infinity;
  const [aTens, aUnits, bTens, bUnits] = [tens(m), units(m), tens(n), units(n)];
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

export function isTrivial(a: number, b: number): boolean {
  return Math.min(a, b) <= 1;
}

export function problemKey(a: number, b: number): string {
  return `${Math.min(a, b).toString()}x${Math.max(a, b).toString()}`;
}

export function scoreProblem(a: number, b: number): number {
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  const zeros = trailingZeros(lo) + trailingZeros(hi);
  const sa = strip(lo);
  const sb = strip(hi);
  if (sa === 1 || sb === 1) return TIMES_TEN_COST + zeros * ZERO_COST;
  return zeros * ZERO_COST + coreScore(sa, sb);
}

export function classifyProblem(a: number, b: number): DifficultyLevel | null {
  if (isTrivial(a, b)) return null;
  const score = scoreProblem(a, b);
  if (score <= DIFFICULTY_THRESHOLDS.easy) return 1;
  if (score <= DIFFICULTY_THRESHOLDS.medium) return 2;
  if (score <= DIFFICULTY_THRESHOLDS.hard) return 3;
  return 4;
}

const tierPoolCache = new Map<DifficultyLevel, readonly Problem[]>();

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

export function randomProblemForLevel(level: DifficultyLevel, rng: () => number = Math.random): Problem {
  const pool = getTierPool(level);
  const index = Math.min(pool.length - 1, Math.floor(rng() * pool.length));
  return pool[index] ?? { a: MIN_OPERAND, b: MIN_OPERAND };
}
