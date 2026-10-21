import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  getDifficultyName,
  loadSettings,
  saveSettings,
  loadProgress,
  saveProgress,
  loadTheme,
  saveTheme,
  debounce,
} from '../utils';
import { applyGrade, createStore, SRS_VERSION } from '../srs';

const localStorageMock = (() => {
  const store = new Map<string, string>();

  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('getDifficultyName', () => {
  it('should return correct names for each difficulty level', () => {
    expect(getDifficultyName(1)).toBe('Easy');
    expect(getDifficultyName(2)).toBe('Medium');
    expect(getDifficultyName(3)).toBe('Hard');
    expect(getDifficultyName(4)).toBe('Expert');
  });
});

describe('Settings persistence', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it('should save and load settings', () => {
    const settings = {
      questionTime: 10,
      answerTime: 5,
      difficulty: 2 as const,
    };

    saveSettings(settings);
    const loaded = loadSettings();
    expect(loaded).toEqual(settings);
  });

  it('should return null for missing settings', () => {
    expect(loadSettings()).toBeNull();
  });

  it('should handle corrupted localStorage data', () => {
    localStorageMock.setItem('mathQuizSettings', 'invalid json');
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    expect(loadSettings()).toBeNull();
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });
});

describe('Progress (spaced-repetition) persistence', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it('should round-trip a store', () => {
    const store = applyGrade(createStore(), '7x8', 'correct', 1_000);
    saveProgress(store);
    expect(loadProgress()).toEqual(store);
  });

  it('should return null when nothing is saved', () => {
    expect(loadProgress()).toBeNull();
  });

  it('should discard corrupted data and clear it', () => {
    localStorageMock.setItem('mathQuizProgress', '{not valid json');
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    expect(loadProgress()).toBeNull();
    expect(consoleSpy).toHaveBeenCalled();
    expect(localStorageMock.getItem('mathQuizProgress')).toBeNull();

    consoleSpy.mockRestore();
  });

  it('should reject a store written by an incompatible version', () => {
    const stale = JSON.stringify({ version: SRS_VERSION + 1, records: {} });
    localStorageMock.setItem('mathQuizProgress', stale);

    expect(loadProgress()).toBeNull();
    expect(localStorageMock.getItem('mathQuizProgress')).toBeNull();
  });

  it('should reject structurally invalid data (missing records)', () => {
    localStorageMock.setItem('mathQuizProgress', JSON.stringify({ version: SRS_VERSION }));
    expect(loadProgress()).toBeNull();
  });
});

describe('Theme persistence', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it('should save and load theme', () => {
    saveTheme('light');
    expect(loadTheme()).toBe('light');

    saveTheme('dark');
    expect(loadTheme()).toBe('dark');
  });

  it('should default to dark theme', () => {
    expect(loadTheme()).toBe('dark');
  });
});

describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should debounce function calls', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced();
    debounced();
    debounced();

    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should pass arguments to debounced function', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced('arg1', 'arg2');
    vi.advanceTimersByTime(100);

    expect(fn).toHaveBeenCalledWith('arg1', 'arg2');
  });

  it('should cancel previous timeout on new call', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced();
    vi.advanceTimersByTime(50);
    debounced();
    vi.advanceTimersByTime(50);

    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(50);

    expect(fn).toHaveBeenCalledTimes(1);
  });
});
