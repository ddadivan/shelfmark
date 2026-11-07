/**
 * Literal strings that must never appear in the production bundle (`dist/apps/web/browser`):
 * they survive minification and exist only in the mocks and the e2e harness.
 * Consumed by `scripts/check-production-bundle.mjs` (added in #86); wired in when #73 is
 * combined with #86.
 */
export const PRODUCTION_BUNDLE_MARKERS = [
  'angular.dev/overview',
  'unreachable.example',
  'save-fails.example',
  'Mock: preview failed',
  'Mock: save failed',
  '__e2e/add-link',
] as const;
