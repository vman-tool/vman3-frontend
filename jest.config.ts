import type { Config } from 'jest';

const config: Config = {
  preset: 'jest-preset-angular',
  setupFilesAfterEnv: ['<rootDir>/setup-jest.ts'],
  testEnvironment: 'jsdom',

  // A handful of deps (ng2-charts, lodash-es, ...) ship ES modules with no
  // CommonJS build. Jest ignores node_modules by default, so these need to
  // be transformed too instead of loaded as-is.
  transformIgnorePatterns: [
    'node_modules/(?!.*\\.mjs$|lodash-es|ng2-charts|chart\\.js|chartjs-.*)',
  ],

  // Mirrors the "paths" entries in tsconfig.json (app/*, assets/*) so
  // non-relative imports like `from 'app/app.service'` resolve under Jest.
  moduleNameMapper: {
    '^app/(.*)$': '<rootDir>/src/app/$1',
    '^assets/(.*)$': '<rootDir>/src/assets/$1',
  },

  collectCoverageFrom: [
    'src/app/**/*.ts',
    '!src/app/**/*.spec.ts',
    '!src/app/**/*.module.ts',
    '!src/app/**/interface.ts',
    '!src/main.ts',
  ],
  coverageDirectory: '<rootDir>/coverage/vman3-frontend',
};

export default config;
