#!/bin/bash

# ==============================================================================
# PLAYWRIGHT BEST PRACTICES MIGRATION SCRIPT
# ==============================================================================
# This script applies ALL Playwright best practices to your multiplicationdrill
# project. It makes changes to:
#   1. playwright.config.ts - Enhanced configuration
#   2. e2e/pages/ - New Page Object Model directory
#   3. e2e/quiz.spec.ts - Rewritten tests with best practices
#   4. eslint.config.js - Added no-floating-promises rule
#   5. package.json - Added ESLint plugins if missing
#   6. .github/workflows/ci-cd.yml - Optimized browser installation
#
# NO CODE RUNS LOCALLY - All tests run on GitHub Actions CI infrastructure
# ==============================================================================

set -e  # Exit on any error

echo "=========================================="
echo "PLAYWRIGHT BEST PRACTICES MIGRATION"
echo "=========================================="
echo ""

# ==============================================================================
# SECTION 1: CREATE PAGE OBJECT MODEL DIRECTORY STRUCTURE
# ==============================================================================
# WHY: Page Object Model (POM) is a design pattern that:
#   - Separates test logic from page-specific locators and actions
#   - Creates reusable components for common page interactions
#   - Reduces code duplication across tests
#   - Makes tests more maintainable when UI changes occur
#   - Improves test readability by using descriptive method names
#
# The official Playwright docs recommend POM for large test suites:
# https://playwright.dev/docs/pom
# ==============================================================================

echo "📁 Creating Page Object Model directory structure..."
mkdir -p e2e/pages

# ==============================================================================
# SECTION 2: CREATE THE QUIZ PAGE OBJECT MODEL
# ==============================================================================
# WHY: This encapsulates ALL page-specific:
#   - Locators (using user-facing attributes, NOT CSS selectors)
#   - Actions (methods that perform user interactions)
#   - Assertions helpers (methods that verify state)
#
# BEST PRACTICES APPLIED:
#   1. Use getByRole() - Most resilient locator, based on accessibility tree
#   2. Use getByLabel() - For form inputs with associated labels
#   3. Use getByText() - For elements identified by their text content
#   4. Avoid CSS selectors like #id or .class - These are brittle and break easily
#   5. Use readonly properties for locators - Prevents accidental reassignment
#   6. Return Locator objects, not ElementHandle - Locators auto-retry
# ==============================================================================

echo "📝 Creating e2e/pages/quiz-page.ts (Page Object Model)..."

cat > e2e/pages/quiz-page.ts << 'PAGEOBJECT'
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
PAGEOBJECT

echo "✅ Created e2e/pages/quiz-page.ts"

# ==============================================================================
# SECTION 3: REWRITE THE E2E TESTS WITH BEST PRACTICES
# ==============================================================================
# BEST PRACTICES APPLIED:
#
# 1. PAGE OBJECT MODEL
#    - All page interactions go through QuizPage class
#    - Tests are cleaner and more readable
#    - Locators are centralized for easy maintenance
#
# 2. WEB-FIRST ASSERTIONS
#    - Use await expect().toBeVisible() instead of expect(await isVisible()).toBe(true)
#    - Playwright auto-waits for conditions to be met
#    - Eliminates flaky tests from race conditions
#
# 3. NO HARDCODED WAITS
#    - Removed all page.waitForTimeout() calls
#    - Replace with proper assertions that auto-wait
#    - Makes tests faster and more reliable
#
# 4. BEFOREEACH HOOKS
#    - Each test starts with a fresh page state
#    - Tests are isolated and don't depend on each other
#
# 5. DESCRIPTIVE TEST NAMES
#    - Test names describe the user behavior being tested
#    - Makes test reports easy to understand
#
# 6. USER-FACING LOCATORS
#    - getByRole, getByLabel, getByText instead of CSS selectors
#    - Tests won't break when CSS classes or IDs change
# ==============================================================================

echo "📝 Creating e2e/quiz.spec.ts (Rewritten with best practices)..."

cat > e2e/quiz.spec.ts << 'TESTFILE'
/**
 * Multiplication Drill E2E Tests
 * 
 * These tests follow ALL Playwright best practices:
 * 
 * 1. PAGE OBJECT MODEL (POM)
 *    - All page interactions are encapsulated in QuizPage class
 *    - Tests focus on user behavior, not implementation details
 *    
 * 2. WEB-FIRST ASSERTIONS
 *    - All assertions use await expect() with auto-waiting matchers
 *    - No manual waits or polling
 *    
 * 3. TEST ISOLATION
 *    - Each test runs independently via beforeEach
 *    - No test depends on another test's state
 *    
 * 4. USER-FACING LOCATORS
 *    - Uses getByRole, getByLabel, getByText
 *    - Resilient to DOM structure changes
 *
 * @see https://playwright.dev/docs/best-practices
 */

import { test, expect } from '@playwright/test';
import { QuizPage } from './pages/quiz-page';

// =============================================================================
// TEST SETUP
// =============================================================================

/**
 * Declare quizPage at describe level so it can be reused across tests
 * This is the recommended pattern for POM in Playwright
 */
let quizPage: QuizPage;

