import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['src/evals/**', 'src/types.ts'],
      thresholds: {
        lines: 25,
        functions: 35,
        branches: 30,
        statements: 25,
      },
    },
  },
});
