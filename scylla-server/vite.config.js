import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    singleThread: true,
    include: ['**/*.test.ts'],
    globals: true,
    singleThread: true
  }
});
