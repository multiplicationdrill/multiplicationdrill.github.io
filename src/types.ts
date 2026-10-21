export interface Problem {
  readonly a: number;
  readonly b: number;
}

export type QuizPhase = 'idle' | 'question' | 'answer';

export type DifficultyLevel = 1 | 2 | 3 | 4;

export type DifficultyName = 'Easy' | 'Medium' | 'Hard' | 'Expert';

export type Grade = 'correct' | 'incorrect';

export type Theme = 'light' | 'dark';

export type LeitnerBox = 0 | 1 | 2 | 3 | 4 | 5;

export interface SrsRecord {
  readonly box: LeitnerBox;
  readonly dueAt: number;
  readonly lastSeen: number;
  readonly seen: number;
  readonly correct: number;
  readonly incorrect: number;
}

export interface SrsStore {
  readonly version: number;
  readonly records: Readonly<Record<string, SrsRecord>>;
}

export interface Settings {
  readonly questionTime: number;
  readonly answerTime: number;
  readonly difficulty: DifficultyLevel;
}
