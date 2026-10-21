import { getTierPool, problemKey, randomProblemForLevel } from './difficulty';
import { effect, type Signal } from './signals';
import { applyGrade, applySeen, createStore, RECENCY_WINDOW, selectNext } from './srs';
import { displayText, isGradingPhase, progressPercent, state, timerDisplayText } from './state';
import type { Grade, SrsStore, Theme } from './types';
import {
  debounce,
  getDifficultyName,
  isDifficultyLevel,
  isSeconds,
  loadProgress,
  loadSettings,
  loadTheme,
  saveProgress,
  saveSettings,
  saveTheme,
} from './utils';

const GRADE_KEYS: ReadonlyMap<string, Grade> = new Map([
  ['ArrowRight', 'correct'],
  ['c', 'correct'],
  ['C', 'correct'],
  ['ArrowLeft', 'incorrect'],
  ['x', 'incorrect'],
  ['X', 'incorrect'],
]);

function byId<T extends HTMLElement>(id: string, type: abstract new () => T): T {
  const element = document.getElementById(id);
  if (!(element instanceof type)) throw new Error(`Missing element #${id}`);
  return element;
}

function queryElements() {
  return {
    themeToggle: byId('themeToggle', HTMLButtonElement),
    display: byId('display', HTMLOutputElement),
    progressBar: byId('progressBar', HTMLDivElement),
    timerDisplay: byId('timerDisplay', HTMLParagraphElement),
    gradeButtons: byId('gradeButtons', HTMLDivElement),
    gradeCorrectButton: byId('gradeCorrect', HTMLButtonElement),
    gradeIncorrectButton: byId('gradeIncorrect', HTMLButtonElement),
    questionTimeSlider: byId('questionTime', HTMLInputElement),
    questionTimeValue: byId('questionTimeValue', HTMLSpanElement),
    answerTimeSlider: byId('answerTime', HTMLInputElement),
    answerTimeValue: byId('answerTimeValue', HTMLSpanElement),
    difficultySlider: byId('difficulty', HTMLInputElement),
    difficultyValue: byId('difficultyValue', HTMLSpanElement),
    quizButton: byId('quizButton', HTMLButtonElement),
    quizStatus: byId('quizStatus', HTMLElement),
    correctCount: byId('correctCount', HTMLElement),
    incorrectCount: byId('incorrectCount', HTMLElement),
  } as const;
}

type Elements = ReturnType<typeof queryElements>;

let progress: SrsStore = createStore();
let recentKeys: readonly string[] = [];
let currentGraded = false;
let frameId: number | undefined;
let lastTimestamp: number | undefined;

const persistProgress = debounce(() => {
  saveProgress(progress);
}, 400);

const persistSettings = debounce(() => {
  saveSettings({
    questionTime: state.questionTime.get(),
    answerTime: state.answerTime.get(),
    difficulty: state.difficulty.get(),
  });
}, 300);

function currentKey(): string {
  const { a, b } = state.currentProblem.get();
  return problemKey(a, b);
}

function startNextProblem(): void {
  const level = state.difficulty.get();
  const next = selectNext(getTierPool(level), progress, recentKeys, Date.now()) ?? randomProblemForLevel(level);

  state.currentProblem.set(next);
  recentKeys = [...recentKeys, problemKey(next.a, next.b)].slice(-RECENCY_WINDOW);
  currentGraded = false;
  lastTimestamp = undefined;
  state.currentPhase.set('question');
  state.timeRemaining.set(state.questionTime.get());
}

function tick(timestamp: number): void {
  if (!state.isQuizActive.get()) {
    frameId = undefined;
    return;
  }

  const elapsed = (timestamp - (lastTimestamp ?? timestamp)) / 1000;
  lastTimestamp = timestamp;

  const remaining = Math.max(0, state.timeRemaining.get() - elapsed);
  state.timeRemaining.set(remaining);

  if (remaining === 0) {
    if (state.currentPhase.get() === 'question') {
      state.currentPhase.set('answer');
      state.timeRemaining.set(state.answerTime.get());
    } else {
      if (!currentGraded) {
        progress = applySeen(progress, currentKey(), Date.now());
        persistProgress();
      }
      startNextProblem();
    }
  }

  frameId = requestAnimationFrame(tick);
}

function gradeAnswer(grade: Grade): void {
  if (!isGradingPhase.get() || currentGraded) return;

  currentGraded = true;
  progress = applyGrade(progress, currentKey(), grade, Date.now());
  persistProgress();

  const counter = grade === 'correct' ? state.sessionCorrect : state.sessionIncorrect;
  counter.set(counter.get() + 1);

  startNextProblem();
}

