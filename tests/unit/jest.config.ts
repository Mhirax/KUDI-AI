import type { Config } from 'jest';

const config: Config = {
  displayName: 'unit',
  testEnvironment: 'node',
  rootDir: '../../',
  testMatch: ['**/*.spec.ts'],
  transform: { '^.+\\.ts$': 'ts-jest' },
  collectCoverageFrom: ['modules/**/*.ts', 'shared/**/*.ts', '!**/*.spec.ts'],
  coverageThreshold: {
    global: { branches: 80, functions: 80, lines: 80, statements: 80 },
  },
};

export default config;
