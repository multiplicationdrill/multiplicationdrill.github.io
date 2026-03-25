import { effect } from './signals';
import { state, displayText, progressPercent, timerDisplayText } from './state';
import { DifficultyLevel, Settings } from './types';
import {
  generateProblem,
  getDifficultyName,
  loadSettings,
  saveSettings,
  loadTheme,
  saveTheme,
  generateSeed,
  debounce,
} from './utils';

// DOM Elements
interface DOMElements {
  readonly display: HTMLElement;
  readonly progressBar: HTMLElement;
  readonly timerDisplay: HTMLElement;
  readonly questionTimeValue: HTMLElement;
  readonly answerTimeValue: HTMLElement;
  readonly difficultyValue: HTMLElement;
  readonly quizButton: HTMLButtonElement;
  readonly modeStatus: HTMLElement;
  readonly quizStatus: HTMLElement;
  readonly updateTime: HTMLElement;
  readonly questionTimeSlider: HTMLInputElement;
  readonly answerTimeSlider: HTMLInputElement;
  readonly difficultySlider: HTMLInputElement;
  readonly incrementBtn: HTMLButtonElement;
  readonly resetBtn: HTMLButtonElement;
  readonly autoUpdateCheckbox: HTMLInputElement;
}

let elements: DOMElements;
let animationFrameId: number | null = null;
let lastTimestamp = 0;
let autoUpdateTimer: ReturnType<typeof setInterval> | null = null;

function getElements(): DOMElements {
  return {
    display: document.getElementById('display')!,
    progressBar: document.getElementById('progressBar')!,
    timerDisplay: document.getElementById('timerDisplay')!,
    questionTimeValue: document.getElementById('questionTimeValue')!,
    answerTimeValue: document.getElementById('answerTimeValue')!,
    difficultyValue: document.getElementById('difficultyValue')!,
    quizButton: document.getElementById('quizButton')! as HTMLButtonElement,
    modeStatus: document.getElementById('modeStatus')!,
    quizStatus: document.getElementById('quizStatus')!,
    updateTime: document.getElementById('updateTime')!,
    questionTimeSlider: document.getElementById('questionTime')! as HTMLInputElement,
    answerTimeSlider: document.getElementById('answerTime')! as HTMLInputElement,
    difficultySlider: document.getElementById('difficulty')! as HTMLInputElement,
    incrementBtn: document.getElementById('incrementBtn')! as HTMLButtonElement,
    resetBtn: document.getElementById('resetBtn')! as HTMLButtonElement,
    autoUpdateCheckbox: document.getElementById('autoUpdate')! as HTMLInputElement,
  };
}

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
  updateLastTime();

  if (newTime === 0) {
    const currentPhase = state.currentPhase.get();
    if (currentPhase === 'question') {
      state.currentPhase.set('answer');
      state.timeRemaining.set(state.answerTime.get());
    } else if (currentPhase === 'answer') {
      startNextProblem();
    }
  }

  animationFrameId = requestAnimationFrame(gameLoop);
}

function startNextProblem(): void {
  state.currentProblem.set(generateProblem(state.difficulty.get()));
  state.currentPhase.set('question');
  state.timeRemaining.set(state.questionTime.get());
}

export function toggleQuiz(): void {
  const willBeActive = !state.isQuizActive.get();
  state.isQuizActive.set(willBeActive);

  if (willBeActive) {
    lastTimestamp = 0; // Reset timestamp for the first frame
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
    updateLastTime();
  }
}

export function increment(): void {
  state.counter.set(state.counter.get() + 1);
  updateLastTime();
}

export function reset(): void {
  state.counter.set(0);
  state.seed.set(generateSeed(state.difficulty.get()));
  updateLastTime();
}

function updateLastTime(): void {
  elements.updateTime.textContent = new Date().toLocaleTimeString();
}

export function toggleAutoUpdate(checked: boolean): void {
  state.autoUpdateEnabled.set(checked);
}

function startAutoUpdate(): void {
  if (autoUpdateTimer) return;
  autoUpdateTimer = setInterval(() => {
    if (!state.isQuizActive.get() && state.autoUpdateEnabled.get()) {
      increment();
    }
  }, 3000);
}

function stopAutoUpdate(): void {
  if (autoUpdateTimer) {
    clearInterval(autoUpdateTimer);
    autoUpdateTimer = null;
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
    const autoUpdate = saved.autoUpdate ?? false;

    state.questionTime.set(questionTime);
    state.answerTime.set(answerTime);
    state.difficulty.set(difficulty);
    state.autoUpdateEnabled.set(autoUpdate);
    // Set seed based on loaded difficulty
    state.seed.set(generateSeed(difficulty));

    // Sync the DOM elements with loaded values
    elements.questionTimeSlider.value = questionTime.toString();
    elements.answerTimeSlider.value = answerTime.toString();
    elements.difficultySlider.value = difficulty.toString();
    elements.autoUpdateCheckbox.checked = autoUpdate;
  } else {
    // No saved settings, ensure DOM matches default state values
    elements.questionTimeSlider.value = state.questionTime.get().toString();
    elements.answerTimeSlider.value = state.answerTime.get().toString();
    elements.difficultySlider.value = state.difficulty.get().toString();
    elements.autoUpdateCheckbox.checked = state.autoUpdateEnabled.get();
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
    elements.modeStatus.textContent = isActive ? 'Quiz' : 'Manual';
    elements.quizStatus.textContent = isActive ? 'Running' : 'Stopped';

    const disabled = isActive;
    elements.questionTimeSlider.disabled = disabled;
    elements.answerTimeSlider.disabled = disabled;
    elements.difficultySlider.disabled = disabled;
    elements.incrementBtn.disabled = disabled;
    elements.resetBtn.disabled = disabled;
    elements.autoUpdateCheckbox.disabled = disabled;
  });

  effect(() => {
    const autoUpdate = state.autoUpdateEnabled.get();
    const quizActive = state.isQuizActive.get();

    if (autoUpdate && !quizActive) {
      startAutoUpdate();
    } else {
      stopAutoUpdate();
    }
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
    // Update seed when difficulty changes in manual mode
    if (!state.isQuizActive.get()) {
      state.seed.set(generateSeed(difficulty));
    }
    debouncedSave();
  });

  effect(() => {
    debouncedSave(); // For autoUpdate changes
  });
}

function saveSettingsToStorage(): void {
  const settings = {
    questionTime: state.questionTime.get(),
    answerTime: state.answerTime.get(),
    difficulty: state.difficulty.get(),
    autoUpdate: state.autoUpdateEnabled.get(),
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

  // Handle visibility change for auto-update
  document.addEventListener('visibilitychange', () => {
    if (!state.isQuizActive.get() && state.autoUpdateEnabled.get()) {
      if (document.hidden) {
        stopAutoUpdate();
      } else {
        startAutoUpdate();
      }
    }
  });
}

export function initialize(): void {
  elements = getElements();
  initializeSettings();
  setupEffects();
  setupEventListeners();
  updateLastTime();
}

// Export for testing
export { state, elements };
