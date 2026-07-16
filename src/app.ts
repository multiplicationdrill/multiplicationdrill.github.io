import { effect } from './signals';
import {
  state,
  displayText,
  progressPercent,
  timerDisplayText,
  isGradingPhase,
} from './state';
import { DifficultyLevel, Grade, Settings, SrsStore } from './types';
import {
  getDifficultyName,
  loadSettings,
  saveSettings,
  loadTheme,
  saveTheme,
  loadProgress,
  saveProgress,
  debounce,
} from './utils';
import { getTierPool, problemKey, randomProblemForLevel } from './difficulty';
import { applyGrade, applySeen, createStore, RECENCY_WINDOW, selectNext } from './srs';

// DOM Elements
interface DOMElements {
  readonly display: HTMLElement;
  readonly progressBar: HTMLElement;
  readonly timerDisplay: HTMLElement;
  readonly questionTimeValue: HTMLElement;
  readonly answerTimeValue: HTMLElement;
  readonly difficultyValue: HTMLElement;
  readonly quizButton: HTMLButtonElement;
  readonly quizStatus: HTMLElement;
  readonly correctCount: HTMLElement;
  readonly incorrectCount: HTMLElement;
  readonly questionTimeSlider: HTMLInputElement;
  readonly answerTimeSlider: HTMLInputElement;
  readonly difficultySlider: HTMLInputElement;
  readonly gradeButtons: HTMLElement;
  readonly gradeCorrectButton: HTMLButtonElement;
  readonly gradeIncorrectButton: HTMLButtonElement;
}

let elements: DOMElements;
let animationFrameId: number | null = null;
let lastTimestamp = 0;

// Spaced-repetition state lives at module scope. The store is immutable and
// swapped wholesale on each update. `recentKeys` is a short ring of the most
// recently shown problems (so we don't immediately repeat one), and
// `currentGraded` tracks whether the on-screen problem was already graded.
let progress: SrsStore = createStore();
let recentKeys: string[] = [];
let currentGraded = false;

function getElements(): DOMElements {
  return {
    display: document.getElementById('display')!,
    progressBar: document.getElementById('progressBar')!,
    timerDisplay: document.getElementById('timerDisplay')!,
    questionTimeValue: document.getElementById('questionTimeValue')!,
    answerTimeValue: document.getElementById('answerTimeValue')!,
    difficultyValue: document.getElementById('difficultyValue')!,
    quizButton: document.getElementById('quizButton')! as HTMLButtonElement,
    quizStatus: document.getElementById('quizStatus')!,
    correctCount: document.getElementById('correctCount')!,
    incorrectCount: document.getElementById('incorrectCount')!,
    questionTimeSlider: document.getElementById('questionTime')! as HTMLInputElement,
    answerTimeSlider: document.getElementById('answerTime')! as HTMLInputElement,
    difficultySlider: document.getElementById('difficulty')! as HTMLInputElement,
    gradeButtons: document.getElementById('gradeButtons')!,
    gradeCorrectButton: document.getElementById('gradeCorrect')! as HTMLButtonElement,
    gradeIncorrectButton: document.getElementById('gradeIncorrect')! as HTMLButtonElement,
  };
}

function rememberRecent(key: string): void {
  recentKeys = [...recentKeys, key].slice(-RECENCY_WINDOW);
}

const debouncedSaveProgress = debounce(() => saveProgress(progress), 400);

function gameLoop(timestamp: number): void {
  if (!state.isQuizActive.get()) {
    animationFrameId = null;
    return;
  }

  if (!lastTimestamp) {
    lastTimestamp = timestamp;
  }

  const deltaTime = (timestamp - lastTimestamp) / 1000; // Time elapsed in seconds
  lastTimestamp = timestamp;

  const newTime = Math.max(0, state.timeRemaining.get() - deltaTime);
  state.timeRemaining.set(newTime);

  if (newTime === 0) {
    const currentPhase = state.currentPhase.get();
    if (currentPhase === 'question') {
      state.currentPhase.set('answer');
      state.timeRemaining.set(state.answerTime.get());
    } else if (currentPhase === 'answer') {
      // The answer window elapsed without a self-grade. Record an ungraded
      // showing so spaced repetition still schedules it, then move on.
      if (!currentGraded) {
        const { a, b } = state.currentProblem.get();
        progress = applySeen(progress, problemKey(a, b), Date.now());
        debouncedSaveProgress();
      }
      startNextProblem();
    }
  }

  animationFrameId = requestAnimationFrame(gameLoop);
}

