export interface Problem {
  readonly a: number;
  readonly b: number;
}

export type QuizPhase = 'idle' | 'question' | 'answer';

export type DifficultyLevel = 1 | 2 | 3 | 4;

export interface DifficultyRange {
  readonly min: number;
  readonly max: number;
}

export interface Settings {
  readonly questionTime: number;
  readonly answerTime: number;
  readonly difficulty: DifficultyLevel;
  readonly autoUpdate: boolean;
}

export interface AppState {
  readonly counter: number;
  readonly seed: number;
  readonly questionTime: number;
  readonly answerTime: number;
  readonly difficulty: DifficultyLevel;
  readonly isQuizActive: boolean;
  readonly currentPhase: QuizPhase;
  readonly timeRemaining: number;
  readonly autoUpdateEnabled: boolean;
  readonly currentProblem: Problem;
}
