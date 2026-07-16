# Multiplication Drill

[![CI/CD Pipeline](https://github.com/multiplicationdrill/multiplicationdrill.github.io/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/multiplicationdrill/multiplicationdrill.github.io/actions/workflows/ci-cd.yml)
[![codecov](https://codecov.io/gh/multiplicationdrill/multiplicationdrill.github.io/branch/master/graph/badge.svg)](https://codecov.io/gh/multiplicationdrill/multiplicationdrill.github.io)

A reactive math quiz application built with TypeScript and a custom signal-based state management system.

**Live Demo**: [https://multiplicationdrill.github.io](https://multiplicationdrill.github.io)

## Features

- **Timed multiplication drill**: Each problem is shown for a configurable
  question time, then the answer is revealed for a configurable answer time,
  then the next problem appears automatically.
- **Cognitive difficulty levels**: Easy, Medium, Hard, and Expert, graded by how
  hard a problem is to work out *in your head* rather than by the size of the
  numbers. The full `0–99 × 0–99` table is available, trivial `×0`/`×1` problems
  are excluded, and shortcuts are recognised — so `64 × 10` and `25 × 4` are Easy
  while `7 × 8` is Medium. See [DIFFICULTY.md](DIFFICULTY.md) for the full model.
- **Self-assessment**: During the answer phase, mark whether you got it right
  with the large ✓ / ✗ buttons. Tapping advances immediately to the next problem.
- **Spaced repetition**: A Leitner-box scheduler avoids immediate repeats, parks
  problems you know for longer, and brings problems you miss back soon. Progress
  persists across sessions.
- **Session stats**: A running tally of correct and incorrect answers for the
  current session.
- **Keyboard shortcuts**: On desktop, grade with the arrow keys (→ correct,
  ← incorrect) or `C` / `X`. Touch and click work everywhere.
- **Accessibility**: ARIA labels on interactive elements, visible focus
  indicators, and keyboard-accessible sliders.
- **Dark/Light theme**: Toggle with a persistent preference.
- **Responsive design**: Works on desktop and mobile, with touch targets sized
  for comfortable tapping.
- **Settings persistence**: Preferences are saved locally with debounced writes.

## Technology Stack

- **TypeScript**: For type-safe code
- **Vite 8 (Rolldown)**: Fast build tool and dev server
- **Custom Signal System**: Reactive state management inspired by SolidJS
- **Vitest**: Unit testing framework
- **Playwright**: End-to-end testing across Chromium, Firefox, and WebKit,
  run in a container for parity with CI
- **GitHub Actions**: CI/CD pipeline
- **GitHub Pages**: Hosting

## Development

### Prerequisites

- Node.js 22+ and Yarn
- Podman (for the containerized end-to-end tests)

### Setup

```bash
# Clone the repository
git clone https://github.com/multiplicationdrill/multiplicationdrill.github.io.git
cd multiplicationdrill.github.io

# Install dependencies
yarn install

# Run development server
yarn dev
```

### Available Scripts

- `yarn dev` - Start development server
- `yarn build` - Type-check and build for production
- `yarn test` - Run unit tests in watch mode
- `yarn test:run` - Run unit tests once
- `yarn test:coverage:ci` - Run unit tests with coverage
- `yarn test:e2e` - Run end-to-end tests (expects Playwright browsers available)
- `yarn e2e:container:build` - Build the E2E test container image
- `yarn e2e:container` - Run E2E tests in the container (CI mode)
- `yarn e2e:containernoci` - Run E2E tests in the container (local, interactive)
- `yarn lint` - Run ESLint (zero warnings allowed)
- `yarn type-check` - Type-check without emitting
- `yarn test:all` - Full pipeline: lint → type-check → unit tests → build and run the E2E container

## Architecture

### Signal System

The application uses a custom reactive signal system for state management:

- **Signal**: Holds a value and notifies observers when it changes
- **ComputedSignal**: Derives values from other signals, with automatic dependency tracking
- **effect**: Runs side effects when dependencies change

### Difficulty & Spaced Repetition

Two pure, side-effect-free modules power the drill and are documented in detail
in [DIFFICULTY.md](DIFFICULTY.md):

- **`difficulty.ts`** scores each problem by the cost of the cheapest mental
  strategy and buckets it into a tier.
- **`srs.ts`** implements the Leitner-box scheduler that chooses which problem to
  show next.

### Project Structure

```
src/
├── __tests__/       # Unit tests
├── signals.ts       # Signal system implementation
├── types.ts         # TypeScript type definitions
├── difficulty.ts    # Cognitive-cost difficulty model
├── srs.ts           # Spaced-repetition scheduler
├── utils.ts         # Utility functions and persistence
├── state.ts         # Application state
├── app.ts           # Main application logic
├── main.ts          # Entry point
└── style.css        # Styles

e2e/
├── pages/           # Page Object Models
└── quiz.spec.ts     # End-to-end tests

Additional files:
├── index.html       # HTML template
├── DIFFICULTY.md    # Difficulty & spaced-repetition design notes
├── vite.config.ts   # Vite configuration
├── vitest.config.ts # Vitest configuration
├── tsconfig.json    # TypeScript configuration
├── package.json     # Dependencies and scripts
└── .github/
    └── workflows/
        └── ci-cd.yml # GitHub Actions pipeline
```

## Testing

The project uses Vitest for unit testing and Playwright for end-to-end testing:

```bash
# Run unit tests once
yarn test:run

# Run unit tests with coverage
yarn test:coverage:ci

# Build and run the E2E container (matches CI)
yarn e2e:container:build
yarn e2e:containernoci

# Run the full pipeline
yarn test:all
```

The unit suite covers the signal system, the difficulty model, the
spaced-repetition scheduler, state computations, and utilities including
localStorage persistence and debouncing. The end-to-end suite exercises the full
quiz lifecycle, self-grading (tap and keyboard), the session tally, settings,
theme switching, and mobile layout.

The end-to-end tests run inside a container built from Microsoft's official
Playwright image. This keeps browser and system-library versions consistent with
CI and avoids host mismatches; the `:Z` volume flag in the scripts is required
for SELinux systems such as Fedora.

## Deployment

The application is automatically deployed to GitHub Pages when changes are pushed to the master branch:

1. Tests run on the configured Node.js versions
2. Linting and type checking are performed
3. If all checks pass, the app is built and deployed
4. Deployment uses GitHub's native Pages action

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Quality

- All code must pass TypeScript type checking
- ESLint must pass with no warnings
- All tests must pass
- New features should include tests

## Recent Changes

- **Feature overhaul**: Cognitive-cost difficulty model over the full 0–99
  table, self-assessment with ✓/✗ buttons, spaced repetition with persistent
  progress, a session tally, and keyboard shortcuts. Manual mode was removed.
- **Toolchain modernization**: TypeScript 6, Vite 8 (Rolldown), Vitest 4, ESLint
  10 flat config, and containerized Playwright E2E via Podman.
- **Accessibility & performance**: ARIA support, keyboard navigation, focus
  indicators, and debounced localStorage writes.

## License

This project is open source and available under the AGPL license.

---

*Notice: This project contains code generated by Large Language Models such as Claude and Gemini. All code is experimental whether explicitly stated or not.*
