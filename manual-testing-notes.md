# Comprehensive Testing Notes - Multiplication Drill Application

## 1. Visual and Theme Testing

### Dark/Light Mode Toggle
- **Location**: Top-right corner (🌓 button)
- **Test Cases**:
  1. Default state should be dark mode
  2. Click toggle → switches to light mode (rainbow gradient background animation)
  3. Click again → returns to dark mode
  4. Theme preference persists after page reload
  5. Verify all UI elements remain readable in both themes
  6. Check contrast ratios meet accessibility standards

## 2. Quiz Flow Testing

### Basic Quiz Flow
1. **Before Starting**:
   - Display shows "Press Start Quiz"
   - Timer shows "Ready"
   - Grade buttons are hidden
   - Session counters (Correct / Incorrect) show 0
   - All settings sliders enabled

2. **Starting a Quiz**:
   - Click "Start Quiz" button
   - Button text changes to "Stop Quiz"
   - Display shows a multiplication problem (e.g., "7 × 8")
   - Progress bar begins filling
   - Timer shows "Question: X.Xs"
   - Settings sliders become disabled (grayed out)
   - Grade buttons appear, but are disabled during the question phase

3. **Question Phase**:
   - Problem displays without the answer for the configured duration
   - Progress bar fills from left to right (green gradient)
   - Timer counts down from the question time setting

4. **Answer Phase**:
   - Display shows the full equation with answer (e.g., "7 × 8 = 56")
   - Progress bar changes color (orange/yellow gradient)
   - Timer shows "Answer: X.Xs" and counts down
   - Grade buttons (✓ / ✗) become enabled

5. **Continuous Flow**:
   - If not graded, after the answer phase a new problem starts automatically
   - Problems should vary (no immediate repeats — see Spaced Repetition)
   - Quiz continues until manually stopped

6. **Stopping Quiz**:
   - Click "Stop Quiz" button
   - Display returns to "Press Start Quiz"
   - Settings sliders re-enable
   - Grade buttons hide
   - Timer shows "Ready"

## 3. Settings Configuration

### Question Time Slider
- **Range**: 1-30 seconds
- **Default**: 5 seconds
- **Test Cases**:
  1. Drag slider to minimum (1s) - verify "1s" displays
  2. Drag to maximum (30s) - verify "30s" displays
  3. Set to 10s, start quiz, verify the question displays for 10 seconds
  4. Cannot be adjusted during an active quiz
  5. Setting persists after page reload

### Answer Time Slider
- **Range**: 1-30 seconds
- **Default**: 3 seconds
- **Test Cases**:
  1. Similar to Question Time tests
  2. Verify the answer phase uses this duration
  3. Can be different from the question time

### Difficulty Slider
- **Range**: 1-4 (Easy/Medium/Hard/Expert)
- **Default**: 3 (Hard)
- **Semantics**: Tiers reflect the **cognitive cost** of solving a problem in
  your head, not operand size. The full `0–99 × 0–99` table is used and trivial
  `×0`/`×1` problems never appear. See [DIFFICULTY.md](DIFFICULTY.md).
- **Test Cases**:
  1. **Easy (1)**: Simple facts and shortcut-friendly problems (e.g., `64 × 10`,
     `25 × 4`, small single-digit facts)
  2. **Medium (2)**: Harder single-digit facts and small two-digit × one-digit
     (e.g., `7 × 8`, `13 × 7`)
  3. **Hard (3)**: General two-digit × two-digit (e.g., `47 × 63`)
  4. **Expert (4)**: The hardest two-digit × two-digit (e.g., `78 × 89`)
  5. Slider label updates to the tier name (Easy/Medium/Hard/Expert)
  6. Cannot be changed during an active quiz
  7. Spot-check that problems shown in each tier feel appropriate to that tier

## 4. Self-Grading Testing

### Grade Buttons (✓ / ✗)
- **Location**: Below the timer, shown only during a quiz
- **Layout**: ✗ (incorrect) on the left, ✓ (correct) on the right
- **Test Cases**:
  1. Hidden entirely before the quiz starts and after it stops
  2. Visible but disabled during the question phase
  3. Enabled during the answer phase
  4. Tapping ✓ increments the Correct counter and immediately advances to the
     next problem
  5. Tapping ✗ increments the Incorrect counter and immediately advances
  6. After grading, the buttons return to disabled (new question phase) until the
     next answer is shown
  7. A problem can only be graded once per cycle (no double counting)