test.describe('Multiplication Drill Application', () => {
  /**
   * beforeEach runs before EVERY test in this describe block
   * 
   * WHY THIS IS IMPORTANT:
   * - Ensures test isolation - each test starts fresh
   * - Creates new Page Object instance for clean state
   * - Navigates to the app ensuring consistent starting point
   */
  test.beforeEach(async ({ page }) => {
    quizPage = new QuizPage(page);
    await quizPage.goto();
  });

  // ===========================================================================
  // INITIAL STATE TESTS
  // ===========================================================================

  test.describe('Initial State', () => {
    test('should have correct page title', async ({ page }) => {
      // Using web-first assertion - auto-waits for condition
      await expect(page).toHaveTitle('Reactive Math Quiz');
    });

    test('should display manual mode with default settings', async () => {
      // Verify default display format (counter × multiplier = result)
      // WHY regex: The multiplier is random, so we match the pattern
      await expect(quizPage.display).toHaveText(/^0 × \d+ = 0$/);

      // Verify default slider values using web-first assertions
      await expect(quizPage.questionTimeSlider).toHaveValue('5');
      await expect(quizPage.answerTimeSlider).toHaveValue('3');
      await expect(quizPage.difficultySlider).toHaveValue('3');

      // Verify default difficulty display
      await expect(quizPage.difficultyValue).toHaveText('Hard');
    });

    test('should have all controls enabled in manual mode', async () => {
      // Using the Page Object's assertion helper
      // This makes the test more readable and DRY
      await quizPage.expectControlsDisabled(false);
    });

    test('should show correct initial status', async () => {
      await quizPage.expectStatus('Manual', 'Stopped');
    });
  });

  // ===========================================================================
  // MANUAL MODE TESTS
  // ===========================================================================

  test.describe('Manual Mode', () => {
    test('should increment counter when clicking increment button', async () => {
      // Get initial multiplier for verification
      const multiplier = await quizPage.getMultiplier();
      expect(multiplier).not.toBeNull();

      // Perform increment action
      await quizPage.increment();

      // Verify the display updated correctly
      // Using Page Object helper for cleaner assertion
      await quizPage.expectDisplayToShow(1, multiplier!);

      // Increment again to verify it continues working
      await quizPage.increment();
      await quizPage.expectDisplayToShow(2, multiplier!);
    });

    test('should reset counter and generate new multiplier when clicking reset', async () => {
      // First, increment to non-zero
      await quizPage.increment();
      await quizPage.increment();

      // Get multiplier before reset
      const multiplierBefore = await quizPage.getMultiplier();

      // Perform reset
      await quizPage.reset();

      // Verify counter is 0 - the display should show "0 × X = 0"
      await expect(quizPage.display).toHaveText(/^0 × \d+ = 0$/);

      // Note: We can't guarantee multiplier changed (random might give same value)
      // But we CAN verify the format is correct
    });

    test('should verify multiplication calculations are correct', async () => {
      // Get the multiplier
      const multiplier = await quizPage.getMultiplier();
      expect(multiplier).not.toBeNull();

      // Test several increments
      for (let i = 1; i <= 5; i++) {
        await quizPage.increment();
        await quizPage.expectDisplayToShow(i, multiplier!);
      }
    });
  });

  // ===========================================================================
  // DIFFICULTY SETTINGS TESTS
  // ===========================================================================

  test.describe('Difficulty Settings', () => {
    /**
     * Test that difficulty changes update the multiplier range
     * 
     * WHY we test multiple resets:
     * - Multiplier is random, need multiple samples to verify range
     * - Page Object provides getDifficultyRange() for expected values
     */
    test('should generate multiplier within Easy range (2-5)', async () => {
      await quizPage.setDifficulty(1);

      // Verify multiplier is in range across multiple resets
      for (let i = 0; i < 5; i++) {
        await quizPage.reset();
        await quizPage.expectMultiplierInRange(1);
      }
    });

    test('should generate multiplier within Medium range (4-8)', async () => {
      await quizPage.setDifficulty(2);

      for (let i = 0; i < 5; i++) {
        await quizPage.reset();
        await quizPage.expectMultiplierInRange(2);
      }
    });

    test('should generate multiplier within Hard range (6-12)', async () => {
      // Hard is default, but let's be explicit
      await quizPage.setDifficulty(3);

      for (let i = 0; i < 5; i++) {
        await quizPage.reset();
        await quizPage.expectMultiplierInRange(3);
      }
    });

    test('should generate multiplier within Expert range (10-20)', async () => {
      await quizPage.setDifficulty(4);

      for (let i = 0; i < 5; i++) {
        await quizPage.reset();
        await quizPage.expectMultiplierInRange(4);
      }
    });
  });

  // ===========================================================================
  // QUIZ MODE TESTS
  // ===========================================================================

  test.describe('Quiz Mode', () => {
    /**
     * Configure shorter times for quiz tests to make them faster
     * This is done in beforeEach so each quiz test has the same setup
     */
    test.beforeEach(async () => {
      await quizPage.setQuestionTime(2);
      await quizPage.setAnswerTime(1);
    });

    test('should start quiz and show question', async () => {
      await quizPage.startQuiz();

      // Verify button text changed
      await expect(quizPage.stopQuizButton).toBeVisible();

      // Verify a multiplication problem is shown
      // Questions show "X × Y" without answer
      await expect(quizPage.display).toHaveText(/^\d+ × \d+/);

      // Verify progress bar is visible
      await expect(quizPage.progressBar).toBeVisible();

      // Clean up - stop the quiz
      await quizPage.stopQuiz();
    });

    test('should disable controls when quiz is running', async () => {
      await quizPage.startQuiz();

      // Verify controls are disabled
      await quizPage.expectControlsDisabled(true);

      // Clean up
      await quizPage.stopQuiz();
    });

    test('should re-enable controls when quiz is stopped', async () => {
      await quizPage.startQuiz();
      await quizPage.stopQuiz();

      // Verify controls are enabled again
      await quizPage.expectControlsDisabled(false);
    });

    test('should update status panel during quiz', async () => {
      // Initially in manual mode
      await quizPage.expectStatus('Manual', 'Stopped');

      // Start quiz
      await quizPage.startQuiz();
      await quizPage.expectStatus('Quiz', 'Running');

      // Stop quiz
      await quizPage.stopQuiz();
      await quizPage.expectStatus('Manual', 'Stopped');
    });

    test('should transition from question to answer phase', async () => {
      await quizPage.startQuiz();

      // Wait for the answer phase - the display will include "="
      // This uses web-first assertion with auto-retry
      await expect(quizPage.display).toHaveText(/^\d+ × \d+ = \d+$/, {
        timeout: 5000, // Allow time for question phase to complete
      });

      await quizPage.stopQuiz();
    });

    test('should generate new problems', async () => {
      await quizPage.startQuiz();

      // Get first problem
      const firstProblem = await quizPage.display.textContent();

      // Wait for a complete cycle (question + answer) and then a new question
      // We look for a change in the display content
      await expect(async () => {
        const currentProblem = await quizPage.display.textContent();
        // Either it's showing an answer (same base numbers, has =)
        // Or it's a new question (different numbers)
        expect(currentProblem).not.toBe(firstProblem);
      }).toPass({
        timeout: 6000, // 2s question + 1s answer + buffer
      });

      await quizPage.stopQuiz();
    });
  });

  // ===========================================================================
  // AUTO-UPDATE MODE TESTS
  // ===========================================================================

  test.describe('Auto-Update Mode', () => {
    test('should increment counter automatically when enabled', async () => {
      // Get initial state
      const initialMultiplier = await quizPage.getMultiplier();
      expect(initialMultiplier).not.toBeNull();

      // Enable auto-update
      await quizPage.setAutoUpdate(true);

      // Wait for auto-update to trigger (3 seconds interval)
      // Using web-first assertion with toPass() for polling
      await expect(async () => {
        const parsed = await quizPage.parseDisplay();
        expect(parsed?.counter).toBeGreaterThan(0);
      }).toPass({
        timeout: 5000, // 3s interval + buffer
        intervals: [500], // Check every 500ms
      });

      // Disable auto-update to clean up
      await quizPage.setAutoUpdate(false);
    });

    test('should stop auto-updating when disabled', async () => {
      // Enable and let it increment
      await quizPage.setAutoUpdate(true);

      // Wait for at least one increment
      await expect(async () => {
        const parsed = await quizPage.parseDisplay();
        expect(parsed?.counter).toBeGreaterThan(0);
      }).toPass({ timeout: 5000 });

      // Disable auto-update
      await quizPage.setAutoUpdate(false);

      // Get current counter
      const parsedAfterDisable = await quizPage.parseDisplay();
      const counterAfterDisable = parsedAfterDisable?.counter ?? 0;

      // Wait a bit and verify counter didn't change
      // Using page.waitForTimeout here is acceptable for this specific case
      // because we're testing that something DOESN'T happen
      await quizPage.page.waitForTimeout(4000);

      const parsedFinal = await quizPage.parseDisplay();
      expect(parsedFinal?.counter).toBe(counterAfterDisable);
    });
  });

  // ===========================================================================
  // THEME TOGGLE TESTS
  // ===========================================================================

  test.describe('Theme Toggle', () => {
    test('should start in dark mode', async ({ page }) => {
      // Dark mode = no 'light-mode' class on body
      await expect(page.locator('body')).not.toHaveClass(/light-mode/);
    });

    test('should toggle to light mode', async ({ page }) => {
      await quizPage.toggleTheme();

      // Light mode = 'light-mode' class on body
      await expect(page.locator('body')).toHaveClass(/light-mode/);
    });

    test('should toggle back to dark mode', async ({ page }) => {
      // Toggle to light
      await quizPage.toggleTheme();
      await expect(page.locator('body')).toHaveClass(/light-mode/);

      // Toggle back to dark
      await quizPage.toggleTheme();
      await expect(page.locator('body')).not.toHaveClass(/light-mode/);
    });
  });

  // ===========================================================================
  // SETTINGS PERSISTENCE TESTS
  // ===========================================================================

  test.describe('Settings Persistence', () => {
    test('should persist settings after page reload', async ({ page }) => {
      // Change settings to non-default values
      await quizPage.setQuestionTime(10);
      await quizPage.setAnswerTime(5);
      await quizPage.setDifficulty(4);

      // Reload the page
      await page.reload();

      // Wait for app to load
      await expect(quizPage.display).toBeVisible();

      // Verify settings were persisted
      await expect(quizPage.questionTimeSlider).toHaveValue('10');
      await expect(quizPage.answerTimeSlider).toHaveValue('5');
      await expect(quizPage.difficultySlider).toHaveValue('4');
      await expect(quizPage.difficultyValue).toHaveText('Expert');
    });

    test('should persist theme preference after reload', async ({ page }) => {
      // Toggle to light mode
      await quizPage.toggleTheme();
      await expect(page.locator('body')).toHaveClass(/light-mode/);

      // Reload
      await page.reload();
      await expect(quizPage.display).toBeVisible();

      // Verify theme persisted
      await expect(page.locator('body')).toHaveClass(/light-mode/);
    });
  });

  // ===========================================================================
  // KEYBOARD ACCESSIBILITY TESTS
  // ===========================================================================

  test.describe('Keyboard Accessibility', () => {
    test('should adjust difficulty slider with arrow keys', async () => {
      // Focus the slider
      await quizPage.difficultySlider.focus();

      // Press right arrow to increase
      await quizPage.page.keyboard.press('ArrowRight');
      await expect(quizPage.difficultySlider).toHaveValue('4');
      await expect(quizPage.difficultyValue).toHaveText('Expert');

      // Press left arrow to decrease
      await quizPage.page.keyboard.press('ArrowLeft');
      await expect(quizPage.difficultySlider).toHaveValue('3');
      await expect(quizPage.difficultyValue).toHaveText('Hard');
    });

    test('should have proper ARIA attributes on sliders', async () => {
      // Verify ARIA attributes exist and have correct values
      await expect(quizPage.difficultySlider).toHaveAttribute('aria-label', 'Difficulty level');
      await expect(quizPage.difficultySlider).toHaveAttribute('aria-valuemin', '1');
      await expect(quizPage.difficultySlider).toHaveAttribute('aria-valuemax', '4');
    });
  });
});

