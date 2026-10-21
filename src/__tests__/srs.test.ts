import { describe, it, expect } from 'vitest';
import {
  createStore,
  isSrsStore,
  initialRecord,
  getRecord,
  gradeRecord,
  noteSeen,
  isDue,
  applyGrade,
  applySeen,
  selectNext,
  SRS_VERSION,
  MAX_BOX,
  BOX_INTERVALS_MS,
  SEEN_COOLDOWN_MS,
} from '../srs';
import { problemKey } from '../difficulty';
import type { Problem, SrsRecord } from '../types';

const NOW = 1_000_000;
const pick = (): number => 0;

describe('createStore / isSrsStore', () => {
  it('creates an empty, correctly-versioned store', () => {
    const store = createStore();
    expect(store.version).toBe(SRS_VERSION);
    expect(store.records).toEqual({});
  });

  it('accepts a valid store and rejects anything else', () => {
    expect(isSrsStore(createStore())).toBe(true);
    expect(isSrsStore(null)).toBe(false);
    expect(isSrsStore(42)).toBe(false);
    expect(isSrsStore({ version: SRS_VERSION })).toBe(false);
    expect(isSrsStore({ version: SRS_VERSION + 1, records: {} })).toBe(false);
    expect(isSrsStore({ records: {} })).toBe(false);
  });
});

describe('initialRecord', () => {
  it('is an unseen record that is immediately due', () => {
    const record = initialRecord(NOW);
    expect(record).toEqual({ box: 0, dueAt: NOW, lastSeen: 0, seen: 0, correct: 0, incorrect: 0 });
    expect(isDue(record, NOW)).toBe(true);
  });
});

describe('gradeRecord', () => {
  it('promotes one box on a correct answer and parks it for that interval', () => {
    const graded = gradeRecord(initialRecord(NOW), 'correct', NOW);
    expect(graded.box).toBe(1);
    expect(graded.correct).toBe(1);
    expect(graded.seen).toBe(1);
    expect(graded.dueAt).toBe(NOW + BOX_INTERVALS_MS[1]);
  });

  it('sends an incorrect answer back to box 0, due again soon (not immediately)', () => {
    const strong: SrsRecord = { box: 4, dueAt: NOW, lastSeen: 0, seen: 3, correct: 3, incorrect: 0 };
    const graded = gradeRecord(strong, 'incorrect', NOW);
    expect(graded.box).toBe(0);
    expect(graded.incorrect).toBe(1);
    expect(graded.dueAt).toBe(NOW + BOX_INTERVALS_MS[0]);
    expect(graded.dueAt).toBeGreaterThan(NOW);
    expect(BOX_INTERVALS_MS[0]).toBeLessThan(BOX_INTERVALS_MS[MAX_BOX]);
  });

  it('never promotes beyond MAX_BOX', () => {
    let record: SrsRecord = initialRecord(NOW);
    for (let i = 0; i < MAX_BOX + 3; i++) record = gradeRecord(record, 'correct', NOW);
    expect(record.box).toBe(MAX_BOX);
    expect(record.dueAt).toBe(NOW + BOX_INTERVALS_MS[MAX_BOX]);
  });
});

describe('noteSeen', () => {
  it('does not change the box but pushes dueAt out by the cooldown', () => {
    const record: SrsRecord = { box: 2, dueAt: NOW - 1, lastSeen: 0, seen: 1, correct: 1, incorrect: 0 };
    const seen = noteSeen(record, NOW);
    expect(seen.box).toBe(2);
    expect(seen.seen).toBe(2);
    expect(seen.dueAt).toBe(NOW + SEEN_COOLDOWN_MS);
  });

  it('never pulls an already-distant dueAt closer', () => {
    const far = NOW + 10 * SEEN_COOLDOWN_MS;
    const record: SrsRecord = { box: 3, dueAt: far, lastSeen: 0, seen: 1, correct: 1, incorrect: 0 };
    expect(noteSeen(record, NOW).dueAt).toBe(far);
  });
});