### Keyboard Shortcuts (desktop)
- **Test Cases**:
  1. During the answer phase, Right Arrow or `C` grades correct
  2. During the answer phase, Left Arrow or `X` grades incorrect
  3. Keys do nothing outside the answer phase
  4. Keyboard grading advances and updates counters just like tapping

### Session Counters
- **Test Cases**:
  1. Both start at 0 and reset to 0 each time a quiz starts
  2. Correct and Incorrect increment independently
  3. Counts accumulate across multiple problems within a session

## 5. Spaced Repetition Testing

Spaced repetition decides which problem appears next. Behaviour is time-based.

- **Test Cases**:
  1. **No immediate repeats**: Across a run of problems in the same tier, the
     same problem should not reappear back-to-back
  2. **Missed problems resurface soon**: Grade a problem incorrect; within a
     short time it should come back around
  3. **Known problems are parked**: Grade a problem correct; it should not
     reappear for a long time
  4. **Progress persists**: Answer several problems, reload the page, and
     continue — scheduling should reflect the earlier answers (stored under the
     `mathQuizProgress` localStorage key)
  5. **Corrupt/old progress is handled**: If `mathQuizProgress` is manually
     corrupted, the app should start cleanly rather than error

## 6. Display and Visual Feedback

### Main Display
- **Test Cases**:
  1. Font size is large and readable
  2. Has a subtle shine animation effect
  3. Shows different content based on state:
     - Idle: "Press Start Quiz"
     - Quiz Question: `[num1] × [num2]`
     - Quiz Answer: `[num1] × [num2] = [result]`

### Progress Bar
- **Test Cases**:
  1. Green gradient during the question phase
  2. Orange gradient during the answer phase
  3. Smooth animation from 0% to 100%
  4. Has a shimmer effect overlay
  5. Resets between phases

### Status Panel
- **Always Visible Information**:
  1. **Quiz State**: Shows "Stopped" or "Running"
  2. **Correct**: Session count of correct self-grades
  3. **Incorrect**: Session count of incorrect self-grades

## 7. Accessibility Testing

### Keyboard Navigation
1. **Tab Order**:
   - All interactive elements reachable via Tab key
   - Logical tab order (top to bottom, left to right)
   - Focus indicators visible on all elements

2. **Slider Controls**:
   - Arrow keys adjust values
   - Home/End keys jump to min/max
   - Values announced to screen readers

3. **ARIA Labels**:
   - All sliders have descriptive labels
   - Current values announced
   - Difficulty announces its name (Easy/Medium/Hard/Expert)
   - Grade buttons have descriptive labels ("I answered correctly" /
     "I answered incorrectly")

### Screen Reader Testing
- All controls properly labeled
- State changes announced
- Timer updates readable
- Quiz problems and answers announced

## 8. Performance and Edge Cases

### Browser Compatibility
- Test on Chrome, Firefox, Safari, Edge
- Mobile browsers (iOS Safari, Chrome Mobile)
- Verify animations are smooth on all platforms

### Local Storage
1. **Settings Persistence**:
   - Question time, answer time, difficulty
   - Survives page refresh
   - Handles corrupted storage gracefully

2. **Progress Persistence**:
   - Spaced-repetition state under `mathQuizProgress`
   - Survives page refresh
   - Rejects corrupt or incompatible-version data

3. **Theme Persistence**:
   - Dark/light mode preference saved
   - Applies immediately on page load

### Edge Cases to Test
1. **Rapid Interaction**:
   - Quickly toggle quiz on/off - no crashes or stuck states
   - Spam a grade button - counts once per problem, no double advance

2. **Extreme Settings**:
   - 1 second question + 1 second answer - still playable
   - 30 second timers - progress bar scales correctly

3. **Browser States**:
   - Page refresh during quiz - returns to the idle prompt
   - Multiple tabs open - each maintains independent session state
   - Private/incognito mode - works without localStorage

4. **Timing Precision**:
   - Timer counts down smoothly
   - No skipped numbers in the countdown
   - Phases transition at exactly 0.0s

## 9. Mobile Testing

### Responsive Design
1. **Small Screens** (< 600px):
   - Container fits screen width
   - Font sizes remain readable
   - All controls accessible
   - No horizontal scrolling