function startQuiz(): void {
  state.sessionCorrect.set(0);
  state.sessionIncorrect.set(0);
  recentKeys = [];
  state.isQuizActive.set(true);
  startNextProblem();
  frameId ??= requestAnimationFrame(tick);
}

function stopQuiz(): void {
  if (frameId !== undefined) cancelAnimationFrame(frameId);
  frameId = undefined;
  state.isQuizActive.set(false);
  state.currentPhase.set('idle');
  state.timeRemaining.set(0);
}

function toggleQuiz(): void {
  if (state.isQuizActive.get()) {
    stopQuiz();
  } else {
    startQuiz();
  }
}

function applyTheme(elements: Elements, theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  elements.themeToggle.ariaPressed = String(theme === 'light');
}

function toggleTheme(elements: Elements): void {
  const theme: Theme = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
  applyTheme(elements, theme);
  saveTheme(theme);
}

function restoreSettings(elements: Elements): void {
  const saved = loadSettings();
  if (saved) {
    state.questionTime.set(saved.questionTime);
    state.answerTime.set(saved.answerTime);
    state.difficulty.set(saved.difficulty);
  }

  elements.questionTimeSlider.valueAsNumber = state.questionTime.get();
  elements.answerTimeSlider.valueAsNumber = state.answerTime.get();
  elements.difficultySlider.valueAsNumber = state.difficulty.get();
  applyTheme(elements, loadTheme());
}

function bindSeconds(slider: HTMLInputElement, label: HTMLElement, signal: Signal<number>): void {
  effect(() => {
    const seconds = signal.get().toString();
    label.textContent = `${seconds}s`;
    slider.ariaValueText = `${seconds} seconds`;
  });

  slider.addEventListener('input', () => {
    if (!isSeconds(slider.valueAsNumber)) return;
    signal.set(slider.valueAsNumber);
    persistSettings();
  });
}

function setupEffects(elements: Elements): void {
  effect(() => {
    elements.display.value = displayText.get();
  });

  effect(() => {
    elements.timerDisplay.textContent = timerDisplayText.get();
  });

  effect(() => {
    elements.progressBar.style.inlineSize = `${progressPercent.get().toString()}%`;
    elements.progressBar.dataset.phase = state.currentPhase.get();
  });

  effect(() => {
    const active = state.isQuizActive.get();
    elements.quizButton.textContent = active ? 'Stop Quiz' : 'Start Quiz';
    elements.quizStatus.textContent = active ? 'Running' : 'Stopped';
    elements.questionTimeSlider.disabled = active;
    elements.answerTimeSlider.disabled = active;
    elements.difficultySlider.disabled = active;
    elements.gradeButtons.hidden = !active;
  });

  effect(() => {
    const grading = isGradingPhase.get();
    elements.gradeCorrectButton.disabled = !grading;
    elements.gradeIncorrectButton.disabled = !grading;
  });

  effect(() => {
    elements.correctCount.textContent = state.sessionCorrect.get().toString();
  });

  effect(() => {
    elements.incorrectCount.textContent = state.sessionIncorrect.get().toString();
  });

  effect(() => {
    const name = getDifficultyName(state.difficulty.get());
    elements.difficultyValue.textContent = name;
    elements.difficultySlider.ariaValueText = name;
  });
}

function handleGradingKey(event: KeyboardEvent): void {
  if (event.repeat || event.altKey || event.ctrlKey || event.metaKey) return;
  const grade = GRADE_KEYS.get(event.key);
  if (grade === undefined || !isGradingPhase.get()) return;
  event.preventDefault();
  gradeAnswer(grade);
}

function setupEventListeners(elements: Elements): void {
  bindSeconds(elements.questionTimeSlider, elements.questionTimeValue, state.questionTime);
  bindSeconds(elements.answerTimeSlider, elements.answerTimeValue, state.answerTime);

  elements.difficultySlider.addEventListener('input', () => {
    const level = elements.difficultySlider.valueAsNumber;
    if (!isDifficultyLevel(level)) return;
    state.difficulty.set(level);
    persistSettings();
  });

  elements.themeToggle.addEventListener('click', () => {
    toggleTheme(elements);
  });
  elements.quizButton.addEventListener('click', toggleQuiz);
  elements.gradeCorrectButton.addEventListener('click', () => {
    gradeAnswer('correct');
  });
  elements.gradeIncorrectButton.addEventListener('click', () => {
    gradeAnswer('incorrect');
  });
  document.addEventListener('keydown', handleGradingKey);
}

export function initialize(): void {
  const elements = queryElements();
  progress = loadProgress() ?? createStore();
  restoreSettings(elements);
  setupEffects(elements);
  setupEventListeners(elements);
}
