import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/__tests__/**', 'src/main.ts', 'src/app.ts'],
      reporter: ['text', 'html', 'lcov', 'cobertura'],
    },
  },
});