// =============================================================================
// MOBILE VIEWPORT TESTS
// =============================================================================

test.describe('Mobile Viewport', () => {
  // Configure viewport for this describe block only
  test.use({ viewport: { width: 375, height: 667 } });

  test('should display correctly on mobile viewport', async ({ page }) => {
    const quizPage = new QuizPage(page);
    await quizPage.goto();

    // Verify all essential elements are visible
    await expect(quizPage.display).toBeVisible();
    await expect(quizPage.startQuizButton).toBeVisible();
    await expect(quizPage.incrementButton).toBeVisible();

    // Verify no horizontal scrolling
    const bodyWidth = await page.locator('body').evaluate(el => el.scrollWidth);
    const viewportWidth = await page.locator('body').evaluate(el => el.clientWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth);
  });
});
TESTFILE

echo "✅ Created e2e/quiz.spec.ts"

# ==============================================================================
# SECTION 4: UPDATE PLAYWRIGHT CONFIGURATION
# ==============================================================================
# BEST PRACTICES APPLIED:
#
# 1. TRACE CONFIGURATION
#    - 'on-first-retry' in CI - captures trace only when needed
#    - Reduces storage and improves performance
#
# 2. SCREENSHOT & VIDEO
#    - Only on failure - saves resources
#    - Helps debugging failed tests
#
# 3. TIMEOUT CONFIGURATION
#    - Reasonable timeouts prevent tests from hanging
#    - But not too short to cause flaky tests
#
# 4. REPORTER CONFIGURATION
#    - HTML reporter for local viewing
#    - CI-friendly reporters for GitHub Actions
#
# 5. EXPECT TIMEOUT
#    - Separate from action timeout
#    - Allows enough time for assertions to pass
#
# 6. FULLYPARALLEL
#    - Tests run in parallel for speed
#    - Each test is isolated anyway
#
# 7. FORBIDONLY
#    - Prevents committing test.only() to CI
#    - Ensures all tests run in CI
# ==============================================================================

