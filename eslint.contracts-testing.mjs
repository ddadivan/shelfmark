/**
 * Mock fixtures in `@shelfmark/contracts/testing` are for specs, stories and mock folders only.
 * Flat config replaces a rule's options when a later entry sets it, so configs that set
 * `no-restricted-imports` themselves (eslint.angular.mjs) spread `testingImportPatterns` into their list.
 */
export const testingImportPatterns = [
  {
    group: ['@shelfmark/contracts/testing', '@shelfmark/contracts/testing/*'],
    message: 'Mock fixtures are only for specs, stories and testing/ or mock folders.',
  },
];

/** Files allowed to import the fixtures. */
export const testingImportAllowedFiles = [
  '**/*.spec.ts',
  '**/*.stories.ts',
  '**/testing/**',
  '**/mock/**',
  '**/mocks/**',
];
