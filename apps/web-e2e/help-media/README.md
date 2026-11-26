# Help center screenshots

`npm run help-media` (`npx nx run web-e2e:help-media`) captures the screenshots of the Help center
articles from the mock app, in the light and the dark theme, and writes WebP files to
`apps/web/public/media/help/<slug>-light.webp` and `<slug>-dark.webp` (2000 x 1250, each under
about 130 kB: the encoder lowers the quality until the file fits). Same-origin files, so the CSP
`img-src 'self'` is unchanged.

It serves the web app with its mock APIs on port 4220 (`HELP_MEDIA_PORT` changes it; a server that
already runs there is reused) and needs only `npm ci` (WebP through `sharp`) and the Playwright
Chromium (`npx playwright install chromium`).

## Files

- `models/help-shots.const.ts`: the shots (`slug`, the article that shows it, the screen to open).
- `support/help-scenes.ts`: how each screen is opened on the mock data.
- `models/help-media.const.ts`: window, scale, size budget, output folder.
- An article shows a shot with `{ kind: HELP_BLOCK.Image, keys: ['<slug>'] }` in
  `apps/web/src/app/features/help/models/help-articles.const.ts`; its alt text is
  `help.articles.<article>.images.<slug>` in all seven language files.

## Before every release (PROJECT.md 9.3)

1. Run `npm run help-media`.
2. Open every file in `apps/web/public/media/help/`, light and dark. Look for a screen that changed,
   a mock string that moved, a toast or banner in the way, a file over about 150 kB.
3. Read the article texts (`help.articles.<id>.*`) against the release notes: add or update the
   article for anything new, set its `updated` date, keep all seven languages in step.
4. Click the "Go there" links of changed articles (`HELP_LINK` in `models/help-link.const.ts`).
5. Commit the images and the texts with the release chore PR.

A new screenshot: add the shot and its scene, add the image block, add the alt key in all seven
languages, run the script, check the two files.
