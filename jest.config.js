/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  testMatch: [
    '**/__tests__/**/*.[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)',
    '<rootDir>/src/domain/**/*.test.ts',
  ],
  // Agent git worktrees live under .claude/worktrees — other branches' checkouts.
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/.claude/'],
  modulePathIgnorePatterns: ['<rootDir>/.claude/'],
};
