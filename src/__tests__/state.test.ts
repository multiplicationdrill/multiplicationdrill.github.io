import { describe, it, expect, beforeEach } from 'vitest';
import { state, displayText, progressPercent, timerDisplayText, isGradingPhase } from '../state';

describe('State', () => {
  beforeEach(() => {
    // Reset state to defaults
    state.isQuizActive.set(false);
    state.currentPhase.set('idle');
    state.timeRemaining.set(0);
    state.currentProblem.set({ a: 0, b: 0 });
    state.questionTime.set(5);
    state.answerTime.set(3);
    state.sessionCorrect.set(0);
    state.sessionIncorrect.set(0);
  });

  describe('displayText computed signal', () => {
    it('should prompt to start the quiz when inactive', () => {
      state.isQuizActive.set(false);
      expect(displayText.get()).toBe('Press Start Quiz');
    });

    it('should show question during quiz question phase', () => {
      state.isQuizActive.set(true);
      state.currentPhase.set('question');
      state.currentProblem.set({ a: 7, b: 8 });
      expect(displayText.get()).toBe('7 × 8');
    });

    it('should show answer during quiz answer phase', () => {
      state.isQuizActive.set(true);
      state.currentPhase.set('answer');
      state.currentProblem.set({ a: 7, b: 8 });
      expect(displayText.get()).toBe('7 × 8 = 56');
    });
  });

  describe('progressPercent computed signal', () => {
    it('should return 0 when quiz is inactive', () => {
      state.isQuizActive.set(false);
      expect(progressPercent.get()).toBe(0);
    });

    it('should calculate progress for question phase', () => {
      state.isQuizActive.set(true);
      state.currentPhase.set('question');
      state.questionTime.set(10);
      state.timeRemaining.set(7); // 3 seconds elapsed
      expect(progressPercent.get()).toBe(30); // (10-7)/10 * 100
    });

    it('should calculate progress for answer phase', () => {
      state.isQuizActive.set(true);
      state.currentPhase.set('answer');
      state.answerTime.set(5);
      state.timeRemaining.set(2); // 3 seconds elapsed
      expect(progressPercent.get()).toBe(60); // (5-2)/5 * 100
    });

    it('should handle zero total time', () => {
      state.isQuizActive.set(true);
      state.currentPhase.set('question');
      state.questionTime.set(0);
      expect(progressPercent.get()).toBe(0);
    });
  });

  describe('timerDisplayText computed signal', () => {
    it('should show "Ready" when quiz is inactive', () => {
      state.isQuizActive.set(false);
      expect(timerDisplayText.get()).toBe('Ready');
    });

    it('should show phase and time during quiz', () => {
      state.isQuizActive.set(true);
      state.currentPhase.set('question');
      state.timeRemaining.set(3.5);
      expect(timerDisplayText.get()).toBe('Question: 3.5s');

      state.currentPhase.set('answer');
      state.timeRemaining.set(1.2);
      expect(timerDisplayText.get()).toBe('Answer: 1.2s');
    });
  });

  describe('isGradingPhase computed signal', () => {
    it('is true only while the answer is showing in an active quiz', () => {
      state.isQuizActive.set(false);
      state.currentPhase.set('answer');
      expect(isGradingPhase.get()).toBe(false);

      state.isQuizActive.set(true);
      state.currentPhase.set('question');
      expect(isGradingPhase.get()).toBe(false);

      state.currentPhase.set('answer');
      expect(isGradingPhase.get()).toBe(true);
    });
  });

  describe('session tally signals', () => {
    it('track correct and incorrect counts independently', () => {
      state.sessionCorrect.set(state.sessionCorrect.get() + 1);
      state.sessionCorrect.set(state.sessionCorrect.get() + 1);
      state.sessionIncorrect.set(state.sessionIncorrect.get() + 1);
      expect(state.sessionCorrect.get()).toBe(2);
      expect(state.sessionIncorrect.get()).toBe(1);
    });
  });
});
