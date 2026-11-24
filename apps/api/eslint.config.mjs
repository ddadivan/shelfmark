import base from '../../eslint.config.mjs';
import { testingImportPatterns } from '../../eslint.contracts-testing.mjs';

const betterAuthPath = {
  name: '@thallesp/nestjs-better-auth',
  message: 'Use @CurrentUser() and @AllowAnonymous() from src/common/auth instead (ADR 0029).',
};

// ADR 0049 point 10: the provider SDK makes its own HTTPS calls to a fixed host, so it is confined to
// one file (and the spec that proves no real client is built in tests).
const anthropicPath = {
  name: '@anthropic-ai/sdk',
  message:
    'Only src/ai/providers/anthropic-ai.provider.ts may import the provider SDK (ADR 0049); every other outbound call goes through SafeFetcherService.',
};

const anthropicAllowedFiles = [
  'src/ai/providers/anthropic-ai.provider.ts',
  'src/ai/providers/real-client.guard.spec.ts',
];

// ADR 0054 point 2: the MCP SDK is a devDependency for the conformance spec only; the server is our
// own handler, so nothing of the SDK may reach the API bundle.
const mcpSdkPattern = {
  group: ['@modelcontextprotocol/*', '@modelcontextprotocol/**'],
  message:
    'The MCP SDK is test-only (ADR 0054): import it in *.spec.ts only; the server is src/mcp/.',
};
// ADR 0052: Voyage embeddings are one POST to a pinned host with plain `fetch`, so `fetch` is confined
// to that provider and the Sentry tunnel; every other outbound request goes through SafeFetcherService.
const fetchAllowedFiles = [
  'src/ai/providers/voyage-embedding.provider.ts',
  'src/monitoring/monitoring.service.ts',
];

// Raw HTTP clients would bypass the SSRF guard just like `fetch`: only SafeFetcherService builds
// requests with `node:http` / `node:https` (types and `STATUS_CODES` stay free), and `undici` is not
// imported at all. A separate rule name, so it stacks with the import rules below.
const networkMessage =
  'Outbound HTTP goes through SafeFetcherService (PROJECT.md 5.8, ADR 0050, ADR 0052).';
const networkClientNames = ['default', 'request', 'get', 'Agent', 'globalAgent'];
const networkPaths = [
  ...['http', 'https', 'node:http', 'node:https'].map((name) => ({
    name,
    importNames: networkClientNames,
    allowTypeImports: true,
    message: networkMessage,
  })),
  ...['undici', 'node:undici'].map((name) => ({ name, message: networkMessage })),
];

// Web Push (Shelf 12-notify): `web-push` POSTs to the push service endpoint a browser gave, so it is
// confined to the sender, which re-checks the endpoint against the push service host allow-list.
const webPushAllowedFile = 'src/notifications/push/web-push.sender.ts';
const webPushPath = {
  name: 'web-push',
  message:
    'Only src/notifications/push/web-push.sender.ts may import web-push (allow-listed push service hosts).',
};

export default [
  ...base,
  {
    files: ['src/**/*.ts'],
    ignores: ['src/**/*.spec.ts', ...fetchAllowedFiles],
    rules: {
      'no-restricted-globals': [
        'error',
        {
          name: 'fetch',
          message:
            'Outbound HTTP goes through SafeFetcherService; only the Voyage provider and the Sentry tunnel call fetch (ADR 0050, ADR 0052).',
        },
      ],
      'no-restricted-properties': [
        'error',
        {
          object: 'globalThis',
          property: 'fetch',
          message:
            'Outbound HTTP goes through SafeFetcherService; only the Voyage provider and the Sentry tunnel call fetch (ADR 0050, ADR 0052).',
        },
        {
          object: 'global',
          property: 'fetch',
          message:
            'Outbound HTTP goes through SafeFetcherService; only the Voyage provider and the Sentry tunnel call fetch (ADR 0050, ADR 0052).',
        },
      ],
    },
  },
  {
    files: ['src/**/*.ts'],
    ignores: ['src/**/*.spec.ts', 'src/fetcher/safe-fetcher.service.ts', webPushAllowedFile],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        { paths: [...networkPaths, webPushPath] },
      ],
    },
  },
  {
    // The Web Push sender may import `web-push`, but no raw HTTP client either.
    files: [webPushAllowedFile],
    rules: {
      '@typescript-eslint/no-restricted-imports': ['error', { paths: networkPaths }],
    },
  },
  {
    // ADR 0029: feature modules get the user through `@CurrentUser()` and open routes through our
    // `@AllowAnonymous()`. The integration's own `Session`, `OptionalAuth`, `Public` and `Roles`
    // are untyped or bypass the allow-list, so the package is only imported by the auth wiring.
    files: ['src/**/*.ts'],
    ignores: ['src/auth/**', 'src/common/auth/**', ...anthropicAllowedFiles],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [betterAuthPath, anthropicPath],
          patterns: [...testingImportPatterns, mcpSdkPattern],
        },
      ],
    },
  },
  {
    // Specs may import the MCP SDK (the conformance spec); every other restriction stays.
    files: ['src/**/*.spec.ts'],
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
        { paths: [betterAuthPath], patterns: [...testingImportPatterns, mcpSdkPattern] },
      ],
    },
  },
];
