import base from '../../eslint.config.mjs';
import { testingImportPatterns } from '../../eslint.contracts-testing.mjs';

const betterAuthPath = {
  name: '@thallesp/nestjs-better-auth',
  message: 'Use @CurrentUser() and @AllowAnonymous() from src/common/auth instead (ADR 0029).',
};

// ADR 0048 point 10: the provider SDK makes its own HTTPS calls to a fixed host, so it is confined to
// one file (and the spec that proves no real client is built in tests).
const anthropicPath = {
  name: '@anthropic-ai/sdk',
  message:
    'Only src/ai/providers/anthropic-ai.provider.ts may import the provider SDK (ADR 0048); every other outbound call goes through SafeFetcherService.',
};

const anthropicAllowedFiles = [
  'src/ai/providers/anthropic-ai.provider.ts',
  'src/ai/providers/real-client.guard.spec.ts',
];

export default [
  ...base,
  {
    // ADR 0029: feature modules get the user through `@CurrentUser()` and open routes through our
    // `@AllowAnonymous()`. The integration's own `Session`, `OptionalAuth`, `Public` and `Roles`
    // are untyped or bypass the allow-list, so the package is only imported by the auth wiring.
    files: ['src/**/*.ts'],
    ignores: ['src/auth/**', 'src/common/auth/**', ...anthropicAllowedFiles],
    rules: {
      'no-restricted-imports': [
        'error',
        { paths: [betterAuthPath, anthropicPath], patterns: testingImportPatterns },
      ],
    },
  },
  {
    // The only files that may import the provider SDK still may not import the auth package.
    files: anthropicAllowedFiles,
    rules: {
      'no-restricted-imports': [
        'error',
        { paths: [betterAuthPath], patterns: testingImportPatterns },
      ],
    },
  },
];
