import { test, expect } from '@playwright/test';

test.describe('Multiplication Drill', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => ((window as any).__TEST_MODE__ = true));
    await page.evaluate(() => localStorage.clear());
    await page.goto('/');
    await expect(page.locator('#display')).toBeVisible();
  });

  test('initial state loads correctly', async ({ page }) => {
    await expect(page).toHaveTitle('Reactive Math Quiz');
    await expect(page.locator('#display')).toHaveText(/0 × \d+ = 0/);
    await expect(page.locator('#questionTime')).toHaveValue('5');
    await expect(page.locator('#answerTime')).toHaveValue('3');
    await expect(page.locator('#difficulty')).toHaveValue('3');
    await expect(page.locator('#difficultyValue')).toHaveText('Hard');
  });

  test('manual increment and reset', async ({ page }) => {
    const display = page.locator('#display');
    await page.locator('#incrementBtn').click();
    await expect(display).toHaveText(/1 × \d+ = \d+/);
    await page.locator('#incrementBtn').click();
    await expect(display).toHaveText(/2 × \d+ = \d+/);
    await page.locator('#resetBtn').click();
    await expect(display).toHaveText(/0 × \d+ = 0/);
  });

  test('difficulty changes behavior', async ({ page }) => {
    await page.locator('#difficulty').fill('4');
    await expect(page.locator('#difficultyValue')).toHaveText('Expert');
    await page.locator('#resetBtn').click();
    await expect(page.locator('#display')).toHaveText(/0 × \d+ = 0/);
  });

  test('quiz mode flow', async ({ page }) => {
    const quizButton = page.locator('#quizButton');
    await page.locator('#questionTime').fill('2');
    await page.locator('#answerTime').fill('1');
    await quizButton.click();
    await expect(quizButton).toHaveText('Stop Quiz');
    await expect(page.locator('#progressBar')).toBeVisible();
    await quizButton.click();
    await expect(quizButton).toHaveText('Start Quiz');
  });

  test('theme toggle', async ({ page }) => {
    const body = page.locator('body');
    await expect(body).not.toHaveClass(/light-mode/);
    await page.locator('.theme-toggle').click();
    await expect(body).toHaveClass(/light-mode/);
  });

  test('settings persistence', async ({ page }) => {
    await page.locator('#questionTime').fill('10');
    await page.locator('#answerTime').fill('5');
    await page.locator('#difficulty').fill('4');
    await page.reload();
    await expect(page.locator('#questionTime')).toHaveValue('10');
    await expect(page.locator('#difficultyValue')).toHaveText('Expert');
  });

  test('auto update increments', async ({ page }) => {
    const display = page.locator('#display');
    const before = await display.textContent();
    await page.locator('#autoUpdate').check();

    await expect(async () => {
      const after = await display.textContent();
      expect(after).not.toBe(before);
    }).toPass();
  });

  test('keyboard navigation for slider', async ({ page }) => {
    const slider = page.locator('#difficulty');
    await slider.focus();
    await page.keyboard.press('ArrowRight');
    await expect(slider).toHaveValue('4');
  });

  test('status panel updates', async ({ page }) => {
    const quizButton = page.locator('#quizButton');
    const quizStatus = page.locator('#quizStatus');
    await expect(quizStatus).toHaveText('Stopped');
    await quizButton.click();
    await expect(quizStatus).toHaveText('Running');
    await quizButton.click();
    await expect(quizStatus).toHaveText('Stopped');
  });
});

test.describe('Mobile viewport', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('responsive layout fits', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#display')).toBeVisible();
    const width = await page.evaluate(() => document.body.scrollWidth);
    const view = await page.evaluate(() => document.body.clientWidth);
    expect(width).toBeLessThanOrEqual(view);
  });
});

