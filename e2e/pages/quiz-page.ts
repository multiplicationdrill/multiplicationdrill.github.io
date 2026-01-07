/**
 * QuizPage - Page Object Model for the Multiplication Drill application
 * 
 * FIXES APPLIED:
 * 1. Changed slider locators to use ID selectors (getByLabel doesn't work reliably
 *    when there's both a <label> and aria-label with different text)
 * 2. Changed slider interaction from fill() to proper range input handling
 * 3. Fixed theme toggle button locator (emoji matching is unreliable)
 */

import { type Page, type Locator, expect } from '@playwright/test';

type DifficultyLevel = 1 | 2 | 3 | 4;

interface DifficultyConfig {
  name: string;
  min: number;
  max: number;
}

const DIFFICULTY_MAP: Record<DifficultyLevel, DifficultyConfig> = {
  1: { name: 'Easy', min: 2, max: 5 },
  2: { name: 'Medium', min: 4, max: 8 },
  3: { name: 'Hard', min: 6, max: 12 },
  4: { name: 'Expert', min: 10, max: 20 },
};

export class QuizPage {
  readonly page: Page;

  // Display elements
  readonly display: Locator;
  readonly progressBar: Locator;
  readonly timerDisplay: Locator;

  // Quiz control buttons
  readonly startQuizButton: Locator;
  readonly stopQuizButton: Locator;

  // Manual mode buttons
  readonly incrementButton: Locator;
  readonly resetButton: Locator;

  // Settings sliders - USE ID LOCATORS instead of getByLabel
  // getByLabel fails when <label> text differs from aria-label
  readonly questionTimeSlider: Locator;
  readonly answerTimeSlider: Locator;
  readonly difficultySlider: Locator;

  // Settings value displays
  readonly questionTimeValue: Locator;
  readonly answerTimeValue: Locator;
  readonly difficultyValue: Locator;

  // Auto-update checkbox
  readonly autoUpdateCheckbox: Locator;

  // Theme toggle
  readonly themeToggle: Locator;

  // Status indicators
  readonly modeStatus: Locator;
  readonly quizStatus: Locator;

  constructor(page: Page) {
    this.page = page;

    // Display elements - ID locators are acceptable fallback
    this.display = page.locator('#display');
    this.progressBar = page.locator('#progressBar');
    this.timerDisplay = page.locator('#timerDisplay');

    // Quiz control buttons - getByRole with name is most resilient
    this.startQuizButton = page.getByRole('button', { name: 'Start Quiz' });
    this.stopQuizButton = page.getByRole('button', { name: 'Stop Quiz' });

    // Manual mode buttons
    this.incrementButton = page.getByRole('button', { name: 'Increment' });
    this.resetButton = page.getByRole('button', { name: 'Reset' });

    // FIX: Use ID locators for sliders instead of getByLabel
    // The HTML has <label for="questionTime">Question Time:</label> AND
    // <input aria-label="Question time in seconds"> which can cause conflicts
    this.questionTimeSlider = page.locator('#questionTime');
    this.answerTimeSlider = page.locator('#answerTime');
    this.difficultySlider = page.locator('#difficulty');

    // Settings value displays
    this.questionTimeValue = page.locator('#questionTimeValue');
    this.answerTimeValue = page.locator('#answerTimeValue');
    this.difficultyValue = page.locator('#difficultyValue');

    // FIX: Use locator with type=checkbox and label association
    this.autoUpdateCheckbox = page.locator('#autoUpdate');

    // FIX: Theme toggle - use class selector since there's no ID in HTML
    // and emoji matching with getByRole is unreliable
    this.themeToggle = page.locator('.theme-toggle');

    // Status indicators
    this.modeStatus = page.locator('#modeStatus');
    this.quizStatus = page.locator('#quizStatus');
  }

  // Navigation
  async goto(): Promise<void> {
    await this.page.goto('/');
    await expect(this.display).toBeVisible();
  }

  // Quiz control methods
  async startQuiz(): Promise<void> {
    await this.startQuizButton.click();
    await expect(this.stopQuizButton).toBeVisible();
  }

  async stopQuiz(): Promise<void> {
    await this.stopQuizButton.click();
    await expect(this.startQuizButton).toBeVisible();
  }

