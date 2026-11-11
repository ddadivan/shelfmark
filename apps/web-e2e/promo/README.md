# Promo video recorder (#271)

A scripted Playwright run on the mock demo that records the "How it works" video
(`HowItWorks.dc.html`, "Shelfmark in 60 seconds"): landing → "Open the demo" → paste a link →
the preview fills in → choose a folder → add a tag → save (the card lands) → open the folder and
the tag → find it again with ⌘K (Search on the phone). It never runs with the e2e suite: it has
its own config (`playwright.promo.config.mts`) and file pattern.

## Re-record

```bash
npx nx run web-e2e:promo          # or: npm run promo — all four variants, about 6 minutes
npx nx run web-e2e:promo -- --grep light-desktop   # one variant
```

It serves the e2e build on port 4218 (`PROMO_PORT` changes it; a server already running there is
reused), then writes to `apps/web/public/media/`, per variant
`how-it-works-<light|dark>-<desktop|phone>`:

| File    | What                                                                |
| ------- | ------------------------------------------------------------------- |
| `.mp4`  | H.264 (High, level 3.1), no audio, faststart; what the dialog plays |
| `.webm` | VP9, no audio; the fallback for browsers without H.264              |
| `.webp` | Poster: the library right after the save                            |
| `.vtt`  | English captions, one cue per step, times measured during the run   |

Desktop is 1280 × 720, the phone 390 × 844 (touch, the tab bar). Each video is about 0.3–0.6 MB.
Commit the files after checking them; the dialog picks the one for the current theme and device.

**Requires a full ffmpeg** with `libx264`, `libvpx-vp9` and `libwebp` (macOS: `brew install ffmpeg`;
or set `FFMPEG_PATH`). Playwright's bundled ffmpeg only writes the raw VP8 recording, so the
script checks for the encoders first and stops with the fix.

## How it works

- `models/promo-steps.const.ts` is the script: each step has a caption and an action; the
  recorder measures when each step starts and writes the captions from those times.
- Chapters: a step with `chapter` waits until that chapter's start (`PROMO_CHAPTER_START_MS`:
  0:00, 0:18, 0:41), so the captions line up with the dialog's chapter buttons
  (`HOW_IT_WORKS_CHAPTERS` in `apps/web`). If a chapter starts more than 0.5 s late, the run
  fails: shorten the steps before it, or move both constants to the new time.
- `support/promo-director.ts` paces the run: pointer glides, typing with a delay, pauses. The
  pointer dot (and the tap ripple on the phone) is injected by the recorder only, as a manual
  popover so it stays above the app's dialogs; it is hidden in the poster.
- The dark variants use the system colour scheme (`colorScheme: 'dark'`), as a visitor would.
  The desktop uses a Mac user agent, so the app shows ⌘ and answers ⌘K.
- The raw recording starts when the page opens; ffmpeg cuts it from the first frame of the
  loaded landing.

## When the UI changes

Re-run the recorder. A step fails like a test when its target is gone (15 s timeout); update the
locator in `promo-steps.const.ts`. Captions are plain English text in the media files, not UI
strings, so they are not translation keys.