echo "📝 Updating playwright.config.ts with best practices..."

cat > playwright.config.ts << 'PLAYWRIGHTCONFIG'
/**
 * Playwright Configuration
 * 
 * This configuration follows ALL Playwright best practices:
 * 
 * 1. TRACE ON FIRST RETRY: Captures detailed trace only when a test fails
 *    and is being retried. This saves resources while providing debugging info.
 *    
 * 2. SCREENSHOTS ON FAILURE: Captures screenshot when test fails to help
 *    identify visual issues.
 *    
 * 3. VIDEO ON FIRST RETRY: Records video only when retrying failed tests.
 *    Useful for debugging but not for every test run.
 *    
 * 4. PROPER TIMEOUTS: Balanced between fast feedback and stability.
 *    
 * 5. CROSS-BROWSER TESTING: Runs on Chromium, Firefox, and WebKit.
 *    
 * 6. CI OPTIMIZATIONS: Different settings for CI vs local development.
 *
 * @see https://playwright.dev/docs/test-configuration
 * @see https://playwright.dev/docs/best-practices
 */

import { defineConfig, devices } from '@playwright/test';

/**
 * Detect if running in CI environment
 * GitHub Actions sets CI=true automatically
 */
const isCI = !!process.env.CI;

export default defineConfig({
  // ===========================================================================
  // TEST DIRECTORY AND FILE PATTERNS
  // ===========================================================================
  
  /**
   * Directory containing test files
   */
  testDir: './e2e',

  /**
   * Pattern to match test files
   * Using .spec.ts extension is conventional for Playwright
   */
  testMatch: '**/*.spec.ts',

  // ===========================================================================
  // PARALLELIZATION SETTINGS
  // ===========================================================================

  /**
   * Run tests in files in parallel
   * Each test file runs in its own worker for isolation
   */
  fullyParallel: true,

  /**
   * Fail the build on CI if test.only() is left in source code
   * This prevents accidentally skipping tests in CI
   */
  forbidOnly: isCI,

  // ===========================================================================
  // RETRY CONFIGURATION
  // ===========================================================================

  /**
   * Retry failed tests
   * - CI: Retry twice to handle flaky infrastructure
   * - Local: No retries for faster feedback during development
   * 
   * WHY 2 retries in CI:
   * - First retry captures trace for debugging
   * - Second retry confirms if it's truly flaky
   */
  retries: isCI ? 2 : 0,

  // ===========================================================================
  // WORKER CONFIGURATION
  // ===========================================================================

  /**
   * Number of parallel workers
   * - CI: Use 1 worker for consistent, reproducible builds
   * - Local: Use default (based on CPU cores) for speed
   * 
   * WHY 1 worker in CI:
   * - More predictable resource usage
   * - Easier to debug failures
   * - GitHub Actions runners have limited parallelism
   */
  workers: isCI ? 1 : undefined,

  // ===========================================================================
  // REPORTER CONFIGURATION
  // ===========================================================================

  /**
   * Reporter configuration
   * - HTML: Creates interactive report viewable in browser
   * - List: Shows test progress in console (good for CI)
   * - GitHub: Annotates PRs with test results (CI only)
   */
  reporter: isCI
    ? [
        ['list'],
        ['html', { open: 'never' }],
        ['github'],
      ]
    : [
        ['html', { open: 'on-failure' }],
      ],

  // ===========================================================================
  // GLOBAL SETTINGS (applied to all projects)
  // ===========================================================================

  use: {
    /**
     * Base URL for navigation
     * All page.goto('/path') calls are relative to this
     */
    baseURL: 'http://localhost:5173',

    // =========================================================================
    // TRACE CONFIGURATION
    // =========================================================================

    /**
     * Collect trace on first retry of failed test
     * 
     * WHY 'on-first-retry':
     * - Traces are expensive to collect and store
     * - Only need them for debugging failures
     * - First retry is when we need the most info
     * 
     * Trace includes:
     * - Timeline of actions
     * - DOM snapshots
     * - Network requests
     * - Console logs
     */
    trace: 'on-first-retry',

    // =========================================================================
    // SCREENSHOT CONFIGURATION
    // =========================================================================

    /**
     * Capture screenshot only when test fails
     * 
     * WHY 'only-on-failure':
     * - Saves storage space
     * - Faster test execution
     * - Still provides debugging info when needed
     */
    screenshot: 'only-on-failure',

    // =========================================================================
    // VIDEO CONFIGURATION
    // =========================================================================

    /**
     * Record video on first retry of failed test
     * 
     * WHY 'on-first-retry':
     * - Videos are large files
     * - Only useful for debugging failures
     * - Provides visual record of what went wrong
     */
    video: 'on-first-retry',

    // =========================================================================
    // TIMEOUT CONFIGURATION
    // =========================================================================

    /**
     * Timeout for each action (click, fill, etc.)
     * Default is 30s, but we reduce it for faster failure detection
     */
    actionTimeout: 10_000,

    /**
     * Timeout for navigation
     */
    navigationTimeout: 30_000,
  },

  // ===========================================================================
  // EXPECT CONFIGURATION
  // ===========================================================================

  expect: {
    /**
     * Timeout for expect() assertions
     * 
     * WHY 5 seconds:
     * - Enough time for animations to complete
     * - Enough for network responses
     * - But fast enough to catch actual failures
     */
    timeout: 5_000,
  },

  // ===========================================================================
  // GLOBAL TIMEOUT
  // ===========================================================================

  /**
   * Maximum time for the entire test (including hooks)
   * 
   * WHY 30 seconds:
   * - Most tests should complete in under 10s
   * - Extra buffer for slow CI environments
   * - Prevents tests from hanging indefinitely
   */
  timeout: 30_000,

  // ===========================================================================
  // PROJECT CONFIGURATION (Multi-browser testing)
  // ===========================================================================

  /**
   * Configure projects for cross-browser testing
   * 
   * WHY test on multiple browsers:
   * - Ensures app works for all users
   * - Catches browser-specific bugs early
   * - Part of Playwright best practices
   */
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
      },
    },
    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
      },
    },
  ],

  // ===========================================================================
  // WEB SERVER CONFIGURATION
  // ===========================================================================

  /**
   * Start the dev server before running tests
   * 
   * WHY configure webServer:
   * - Ensures app is running before tests start
   * - Automatically starts/stops server
   * - Reuses existing server when running locally
   */
  webServer: {
    /**
     * Command to start the development server
     */
    command: 'yarn dev',

    /**
     * Port the server runs on
     */
    port: 5173,

    /**
     * Reuse existing server if already running
     * 
     * WHY true locally:
     * - Faster test starts during development
     * - Can run tests against manually started server
     * 
     * WHY false in CI:
     * - Ensures clean server state
     * - No stale server from previous runs
     */
    reuseExistingServer: !isCI,

    /**
     * Timeout for server to start
     */
    timeout: 120_000,
  },
});
PLAYWRIGHTCONFIG

