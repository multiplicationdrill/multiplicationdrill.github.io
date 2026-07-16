import { DifficultyLevel, Settings, SrsStore } from './types';
import { isSrsStore } from './srs';

// ES2025: Use Map for O(1) lookup instead of switch statements
const DIFFICULTY_NAMES = new Map<DifficultyLevel, string>([
  [1, 'Easy'],
  [2, 'Medium'],
  [3, 'Hard'],
  [4, 'Expert'],
]);

export function getDifficultyName(level: DifficultyLevel): string {
  return DIFFICULTY_NAMES.get(level) ?? 'Hard';
}

export function randomInRange(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const SETTINGS_KEY = 'mathQuizSettings';
const THEME_KEY = 'theme';
const PROGRESS_KEY = 'mathQuizProgress';

export function loadSettings(): Settings | null {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (saved) {
      return JSON.parse(saved) as Settings;
    }
  } catch (e) {
    console.error('Failed to load settings - resetting to defaults', e);
    try {
      localStorage.removeItem(SETTINGS_KEY);
    } catch {
      // Ignore if we can't remove
    }
  }
  return null;
}

export function saveSettings(settings: Settings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    // Silently fail if localStorage is disabled (e.g., private mode)
    console.warn('Failed to save settings:', e);
  }
}

/**
 * Load the spaced-repetition store. Returns null when there is nothing saved,
 * the data is corrupt, or it was written by an incompatible version — in the
 * last two cases the stale entry is cleared so a fresh store can take over.
 */
export function loadProgress(): SrsStore | null {
  try {
    const saved = localStorage.getItem(PROGRESS_KEY);
    if (!saved) return null;

    const parsed: unknown = JSON.parse(saved);
    if (isSrsStore(parsed)) return parsed;

    // Unrecognised or outdated shape — discard it.
    localStorage.removeItem(PROGRESS_KEY);
    return null;
  } catch (e) {
    console.error('Failed to load progress - resetting', e);
    try {
      localStorage.removeItem(PROGRESS_KEY);
    } catch {
      // Ignore if we can't remove
    }
    return null;
  }
}

export function saveProgress(store: SrsStore): void {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(store));
  } catch (e) {
    // Silently fail if localStorage is disabled (e.g., private mode)
    console.warn('Failed to save progress:', e);
  }
}

export function loadTheme(): 'light' | 'dark' {
  try {
    return localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

export function saveTheme(theme: 'light' | 'dark'): void {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Silently fail if localStorage is disabled
  }
}

// Debounce utility
export function debounce<T extends (...args: unknown[]) => void>(
  func: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}
