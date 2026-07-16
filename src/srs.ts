/**
 * srs.ts — spaced repetition for the drill.
 * =============================================================================
 *
 * Goals (from the product brief):
 *   • Don't re-show a problem the learner just saw.
 *   • A problem answered **correctly** is parked for a long time.
 *   • A problem answered **incorrectly** comes back **soon** — but not
 *     immediately (a few problems should pass first).
 *
 * We use Leitner boxes: every problem lives in a box 0..MAX_BOX. Answering
 * correctly promotes it one box (longer interval); answering incorrectly sends
 * it back to box 0 (the "soon" interval). Each box maps to a fixed time-based
 * interval, so scheduling is intuitive and needs no per-item tuning.
 *
 * The whole module is **pure**: `now` (epoch ms) and `rng` are passed in, and
 * every function returns new values rather than mutating. That keeps scheduling
 * deterministic under test and free of any storage/DOM dependency. Persistence
 * lives in `src/utils.ts`; this file only knows how to *evolve* a store.
 */

import { Grade, Problem, SrsRecord, SrsStore } from './types';
import { problemKey } from './difficulty';

/** Bump when the on-disk shape changes so old data is discarded cleanly. */
export const SRS_VERSION = 1;

/** Highest Leitner box. */
export const MAX_BOX = 5;

/**
 * Interval (ms) before a problem in each box is due again.
 * box 0 ≈ 45s ("soon"), climbing to box 5 ≈ 4 days ("long").
 */
export const BOX_INTERVALS_MS: readonly number[] = [
  45_000, // 45 seconds
  5 * 60_000, // 5 minutes
  30 * 60_000, // 30 minutes
  4 * 3_600_000, // 4 hours
  24 * 3_600_000, // 1 day
  4 * 24 * 3_600_000, // 4 days
];

/** After showing a problem *without* grading it, hold it back at least this long. */
export const SEEN_COOLDOWN_MS = 30_000;

/** How many of the most recent problems to keep out of the next selection. */
export const RECENCY_WINDOW = 8;

/** Size of the top-priority cohort that a pick is randomised within. */
const PICK_COHORT = 4;

/** A fresh, empty store. */
export function createStore(): SrsStore {
  return { version: SRS_VERSION, records: {} };
}

/**
 * Runtime type guard for a persisted store. Used by the persistence layer to
 * reject corrupt or stale data.
 */
export function isSrsStore(value: unknown): value is SrsStore {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  if (candidate.version !== SRS_VERSION) return false;
  return typeof candidate.records === 'object' && candidate.records !== null;
}

/**
 * A brand-new record for a problem about to be shown for the first time.
 * `dueAt = now` means "immediately eligible", so unseen problems are naturally
 * introduced by the selector.
 */
export function initialRecord(now: number): SrsRecord {
  return { box: 0, dueAt: now, lastSeen: 0, seen: 0, correct: 0, incorrect: 0 };
}

export function getRecord(store: SrsStore, key: string): SrsRecord | undefined {
  return store.records[key];
}

/** Evolve a record given a self-reported grade. */
export function gradeRecord(record: SrsRecord, grade: Grade, now: number): SrsRecord {
  const correct = grade === 'correct';
  const box = correct ? Math.min(record.box + 1, MAX_BOX) : 0;
  return {
    box,
    dueAt: now + BOX_INTERVALS_MS[box],
    lastSeen: now,
    seen: record.seen + 1,
    correct: record.correct + (correct ? 1 : 0),
    incorrect: record.incorrect + (correct ? 0 : 1),
  };
}

/**
 * Evolve a record when a problem was shown but the learner did not grade it
 * (e.g. the answer timer elapsed). The box is untouched; we only nudge `dueAt`
 * forward by the cooldown so it isn't shown again right away.
 */
export function noteSeen(record: SrsRecord, now: number): SrsRecord {
  return {
    ...record,
    seen: record.seen + 1,
    lastSeen: now,
    dueAt: Math.max(record.dueAt, now + SEEN_COOLDOWN_MS),
  };
}

/** A problem with no record yet is treated as due (so it can be introduced). */
export function isDue(record: SrsRecord | undefined, now: number): boolean {
  return record === undefined || record.dueAt <= now;
}

/** Apply a grade to the store, returning a new store. */
export function applyGrade(store: SrsStore, key: string, grade: Grade, now: number): SrsStore {
  const existing = store.records[key] ?? initialRecord(now);
  return {
    version: store.version,
    records: { ...store.records, [key]: gradeRecord(existing, grade, now) },
  };
}

/** Record an ungraded showing in the store, returning a new store. */
export function applySeen(store: SrsStore, key: string, now: number): SrsStore {
  const existing = store.records[key] ?? initialRecord(now);
  return {
    version: store.version,
    records: { ...store.records, [key]: noteSeen(existing, now) },
  };
}

interface Candidate {
  readonly problem: Problem;
  readonly record: SrsRecord | undefined;
}

// Unseen records sort ahead of box 0 so new material is introduced promptly.
const boxRank = (record: SrsRecord | undefined): number => (record ? record.box : -1);

/**
 * Choose the next problem to show.
 *
 * Selection order:
 *   1. Drop anything in `recentKeys` (relaxed only if that would leave nothing).
 *   2. If any candidates are due, prefer them, ordered by lowest box then most
 *      overdue — struggling and unseen problems surface first.
 *   3. Otherwise fall back to the soonest-due problems.
 *   4. Randomise within the top {@link PICK_COHORT} to avoid a rigid sequence.
 *
 * `rng` is injectable; `rng() === 0` deterministically picks the top-priority
 * problem, which the tests rely on. Returns `null` only for an empty pool.
 */
export function selectNext(
  pool: readonly Problem[],
  store: SrsStore,
  recentKeys: readonly string[],
  now: number,
  rng: () => number = Math.random,
): Problem | null {
  if (pool.length === 0) return null;

  const recent = new Set(recentKeys);
  let candidates: Candidate[] = pool
    .filter((problem) => !recent.has(problemKey(problem.a, problem.b)))
    .map((problem) => ({ problem, record: store.records[problemKey(problem.a, problem.b)] }));

  // If recency filtering removed everything, ignore it this once.
  if (candidates.length === 0) {
    candidates = pool.map((problem) => ({
      problem,
      record: store.records[problemKey(problem.a, problem.b)],
    }));
  }

  const due = candidates.filter((c) => isDue(c.record, now));
  const useDue = due.length > 0;
  const group = useDue ? due : candidates;

  const sorted = [...group].sort((x, y) => {
    if (useDue) {
      const boxDelta = boxRank(x.record) - boxRank(y.record);
      if (boxDelta !== 0) return boxDelta;
      const dueX = x.record ? x.record.dueAt : -Infinity;
      const dueY = y.record ? y.record.dueAt : -Infinity;
      return dueX - dueY;
    }
    const dueX = x.record ? x.record.dueAt : Infinity;
    const dueY = y.record ? y.record.dueAt : Infinity;
    if (dueX !== dueY) return dueX - dueY;
    return boxRank(x.record) - boxRank(y.record);
  });

  const cohort = sorted.slice(0, Math.min(PICK_COHORT, sorted.length));
  const index = Math.min(cohort.length - 1, Math.floor(rng() * cohort.length));
  return cohort[index].problem;
}