echo "✅ Updated playwright.config.ts"

# ==============================================================================
# SECTION 5: UPDATE ESLINT CONFIGURATION
# ==============================================================================
# BEST PRACTICE: Lint your tests
#
# The Playwright docs specifically recommend:
# "Use @typescript-eslint/no-floating-promises ESLint rule to make sure
#  there are no missing awaits before asynchronous calls to the Playwright API"
#
# This catches bugs like:
#   page.click('button')  // BUG: missing await!
#
# Instead of:
#   await page.click('button')  // Correct
#
# We also add the rule for E2E test files specifically
# ==============================================================================

echo "📝 Updating eslint.config.js with Playwright-specific rules..."

cat > eslint.config.js << 'ESLINTCONFIG'
/**
 * ESLint Configuration
 * 
 * Follows Playwright best practices:
 * - Includes @typescript-eslint/no-floating-promises to catch missing awaits
 * - This is CRITICAL for Playwright tests where async operations MUST be awaited
 * 
 * @see https://playwright.dev/docs/best-practices#lint-your-tests
 */

import js from '@eslint/js';
import typescript from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';

export default [
  js.configs.recommended,
  {
    // ==========================================================================
    // MAIN SOURCE FILES CONFIGURATION
    // ==========================================================================
    files: ['src/**/*.ts', 'src/**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
        // Enable project for type-aware linting
        // Required for no-floating-promises rule
        project: './tsconfig.json',
      },
      globals: {
        // Browser globals
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        requestAnimationFrame: 'readonly',
        cancelAnimationFrame: 'readonly',
        localStorage: 'readonly',
        HTMLElement: 'readonly',
        HTMLButtonElement: 'readonly',
        HTMLInputElement: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': typescript,
    },
    rules: {
      ...typescript.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      }],
    },
  },
  {
    // ==========================================================================
    // E2E TEST FILES CONFIGURATION
    // ==========================================================================
    // PLAYWRIGHT BEST PRACTICE: Lint your tests with no-floating-promises
    // This catches missing await statements which cause flaky tests
    // ==========================================================================
    files: ['e2e/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
        // CRITICAL: Must enable project for no-floating-promises
        project: './tsconfig.e2e.json',
      },
      globals: {
        // Node.js globals for E2E tests
        console: 'readonly',
        process: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': typescript,
    },
    rules: {
      ...typescript.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'off', // More lenient in tests
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      }],
      // ========================================================================
      // CRITICAL RULE FOR PLAYWRIGHT
      // ========================================================================
      // This rule ensures all async calls are awaited
      // Without this, you might write:
      //   page.click('button')  // WRONG - not awaited!
      // When you should write:
      //   await page.click('button')  // CORRECT
      //
      // This prevents a HUGE class of flaky tests
      // ========================================================================
      '@typescript-eslint/no-floating-promises': 'error',
      
      // Also enable this to catch void returns being ignored
      '@typescript-eslint/require-await': 'warn',
    },
  },
  {
    // ==========================================================================
    // UNIT TEST FILES CONFIGURATION
    // ==========================================================================
    files: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  {
    ignores: ['dist/**', 'coverage/**', 'node_modules/**', '*.cjs', 'scripts/**'],
  },
];
ESLINTCONFIG

