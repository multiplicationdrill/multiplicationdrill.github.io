import { expect, test } from '@playwright/test';
import { QuizPage } from './pages/quiz-page';

test.describe('Multiplication Drill Application', () => {
  let quizPage: QuizPage;

  test.beforeEach(async ({ page }) => {
    quizPage = new QuizPage(page);
    await quizPage.goto();
  });

  test.describe('Initial State', () => {
    test('should load the page with correct title', async ({ page }) => {
      await expect(page).toHaveTitle('Reactive Math Quiz');
    });

    test('should prompt to start the quiz', async () => {
      await expect(quizPage.display).toHaveText('Press Start Quiz');
      await expect(quizPage.timerDisplay).toHaveText('Ready');
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
      await quizPage.setQuestionTime(2);
      await quizPage.startQuiz();
      await quizPage.expectQuizQuestion();
      await quizPage.expectQuizAnswer({ timeout: 10_000 });
      await quizPage.stopQuiz();
      await expect(quizPage.display).toHaveText('Press Start Quiz');
    });

    test('should generate new problems', async () => {
      await quizPage.setQuestionTime(1);
      await quizPage.setAnswerTime(1);
      await quizPage.startQuiz();

      const firstProblem = await quizPage.display.textContent();

      await expect(async () => {
        expect(await quizPage.display.textContent()).not.toBe(firstProblem);
      }).toPass({ timeout: 10_000 });

      await quizPage.stopQuiz();
    });
  });

  test.describe('Self-Grading', () => {
    test('should keep grade buttons disabled during the question phase', async () => {
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
      await quizPage.setAnswerTime(30);
      await quizPage.startQuiz();

      await quizPage.waitForAnswerPhase();
      await quizPage.gradeCorrect();

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

    test('should reset the session tally when a new quiz starts', async () => {
      await quizPage.setQuestionTime(1);
      await quizPage.setAnswerTime(30);
      await quizPage.startQuiz();
      await quizPage.waitForAnswerPhase();
      await quizPage.gradeCorrect();
      await expect(quizPage.correctCount).toHaveText('1');
      await quizPage.stopQuiz();

      await quizPage.startQuiz();
      await expect(quizPage.correctCount).toHaveText('0');
      await quizPage.stopQuiz();
    });

    test('should support keyboard shortcuts for grading', async ({ page }) => {
      await quizPage.setQuestionTime(1);
      await quizPage.setAnswerTime(30);
      await quizPage.startQuiz();

      await quizPage.waitForAnswerPhase();
      await page.keyboard.press('ArrowRight');
      await expect(quizPage.correctCount).toHaveText('1');

      await quizPage.waitForAnswerPhase();
      await page.keyboard.press('ArrowLeft');
      await expect(quizPage.incorrectCount).toHaveText('1');

      await quizPage.waitForAnswerPhase();
      await page.keyboard.press('c');
      await expect(quizPage.correctCount).toHaveText('2');

      await quizPage.waitForAnswerPhase();
      await page.keyboard.press('x');
      await expect(quizPage.incorrectCount).toHaveText('2');

      await quizPage.stopQuiz();
    });
  });

  test.describe('Settings', () => {
    test('should change difficulty tier name', async () => {
      await quizPage.setDifficulty(1);
      await quizPage.setDifficulty(4);
    });

    test('should adjust question time slider', async () => {
      await quizPage.setQuestionTime(10);
      await expect(quizPage.questionTimeSlider).toHaveAttribute('aria-valuetext', '10 seconds');
    });

    test('should adjust answer time slider', async () => {
      await quizPage.setAnswerTime(5);
      await expect(quizPage.answerTimeSlider).toHaveAttribute('aria-valuetext', '5 seconds');
    });

    test('should expose range bounds and value text on sliders', async () => {
      await expect(quizPage.difficultySlider).toHaveAttribute('min', '1');
      await expect(quizPage.difficultySlider).toHaveAttribute('max', '4');
      await expect(quizPage.difficultySlider).toHaveAttribute('aria-valuetext', 'Hard');
    });

    test('should persist settings across reloads', async ({ page }) => {
      await quizPage.setQuestionTime(12);
      await quizPage.setDifficulty(2);

      await expect
        .poll(() => page.evaluate(() => localStorage.getItem('mathQuizSettings')))
        .toBe(JSON.stringify({ questionTime: 12, answerTime: 3, difficulty: 2 }));

      await page.reload();
      await expect(quizPage.questionTimeValue).toHaveText('12s');
      await expect(quizPage.difficultyValue).toHaveText('Medium');
      await expect(quizPage.questionTimeSlider).toHaveValue('12');
      await expect(quizPage.difficultySlider).toHaveValue('2');
    });
  });

  test.describe('Theme Toggle', () => {
    test('should start in dark mode', async () => {
      await quizPage.expectTheme('dark');
    });

    test('should toggle to light mode', async () => {
      await quizPage.toggleTheme();
      await quizPage.expectTheme('light');
    });

    test('should toggle back to dark mode', async () => {
      await quizPage.toggleTheme();
      await quizPage.expectTheme('light');
      await quizPage.toggleTheme();
      await quizPage.expectTheme('dark');
    });

    test('should persist the theme across reloads', async ({ page }) => {
      await quizPage.toggleTheme();
      await quizPage.expectTheme('light');
      await page.reload();
      await quizPage.expectTheme('light');
    });
  });
});

test.describe('Mobile Viewport', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('should display correctly on mobile viewport', async ({ page }) => {
    const quizPage = new QuizPage(page);
    await quizPage.goto();

    await expect(quizPage.display).toBeVisible();
    await expect(quizPage.startQuizButton).toBeVisible();

    for (const width of [375, 320]) {
      await page.setViewportSize({ width, height: 667 });
      const { scrollWidth, clientWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
    }
  });

  test('should offer tappable grade buttons in the answer phase', async ({ page }) => {
    const quizPage = new QuizPage(page);
    await quizPage.goto();

    await quizPage.setQuestionTime(1);
    await quizPage.startQuiz();
    await quizPage.waitForAnswerPhase();

    const box = await quizPage.gradeCorrectButton.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);

    await quizPage.gradeCorrect();
    await expect(quizPage.correctCount).toHaveText('1');

    await quizPage.stopQuiz();
  });
});
