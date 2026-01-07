/**
 * QuizPage - Page Object Model for the Multiplication Drill application
 * 
 * This class encapsulates all page interactions following Playwright best practices:
 * 
 * 1. USER-FACING LOCATORS: We use getByRole, getByLabel, getByText instead of
 *    CSS selectors. This makes tests resilient to DOM changes.
 * 
 * 2. READONLY LOCATORS: All locators are defined as readonly properties in the
 *    constructor. This prevents accidental reassignment and makes the API clear.
 * 
 * 3. ACTION METHODS: Each user action is encapsulated in a descriptive method.
 *    This makes tests read like user stories.
 * 
 * 4. NO HARDCODED WAITS: We rely on Playwright's auto-waiting. Methods return
 *    promises that resolve when the action is complete.
 * 
 * @see https://playwright.dev/docs/pom
 * @see https://playwright.dev/docs/best-practices
 */

import { type Page, type Locator, expect } from '@playwright/test';

/**
 * Difficulty level type matching the application's DifficultyLevel
 */
type DifficultyLevel = 1 | 2 | 3 | 4;

/**
 * Difficulty configuration with display names and number ranges
 */
interface DifficultyConfig {
  name: string;
  min: number;
  max: number;
}

/**
 * Map of difficulty levels to their configurations
 */
const DIFFICULTY_MAP: Record<DifficultyLevel, DifficultyConfig> = {
  1: { name: 'Easy', min: 2, max: 5 },
  2: { name: 'Medium', min: 4, max: 8 },
  3: { name: 'Hard', min: 6, max: 12 },
  4: { name: 'Expert', min: 10, max: 20 },
};

export class QuizPage {
  // ============================================================================
  // PAGE REFERENCE
  // ============================================================================
  readonly page: Page;

  // ============================================================================
  // DISPLAY ELEMENTS
  // These are the main output elements that show quiz state
  // ============================================================================
  
  /**
   * Main quiz display showing the multiplication problem/answer
   * We use a custom test ID here because this element doesn't have a natural
   * accessible role. This is an acceptable fallback per Playwright docs.
   */
  readonly display: Locator;
  
  /**
   * Progress bar showing time remaining in current phase
   */
  readonly progressBar: Locator;
  
  /**
   * Timer display showing phase and countdown
   */
  readonly timerDisplay: Locator;

  // ============================================================================
  // QUIZ CONTROL BUTTONS
  // Using getByRole('button') with name is THE MOST RESILIENT locator strategy
  // It's based on the accessibility tree, not the DOM structure
  // ============================================================================
  
  /**
   * Button to start/stop the quiz mode
   * Text changes based on state: "Start Quiz" or "Stop Quiz"
   */
  readonly startQuizButton: Locator;
  readonly stopQuizButton: Locator;

  // ============================================================================
  // MANUAL MODE BUTTONS
  // ============================================================================
  
  /**
   * Button to increment the counter in manual mode
   */
  readonly incrementButton: Locator;
  
  /**
   * Button to reset the counter and generate new multiplier
   */
  readonly resetButton: Locator;

  // ============================================================================
  // SETTINGS SLIDERS
  // Using getByLabel() because these inputs have associated <label> elements
  // This is more resilient than using #id selectors
  // ============================================================================
  
  /**
   * Slider to set question display time (1-30 seconds)
   */
  readonly questionTimeSlider: Locator;
  
  /**
   * Slider to set answer display time (1-30 seconds)
   */
  readonly answerTimeSlider: Locator;
  
  /**
   * Slider to set difficulty level (Easy/Medium/Hard/Expert)
   */
  readonly difficultySlider: Locator;

  // ============================================================================
  // SETTINGS DISPLAY VALUES
  // Using getByText with regex or exact matching for dynamic content
  // ============================================================================
  
  /**
   * Display showing current question time setting
   */
  readonly questionTimeValue: Locator;
  
  /**
   * Display showing current answer time setting
   */
  readonly answerTimeValue: Locator;
  
  /**
   * Display showing current difficulty name
   */
  readonly difficultyValue: Locator;

  // ============================================================================
  // AUTO-UPDATE CHECKBOX
  // ============================================================================
  
  /**
   * Checkbox to enable/disable auto-update mode
   */
  readonly autoUpdateCheckbox: Locator;

  // ============================================================================
  // THEME TOGGLE
  // ============================================================================
  
  /**
   * Button to toggle between dark and light themes
   */
  readonly themeToggle: Locator;

  // ============================================================================
  // STATUS INDICATORS
  // ============================================================================
  
  /**
   * Status showing current mode (Manual/Quiz)
   */
  readonly modeStatus: Locator;
  
  /**
   * Status showing quiz state (Stopped/Running)
   */
  readonly quizStatus: Locator;