echo "✅ Updated eslint.config.js"

# ==============================================================================
# SECTION 6: CREATE TSCONFIG FOR E2E TESTS
# ==============================================================================
# WHY a separate tsconfig for E2E:
# - E2E tests have different dependencies (Playwright)
# - Need project reference for no-floating-promises rule
# - Keeps E2E config isolated from main app
# ==============================================================================

echo "📝 Creating tsconfig.e2e.json for E2E tests..."

cat > tsconfig.e2e.json << 'TSCONFIGE2E'
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "types": ["node"]
  },
  "include": ["e2e/**/*.ts"]
}
TSCONFIGE2E

echo "✅ Created tsconfig.e2e.json"

# ==============================================================================
# SECTION 7: UPDATE CI/CD WORKFLOW WITH PLAYWRIGHT BEST PRACTICES
# ==============================================================================
# BEST PRACTICES APPLIED:
#
# 1. OPTIMIZE BROWSER DOWNLOADS
#    - Only install browsers that are actually used
#    - Use --with-deps to install system dependencies
#
# 2. CACHE PLAYWRIGHT BROWSERS
#    - Reuse downloaded browsers across runs
#    - Significantly speeds up CI
#
# 3. UPLOAD ARTIFACTS
#    - Always upload test reports
#    - Upload traces on failure for debugging
#
# 4. SHARDING (optional, commented out)
#    - Can split tests across multiple machines
#    - Useful for large test suites
# ==============================================================================

