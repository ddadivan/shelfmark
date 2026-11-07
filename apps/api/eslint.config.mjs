import base from '../../eslint.config.mjs';
import { testingImportPatterns } from '../../eslint.contracts-testing.mjs';

export default [
  ...base,
  {
    // ADR 0029: feature modules get the user through `@CurrentUser()` and open routes through our
    // `@AllowAnonymous()`. The integration's own `Session`, `OptionalAuth`, `Public` and `Roles`
    // are untyped or bypass the allow-list, so the package is only imported by the auth wiring.
    files: ['src/**/*.ts'],
    ignores: ['src/auth/**', 'src/common/auth/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@thallesp/nestjs-better-auth',
              message:
                'Use @CurrentUser() and @AllowAnonymous() from src/common/auth instead (ADR 0029).',
            },
          ],
          patterns: testingImportPatterns,
        },
      ],
    },
  },
];