2. **Touch Interactions**:
   - Grade buttons have adequate touch targets (minimum 44×44px)
   - Tapping a grade button advances the quiz
   - Sliders draggable with touch
   - No hover-dependent functionality

3. **Orientation**:
   - Works in portrait and landscape
   - Layout adjusts appropriately

## 10. Data Validation

### Problems
1. Problems match the selected difficulty tier
2. Trivial `×0` and `×1` problems never appear
3. Products calculate correctly

### Timer Behavior
1. Never goes negative
2. Displays one decimal place consistently
3. Stops at exactly 0.0

## 11. User Experience Testing

### First-Time User
1. Interface intuitive without instructions
2. Default settings provide a good experience
3. Purpose of each control is clear

### Feedback and Responsiveness
1. All actions have immediate visual feedback
2. Disabled states clearly indicated
3. Loading/transition states smooth
4. No confusing delays or lag

## 12. Regression Testing Checklist

After any code changes, verify:
- [ ] Theme toggle works and persists
- [ ] Quiz start/stop functions correctly
- [ ] Idle display shows "Press Start Quiz"
- [ ] All sliders update values and labels
- [ ] Difficulty label shows the correct tier name
- [ ] Question → answer → next-problem cycle works
- [ ] Grade buttons hidden when idle, disabled in question phase, enabled in answer phase
- [ ] Tapping ✓ / ✗ advances immediately and updates the correct counter
- [ ] Keyboard shortcuts (→ / ← / C / X) grade during the answer phase
- [ ] Session counters reset on start and accumulate correctly
- [ ] No immediate problem repeats; missed problems resurface; known ones are parked
- [ ] Settings and progress save and restore after refresh
- [ ] Progress bar animations smooth
- [ ] Timer counts down accurately
- [ ] All sliders disable during quiz
- [ ] Status panel (Quiz State / Correct / Incorrect) updates correctly
- [ ] No console errors in the browser
- [ ] Mobile responsive design intact (grade targets ≥ 44px)
- [ ] Accessibility features functional

## 13. Automated Test Coverage

### Unit Tests (Vitest)
- Signal system
- Difficulty model: anchors (`64 × 10` Easy, `7 × 8` Medium), the `25 × 4`
  regression, whole-space commutativity, monotonicity, tier partition, and pool
  membership
- Spaced repetition: box promotion/demotion, cooldowns, immutability, and
  selection ordering (recency, due-first, resurfacing, introduction of unseen)
- State computations, including the grading-phase and session signals
- Utility functions: settings/progress/theme persistence and debouncing

### E2E Tests (Playwright)
- Full quiz lifecycle across browsers
- Self-grading via tap and keyboard, with session-count assertions
- Settings (tier names, slider values, ARIA)
- Theme switching
- Mobile layout and touch-target sizing

## Test Scenarios for QA

### Scenario 1: Complete Quiz Session
1. Set difficulty to Easy
2. Set question time to 3s, answer time to 2s
3. Start quiz
4. Grade a few problems with ✓ / ✗
5. Confirm the session counters track your grades
6. Stop quiz and confirm the idle prompt returns

### Scenario 2: Settings Persistence
1. Change all settings to non-default values
2. Switch to the light theme
3. Refresh the page
4. Verify all settings and the theme are retained

### Scenario 3: Spaced Repetition
1. Start a quiz on any tier
2. Deliberately grade one recurring problem incorrect and note it returns soon
3. Grade another correct and note it does not return for a while
4. Refresh mid-session and confirm scheduling continues sensibly

### Scenario 4: Accessibility Navigation
1. Unplug the mouse (desktop) or use the keyboard only
2. Tab through the entire interface
3. Adjust all sliders with arrow keys
4. Start the quiz, then grade using the arrow keys during the answer phase
5. Verify all functions are accessible

## Bug Reporting Template

When reporting issues, include:
1. **Browser**: (e.g., Chrome 120, Safari 17)
2. **Device**: (Desktop/Mobile, OS)
3. **Steps to Reproduce**:
   - Exact sequence of actions
   - Settings values if relevant
4. **Expected Behavior**:
5. **Actual Behavior**:
6. **Screenshot/Video**: If applicable
7. **Console Errors**: Open DevTools (F12) and check the Console tab