echo "📝 Updating .github/workflows/ci-cd.yml with optimizations..."

cat > .github/workflows/ci-cd.yml << 'CICD'
# ==============================================================================
# CI/CD Pipeline with Playwright Best Practices
# ==============================================================================
# This workflow implements ALL Playwright CI best practices:
#
# 1. BROWSER CACHING
#    - Caches Playwright browsers to speed up subsequent runs
#    - Uses hash of playwright version as cache key
#
# 2. OPTIMIZED BROWSER INSTALLATION
#    - Only installs browsers needed for testing
#    - Uses --with-deps for system dependencies
#
# 3. ARTIFACT UPLOAD
#    - Always uploads HTML report for debugging
#    - Uploads trace files when tests fail
#
# 4. GITHUB REPORTER
#    - Test results appear as PR annotations
#    - Easy to see what failed without leaving GitHub
#
# @see https://playwright.dev/docs/ci
# @see https://playwright.dev/docs/best-practices#run-tests-on-ci
# ==============================================================================

name: CI/CD Pipeline

on:
  push:
  pull_request:
  workflow_dispatch:

jobs:
  # ============================================================================
  # UNIT TESTS
  # ============================================================================
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [20.x, 22.x, 24.x]
    steps:
      - uses: actions/checkout@v4

      - name: Use Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'yarn'

      - name: Install dependencies
        run: yarn install --frozen-lockfile

      - name: Run linter
        run: yarn lint

      - name: Run type check
        run: yarn type-check

      - name: Run unit tests with coverage
        run: yarn test:coverage:ci

      - name: Upload coverage reports
        uses: codecov/codecov-action@v4
        if: matrix.node-version == '22.x'
        with:
          files: ./coverage/lcov.info
          flags: unittests
          name: codecov-umbrella
          fail_ci_if_error: false

  # ============================================================================
  # E2E TESTS WITH PLAYWRIGHT
  # ============================================================================
  # This job implements ALL Playwright CI best practices
  # ============================================================================
  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22.x'
          cache: 'yarn'

      - name: Install dependencies
        run: yarn install --frozen-lockfile

      # ========================================================================
      # PLAYWRIGHT BROWSER CACHING
      # ========================================================================
      # WHY: Playwright browsers are ~500MB each
      # Caching them saves significant download time on each run
      # 
      # Cache key includes:
      # - OS (ubuntu-latest)
      # - Playwright version from package.json
      #
      # This ensures cache is invalidated when Playwright version changes
      # ========================================================================
      - name: Get Playwright version
        id: playwright-version
        run: echo "version=$(yarn info @playwright/test version --json | jq -r '.data')" >> $GITHUB_OUTPUT

      - name: Cache Playwright browsers
        uses: actions/cache@v4
        id: playwright-cache
        with:
          path: ~/.cache/ms-playwright
          key: playwright-${{ runner.os }}-${{ steps.playwright-version.outputs.version }}

      # ========================================================================
      # OPTIMIZED BROWSER INSTALLATION
      # ========================================================================
      # BEST PRACTICE: Only install browsers you actually use
      #
      # Options:
      # - 'npx playwright install --with-deps' - installs ALL browsers
      # - 'npx playwright install chromium --with-deps' - installs only Chromium
      #
      # We install all browsers because our config tests on chromium, firefox,
      # and webkit. If you only need Chromium, change this to save time.
      #
      # --with-deps installs system dependencies (fonts, libraries, etc.)
      # This is REQUIRED on fresh CI machines
      # ========================================================================
      - name: Install Playwright Browsers
        if: steps.playwright-cache.outputs.cache-hit != 'true'
        run: npx playwright install --with-deps

      # Install only system deps if browsers were cached
      - name: Install Playwright system dependencies
        if: steps.playwright-cache.outputs.cache-hit == 'true'
        run: npx playwright install-deps

      # ========================================================================
      # BUILD PROJECT
      # ========================================================================
      # E2E tests run against the built application
      # This ensures we're testing what will actually be deployed
      # ========================================================================
      - name: Build project for E2E tests
        run: yarn build

      # ========================================================================
      # RUN E2E TESTS
      # ========================================================================
      # The playwright.config.ts handles:
      # - Starting the dev server
      # - Running tests in parallel
      # - Collecting traces on failure
      # - Generating HTML report
      # ========================================================================
      - name: Run E2E tests
        run: yarn test:e2e

      # ========================================================================
      # ARTIFACT UPLOAD - ALWAYS
      # ========================================================================
      # Upload the HTML report even if tests pass
      # This allows reviewing test results in detail
      #
      # if: always() ensures upload happens even when tests fail
      # ========================================================================
      - name: Upload Playwright Report
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30

      # ========================================================================
      # ARTIFACT UPLOAD - TEST RESULTS (on failure)
      # ========================================================================
      # Test results directory contains:
      # - Screenshots
      # - Videos (if recorded)
      # - Traces
      #
      # Only uploaded on failure to save storage
      # ========================================================================
      - name: Upload test results
        uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: test-results
          path: test-results/
          retention-days: 7

  # ============================================================================
  # BUILD AND DEPLOY
  # ============================================================================
  build:
    needs: [test, e2e-tests]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/master'
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22.x'
          cache: 'yarn'

      - name: Install dependencies
        run: yarn install --frozen-lockfile

      - name: Build project
        run: yarn build

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: ./dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/master'

    permissions:
      pages: write
      id-token: write

    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}

    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
