import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
    exclude: [
      'node_modules/**',
      'dist/**',
      'coverage/**',
      'e2e/**',
      '**/*.d.ts',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/**',
        'dist/**',
        'coverage/**',
        '**/*.d.ts',
        '**/*.config.*',
        '**/*.cjs',
        'scripts/**',
        'src/__tests__/**',
        'src/main.ts', // Entry point is mostly DOM manipulation
        'src/app.ts', // Mostly DOM manipulation, hard to test without full integration tests
        'e2e/**',
      ],
      include: [
        'src/**/*.ts',
      ],
      all: true, // Include all matching source files in coverage
    },
  },
});
