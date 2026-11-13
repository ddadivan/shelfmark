import { type Page } from '@playwright/test';

/**
 * A same-origin stand-in for a Google / GitHub profile photo (#352): the e2e never loads a real
 * provider avatar, the route answers this drawing instead.
 */
export const SAMPLE_AVATAR_PATH = '/e2e-avatar.svg';
/** A photo URL that fails to load (404), to see the initials fallback. */
export const BROKEN_AVATAR_PATH = '/e2e-avatar-missing.png';

const SAMPLE_AVATAR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">
  <rect width="96" height="96" fill="#7aa6d8"/>
  <circle cx="48" cy="38" r="18" fill="#f3d2b3"/>
  <path d="M14 96c4-22 18-32 34-32s30 10 34 32z" fill="#2f4f7a"/>
</svg>`;

/** Serves the sample photo and the broken one on this page. */
export async function routeSampleAvatars(page: Page): Promise<void> {
  await page.route(`**${SAMPLE_AVATAR_PATH}`, (route) =>
    route.fulfill({ contentType: 'image/svg+xml', body: SAMPLE_AVATAR_SVG }),
  );
  await page.route(`**${BROKEN_AVATAR_PATH}`, (route) => route.fulfill({ status: 404, body: '' }));
}
