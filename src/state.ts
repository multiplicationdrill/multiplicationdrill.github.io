import { Signal, ComputedSignal } from './signals';
import { Problem, QuizPhase, DifficultyLevel } from './types';
import { generateSeed } from './utils';

// Application State
export const state = {
  counter: new Signal(0),
  seed: new Signal(generateSeed(3)), // Initialize with default difficulty
  questionTime: new Signal(5),
  answerTime: new Signal(3),
  difficulty: new Signal<DifficultyLevel>(3),
  isQuizActive: new Signal(false),
  currentPhase: new Signal<QuizPhase>('idle'),
  timeRemaining: new Signal(0),
  autoUpdateEnabled: new Signal(false),
  currentProblem: new Signal<Problem>({ a: 0, b: 0 }),
} as const;

// Computed Values (Derived State)
export const displayText = new ComputedSignal(() => {
  if (state.isQuizActive.get()) {
    const phase = state.currentPhase.get();
    const p = state.currentProblem.get();
    if (phase === 'question') {
      return `${p.a} \u00D7 ${p.b}`;
    } else if (phase === 'answer') {
      return `${p.a} \u00D7 ${p.b} = ${p.a * p.b}`;
    }
  }
  // Manual mode display
  const count = state.counter.get();
  const seed = state.seed.get();
  return `${count} \u00D7 ${seed} = ${count * seed}`;
});

export const progressPercent = new ComputedSignal(() => {
  if (!state.isQuizActive.get()) return 0;

  const phase = state.currentPhase.get();
  const totalTime = phase === 'question'
    ? state.questionTime.get()
    : state.answerTime.get();
  const remaining = state.timeRemaining.get();

  if (totalTime === 0) return 0;
  return ((totalTime - remaining) / totalTime) * 100;
});

export const timerDisplayText = new ComputedSignal(() => {
  if (!state.isQuizActive.get()) return 'Ready';

  const phase = state.currentPhase.get();
  const remaining = state.timeRemaining.get();
  const phaseText = phase.charAt(0).toUpperCase() + phase.slice(1);
  return `${phaseText}: ${remaining.toFixed(1)}s`;
});
