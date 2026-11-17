/**
 * The Shelfmark app the extension saves to. The development build swaps this file for
 * `shelfmark-origin.development.const.ts` (project.json `fileReplacements`), and the manifest of each
 * build grants host access to exactly this origin's `/api/*`.
 */
export const SHELFMARK_ORIGIN = 'https://shelfmark-app.vercel.app';
