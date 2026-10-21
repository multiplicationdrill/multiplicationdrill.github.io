import { expect, type Locator, type Page } from '@playwright/test';

export type DifficultyLevel = 1 | 2 | 3 | 4;

const DIFFICULTY_NAMES: Readonly<Record<DifficultyLevel, string>> = {
  1: 'Easy',
  2: 'Medium',
  3: 'Hard',
  4: 'Expert',
};

const TIMES = '\u00d7';

export class QuizPage {
  readonly page: Page;
  readonly root: Locator;
  readonly display: Locator;
  readonly timerDisplay: Locator;
  readonly startQuizButton: Locator;
  readonly stopQuizButton: Locator;
  readonly gradeButtons: Locator;
  readonly gradeCorrectButton: Locator;
  readonly gradeIncorrectButton: Locator;
  readonly questionTimeSlider: Locator;
  readonly answerTimeSlider: Locator;
  readonly difficultySlider: Locator;
  readonly questionTimeValue: Locator;
  readonly answerTimeValue: Locator;
  readonly difficultyValue: Locator;
  readonly themeToggle: Locator;
  readonly quizStatus: Locator;
  readonly correctCount: Locator;
  readonly incorrectCount: Locator;

  constructor(page: Page) {
    this.page = page;
    this.root = page.locator('html');
    this.display = page.getByTestId('display');
    this.timerDisplay = page.getByTestId('timer');
    this.startQuizButton = page.getByRole('button', { name: 'Start Quiz', exact: true });
    this.stopQuizButton = page.getByRole('button', { name: 'Stop Quiz', exact: true });
    this.gradeButtons = page.getByTestId('grade-buttons');
    this.gradeCorrectButton = page.getByRole('button', { name: 'I answered correctly', exact: true });
    this.gradeIncorrectButton = page.getByRole('button', { name: 'I answered incorrectly', exact: true });
    this.questionTimeSlider = page.getByRole('slider', { name: 'Question Time', exact: true });
    this.answerTimeSlider = page.getByRole('slider', { name: 'Answer Time', exact: true });
    this.difficultySlider = page.getByRole('slider', { name: 'Difficulty', exact: true });
    this.questionTimeValue = page.getByTestId('question-time-value');
    this.answerTimeValue = page.getByTestId('answer-time-value');
    this.difficultyValue = page.getByTestId('difficulty-value');
    this.themeToggle = page.getByRole('button', { name: 'Light mode', exact: true });
    this.quizStatus = page.getByTestId('quiz-status');
    this.correctCount = page.getByTestId('correct-count');
    this.incorrectCount = page.getByTestId('incorrect-count');
  }

  async goto(): Promise<void> {
    await this.page.goto('/');
    await expect(this.display).toBeVisible();
  }

  async startQuiz(): Promise<void> {
    await this.startQuizButton.click();
    await expect(this.stopQuizButton).toBeVisible();
  }

  async stopQuiz(): Promise<void> {
    await this.stopQuizButton.click();
    await expect(this.startQuizButton).toBeVisible();
  }

  async waitForAnswerPhase(): Promise<void> {
    await expect(this.gradeCorrectButton).toBeEnabled({ timeout: 10_000 });
  }

  async gradeCorrect(): Promise<void> {
    await this.gradeCorrectButton.click();
  }

  async gradeIncorrect(): Promise<void> {
    await this.gradeIncorrectButton.click();
  }

  async setQuestionTime(seconds: number): Promise<void> {
    await setRange(this.questionTimeSlider, seconds);
    await expect(this.questionTimeValue).toHaveText(`${seconds.toString()}s`);
  }

  async setAnswerTime(seconds: number): Promise<void> {
    await setRange(this.answerTimeSlider, seconds);
    await expect(this.answerTimeValue).toHaveText(`${seconds.toString()}s`);
  }

  async setDifficulty(level: DifficultyLevel): Promise<void> {
    await setRange(this.difficultySlider, level);
    await expect(this.difficultyValue).toHaveText(DIFFICULTY_NAMES[level]);
  }

  async toggleTheme(): Promise<void> {
    await this.themeToggle.click();
  }

  async expectTheme(theme: 'light' | 'dark'): Promise<void> {
    await expect(this.root).toHaveAttribute('data-theme', theme);
    await expect(this.themeToggle).toHaveAttribute('aria-pressed', String(theme === 'light'));
  }

  async expectQuizQuestion(): Promise<void> {
    await expect(this.display).toHaveText(new RegExp(`^\\d+ ${TIMES} \\d+$`));
  }

  async expectQuizAnswer(options?: { readonly timeout: number }): Promise<void> {
    await expect(this.display).toHaveText(new RegExp(`^\\d+ ${TIMES} \\d+ = \\d+$`), options);
  }

  async expectControlsDisabled(disabled: boolean): Promise<void> {
    for (const slider of [this.questionTimeSlider, this.answerTimeSlider, this.difficultySlider]) {
      await expect(slider).toBeEnabled({ enabled: !disabled });
    }
  }

  async expectGradeButtonsEnabled(enabled: boolean): Promise<void> {
    for (const button of [this.gradeCorrectButton, this.gradeIncorrectButton]) {
      await expect(button).toBeEnabled({ enabled });
    }
  }

  async expectQuizStatus(quizState: 'Stopped' | 'Running'): Promise<void> {
    await expect(this.quizStatus).toHaveText(quizState);
  }
}

async function setRange(slider: Locator, value: number): Promise<void> {
  await slider.evaluate((element: HTMLInputElement, next: number) => {
    element.valueAsNumber = next;
    element.dispatchEvent(new Event('input', { bubbles: true }));
  }, value);
}
