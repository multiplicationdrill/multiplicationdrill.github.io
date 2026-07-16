export interface Problem {
  readonly a: number;
  readonly b: number;
}

export type QuizPhase = 'idle' | 'question' | 'answer';

export type DifficultyLevel = 1 | 2 | 3 | 4;

/**
 * The four difficulty tiers, by name. The numeric `DifficultyLevel` maps to
 * these in order (1 = Easy … 4 = Expert). Unlike the old model, a tier is no
 * longer an operand range — it is a band of the cognitive-difficulty score
 * produced by `src/difficulty.ts`.
 */
export type DifficultyName = 'Easy' | 'Medium' | 'Hard' | 'Expert';

/** Self-reported outcome for a single problem. */
export type Grade = 'correct' | 'incorrect';

/**
 * Per-problem spaced-repetition state (Leitner box scheduling). One record is
 * created lazily the first time a problem is shown, so the store only ever
 * holds problems the learner has actually seen.
 */
export interface SrsRecord {
  /** Leitner box, 0..MAX_BOX. Higher box ⇒ longer interval before it is due. */
  readonly box: number;
  /** Epoch milliseconds at which this problem becomes eligible again. */
  readonly dueAt: number;
  /** Epoch milliseconds when it was last shown (0 if never). */
  readonly lastSeen: number;
  /** Total times shown. */
  readonly seen: number;
  /** Total times self-graded correct. */
  readonly correct: number;
  /** Total times self-graded incorrect. */
  readonly incorrect: number;
}

/** Versioned, serialisable spaced-repetition store persisted to localStorage. */
export interface SrsStore {
  readonly version: number;
  readonly records: Readonly<Record<string, SrsRecord>>;
}

export interface Settings {
  readonly questionTime: number;
  readonly answerTime: number;
  readonly difficulty: DifficultyLevel;
}

/**
 * Shape of the reactive application state. Kept as documentation of the signal
 * graph in `src/state.ts`; each field is held in its own `Signal`.
 */
export interface AppState {
  readonly questionTime: number;
  readonly answerTime: number;
  readonly difficulty: DifficultyLevel;
  readonly isQuizActive: boolean;
  readonly currentPhase: QuizPhase;
  readonly timeRemaining: number;
  readonly currentProblem: Problem;
  readonly sessionCorrect: number;
  readonly sessionIncorrect: number;
}
