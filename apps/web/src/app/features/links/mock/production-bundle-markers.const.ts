/**
 * Literal strings that must never appear in the production bundle (`dist/apps/web/browser`):
 * they survive minification and exist only in the mocks and the e2e harness.
 * Imported by `scripts/check-production-bundle.mjs`, so keep this file free of imports.
 */
export const PRODUCTION_BUNDLE_MARKERS = [
  'angular.dev/overview',
  'unreachable.example',
  'save-fails.example',
  'Mock: preview failed',
  'Mock: save failed',
  'patch-fails.example',
  'delete-fails.example',
  'Mock: update failed',
  'Mock: delete failed',
  'Mock: list failed',
  'sm-mock-links-scenario',
  'Saved article',
  'Note for article',
  '.example.com/articles/',
  '__e2e/add-link',
] as const;