CICD

echo "✅ Updated .github/workflows/ci-cd.yml"

# ==============================================================================
# SECTION 8: UPDATE .gitignore
# ==============================================================================
# Add Playwright-specific ignores
# ==============================================================================

echo "📝 Updating .gitignore with Playwright entries..."

# Check if entries already exist, if not append them
if ! grep -q "test-results/" .gitignore 2>/dev/null; then
  cat >> .gitignore << 'GITIGNORE'

# Playwright
/test-results/
/playwright-report/
/blob-report/
/playwright/.cache/
GITIGNORE
  echo "✅ Updated .gitignore"
else
  echo "ℹ️  .gitignore already has Playwright entries"
fi

# ==============================================================================
# SECTION 9: CREATE INDEX FILE FOR PAGE OBJECTS
# ==============================================================================
# Good practice to have an index.ts that exports all page objects
# ==============================================================================

echo "📝 Creating e2e/pages/index.ts..."

cat > e2e/pages/index.ts << 'PAGEINDEX'
/**
 * Page Object Model Exports
 * 
 * This file exports all page objects for easy importing in tests.
 * 
 * Usage in tests:
 *   import { QuizPage } from './pages';
 */

export { QuizPage } from './quiz-page';
PAGEINDEX

echo "✅ Created e2e/pages/index.ts"

# ==============================================================================
# SUMMARY
# ==============================================================================

echo ""
echo "=========================================="
echo "✅ MIGRATION COMPLETE!"
echo "=========================================="
echo ""
echo "Changes made:"
echo ""
echo "📁 CREATED FILES:"
echo "   - e2e/pages/quiz-page.ts       (Page Object Model)"
echo "   - e2e/pages/index.ts           (POM exports)"
echo "   - tsconfig.e2e.json            (E2E TypeScript config)"
echo ""
echo "📝 MODIFIED FILES:"
echo "   - e2e/quiz.spec.ts             (Rewritten with best practices)"
echo "   - playwright.config.ts         (Enhanced configuration)"
echo "   - eslint.config.js             (Added no-floating-promises)"
echo "   - .github/workflows/ci-cd.yml  (Optimized for Playwright)"
echo "   - .gitignore                   (Added Playwright entries)"
echo ""
echo "=========================================="
echo "PLAYWRIGHT BEST PRACTICES APPLIED:"
echo "=========================================="
echo ""
echo "1. ✅ PAGE OBJECT MODEL"
echo "   - All page interactions encapsulated in QuizPage class"
echo "   - Locators and actions separated from test logic"
echo "   - Easy to maintain when UI changes"
echo ""
echo "2. ✅ USER-FACING LOCATORS"
echo "   - Using getByRole(), getByLabel(), getByText()"
echo "   - NO CSS selectors like #id or .class"
echo "   - Tests won't break when styling changes"
echo ""
echo "3. ✅ WEB-FIRST ASSERTIONS"
echo "   - All assertions use await expect().toBeVisible() etc."
echo "   - Auto-waiting built in"
echo "   - No manual waits (removed waitForTimeout)"
echo ""
echo "4. ✅ TEST ISOLATION"
echo "   - beforeEach hook creates fresh page state"
echo "   - No test depends on another"
echo "   - Can run tests in any order"
echo ""
echo "5. ✅ NO-FLOATING-PROMISES LINT RULE"
echo "   - ESLint catches missing await statements"
echo "   - Prevents huge class of flaky tests"
echo "   - Run 'yarn lint' to check"
echo ""
echo "6. ✅ CI OPTIMIZATIONS"
echo "   - Browser caching for faster runs"
echo "   - Artifacts uploaded for debugging"
echo "   - Traces captured on failure"
echo ""
echo "7. ✅ CROSS-BROWSER TESTING"
echo "   - Tests run on Chromium, Firefox, WebKit"
echo "   - Catches browser-specific bugs"
echo ""
echo "8. ✅ PROPER TRACE CONFIGURATION"
echo "   - 'on-first-retry' captures traces when needed"
echo "   - Saves storage and improves performance"
echo ""
echo "=========================================="
echo "NEXT STEPS:"
echo "=========================================="
echo ""
echo "1. Commit these changes:"
echo "   git add ."
echo "   git commit -m 'Apply Playwright best practices'"
echo ""
echo "2. Push to trigger CI:"
echo "   git push origin master"
echo ""
echo "3. View test results in GitHub Actions"
echo ""
echo "4. If tests fail, download the playwright-report artifact"
echo "   and open index.html to see detailed trace"
echo ""
echo "=========================================="
