# Visual regression (#340)

Playwright `toHaveScreenshot` baselines of the key screens, kept apart from the e2e suite: own
config (`playwright.visual.config.mts`), own specs (`*.visual.spec.ts`), own output. `nx e2e web-e2e`
and its sharding do not run them.

## What it covers

Signed-in screens run on the mock APIs of the `e2e` build, dates frozen at 2026-06-15 10:00 UTC
(`support/visual-test.ts`), animations off, `reducedMotion: reduce`, `en-US`, UTC, fonts and the
network settled before every shot. Each screen is a viewport shot named `<screen>.png`.

| Screen                                         | Spec                     | Projects              |
| ---------------------------------------------- | ------------------------ | --------------------- |
| landing (above the fold), sign-in              | `public.visual.spec.ts`  | all                   |
| library cards, list, folder feed, sidebar      | `library.visual.spec.ts` | all                   |
| add link (dialog / phone sheet), folder style  | `library.visual.spec.ts` | all                   |
| empty filter result                            | `library.visual.spec.ts` | all                   |
| search results panel (header field, from 80em) | `library.visual.spec.ts` | desktop only          |
| tab bar, bottom sheet (Recently opened)        | `library.visual.spec.ts` | tablet and phone only |
| settings appearance, settings library          | `account.visual.spec.ts` | all                   |
| trash with items, empty trash, empty library   | `account.visual.spec.ts` | all                   |

Projects: `desktop` (1280x800), `tablet` (820x1180, touch), `phone` (360x780, touch), each in
`light` and `dark`, so `desktop-light`, `desktop-dark`, `tablet-light`, ... The sidebar of the
tablet and phone is the Library tab (the tab bar replaces the sidebar below 64em).
Baselines live in `__screenshots__/<project>/<spec file>/<screen>.png`.

## Why the baselines come from CI

Text rendering depends on the OS fonts and the Chromium build. The baselines are generated in the
CI container `mcr.microsoft.com/playwright:v1.65.0-noble` and compared there. A run on macOS or
on another Linux differs in anti-aliasing and will fail against them: use local runs for
debugging only and never commit baselines made outside that image.

Compare threshold (`playwright.visual.config.mts`): `threshold: 0.2` (per-pixel colour distance)
and `maxDiffPixelRatio: 0.002` (0.2% of the pixels). That absorbs sub-pixel anti-aliasing noise,
a changed colour, spacing, icon or text still fails.

## Run locally (debugging)

```bash
npx nx run web:build:e2e                       # the build CI serves
npx nx run web:serve-static:e2e --port=4200    # or let Playwright start it (reused if running)
npm run e2e:visual                             # compare against the committed baselines
```

`E2E_PORT` changes the port. Open the report with `npx playwright show-report
dist/.playwright/apps/web-e2e/visual-report` (CI runs write it there).

## Review a failure

The PR check uploads two artifacts on failure:

- `visual-diffs`: per failed test the `*-expected.png`, `*-actual.png` and `*-diff.png` (changed
  pixels in red).
- the Playwright HTML report, with a side-by-side and slider view of the same images.

Look at the diff: an intended design change is accepted by updating the baselines, anything else
is a regression to fix.

## Update the baselines on purpose

1. Add the `visual:update` label to the PR (a PR from this repository). The `visual-update` job
   regenerates every baseline in the container, commits them to the PR branch as
   `test(web-e2e): update the visual baselines (visual:update)` and also uploads them as the
   `visual-baselines` artifact.
2. Review the changed PNGs in the PR's diff (GitHub shows image diffs side by side, swipe and
   onion skin). Pull the commit before you push again.
3. The workflows that GitHub queues for the bot's commit wait for approval (they show "action
   required"); approve them on the run page, or simply push again: the comparison runs on your
   next push.
   To regenerate again later, remove the label and add it once more.

Or run the same inside the image, from the repo root:

```bash
docker run --rm -it -v "$PWD":/work -w /work --ipc=host mcr.microsoft.com/playwright:v1.65.0-noble \
  bash -c "npm ci && npx nx run web:build:e2e && npm run e2e:visual:update"
```

(`e2e:visual:update` is `--update-snapshots=all`; it starts the static server itself.) Commit
only the PNGs that you meant to change.

## Writing a new screen

Add a test to a `*.visual.spec.ts`, drive the app with the helpers of `../src/support`, wait for
the visible end state (not a timer), then call `expectScreen(page, 'name')`. Use
`test.skip(condition, reason)` only for screens that do not exist at a viewport. Mask (`mask:`)
only genuinely random content; there is none today.
