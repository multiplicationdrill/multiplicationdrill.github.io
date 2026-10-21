import { isSrsStore } from './srs';
import type { DifficultyLevel, DifficultyName, Settings, SrsStore, Theme } from './types';

const DIFFICULTY_NAMES: Readonly<Record<DifficultyLevel, DifficultyName>> = {
  1: 'Easy',
  2: 'Medium',
  3: 'Hard',
  4: 'Expert',
};

export const MIN_SECONDS = 1;
export const MAX_SECONDS = 30;

const SETTINGS_KEY = 'mathQuizSettings';
const THEME_KEY = 'theme';
const PROGRESS_KEY = 'mathQuizProgress';

export function getDifficultyName(level: DifficultyLevel): DifficultyName {
  return DIFFICULTY_NAMES[level];
}

export function isDifficultyLevel(value: unknown): value is DifficultyLevel {
  return typeof value === 'number' && Object.hasOwn(DIFFICULTY_NAMES, value);
}

export function isSeconds(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= MIN_SECONDS && value <= MAX_SECONDS;
}

function parseSettings(value: unknown): Settings | null {
  if (typeof value !== 'object' || value === null) return null;
  const { questionTime, answerTime, difficulty } = value as Record<string, unknown>;
  if (!isSeconds(questionTime) || !isSeconds(answerTime) || !isDifficultyLevel(difficulty)) return null;
  return { questionTime, answerTime, difficulty };
}

function removeItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    return;
  }
}

function writeItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    console.warn(`Failed to save ${key}:`, error);
  }
}

function readJson<T>(key: string, parse: (value: unknown) => T | null): T | null {
  try {
    const saved = localStorage.getItem(key);
    if (saved === null) return null;
    const parsed = parse(JSON.parse(saved));
    if (parsed === null) removeItem(key);
    return parsed;
  } catch (error) {
    console.error(`Failed to load ${key} - resetting`, error);
    removeItem(key);
    return null;
  }
}

export function loadSettings(): Settings | null {
  return readJson(SETTINGS_KEY, parseSettings);
}

export function saveSettings(settings: Settings): void {
  writeItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function loadProgress(): SrsStore | null {
  return readJson(PROGRESS_KEY, (value) => (isSrsStore(value) ? value : null));
}

export function saveProgress(store: SrsStore): void {
  writeItem(PROGRESS_KEY, JSON.stringify(store));
}

export function loadTheme(): Theme {
  try {
    return localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

export function saveTheme(theme: Theme): void {
  writeItem(THEME_KEY, theme);
}

export function debounce<A extends unknown[]>(fn: (...args: A) => void, wait: number): (...args: A) => void {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  return (...args: A) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      fn(...args);
    }, wait);
  };
}
