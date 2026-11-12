/**
 * Mock builds only: the production origin the mock share API shows in public links under the
 * `showcase` scenario, so the promo video never shows a local address (#326). Never used by the
 * HTTP API or a production build.
 */
export const MOCK_PUBLIC_ORIGIN = 'https://shelfmark-app.vercel.app';
