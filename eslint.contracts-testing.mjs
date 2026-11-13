/**
 * Mock fixtures in `@shelfmark/contracts/testing` and the component harnesses in
 * `@shelfmark/ui/testing` are for specs, stories and mock folders only, so app code never bundles them.
 * Flat config replaces a rule's options when a later entry sets it, so configs that set
 * `no-restricted-imports` themselves (eslint.angular.mjs) spread `testingImportPatterns` into their list.
 */
export const testingImportPatterns = [
  {
    group: ['@shelfmark/contracts/testing', '@shelfmark/contracts/testing/*'],
    message: 'Mock fixtures are only for specs, stories and testing/ or mock folders.',
  },
  {
    group: ['@shelfmark/ui/testing', '@shelfmark/ui/testing/*'],
    message: 'Component harnesses are only for specs and testing/ folders.',
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
