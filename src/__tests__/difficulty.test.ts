import { describe, it, expect } from 'vitest';
import {
  isTrivial,
  problemKey,
  scoreProblem,
  classifyProblem,
  getTierPool,
  randomProblemForLevel,
  DIFFICULTY_THRESHOLDS,
  MIN_OPERAND,
  MAX_OPERAND,
} from '../difficulty';
import type { DifficultyLevel } from '../types';

const ALL_LEVELS: DifficultyLevel[] = [1, 2, 3, 4];

describe('isTrivial', () => {
  it('treats any factor of 0 or 1 as trivial', () => {
    expect(isTrivial(0, 0)).toBe(true);
    expect(isTrivial(0, 7)).toBe(true);
    expect(isTrivial(7, 0)).toBe(true);
    expect(isTrivial(1, 9)).toBe(true);
    expect(isTrivial(9, 1)).toBe(true);
    expect(isTrivial(1, 1)).toBe(true);
  });

  it('treats products of two operands >= 2 as non-trivial', () => {
    expect(isTrivial(2, 2)).toBe(false);
    expect(isTrivial(7, 8)).toBe(false);
    expect(isTrivial(99, 99)).toBe(false);
  });
});

describe('problemKey', () => {
  it('is canonical and order-independent', () => {
    expect(problemKey(7, 8)).toBe('7x8');
    expect(problemKey(8, 7)).toBe('7x8');
    expect(problemKey(12, 12)).toBe('12x12');
  });
});

describe('scoreProblem', () => {
  it('is commutative across the whole operand space', () => {
    for (let a = MIN_OPERAND; a <= MAX_OPERAND; a++) {
      for (let b = a + 1; b <= MAX_OPERAND; b++) {
        expect(scoreProblem(a, b)).toBeCloseTo(scoreProblem(b, a), 10);
      }
    }
  });

  it('orders problems monotonically from trivial computation to the grid', () => {
    const easy = scoreProblem(2, 3);
    const hardFact = scoreProblem(7, 8);
    const twoByOne = scoreProblem(13, 7);
    const twoByTwo = scoreProblem(47, 63);
    const worst = scoreProblem(99, 99);
    expect(easy).toBeLessThan(hardFact);
    expect(hardFact).toBeLessThan(twoByOne);
    expect(twoByOne).toBeLessThan(twoByTwo);
    expect(twoByTwo).toBeLessThan(worst);
  });

  it('rewards shortcut strategies: ×2 and ×5 beat an unstructured hard fact', () => {
    expect(scoreProblem(2, 9)).toBeLessThan(scoreProblem(7, 8));
    expect(scoreProblem(5, 8)).toBeLessThan(scoreProblem(7, 8));
  });

  it('treats appending zeros as nearly free', () => {
    expect(scoreProblem(64, 10)).toBeLessThan(scoreProblem(6, 7));
    // 40 × 8 is just (4 × 8) with a zero, so barely harder than 4 × 8
    expect(scoreProblem(40, 8) - scoreProblem(4, 8)).toBeLessThan(0.5);
  });
});

describe('classifyProblem — anchors', () => {
  it('64 × 10 is Easy (the required anchor)', () => {
    expect(classifyProblem(64, 10)).toBe(1);
  });

  it('7 × 8 is Medium (the required anchor), commutatively', () => {
    expect(classifyProblem(7, 8)).toBe(2);
    expect(classifyProblem(8, 7)).toBe(2);
  });

  it('25 × 4 is NOT Hard — it is Easy via doubling (the regression case)', () => {
    const level = classifyProblem(25, 4);
    expect(level).not.toBeNull();
    expect(level).toBeLessThanOrEqual(2); // Easy or Medium, never Hard/Expert
    expect(classifyProblem(25, 4)).toBe(1);
    // and strictly easier than a genuine two-digit × two-digit grid problem
    expect(scoreProblem(25, 4)).toBeLessThan(scoreProblem(47, 63));
  });

  it('places representative problems in sensible tiers', () => {
    expect(classifyProblem(2, 3)).toBe(1); // Easy
    expect(classifyProblem(7, 9)).toBe(1); // Easy — the ×9 trick
    expect(classifyProblem(11, 11)).toBe(1); // Easy — the ×11 trick
    expect(classifyProblem(20, 20)).toBe(1); // Easy — 2×2 with two zeros
    expect(classifyProblem(6, 7)).toBe(2); // Medium — a hard, shortcut-free fact
    expect(classifyProblem(13, 7)).toBe(2); // Medium — small two-digit × one-digit
    expect(classifyProblem(12, 12)).toBe(3); // Hard
    expect(classifyProblem(47, 63)).toBe(3); // Hard
    expect(classifyProblem(78, 89)).toBe(4); // Expert
    expect(classifyProblem(99, 99)).toBe(4); // Expert
  });

  it('returns null for trivial problems', () => {
    expect(classifyProblem(1, 50)).toBeNull();
    expect(classifyProblem(0, 7)).toBeNull();
    expect(classifyProblem(1, 1)).toBeNull();
  });
});

describe('thresholds are ordered', () => {
  it('easy < medium < hard', () => {
    expect(DIFFICULTY_THRESHOLDS.easy).toBeLessThan(DIFFICULTY_THRESHOLDS.medium);
    expect(DIFFICULTY_THRESHOLDS.medium).toBeLessThan(DIFFICULTY_THRESHOLDS.hard);
  });
});

describe('tier pools', () => {
  it('every non-trivial canonical pair lands in exactly one tier (partition)', () => {
    const seen = new Set<string>();
    let classified = 0;
    for (const level of ALL_LEVELS) {
      for (const problem of getTierPool(level)) {
        const key = problemKey(problem.a, problem.b);
        expect(seen.has(key)).toBe(false); // disjoint
        seen.add(key);
        classified += 1;
      }
    }

    let expected = 0;
    for (let a = MIN_OPERAND; a <= MAX_OPERAND; a++) {
      for (let b = a; b <= MAX_OPERAND; b++) {
        if (!isTrivial(a, b)) expected += 1;
      }
    }
    expect(classified).toBe(expected);
  });

  it('gives every tier a usefully large pool', () => {
    for (const level of ALL_LEVELS) {
      expect(getTierPool(level).length).toBeGreaterThan(100);
    }
  });

  it('only contains canonical (a <= b), non-trivial, correctly-tiered problems', () => {
    for (const level of ALL_LEVELS) {
      for (const { a, b } of getTierPool(level)) {
        expect(a).toBeLessThanOrEqual(b);
        expect(isTrivial(a, b)).toBe(false);
        expect(classifyProblem(a, b)).toBe(level);
      }
    }
  });

  it('returns a cached, stable reference on repeated calls', () => {
    expect(getTierPool(2)).toBe(getTierPool(2));
  });
});

describe('randomProblemForLevel', () => {
  it('always returns a non-trivial problem in the requested tier', () => {
    let seed = 0.123;
    const rng = (): number => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    for (const level of ALL_LEVELS) {
      for (let i = 0; i < 200; i++) {
        const { a, b } = randomProblemForLevel(level, rng);
        expect(isTrivial(a, b)).toBe(false);
        expect(classifyProblem(a, b)).toBe(level);
      }
    }
  });

  it('rng() === 0 selects the first problem in the pool (deterministic)', () => {
    const first = getTierPool(3)[0];
    expect(randomProblemForLevel(3, () => 0)).toEqual(first);
  });
});
