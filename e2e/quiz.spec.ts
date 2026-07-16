/**
 * Multiplication Drill E2E Tests
 *
 * NOTES:
 * - Unicode escape for the multiplication sign avoids source-encoding issues.
 * - Range sliders are driven via evaluate() + dispatchEvent (see the POM).
 * - Grade timing is made deterministic by choosing question/answer durations
 *   rather than sleeping: a long question time to observe the question phase,
 *   a short one to reach the answer phase quickly.
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

    test('should prompt to start the quiz', async () => {
      await expect(quizPage.display).toHaveText('Press Start Quiz');
    });

    test('should have all controls enabled before starting', async () => {
      await quizPage.expectControlsDisabled(false);
    });

    test('should show a stopped status', async () => {
      await quizPage.expectQuizStatus('Stopped');
    });

    test('should hide the grade buttons before starting', async () => {
      await expect(quizPage.gradeButtons).toBeHidden();
    });

    test('should start the session counters at zero', async () => {
      await expect(quizPage.correctCount).toHaveText('0');
      await expect(quizPage.incorrectCount).toHaveText('0');
    });
  });

  // ===========================================================================
  // QUIZ MODE TESTS
  // ===========================================================================

  test.describe('Quiz Mode', () => {
    test('should start quiz when clicking Start Quiz button', async () => {
      await quizPage.startQuiz();
      await quizPage.expectQuizStatus('Running');
    });

    test('should disable settings sliders during quiz', async () => {
      await quizPage.startQuiz();
      await quizPage.expectControlsDisabled(true);
      await quizPage.stopQuiz();
      await quizPage.expectControlsDisabled(false);
    });

    test('should update status panel during quiz', async () => {
      await quizPage.expectQuizStatus('Stopped');
      await quizPage.startQuiz();
      await quizPage.expectQuizStatus('Running');
      await quizPage.stopQuiz();
      await quizPage.expectQuizStatus('Stopped');
    });

    test('should show a bare question, then reveal the answer', async () => {
      await quizPage.setQuestionTime(1);
      await quizPage.startQuiz();

      // Answer phase includes the product ("a × b = c")
      const answerPattern = new RegExp(`^\\d+\\s*${TIMES}\\s*\\d+\\s*=\\s*\\d+$`);
      await expect(quizPage.display).toHaveText(answerPattern, { timeout: 10000 });

      await quizPage.stopQuiz();
    });

    test('should generate new problems', async () => {
      await quizPage.setQuestionTime(1);
      await quizPage.startQuiz();

      const firstProblem = await quizPage.display.textContent();

      await expect(async () => {
        const currentProblem = await quizPage.display.textContent();
        expect(currentProblem).not.toBe(firstProblem);
      }).toPass({ timeout: 10000 });

      await quizPage.stopQuiz();
    });
  });

  // ===========================================================================
  // SELF-GRADING TESTS
  // ===========================================================================

  test.describe('Self-Grading', () => {
    test('should keep grade buttons disabled during the question phase', async () => {
      // A long question time keeps us in the question phase to observe it.
      await quizPage.setQuestionTime(30);
      await quizPage.startQuiz();

      await expect(quizPage.gradeButtons).toBeVisible();
      await quizPage.expectGradeButtonsEnabled(false);

      await quizPage.stopQuiz();
    });

    test('should enable grade buttons during the answer phase', async () => {
      await quizPage.setQuestionTime(1);
      await quizPage.startQuiz();

      await quizPage.waitForAnswerPhase();
      await quizPage.expectGradeButtonsEnabled(true);

      await quizPage.stopQuiz();
    });

    test('should count a correct grade and advance immediately', async () => {
      await quizPage.setQuestionTime(1);
      await quizPage.setAnswerTime(30); // long, so advancing is clearly from the tap
      await quizPage.startQuiz();

      await quizPage.waitForAnswerPhase();
      await quizPage.gradeCorrect();

      // Advancing returns us to a question phase, so grading is disabled again.
      await quizPage.expectGradeButtonsEnabled(false);
      await expect(quizPage.correctCount).toHaveText('1');
      await expect(quizPage.incorrectCount).toHaveText('0');

      await quizPage.stopQuiz();
    });

    test('should count an incorrect grade and advance immediately', async () => {
      await quizPage.setQuestionTime(1);
      await quizPage.setAnswerTime(30);
      await quizPage.startQuiz();

      await quizPage.waitForAnswerPhase();
      await quizPage.gradeIncorrect();

      await quizPage.expectGradeButtonsEnabled(false);
      await expect(quizPage.incorrectCount).toHaveText('1');
      await expect(quizPage.correctCount).toHaveText('0');

      await quizPage.stopQuiz();
    });

    test('should accumulate the session tally across problems', async () => {
      await quizPage.setQuestionTime(1);
      await quizPage.startQuiz();

      await quizPage.waitForAnswerPhase();
      await quizPage.gradeCorrect();

      await quizPage.waitForAnswerPhase();
      await quizPage.gradeIncorrect();

      await expect(quizPage.correctCount).toHaveText('1');
      await expect(quizPage.incorrectCount).toHaveText('1');

      await quizPage.stopQuiz();
    });

    test('should support keyboard shortcuts for grading', async () => {
      await quizPage.setQuestionTime(1);
      await quizPage.setAnswerTime(30);
      await quizPage.startQuiz();

      // Right arrow = correct
      await quizPage.waitForAnswerPhase();
      await quizPage.page.keyboard.press('ArrowRight');
      await expect(quizPage.correctCount).toHaveText('1');

      // Left arrow = incorrect
      await quizPage.waitForAnswerPhase();
      await quizPage.page.keyboard.press('ArrowLeft');
      await expect(quizPage.incorrectCount).toHaveText('1');

      await quizPage.stopQuiz();
    });
  });

  // ===========================================================================
  // SETTINGS TESTS
  // ===========================================================================

  test.describe('Settings', () => {
    test('should change difficulty tier name', async () => {
      await quizPage.setDifficulty(1);
      await expect(quizPage.difficultyValue).toHaveText('Easy');

      await quizPage.setDifficulty(4);
      await expect(quizPage.difficultyValue).toHaveText('Expert');
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

    // Verify no horizontal scrolling
    const bodyWidth = await page.locator('body').evaluate((el) => el.scrollWidth);
    const viewportWidth = await page.locator('body').evaluate((el) => el.clientWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth);
  });

  test('should offer tappable grade buttons in the answer phase', async ({ page }) => {
    const quizPage = new QuizPage(page);
    await quizPage.goto();

    await quizPage.setQuestionTime(1);
    await quizPage.startQuiz();
    await quizPage.waitForAnswerPhase();

    // Touch targets should meet the ~44px minimum recommendation.
    const box = await quizPage.gradeCorrectButton.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.height).toBeGreaterThanOrEqual(44);

    // Tapping advances and records the grade.
    await quizPage.gradeCorrect();
    await expect(quizPage.correctCount).toHaveText('1');

    await quizPage.stopQuiz();
  });
});