describe('applyGrade / applySeen', () => {
  it('creates a record on first grade and does not mutate the input store', () => {
    const store = createStore();
    const next = applyGrade(store, '7x8', 'correct', NOW);
    expect(getRecord(store, '7x8')).toBeUndefined();
    expect(getRecord(next, '7x8')?.box).toBe(1);
  });

  it('applySeen records an ungraded showing', () => {
    const next = applySeen(createStore(), '6x7', NOW);
    const record = getRecord(next, '6x7');
    expect(record?.seen).toBe(1);
    expect(record?.box).toBe(0);
    expect(record?.dueAt).toBe(NOW + SEEN_COOLDOWN_MS);
  });
});

describe('selectNext', () => {
  const pool: Problem[] = [
    { a: 2, b: 3 },
    { a: 6, b: 7 },
    { a: 7, b: 8 },
    { a: 8, b: 9 },
  ];

  it('returns null only for an empty pool', () => {
    expect(selectNext([], createStore(), [], NOW, pick)).toBeNull();
    expect(selectNext(pool, createStore(), [], NOW, pick)).not.toBeNull();
  });

  it('never returns a problem in the recency window (unless that empties the pool)', () => {
    const recent = ['2x3', '6x7', '7x8'];
    const chosen = selectNext(pool, createStore(), recent, NOW, pick);
    expect(chosen).toEqual({ a: 8, b: 9 });

    const allRecent = ['2x3', '6x7', '7x8', '8x9'];
    expect(selectNext(pool, createStore(), allRecent, NOW, pick)).not.toBeNull();
  });

  it('prefers a due problem over one parked in a high box', () => {
    let store = createStore();
    store = { version: store.version, records: {
      '2x3': { box: 5, dueAt: NOW + 1_000_000, lastSeen: NOW, seen: 5, correct: 5, incorrect: 0 },
      '7x8': { box: 0, dueAt: NOW - 10, lastSeen: NOW - 100, seen: 2, correct: 0, incorrect: 2 },
    } };
    const chosen = selectNext(pool, store, ['6x7', '8x9'], NOW, pick);
    expect(chosen).toEqual({ a: 7, b: 8 });
  });

  it('resurfaces a freshly-missed problem ahead of freshly-correct ones', () => {
    let store = applyGrade(createStore(), '7x8', 'incorrect', NOW);
    store = applyGrade(store, '6x7', 'correct', NOW);
    const later = NOW + BOX_INTERVALS_MS[0] + 1;
    const chosen = selectNext(pool, store, ['2x3', '8x9'], later, pick);
    expect(chosen).toEqual({ a: 7, b: 8 });
  });

  it('introduces an unseen problem ahead of a seen, not-yet-due one', () => {
    const store = applyGrade(createStore(), '2x3', 'correct', NOW);
    const chosen = selectNext(pool, store, [], NOW, pick);
    expect(chosen).not.toEqual({ a: 2, b: 3 });
    expect(chosen).not.toBeNull();
    expect(getRecord(store, problemKey(chosen?.a ?? 0, chosen?.b ?? 0))).toBeUndefined();
  });

  it('falls back to the soonest-due problem when nothing is due yet', () => {
    const smallPool: Problem[] = [
      { a: 6, b: 7 },
      { a: 7, b: 8 },
    ];
    let store = createStore();
    store = { version: store.version, records: {
      '6x7': { box: 1, dueAt: NOW + 500, lastSeen: NOW, seen: 1, correct: 1, incorrect: 0 },
      '7x8': { box: 1, dueAt: NOW + 100, lastSeen: NOW, seen: 1, correct: 1, incorrect: 0 },
    } };
    const chosen = selectNext(smallPool, store, [], NOW, pick);
    expect(chosen).toEqual({ a: 7, b: 8 });
  });
});
