import type { Config } from 'jest';

const config: Config = {
  displayName: 'integration',
  testEnvironment: 'node',
  rootDir: '../../',
  testMatch: ['**/*.integration-spec.ts'],
  transform: { '^.+\\.ts$': 'ts-jest' },
  testTimeout: 30000,
};

export default config;
