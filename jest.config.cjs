/* eslint-disable */
const { pathsToModuleNameMapper } = require('ts-jest');
const { compilerOptions } = require('./tsconfig.json');

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testTimeout: 30000,
  verbose: true,
  rootDir: './',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths, { prefix: '<rootDir>/' }),
  transform: {
    '^.+\\.[tj]sx?$': ['ts-jest', { diagnostics: false }],
  },
  // Unit specs live next to their source files under apps/
  testMatch: ['<rootDir>/apps/**/*.spec.ts'],
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/dist/',
  ],
  collectCoverageFrom: [
    'apps/backend/src/**/*.ts',
    '!apps/backend/src/**/*.module.ts',
    '!apps/backend/src/**/*.dto.ts',
    '!apps/backend/src/**/*.schema.ts',
    '!apps/backend/src/**/main.ts',
    '!apps/backend/src/common/drizzle/schema/**',
    '!apps/backend/src/common/drizzle/drizzle.provider.ts',
    '!apps/backend/src/options/**',
  ],
  coverageThreshold: {
    global: {
      lines: 85,
      branches: 85,
    },
  },
};
