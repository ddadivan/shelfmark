# Promo video recorder (#271)

A scripted Playwright run on the mock demo that records the "How it works" video
(`HowItWorks.dc.html`, "Shelfmark in 2 minutes", rewritten for #315) through the features of
today, in six chapters: **Save a link** (landing → "Open the demo" → paste a link, the preview
fills in, folder and tag, save; "Add several links" with a pasted list), **Folders and tags**
(colour and icon, pin to the sidebar, filter by a tag), **Find it again** (⌘K / Search, a saved
view, favorites, Recently opened, delete and restore from Trash), **Many at once** (select two
cards and move them; drag a card onto a folder on desktop, Move to folder on the phone), **Make it
yours** (dark theme and an own accent colour, a language switch, export, Send feedback; on the
phone the share target too) and **Share a collection** (#326: a folder's menu → Share… → the
public link on → Copy link → the `/c/…` page as a guest). The phone recording shows the tab bar
throughout. Demo accounts cannot share, so the last chapter switches to a made-up regular mock
account (`PROMO_SHARE`, no personal data) under the mock `showcase` scenario
(`sm-mock-links-scenario`), which starts every mock session, the guest's too, from the demo's
mockup library; the guest is the same tab without the session. It never runs with the e2e suite: it has
its own config (`playwright.promo.config.mts`) and file pattern.

## Re-record

```bash
npx nx run web-e2e:promo          # or: npm run promo — both recordings, about 15 minutes
npx nx run web-e2e:promo -- --grep desktop          # one variant
PROMO_MEASURE=1 npx nx run web-e2e:promo             # where each chapter would start, no encoding
```

It serves the e2e build on port 4218 (`PROMO_PORT` changes it; a server already running there is
reused), then writes to `apps/web/public/media/`, per variant
`how-it-works-<desktop|phone>`:

| File    | What                                                                |
| ------- | ------------------------------------------------------------------- |
| `.mp4`  | H.264 (High, level 3.1), no audio, faststart; what the dialog plays |
| `.webm` | VP9, no audio; the fallback for browsers without H.264              |
| `.webp` | Poster: the library right after the save                            |
| `.vtt`  | English captions, one cue per step, times measured during the run   |

Two recordings (#315): the desktop at 1440 × 900 (H.264 level 4.0) and the phone at 390 × 844
(touch, the tab bar), both starting in the light theme. Each video is about 1–2.5 MB for two
and a half minutes (CRF 34 / VP9 46). Commit the files after checking them; the dialog plays the one that
fits the layout (`ViewportService.phone`), shows only the poster under reduced motion and starts
playing on request.

**Requires a full ffmpeg** with `libx264`, `libvpx-vp9` and `libwebp` (macOS: `brew install ffmpeg`;
or set `FFMPEG_PATH`). Playwright's bundled ffmpeg only writes the raw VP8 recording, so the
script checks for the encoders first and stops with the fix.

## How it works

- `models/promo-steps.const.ts` is the script: each step has a caption and an action; the
  recorder measures when each step starts and writes the captions from those times.
- Chapters: a step with `chapter` waits until that chapter's start (`PROMO_CHAPTER_START_MS`:
  0:00, 0:34, 0:52, 1:19, 1:39, 2:06), so the captions line up with the dialog's chapter buttons
  (`HOW_IT_WORKS_CHAPTERS` in `apps/web`). If a chapter starts more than 0.5 s late, the run
  fails: shorten the steps before it, or move both constants to the new time (a `PROMO_MEASURE=1`
  run prints where each chapter would start with no holds). A step with `only` runs on one device.
- `support/promo-director.ts` paces the run: pointer glides, typing with a delay, pauses. The
  pointer dot (and the tap ripple on the phone) is injected by the recorder only, as a manual
  popover so it stays above the app's dialogs; it is hidden in the poster.
- Both recordings start in the light system colour scheme; the video switches to dark and an own
  accent in its "Make it yours" chapter through Settings › Appearance.
  The desktop uses a Mac user agent, so the app shows ⌘ and answers ⌘K.
- Everything happens inside the app (no reloads), since a reload starts a fresh demo library;
  the exceptions come at the end: the phone's share-target step and the share chapter (the switch
  to the account, then the guest page) use `page.goto`.
- The raw recording starts when the page opens; ffmpeg cuts it from the first frame of the
  loaded landing.

## When the UI changes

Re-run the recorder. A step fails like a test when its target is gone (15 s timeout); update the
locator in `promo-steps.const.ts`. Captions are plain English text in the media files, not UI
strings, so they are not translation keys.
