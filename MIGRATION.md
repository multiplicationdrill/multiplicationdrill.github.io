# Migration Guide: HTML to TypeScript

This guide documents the migration from the original single HTML file to a TypeScript-based Vite project.

## What Changed

### Project Structure
- **Before**: Single `index.html` file with inline CSS and JavaScript
- **After**: Modular TypeScript files with proper separation of concerns

### Build System
- **Before**: No build system, direct browser execution
- **After**: Vite for development and production builds

### Type Safety
- **Before**: Plain JavaScript with no type checking
- **After**: Full TypeScript with strict type checking

### Testing
- **Before**: No automated tests
- **After**: Comprehensive test suite with Vitest

### CI/CD
- **Before**: Manual deployment
- **After**: Automated GitHub Actions pipeline

## Key Improvements

1. **Testability**: All logic is now unit tested
2. **Maintainability**: Code is modular and typed
3. **Performance**: Vite provides optimized production builds
4. **Developer Experience**: Hot module replacement, type checking, linting

## Migration Steps Taken

1. **Extracted Signal System** (`src/signals.ts`)
   - Preserved the exact reactive behavior
   - Added TypeScript types
   - Made it testable

2. **Separated State Management** (`src/state.ts`)
   - Centralized all application state
   - Kept computed signals intact

3. **Modularized Utilities** (`src/utils.ts`)
   - Extracted helper functions
   - Added proper error handling

4. **Preserved All Functionality**
   - Quiz mode works identically
   - Manual mode unchanged
   - Settings persistence maintained
   - Theme switching preserved
   - Animations and styling intact

## No Breaking Changes (initial migration)

The initial HTML-to-TypeScript migration behaved exactly the same as before:
- All features worked identically
- LocalStorage keys were unchanged
- UI/UX was preserved
- No user-facing changes

> **Note:** This "no breaking changes" statement applies to the original
> migration only. The later feature overhaul described below **does** change
> behaviour and the settings shape. See the next section.

## For Developers

### Running Locally

```bash
# Install dependencies
yarn install

# Start dev server (replaces opening HTML file)
yarn dev
```

### Making Changes

1. TypeScript will catch type errors at compile time
2. Tests ensure functionality isn't broken
3. Linter maintains code quality
4. CI/CD automates deployment

### Adding Features

The modular structure makes it easy to:
- Add new quiz modes
- Implement additional math operations
- Create new UI components
- Extend the signal system

## Benefits of Migration

1. **Reliability**: Tests prevent regressions
2. **Scalability**: Modular architecture supports growth
3. **Collaboration**: TypeScript and tests make it easier for others to contribute
4. **Performance**: Optimized builds and code splitting
5. **Modern Tooling**: Latest development tools and practices

---

# Later Changes: Feature Overhaul

A subsequent overhaul reworked how difficulty is defined, added spaced
repetition and self-assessment, and **removed manual mode entirely**. Unlike the
original migration, this round includes intentional breaking changes.

## New Modules

- **`src/difficulty.ts`** — a cognitive-cost difficulty model covering the full
  `0–99 × 0–99` table. Difficulty is now the cost of the cheapest mental strategy
  for a problem rather than a fixed operand range, and trivial `×0`/`×1` problems
  are excluded. See [DIFFICULTY.md](DIFFICULTY.md).
- **`src/srs.ts`** — a pure Leitner-box spaced-repetition scheduler that chooses
  the next problem: no immediate repeats, correct answers parked longer, missed
  problems resurfaced soon.

## Removed: Manual Mode

The entire manual mode was removed: the Increment and Reset buttons, the
auto-update checkbox and its 3-second interval, the visibility-change handling,
the `counter` and `seed` signals, and the `increment` / `reset` /
`toggleAutoUpdate` global handlers. The app is now purely a timed, self-graded
drill.

## New UI

- ✓ / ✗ self-assessment buttons shown during the answer phase; tapping advances
  immediately.
- A session tally of correct and incorrect answers.
- Keyboard shortcuts for grading (→ / `C` for correct, ← / `X` for incorrect),
  layered on top of touch/click.
- The status panel now shows **Quiz State**, **Correct**, and **Incorrect**
  (the old **Mode** and **Last Update** rows were removed).

## Breaking Changes

### Settings shape (`mathQuizSettings`)

The `autoUpdate` field was dropped from the persisted `Settings` object. The
current shape is:

```ts
interface Settings {
  readonly questionTime: number;
  readonly answerTime: number;
  readonly difficulty: DifficultyLevel; // 1..4
}
```

Old settings that still contain `autoUpdate` load without error — the extra
field is simply ignored — so no manual migration is required.

### New localStorage key (`mathQuizProgress`)

Spaced-repetition progress is stored under a new key, `mathQuizProgress`. It is
versioned; anything corrupt or written by an incompatible version is discarded
and cleared on load so a fresh store can take over. This key is additive and does
not affect existing settings or theme keys.

### Difficulty semantics

The difficulty slider still ranges 1–4 with the same Easy/Medium/Hard/Expert
labels, but the problems each tier produces are entirely different: they are now
selected by cognitive cost across the full table rather than by a small operand
range. Existing saved difficulty values remain valid.