  /**
   * Creates a new QuizPage instance
   * 
   * @param page - Playwright Page object from test fixture
   */
  constructor(page: Page) {
    this.page = page;

    // Display elements - using test IDs as fallback since these don't have
    // natural accessible roles. This is acceptable per Playwright docs:
    // "use test ids as a last resort"
    this.display = page.locator('#display');
    this.progressBar = page.locator('#progressBar');
    this.timerDisplay = page.locator('#timerDisplay');

    // Quiz control buttons - using getByRole with accessible name
    // This is THE MOST RESILIENT locator strategy
    this.startQuizButton = page.getByRole('button', { name: 'Start Quiz' });
    this.stopQuizButton = page.getByRole('button', { name: 'Stop Quiz' });

    // Manual mode buttons
    this.incrementButton = page.getByRole('button', { name: 'Increment' });
    this.resetButton = page.getByRole('button', { name: 'Reset' });

    // Settings sliders - using getByLabel since they have associated labels
    // The label text comes from the <label> element in the HTML
    this.questionTimeSlider = page.getByLabel('Question Time:');
    this.answerTimeSlider = page.getByLabel('Answer Time:');
    this.difficultySlider = page.getByLabel('Difficulty:');

    // Settings value displays - these are sibling spans to the sliders
    this.questionTimeValue = page.locator('#questionTimeValue');
    this.answerTimeValue = page.locator('#answerTimeValue');
    this.difficultyValue = page.locator('#difficultyValue');

    // Auto-update checkbox - using getByLabel
    this.autoUpdateCheckbox = page.getByLabel('Auto-update (3s intervals)');

    // Theme toggle - it's a button, so we use getByRole
    // The button contains only an emoji, so we match by the emoji text
    this.themeToggle = page.getByRole('button', { name: '🌓' });

    // Status indicators - these are in a specific structure
    this.modeStatus = page.locator('#modeStatus');
    this.quizStatus = page.locator('#quizStatus');
  }

  // ============================================================================
  // NAVIGATION METHODS
  // ============================================================================

  /**
   * Navigate to the quiz application and wait for it to be fully loaded
   * 
   * WHY we check for display visibility:
   * - Ensures the app has initialized before tests interact with it
   * - Playwright's auto-waiting handles this, but explicit waits make tests clearer
   */
  async goto(): Promise<void> {
    await this.page.goto('/');
    // Wait for app to be fully loaded - this is the main display element
    await expect(this.display).toBeVisible();
  }

  // ============================================================================
  // QUIZ CONTROL METHODS
  // ============================================================================

  /**
   * Start the quiz mode
   * 
   * Uses web-first assertions to wait for the button to be visible
   * before clicking. This prevents flaky tests.
   */
  async startQuiz(): Promise<void> {
    await this.startQuizButton.click();
    // Verify state changed - this acts as both assertion AND wait
    await expect(this.stopQuizButton).toBeVisible();
  }

  /**
   * Stop the quiz mode
   */
  async stopQuiz(): Promise<void> {
    await this.stopQuizButton.click();
    // Verify state changed
    await expect(this.startQuizButton).toBeVisible();
  }

  /**
   * Check if quiz is currently running
   * 
   * WHY we return a boolean instead of using assertions:
   * - Allows tests to make decisions based on state
   * - Web-first assertions should be used in tests, not here
   */
  async isQuizRunning(): Promise<boolean> {
    return this.stopQuizButton.isVisible();
  }

  // ============================================================================
  // MANUAL MODE METHODS
  // ============================================================================

  /**
   * Click the increment button to increase the counter
   */
  async increment(): Promise<void> {
    await this.incrementButton.click();
  }

  /**
   * Click the reset button to reset counter and generate new multiplier
   */
  async reset(): Promise<void> {
    await this.resetButton.click();
  }

  /**
   * Enable or disable auto-update mode
   * 
   * @param enable - true to enable, false to disable
   */
  async setAutoUpdate(enable: boolean): Promise<void> {
    if (enable) {
      await this.autoUpdateCheckbox.check();
    } else {
      await this.autoUpdateCheckbox.uncheck();
    }
  }

  // ============================================================================
  // SETTINGS METHODS
  // ============================================================================

  /**
   * Set the question time duration
   * 
   * WHY we use fill() instead of type():
   * - fill() clears the field first, ensuring a clean state
   * - More reliable for slider inputs
   * 
   * @param seconds - Duration in seconds (1-30)
   */
  async setQuestionTime(seconds: number): Promise<void> {
    await this.questionTimeSlider.fill(seconds.toString());
    // Wait for debounce to complete by checking the displayed value
    await expect(this.questionTimeValue).toHaveText(`${seconds}s`);
  }

  /**
   * Set the answer time duration
   * 
   * @param seconds - Duration in seconds (1-30)
   */
  async setAnswerTime(seconds: number): Promise<void> {
    await this.answerTimeSlider.fill(seconds.toString());
    await expect(this.answerTimeValue).toHaveText(`${seconds}s`);
  }