function startNextProblem(): void {
  const level = state.difficulty.get();
  const pool = getTierPool(level);
  // Spaced repetition chooses the next problem; the pool fallback is a safety
  // net that should never be needed (every tier is non-empty).
  const next =
    selectNext(pool, progress, recentKeys, Date.now(), Math.random) ??
    randomProblemForLevel(level);

  state.currentProblem.set(next);
  rememberRecent(problemKey(next.a, next.b));
  currentGraded = false;
  lastTimestamp = 0; // Re-baseline the clock so the new question gets full time.
  state.currentPhase.set('question');
  state.timeRemaining.set(state.questionTime.get());
}

/**
 * Record the learner's self-assessment for the current problem and advance
 * immediately. No-op unless an answer is showing and hasn't been graded yet.
 */
export function gradeAnswer(grade: Grade): void {
  if (!state.isQuizActive.get() || state.currentPhase.get() !== 'answer' || currentGraded) {
    return;
  }

  currentGraded = true;
  const { a, b } = state.currentProblem.get();
  progress = applyGrade(progress, problemKey(a, b), grade, Date.now());
  debouncedSaveProgress();

  if (grade === 'correct') {
    state.sessionCorrect.set(state.sessionCorrect.get() + 1);
  } else {
    state.sessionIncorrect.set(state.sessionIncorrect.get() + 1);
  }

  startNextProblem();
}

export function toggleQuiz(): void {
  const willBeActive = !state.isQuizActive.get();
  state.isQuizActive.set(willBeActive);

  if (willBeActive) {
    // Fresh session: zero the tally and recency ring.
    state.sessionCorrect.set(0);
    state.sessionIncorrect.set(0);
    recentKeys = [];
    lastTimestamp = 0;
    startNextProblem();
    if (!animationFrameId) {
      animationFrameId = requestAnimationFrame(gameLoop);
    }
  } else {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
    state.currentPhase.set('idle');
    state.timeRemaining.set(0);
  }
}

export function toggleTheme(): void {
  document.body.classList.toggle('light-mode');
  saveTheme(document.body.classList.contains('light-mode') ? 'light' : 'dark');
}

function initializeSettings(): void {
  const saved = loadSettings();
  if (saved) {
    // Load and apply settings with proper fallbacks to defaults
    const questionTime = saved.questionTime ?? 5;
    const answerTime = saved.answerTime ?? 3;
    const difficulty = saved.difficulty ?? 3;

    state.questionTime.set(questionTime);
    state.answerTime.set(answerTime);
    state.difficulty.set(difficulty);

    // Sync the DOM elements with loaded values
    elements.questionTimeSlider.value = questionTime.toString();
    elements.answerTimeSlider.value = answerTime.toString();
    elements.difficultySlider.value = difficulty.toString();
  } else {
    // No saved settings, ensure DOM matches default state values
    elements.questionTimeSlider.value = state.questionTime.get().toString();
    elements.answerTimeSlider.value = state.answerTime.get().toString();
    elements.difficultySlider.value = state.difficulty.get().toString();
  }

  // Load theme preference
  if (loadTheme() === 'light') {
    document.body.classList.add('light-mode');
  }
}

