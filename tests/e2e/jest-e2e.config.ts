import type { Config } from 'jest';

const config: Config = {
  displayName: 'e2e',
  testEnvironment: 'node',
  rootDir: '../../',
  testMatch: ['**/*.e2e-spec.ts'],
  transform: { '^.+\\.ts$': 'ts-jest' },
};

export default config;