  /**
   * Set the difficulty level
   * 
   * @param level - Difficulty level (1=Easy, 2=Medium, 3=Hard, 4=Expert)
   */
  async setDifficulty(level: DifficultyLevel): Promise<void> {
    await this.difficultySlider.fill(level.toString());
    // Wait for the difficulty name to update
    await expect(this.difficultyValue).toHaveText(DIFFICULTY_MAP[level].name);
  }

  /**
   * Get the expected number range for a difficulty level
   * 
   * @param level - Difficulty level
   * @returns Object with min and max values
   */
  getDifficultyRange(level: DifficultyLevel): { min: number; max: number } {
    return {
      min: DIFFICULTY_MAP[level].min,
      max: DIFFICULTY_MAP[level].max,
    };
  }

  // ============================================================================
  // THEME METHODS
  // ============================================================================

  /**
   * Toggle the theme between dark and light mode
   */
  async toggleTheme(): Promise<void> {
    await this.themeToggle.click();
  }

  /**
   * Check if light mode is currently active
   */
  async isLightMode(): Promise<boolean> {
    const body = this.page.locator('body');
    const className = await body.getAttribute('class');
    return className?.includes('light-mode') ?? false;
  }

  // ============================================================================
  // DISPLAY PARSING METHODS
  // ============================================================================

  /**
   * Parse the multiplication display text to extract components
   * 
   * Handles both manual mode format: "X × Y = Z"
   * And quiz mode format: "X × Y" (question) or "X × Y = Z" (answer)
   * 
   * @returns Object with parsed values or null if format doesn't match
   */
  async parseDisplay(): Promise<{
    counter: number;
    multiplier: number;
    result?: number;
    isQuestionOnly: boolean;
  } | null> {
    const text = await this.display.textContent();
    if (!text) return null;

    // Try to match "X × Y = Z" format (manual mode or quiz answer)
    const fullMatch = text.match(/(\d+)\s*×\s*(\d+)\s*=\s*(\d+)/);
    if (fullMatch) {
      return {
        counter: parseInt(fullMatch[1], 10),
        multiplier: parseInt(fullMatch[2], 10),
        result: parseInt(fullMatch[3], 10),
        isQuestionOnly: false,
      };
    }

    // Try to match "X × Y" format (quiz question)
    const questionMatch = text.match(/(\d+)\s*×\s*(\d+)/);
    if (questionMatch) {
      return {
        counter: parseInt(questionMatch[1], 10),
        multiplier: parseInt(questionMatch[2], 10),
        isQuestionOnly: true,
      };
    }

    return null;
  }

  /**
   * Get the current multiplier from the display
   * 
   * @returns The multiplier value or null if not parseable
   */
  async getMultiplier(): Promise<number | null> {
    const parsed = await this.parseDisplay();
    return parsed?.multiplier ?? null;
  }

  // ============================================================================
  // ASSERTION HELPER METHODS
  // ============================================================================

  /**
   * Assert that the display shows a valid multiplication equation
   * 
   * @param counter - Expected counter value
   * @param multiplier - Expected multiplier value
   */
  async expectDisplayToShow(counter: number, multiplier: number): Promise<void> {
    const expected = `${counter} × ${multiplier} = ${counter * multiplier}`;
    await expect(this.display).toHaveText(expected);
  }

  /**
   * Assert that the display shows a quiz question (without answer)
   */
  async expectQuizQuestion(): Promise<void> {
    // Quiz questions show "X × Y" without the "= Z" part
    await expect(this.display).toHaveText(/^\d+\s*×\s*\d+$/);
  }

  /**
   * Assert that the display shows a quiz answer
   */
  async expectQuizAnswer(): Promise<void> {
    // Quiz answers show "X × Y = Z"
    await expect(this.display).toHaveText(/^\d+\s*×\s*\d+\s*=\s*\d+$/);
  }

  /**
   * Assert that controls are in the expected enabled/disabled state
   * 
   * @param disabled - true if controls should be disabled (quiz running)
   */
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

  /**
   * Assert the status panel shows expected values
   * 
   * @param mode - Expected mode (Manual or Quiz)
   * @param quizState - Expected quiz state (Stopped or Running)
   */
  async expectStatus(mode: 'Manual' | 'Quiz', quizState: 'Stopped' | 'Running'): Promise<void> {
    await expect(this.modeStatus).toHaveText(mode);
    await expect(this.quizStatus).toHaveText(quizState);
  }

  /**
   * Assert that the multiplier is within the expected difficulty range
   * 
   * @param level - Difficulty level to check against
   */
  async expectMultiplierInRange(level: DifficultyLevel): Promise<void> {
    const multiplier = await this.getMultiplier();
    const range = this.getDifficultyRange(level);
    
    expect(multiplier).not.toBeNull();
    expect(multiplier).toBeGreaterThanOrEqual(range.min);
    expect(multiplier).toBeLessThanOrEqual(range.max);
  }
}
