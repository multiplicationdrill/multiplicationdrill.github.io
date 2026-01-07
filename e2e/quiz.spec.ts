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
