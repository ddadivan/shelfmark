/**
 * Literal strings that must never appear in the production bundle (`dist/apps/web/browser`):
 * they survive minification and exist only in the mocks. The bundle check script
 * (`scripts/check-production-bundle.mjs`) greps for them.
 */
export const PRODUCTION_BUNDLE_MARKERS = [
  'angular.dev/overview',
  'unreachable.example',
  'save-fails.example',
  'Mock: preview failed',
  'Mock: save failed',
] as const;
