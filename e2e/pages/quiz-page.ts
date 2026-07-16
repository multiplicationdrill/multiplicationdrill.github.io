/**
 * QuizPage - Page Object Model for the Multiplication Drill application
 *
 * NOTES:
 * - Sliders use ID locators: getByLabel is unreliable when a <label> and an
 *   aria-label carry different text.
 * - Range inputs cannot be driven with fill(); we set value + dispatch 'input'.
 * - Grade buttons expose aria-labels, so getByRole is the resilient locator.
 * - The theme toggle has no id and emoji matching via getByRole is flaky, so a
 *   class selector is used.
 */

import { type Page, type Locator, expect } from '@playwright/test';

type DifficultyLevel = 1 | 2 | 3 | 4;

const DIFFICULTY_NAMES: Record<DifficultyLevel, string> = {
  1: 'Easy',
  2: 'Medium',
  3: 'Hard',
  4: 'Expert',
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

  // Self-grading
  readonly gradeButtons: Locator;
  readonly gradeCorrectButton: Locator;
  readonly gradeIncorrectButton: Locator;

  // Settings sliders - USE ID LOCATORS instead of getByLabel
  readonly questionTimeSlider: Locator;
  readonly answerTimeSlider: Locator;
  readonly difficultySlider: Locator;

  // Settings value displays
  readonly questionTimeValue: Locator;
  readonly answerTimeValue: Locator;
  readonly difficultyValue: Locator;

  // Theme toggle
  readonly themeToggle: Locator;

  // Status indicators
  readonly quizStatus: Locator;
  readonly correctCount: Locator;
  readonly incorrectCount: Locator;

  constructor(page: Page) {
    this.page = page;

    this.display = page.locator('#display');
    this.progressBar = page.locator('#progressBar');
    this.timerDisplay = page.locator('#timerDisplay');

    // getByRole with name is most resilient for buttons
    this.startQuizButton = page.getByRole('button', { name: 'Start Quiz' });
    this.stopQuizButton = page.getByRole('button', { name: 'Stop Quiz' });

    // Grade buttons: the container drives visibility; the buttons expose
    // aria-labels for role-based interaction.
    this.gradeButtons = page.locator('#gradeButtons');
    this.gradeCorrectButton = page.getByRole('button', { name: 'I answered correctly' });
    this.gradeIncorrectButton = page.getByRole('button', { name: 'I answered incorrectly' });

    // ID locators for sliders (see notes above)
    this.questionTimeSlider = page.locator('#questionTime');
    this.answerTimeSlider = page.locator('#answerTime');
    this.difficultySlider = page.locator('#difficulty');

    this.questionTimeValue = page.locator('#questionTimeValue');
    this.answerTimeValue = page.locator('#answerTimeValue');
    this.difficultyValue = page.locator('#difficultyValue');

    this.themeToggle = page.locator('.theme-toggle');

    this.quizStatus = page.locator('#quizStatus');
    this.correctCount = page.locator('#correctCount');
    this.incorrectCount = page.locator('#incorrectCount');
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

  // Self-grading methods. Playwright auto-waits for the button to be
  // actionable (visible + enabled), i.e. the answer phase.
  async waitForAnswerPhase(): Promise<void> {
    await expect(this.gradeCorrectButton).toBeEnabled({ timeout: 10000 });
  }

  async gradeCorrect(): Promise<void> {
    await this.gradeCorrectButton.click();
  }

  async gradeIncorrect(): Promise<void> {
    await this.gradeIncorrectButton.click();
  }

  // Range-input interaction: set value directly and dispatch an input event
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
    await expect(this.difficultyValue).toHaveText(DIFFICULTY_NAMES[level]);
  }

  // Toggle theme
  async toggleTheme(): Promise<void> {
    await this.themeToggle.click();
  }

  // Assertion helpers
  async expectQuizQuestion(): Promise<void> {
    await expect(this.display).toHaveText(/^\d+\s*×\s*\d+$/);
  }

  async expectQuizAnswer(): Promise<void> {
    await expect(this.display).toHaveText(/^\d+\s*×\s*\d+\s*=\s*\d+$/);
  }

  async expectControlsDisabled(disabled: boolean): Promise<void> {
    if (disabled) {
      await expect(this.questionTimeSlider).toBeDisabled();
      await expect(this.answerTimeSlider).toBeDisabled();
      await expect(this.difficultySlider).toBeDisabled();
    } else {
      await expect(this.questionTimeSlider).toBeEnabled();
      await expect(this.answerTimeSlider).toBeEnabled();
      await expect(this.difficultySlider).toBeEnabled();
    }
  }

  async expectGradeButtonsEnabled(enabled: boolean): Promise<void> {
    if (enabled) {
      await expect(this.gradeCorrectButton).toBeEnabled();
      await expect(this.gradeIncorrectButton).toBeEnabled();
    } else {
      await expect(this.gradeCorrectButton).toBeDisabled();
      await expect(this.gradeIncorrectButton).toBeDisabled();
    }
  }

  async expectQuizStatus(quizState: 'Stopped' | 'Running'): Promise<void> {
    await expect(this.quizStatus).toHaveText(quizState);
  }
}
