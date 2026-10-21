import { ComputedSignal, Signal } from './signals';
import type { DifficultyLevel, Problem, QuizPhase } from './types';

export const DEFAULT_QUESTION_TIME = 5;
export const DEFAULT_ANSWER_TIME = 3;
export const DEFAULT_DIFFICULTY: DifficultyLevel = 3;

export const state = {
  questionTime: new Signal(DEFAULT_QUESTION_TIME),
  answerTime: new Signal(DEFAULT_ANSWER_TIME),
  difficulty: new Signal<DifficultyLevel>(DEFAULT_DIFFICULTY),
  isQuizActive: new Signal(false),
  currentPhase: new Signal<QuizPhase>('idle'),
  timeRemaining: new Signal(0),
  currentProblem: new Signal<Problem>({ a: 0, b: 0 }),
  sessionCorrect: new Signal(0),
  sessionIncorrect: new Signal(0),
} as const;

const PHASE_LABELS: Readonly<Record<QuizPhase, string>> = {
  idle: 'Idle',
  question: 'Question',
  answer: 'Answer',
};

export const displayText = new ComputedSignal(() => {
  if (!state.isQuizActive.get()) return 'Press Start Quiz';

  const { a, b } = state.currentProblem.get();
  const question = `${a.toString()} \u00D7 ${b.toString()}`;
  return state.currentPhase.get() === 'answer' ? `${question} = ${(a * b).toString()}` : question;
});

export const progressPercent = new ComputedSignal(() => {
  if (!state.isQuizActive.get()) return 0;

  const total = state.currentPhase.get() === 'question' ? state.questionTime.get() : state.answerTime.get();
  if (total === 0) return 0;
  return ((total - state.timeRemaining.get()) / total) * 100;
});

export const timerDisplayText = new ComputedSignal(() => {
  if (!state.isQuizActive.get()) return 'Ready';
  return `${PHASE_LABELS[state.currentPhase.get()]}: ${state.timeRemaining.get().toFixed(1)}s`;
});

export const isGradingPhase = new ComputedSignal(
  () => state.isQuizActive.get() && state.currentPhase.get() === 'answer',
);
