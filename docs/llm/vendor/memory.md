Purpose & context
Kushal is developing a TypeScript-based multiplication drill web application with React frontend and comprehensive E2E testing using Playwright. The project is deployed via GitHub Actions CI/CD pipeline to GitHub Pages, with all testing and deployment operations running in containerized environments rather than locally. The application features interactive quiz functionality with difficulty sliders, progress tracking, and theme toggling capabilities.
The primary objective is maintaining a robust, maintainable testing framework that follows Playwright best practices while ensuring reliable CI/CD deployment. Kushal works on Fedora Linux but emphasizes that the development workflow is designed around GitHub Actions execution rather than local testing, requiring solutions that work seamlessly in containerized CI environments.
Current state
Kushal has identified and is actively resolving critical Playwright test failures affecting the application's E2E test suite. Recent analysis revealed multiple fundamental issues: conflicting locator strategies using getByLabel() with elements that have both label tags and different aria-label attributes, improper slider interactions using fill() method instead of proper DOM event dispatching, unreliable theme toggle locators, and Unicode encoding problems with the multiplication symbol (×) appearing as garbled text in tests.
The codebase has been comprehensively analyzed and fixes are being implemented, including a complete rewrite of the Page Object Model using ID-based locators, proper slider interaction methods using evaluate() and dispatchEvent(), and Unicode escape sequences for reliable character matching across different browser environments.
Key learnings & principles
Kushal has learned to avoid problematic solutions that require sudo privileges or local system modifications, particularly after encountering issues with ChatGPT-provided solutions that used fragile sed commands and expected local execution. The focus has shifted to clean, complete file replacements rather than patch-based approaches.
Critical insights include the importance of using user-facing locators (getByRole(), getByLabel(), getByText()) over brittle CSS selectors, replacing hardcoded waits with web-first assertions that auto-wait for conditions, and ensuring proper SELinux context handling when using containerized testing on Fedora systems.
Approach & patterns
Development follows a containerized-first approach using Podman for local testing that mirrors the GitHub Actions CI environment. The workflow emphasizes comprehensive testing pipelines that include linting, type-checking, unit tests, and E2E tests in sequence through a unified test:all script.
Testing architecture uses Page Object Model patterns with TypeScript throughout, avoiding JavaScript files entirely. The approach prioritizes maintainable, enterprise-grade testing practices with proper trace collection, artifact uploads for debugging failed tests, and CI-optimized configurations.
Tools & resources

Primary stack: TypeScript, React, Playwright for E2E testing, Yarn for package management
CI/CD: GitHub Actions with browser caching and artifact management
Development environment: Fedora Linux with Podman containers for testing isolation
Testing infrastructure: Microsoft's official Playwright container images with volume mounts and SELinux context handling (:Z flags)
Code quality: ESLint with TypeScript-specific rules including @typescript-eslint/no-floating-promises for async operation safety

The project structure includes dedicated e2e testing directories with Page Object Models, comprehensive Playwright configuration optimized for CI environments, and HTML report generation for debugging test failures.