function setupEffects(): void {
  // DOM updates
  effect(() => { elements.display.textContent = displayText.get(); });
  effect(() => { elements.timerDisplay.textContent = timerDisplayText.get(); });

  effect(() => {
    const percent = progressPercent.get();
    elements.progressBar.style.width = `${percent}%`;

    const phase = state.currentPhase.get();
    const color = phase === 'question'
      ? 'linear-gradient(90deg, var(--success), #34d399)'
      : 'linear-gradient(90deg, var(--warning), #fbbf24)';
    elements.progressBar.style.background = color;
  });

  effect(() => {
    const isActive = state.isQuizActive.get();
    elements.quizButton.textContent = isActive ? 'Stop Quiz' : 'Start Quiz';
    elements.quizStatus.textContent = isActive ? 'Running' : 'Stopped';

    const disabled = isActive;
    elements.questionTimeSlider.disabled = disabled;
    elements.answerTimeSlider.disabled = disabled;
    elements.difficultySlider.disabled = disabled;
  });

  // Grade buttons: hidden entirely when idle, visible during a quiz, and only
  // enabled while the answer is on screen (the grading window).
  effect(() => {
    const active = state.isQuizActive.get();
    const grading = isGradingPhase.get();
    elements.gradeButtons.hidden = !active;
    elements.gradeCorrectButton.disabled = !grading;
    elements.gradeIncorrectButton.disabled = !grading;
  });

  // Session tally
  effect(() => {
    elements.correctCount.textContent = state.sessionCorrect.get().toString();
  });
  effect(() => {
    elements.incorrectCount.textContent = state.sessionIncorrect.get().toString();
  });

  // Create a debounced save function
  const debouncedSave = debounce(saveSettingsToStorage, 300);

  // Settings persistence with debounce
  effect(() => {
    const time = state.questionTime.get();
    elements.questionTimeValue.textContent = `${time}s`;
    elements.questionTimeSlider.setAttribute('aria-valuenow', time.toString());
    elements.questionTimeSlider.setAttribute('aria-valuetext', `${time} seconds`);
    debouncedSave();
  });

  effect(() => {
    const time = state.answerTime.get();
    elements.answerTimeValue.textContent = `${time}s`;
    elements.answerTimeSlider.setAttribute('aria-valuenow', time.toString());
    elements.answerTimeSlider.setAttribute('aria-valuetext', `${time} seconds`);
    debouncedSave();
  });

  effect(() => {
    const difficulty = state.difficulty.get();
    const name = getDifficultyName(difficulty);
    elements.difficultyValue.textContent = name;
    elements.difficultySlider.setAttribute('aria-valuenow', difficulty.toString());
    elements.difficultySlider.setAttribute('aria-valuetext', name);
    debouncedSave();
  });
}

function saveSettingsToStorage(): void {
  const settings = {
    questionTime: state.questionTime.get(),
    answerTime: state.answerTime.get(),
    difficulty: state.difficulty.get(),
  } satisfies Settings;
  saveSettings(settings);
}

function setupEventListeners(): void {
  elements.questionTimeSlider.addEventListener('input', (e) => {
    const value = parseInt((e.target as HTMLInputElement).value);
    state.questionTime.set(Math.max(1, value));
  });

  elements.answerTimeSlider.addEventListener('input', (e) => {
    const value = parseInt((e.target as HTMLInputElement).value);
    state.answerTime.set(Math.max(1, value));
  });

  elements.difficultySlider.addEventListener('input', (e) => {
    const value = parseInt((e.target as HTMLInputElement).value) as DifficultyLevel;
    state.difficulty.set(value);
  });

  // Self-grading. Tap/click is the primary interaction and works on touch;
  // arrow and letter keys are an additive convenience for desktop keyboards.
  elements.gradeCorrectButton.addEventListener('click', () => gradeAnswer('correct'));
  elements.gradeIncorrectButton.addEventListener('click', () => gradeAnswer('incorrect'));
  document.addEventListener('keydown', handleGradingKey);
}

function handleGradingKey(event: KeyboardEvent): void {
  if (!isGradingPhase.get()) return;

  // Right / C => correct (right-hand ✓ button); Left / X => incorrect
  // (left-hand ✗ button). Arrows mirror the on-screen button positions.
  if (event.key === 'ArrowRight' || event.key === 'c' || event.key === 'C') {
    event.preventDefault();
    gradeAnswer('correct');
  } else if (event.key === 'ArrowLeft' || event.key === 'x' || event.key === 'X') {
    event.preventDefault();
    gradeAnswer('incorrect');
  }
}

export function initialize(): void {
  elements = getElements();
  progress = loadProgress() ?? createStore();
  initializeSettings();
  setupEffects();
  setupEventListeners();
}

// Export for testing
export { state, elements };
