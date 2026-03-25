import { DifficultyLevel, DifficultyRange, Problem, Settings } from './types';

// ES2025: Use Map for O(1) lookup instead of switch statements
const DIFFICULTY_RANGES = new Map<DifficultyLevel, DifficultyRange>([
  [1, { min: 2, max: 5 }],   // Easy
  [2, { min: 4, max: 8 }],   // Medium
  [3, { min: 6, max: 12 }],  // Hard
  [4, { min: 10, max: 20 }], // Expert
]);

const DIFFICULTY_NAMES = new Map<DifficultyLevel, string>([
  [1, 'Easy'],
  [2, 'Medium'],
  [3, 'Hard'],
  [4, 'Expert'],
]);

const DEFAULT_RANGE: DifficultyRange = { min: 6, max: 12 };

export function getDifficultyRange(level: DifficultyLevel): DifficultyRange {
  return DIFFICULTY_RANGES.get(level) ?? DEFAULT_RANGE;
}

export function getDifficultyName(level: DifficultyLevel): string {
  return DIFFICULTY_NAMES.get(level) ?? 'Hard';
}

export function randomInRange(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function generateProblem(difficulty: DifficultyLevel): Problem {
  const { min, max } = getDifficultyRange(difficulty);

  return {
    a: randomInRange(min, max),
    b: randomInRange(min, max),
  };
}

export function generateSeed(difficulty: DifficultyLevel): number {
  const { min, max } = getDifficultyRange(difficulty);
  return randomInRange(min, max);
}

const SETTINGS_KEY = 'mathQuizSettings';
const THEME_KEY = 'theme';

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
