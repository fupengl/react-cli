/*
 * For a detailed explanation regarding each configuration property and type check, visit:
 * https://jestjs.io/docs/en/configuration.html
 */

/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  verbose: true,
  clearMocks: true,
  coverageDirectory: 'coverage',
  testEnvironment: 'node',
  testMatch: [
    '**/*.+(spec|test).[tj]s?(x)',
    '!**/__fixtures__/**'
  ],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },
  preset: 'ts-jest/presets/default-esm',
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: './tsconfig.json',
        useESM: true
      }
    ]
  },
  transformIgnorePatterns: ['node_modules', '\\.pnp\\.[^\\/]+$'],
  extensionsToTreatAsEsm: ['.ts'],
  resolver: './__mock__/resolver.cjs',
}
