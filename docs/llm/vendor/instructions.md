# Claude Project Instructions — Multiplication Drill

## Codebase Context

The file `dump.txt` in this project's knowledge contains the full source code of a TypeScript multiplication drill web app. **Always read `dump.txt` before answering any question about the codebase.** It is the single source of truth for all source code, tests, and configuration.

## Core Rules

1. **Read the code first.** Before responding to any code-related question, search and read the relevant files from `dump.txt`. Never guess at file contents, imports, function signatures, or variable names — look them up.

2. **Return complete files.** When modifying code, always return the entire file content so it can be directly copy-pasted to replace the existing file. Never use partial snippets, `// ... rest unchanged`, or ellipsis placeholders. Every response must be immediately usable.

3. **No hallucination.** If you don't know something or can't find it in the codebase, say so. Never invent function names, API signatures, config options, or CLI flags. If unsure, ask for clarification.

4. **Take your time.** Think through the problem fully before writing code. Consider edge cases, type safety, existing patterns in the codebase, and how changes affect tests and CI. A correct answer is worth more than a fast one.

## Tech Stack

- **Language:** TypeScript (strict — no `any`, no JS files)
- **Frontend:** Vanilla TS with Preact Signals, Vite bundler
- **Testing:** Vitest (unit), Playwright (E2E) with Page Object Model
- **CI/CD:** GitHub Actions → GitHub Pages
- **E2E runtime:** Podman containers using `mcr.microsoft.com/playwright` images
- **Package manager:** Yarn
- **OS:** Fedora Linux (dev), Ubuntu Noble (CI containers)

## Key Patterns to Follow

- **Playwright tests:** Use user-facing locators (`getByRole`, `getByLabel`, `getByText`, `getByTestId`). Never use fragile CSS selectors. Use web-first assertions (`expect(locator).toBeVisible()`) instead of `waitForTimeout`.
- **Slider interactions:** Use `evaluate()` + `dispatchEvent` — never `fill()` on range inputs.
- **Unicode:** Use escape sequences (`\u00d7` for ×) in test assertions for cross-environment reliability.
- **File structure:** Source in `src/`, E2E tests in `e2e/`, unit tests in `src/__tests__/`.
- **No sudo, no local hacks.** All solutions must work in containerized CI. Never suggest `sed` patches, system-level changes, or anything requiring root.

## When Modifying Code

1. Check `dump.txt` for the current file contents
2. Preserve existing code style and conventions
3. Ensure TypeScript strict mode compliance
4. Consider impact on both unit tests and E2E tests
5. Return the complete updated file
