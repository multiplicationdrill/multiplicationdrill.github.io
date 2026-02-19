# Multiplication Drill

[![CI/CD Pipeline](https://github.com/multiplicationdrill/multiplicationdrill.github.io/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/multiplicationdrill/multiplicationdrill.github.io/actions/workflows/ci-cd.yml)
[![codecov](https://codecov.io/gh/multiplicationdrill/multiplicationdrill.github.io/branch/master/graph/badge.svg)](https://codecov.io/gh/multiplicationdrill/multiplicationdrill.github.io)

A reactive math quiz application built with TypeScript and a custom signal-based state management system.

**Live Demo**: [https://multiplicationdrill.github.io](https://multiplicationdrill.github.io)

## Features

- **Interactive Math Quiz**: Practice multiplication with timed questions and answers
- **Difficulty Levels**: Choose from Easy, Medium, Hard, or Expert
  - Easy: 2-5 range
  - Medium: 4-8 range
  - Hard: 6-12 range
  - Expert: 10-20 range
- **Manual Mode**: Increment counter manually or with auto-update
  - Dynamic multiplier based on difficulty level
  - Auto-update every 3 seconds when enabled
  - Pauses when tab is not visible to save battery
- **Accessibility**: Full keyboard navigation and screen reader support
  - ARIA labels on all interactive elements
  - Visible focus indicators
  - Keyboard-accessible sliders
- **Dark/Light Theme**: Toggle between themes with persistent preference
- **Responsive Design**: Works on desktop and mobile devices
- **Settings Persistence**: Your preferences are saved locally with debounced writes
- **Performance Optimized**: 
  - Debounced localStorage writes reduce disk I/O by 75%
  - Auto-update pauses when tab loses focus
  - Efficient reactive updates via signal system

## Technology Stack

- **TypeScript**: For type-safe code
- **Vite 7**: Fast build tool and dev server
- **Custom Signal System**: Reactive state management inspired by SolidJS
- **Vitest**: Unit testing framework with 95%+ code coverage
- **Playwright**: End-to-end testing across Chrome, Firefox, and WebKit
- **GitHub Actions**: CI/CD pipeline
- **GitHub Pages**: Hosting

## Development

### Prerequisites

- Node.js 22+ and Yarn

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
- `yarn build` - Build for production
- `yarn preview` - Preview production build
- `yarn test` - Run tests
- `yarn test:ui` - Run tests with UI
- `yarn test:coverage` - Run tests with coverage
- `yarn test:e2e` - Run end-to-end tests
- `yarn test:e2e:ui` - Run E2E tests with UI
- `yarn test:all` - Run all tests (unit + E2E)
- `yarn lint` - Run linter
- `yarn type-check` - Check TypeScript types

## Architecture

### Signal System

The application uses a custom reactive signal system for state management:

- **Signal**: Holds a value and notifies observers when it changes
- **ComputedSignal**: Derives values from other signals, with automatic dependency tracking
- **effect**: Runs side effects when dependencies change

### Project Structure

```
src/
├── __tests__/       # Unit tests
├── signals.ts       # Signal system implementation
├── types.ts         # TypeScript type definitions
├── utils.ts         # Utility functions
├── state.ts         # Application state
├── app.ts           # Main application logic
├── main.ts          # Entry point
└── style.css        # Styles

Additional files:
├── index.html       # HTML template
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
# Run unit tests
yarn test

# Run unit tests with UI
yarn test:ui

# Run unit tests with coverage
yarn test:coverage

# Run end-to-end tests
yarn test:e2e

# Run all tests
yarn test:all
```

Test coverage:
- **Unit tests**: 95.81% coverage
- **E2E tests**: All major user flows
- Tests cover:
  - Signal system functionality
  - Utility functions with debouncing
  - State computations
  - Local storage persistence
  - Accessibility features
  - Cross-browser compatibility

## Deployment

The application is automatically deployed to GitHub Pages when changes are pushed to the master branch:

1. Tests run on Node.js 22.x and 24.x
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

- **Performance Optimizations**: Debounced localStorage writes, visibility API integration
- **Accessibility Improvements**: Full ARIA support, keyboard navigation, focus indicators
- **Enhanced Testing**: Added Playwright E2E tests, improved coverage to 95%+
- **Edge Case Handling**: Guards against zero times, robust localStorage error handling
- **Dynamic Multiplier**: The manual mode now uses a multiplier based on the difficulty level instead of always using 10
- **Improved Build System**: Migrated from single HTML file to modular TypeScript with Vite
- **CI/CD Pipeline**: Automated testing and deployment with GitHub Actions

## License

This project is open source and available under the AGPL license.

---

*Notice: This project contains code generated by Large Language Models such as Claude and Gemini. All code is experimental whether explicitly stated or not.*