  async isQuizRunning(): Promise<boolean> {
    return this.stopQuizButton.isVisible();
  }

  // Manual mode methods
  async increment(): Promise<void> {
    await this.incrementButton.click();
  }

  async reset(): Promise<void> {
    await this.resetButton.click();
  }

  async setAutoUpdate(enable: boolean): Promise<void> {
    if (enable) {
      await this.autoUpdateCheckbox.check();
    } else {
      await this.autoUpdateCheckbox.uncheck();
    }
  }

  // FIX: Proper slider interaction - fill() doesn't work on range inputs!
  // Use evaluate() to set the value directly and dispatch input event
  async setQuestionTime(seconds: number): Promise<void> {
    await this.questionTimeSlider.evaluate((el: HTMLInputElement, val: number) => {
      el.value = val.toString();
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }, seconds);
    await expect(this.questionTimeValue).toHaveText(`${seconds}s`);
  }

  async setAnswerTime(seconds: number): Promise<void> {
    await this.answerTimeSlider.evaluate((el: HTMLInputElement, val: number) => {
      el.value = val.toString();
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }, seconds);
    await expect(this.answerTimeValue).toHaveText(`${seconds}s`);
  }

  async setDifficulty(level: DifficultyLevel): Promise<void> {
    await this.difficultySlider.evaluate((el: HTMLInputElement, val: number) => {
      el.value = val.toString();
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }, level);
    const expectedName = DIFFICULTY_MAP[level].name;
    await expect(this.difficultyValue).toHaveText(expectedName);
  }

  // Toggle theme
  async toggleTheme(): Promise<void> {
    await this.themeToggle.click();
  }

  // Helper methods
  getDifficultyRange(level: DifficultyLevel): { min: number; max: number } {
    return DIFFICULTY_MAP[level];
  }

  async getMultiplier(): Promise<number | null> {
    const text = await this.display.textContent();
    if (!text) return null;
    // Match pattern like "5 × 10 = 50" and extract the second number (multiplier)
    const match = text.match(/\d+\s*×\s*(\d+)/);
    return match ? parseInt(match[1], 10) : null;
  }

  // Assertion helpers
  async expectDisplayToShow(counter: number, multiplier: number): Promise<void> {
    const expected = `${counter} × ${multiplier} = ${counter * multiplier}`;
    await expect(this.display).toHaveText(expected);
  }

  async expectQuizQuestion(): Promise<void> {
    await expect(this.display).toHaveText(/^\d+\s*×\s*\d+$/);
  }

  async expectQuizAnswer(): Promise<void> {
    await expect(this.display).toHaveText(/^\d+\s*×\s*\d+\s*=\s*\d+$/);
  }

  async expectControlsDisabled(disabled: boolean): Promise<void> {
    if (disabled) {
      await expect(this.incrementButton).toBeDisabled();
      await expect(this.resetButton).toBeDisabled();
      await expect(this.questionTimeSlider).toBeDisabled();
      await expect(this.answerTimeSlider).toBeDisabled();
      await expect(this.difficultySlider).toBeDisabled();
      await expect(this.autoUpdateCheckbox).toBeDisabled();
    } else {
      await expect(this.incrementButton).toBeEnabled();
      await expect(this.resetButton).toBeEnabled();
      await expect(this.questionTimeSlider).toBeEnabled();
      await expect(this.answerTimeSlider).toBeEnabled();
      await expect(this.difficultySlider).toBeEnabled();
      await expect(this.autoUpdateCheckbox).toBeEnabled();
    }
  }

  async expectStatus(mode: 'Manual' | 'Quiz', quizState: 'Stopped' | 'Running'): Promise<void> {
    await expect(this.modeStatus).toHaveText(mode);
    await expect(this.quizStatus).toHaveText(quizState);
  }

  async expectMultiplierInRange(level: DifficultyLevel): Promise<void> {
    const multiplier = await this.getMultiplier();
    const range = this.getDifficultyRange(level);
    
    expect(multiplier).not.toBeNull();
    expect(multiplier).toBeGreaterThanOrEqual(range.min);
    expect(multiplier).toBeLessThanOrEqual(range.max);
  }
}
