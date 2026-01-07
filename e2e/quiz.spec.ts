/**
 * Multiplication Drill E2E Tests
 * 
 * FIXES APPLIED:
 * 1. Use Unicode escape for multiplication sign to avoid encoding issues
 * 2. Fixed regex patterns to match actual app output
 * 3. Increased timeouts for quiz transitions
 */

import { test, expect } from '@playwright/test';
import { QuizPage } from './pages/quiz-page';

// Unicode multiplication sign (×) - using escape to avoid encoding issues
const TIMES = '\u00D7';

let quizPage: QuizPage;

test.describe('Multiplication Drill Application', () => {
  test.beforeEach(async ({ page }) => {
    quizPage = new QuizPage(page);
    await quizPage.goto();
  });

  // ===========================================================================
  // INITIAL STATE TESTS
  // ===========================================================================

  test.describe('Initial State', () => {
    test('should load the page with correct title', async ({ page }) => {
      await expect(page).toHaveTitle('Reactive Math Quiz');
    });

    test('should display initial manual mode equation', async () => {
      // Should show pattern like "0 × 7 = 0" (counter × multiplier = result)
      const pattern = new RegExp(`^\\d+\\s*${TIMES}\\s*\\d+\\s*=\\s*\\d+$`);
      await expect(quizPage.display).toHaveText(pattern);
    });

    test('should have all controls enabled in manual mode', async () => {
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
      const multiplier = await quizPage.getMultiplier();
      expect(multiplier).not.toBeNull();

      await quizPage.increment();
      await quizPage.expectDisplayToShow(1, multiplier!);

      await quizPage.increment();
      await quizPage.expectDisplayToShow(2, multiplier!);
    });

    test('should reset counter and generate new multiplier when clicking reset', async () => {
      await quizPage.increment();
      await quizPage.increment();

      await quizPage.reset();

      // Verify counter is 0 - the display should show "0 × X = 0"
      const pattern = new RegExp(`^0\\s*${TIMES}\\s*\\d+\\s*=\\s*0$`);
      await expect(quizPage.display).toHaveText(pattern);
    });

    test('should verify multiplication calculations are correct', async () => {
      const multiplier = await quizPage.getMultiplier();
      expect(multiplier).not.toBeNull();

      for (let i = 1; i <= 5; i++) {
        await quizPage.increment();
        await quizPage.expectDisplayToShow(i, multiplier!);
      }
    });
  });

  // ===========================================================================
  // QUIZ MODE TESTS
  // ===========================================================================

  test.describe('Quiz Mode', () => {
    test('should start quiz when clicking Start Quiz button', async () => {
      await quizPage.startQuiz();
      await quizPage.expectStatus('Quiz', 'Running');
    });

    test('should disable manual controls during quiz', async () => {
      await quizPage.startQuiz();
      await quizPage.expectControlsDisabled(true);
      await quizPage.stopQuiz();
      await quizPage.expectControlsDisabled(false);
    });

    test('should update status panel during quiz', async () => {
      await quizPage.expectStatus('Manual', 'Stopped');
      await quizPage.startQuiz();
      await quizPage.expectStatus('Quiz', 'Running');
      await quizPage.stopQuiz();
      await quizPage.expectStatus('Manual', 'Stopped');
    });

    test('should transition from question to answer phase', async () => {
      await quizPage.startQuiz();

      // Wait for the answer phase - the display will include "="
      // Using Unicode escape for multiplication sign
      const answerPattern = new RegExp(`^\\d+\\s*${TIMES}\\s*\\d+\\s*=\\s*\\d+$`);
      await expect(quizPage.display).toHaveText(answerPattern, {
        timeout: 10000, // Allow more time for question phase to complete
      });

      await quizPage.stopQuiz();
    });

    test('should generate new problems', async () => {
      await quizPage.startQuiz();

      const firstProblem = await quizPage.display.textContent();

      // Wait for content to change (new question or answer phase)
      await expect(async () => {
        const currentProblem = await quizPage.display.textContent();
        expect(currentProblem).not.toBe(firstProblem);
      }).toPass({
        timeout: 10000, // Increased timeout
      });

      await quizPage.stopQuiz();
    });
  });

  // ===========================================================================
  // SETTINGS TESTS
  // ===========================================================================

  test.describe('Settings', () => {
    test('should change difficulty and update multiplier range', async () => {
      // Set to Easy (level 1) - range 2-5
      await quizPage.setDifficulty(1);
      await expect(quizPage.difficultyValue).toHaveText('Easy');
      
      // Reset to get new multiplier in the correct range
      await quizPage.reset();
      await quizPage.expectMultiplierInRange(1);
    });

    test('should adjust question time slider', async () => {
      await quizPage.setQuestionTime(10);
      await expect(quizPage.questionTimeValue).toHaveText('10s');
    });

    test('should adjust answer time slider', async () => {
      await quizPage.setAnswerTime(5);
      await expect(quizPage.answerTimeValue).toHaveText('5s');
    });

    test('should have proper ARIA attributes on sliders', async () => {
      await expect(quizPage.difficultySlider).toHaveAttribute('aria-valuemin', '1');
      await expect(quizPage.difficultySlider).toHaveAttribute('aria-valuemax', '4');
    });
  });

  // ===========================================================================
  // THEME TOGGLE TESTS
  // ===========================================================================

  test.describe('Theme Toggle', () => {
    test('should start in dark mode', async ({ page }) => {
      await expect(page.locator('body')).not.toHaveClass(/light-mode/);
    });

    test('should toggle to light mode', async ({ page }) => {
      await quizPage.toggleTheme();
      await expect(page.locator('body')).toHaveClass(/light-mode/);
    });

    test('should toggle back to dark mode', async ({ page }) => {
      await quizPage.toggleTheme();
      await expect(page.locator('body')).toHaveClass(/light-mode/);
      await quizPage.toggleTheme();
      await expect(page.locator('body')).not.toHaveClass(/light-mode/);
    });
  });
});

// =============================================================================
// MOBILE VIEWPORT TESTS
// =============================================================================

test.describe('Mobile Viewport', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('should display correctly on mobile viewport', async ({ page }) => {
    const quizPage = new QuizPage(page);
    await quizPage.goto();

    await expect(quizPage.display).toBeVisible();
    await expect(quizPage.startQuizButton).toBeVisible();
    await expect(quizPage.incrementButton).toBeVisible();

    // Verify no horizontal scrolling
    const bodyWidth = await page.locator('body').evaluate(el => el.scrollWidth);
    const viewportWidth = await page.locator('body').evaluate(el => el.clientWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth);
  });
});
