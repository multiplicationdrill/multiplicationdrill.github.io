import { problemKey } from './difficulty';
import type { Grade, LeitnerBox, Problem, SrsRecord, SrsStore } from './types';

export const SRS_VERSION = 1;

export const MAX_BOX = 5 satisfies LeitnerBox;

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export const BOX_INTERVALS_MS = {
  0: 45_000,
  1: 5 * MINUTE,
  2: 30 * MINUTE,
  3: 4 * HOUR,
  4: DAY,
  5: 4 * DAY,
} as const satisfies Record<LeitnerBox, number>;

const PROMOTIONS = { 0: 1, 1: 2, 2: 3, 3: 4, 4: 5, 5: 5 } as const satisfies Record<LeitnerBox, LeitnerBox>;

export const SEEN_COOLDOWN_MS = 30_000;

export const RECENCY_WINDOW = 8;

const PICK_COHORT = 4;

const isLeitnerBox = (value: unknown): value is LeitnerBox => typeof value === 'number' && Object.hasOwn(BOX_INTERVALS_MS, value);

const isCount = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

export function isSrsRecord(value: unknown): value is SrsRecord {
  return (
    isObject(value) &&
    isLeitnerBox(value.box) &&
    isCount(value.dueAt) &&
    isCount(value.lastSeen) &&
    isCount(value.seen) &&
    isCount(value.correct) &&
    isCount(value.incorrect)
  );
}

export function isSrsStore(value: unknown): value is SrsStore {
  return (
    isObject(value) &&
    value.version === SRS_VERSION &&
    isObject(value.records) &&
    Object.values(value.records).every(isSrsRecord)
  );
}

export function createStore(): SrsStore {
  return { version: SRS_VERSION, records: {} };
}

export function initialRecord(now: number): SrsRecord {
  return { box: 0, dueAt: now, lastSeen: 0, seen: 0, correct: 0, incorrect: 0 };
}

export function getRecord(store: SrsStore, key: string): SrsRecord | undefined {
  return store.records[key];
}

export function gradeRecord(record: SrsRecord, grade: Grade, now: number): SrsRecord {
  const correct = grade === 'correct';
  const box = correct ? PROMOTIONS[record.box] : 0;
  return {
    box,
    dueAt: now + BOX_INTERVALS_MS[box],
    lastSeen: now,
    seen: record.seen + 1,
    correct: record.correct + (correct ? 1 : 0),
    incorrect: record.incorrect + (correct ? 0 : 1),
  };
}

export function noteSeen(record: SrsRecord, now: number): SrsRecord {
  return {
    ...record,
    seen: record.seen + 1,
    lastSeen: now,
    dueAt: Math.max(record.dueAt, now + SEEN_COOLDOWN_MS),
  };
}

export function isDue(record: SrsRecord | undefined, now: number): boolean {
  return record === undefined || record.dueAt <= now;
}

function updateRecord(store: SrsStore, key: string, now: number, update: (record: SrsRecord) => SrsRecord): SrsStore {
  const existing = store.records[key] ?? initialRecord(now);
  return { version: store.version, records: { ...store.records, [key]: update(existing) } };
}

export function applyGrade(store: SrsStore, key: string, grade: Grade, now: number): SrsStore {
  return updateRecord(store, key, now, (record) => gradeRecord(record, grade, now));
}

export function applySeen(store: SrsStore, key: string, now: number): SrsStore {
  return updateRecord(store, key, now, (record) => noteSeen(record, now));
}

interface Candidate {
  readonly problem: Problem;
  readonly record: SrsRecord | undefined;
}

const compare = (x: number, y: number): number => (x < y ? -1 : x > y ? 1 : 0);

const boxRank = ({ record }: Candidate): number => record?.box ?? -1;

const dueRank = ({ record }: Candidate, unseen: number): number => record?.dueAt ?? unseen;

const byPriorityWhenDue = (x: Candidate, y: Candidate): number =>
  compare(boxRank(x), boxRank(y)) || compare(dueRank(x, -Infinity), dueRank(y, -Infinity));

const byPriorityWhenWaiting = (x: Candidate, y: Candidate): number =>
  compare(dueRank(x, Infinity), dueRank(y, Infinity)) || compare(boxRank(x), boxRank(y));

export function selectNext(
  pool: readonly Problem[],
  store: SrsStore,
  recentKeys: readonly string[],
  now: number,
  rng: () => number = Math.random,
): Problem | null {
  if (pool.length === 0) return null;

  const recent = new Set(recentKeys);
  const all = pool.map((problem): Candidate & { readonly key: string } => {
    const key = problemKey(problem.a, problem.b);
    return { problem, key, record: store.records[key] };
  });
  const fresh = all.filter(({ key }) => !recent.has(key));
  const candidates = fresh.length > 0 ? fresh : all;

  const due = candidates.filter(({ record }) => isDue(record, now));
  const ranked = due.length > 0 ? due.toSorted(byPriorityWhenDue) : candidates.toSorted(byPriorityWhenWaiting);

  const cohort = ranked.slice(0, PICK_COHORT);
  const index = Math.min(cohort.length - 1, Math.floor(rng() * cohort.length));
  return cohort[index]?.problem ?? null;
}
