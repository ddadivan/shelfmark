# Promo video recorder (#271)

A scripted Playwright run on the mock demo that records the "How it works" videos
(`HowItWorks.dc.html`, "Shelfmark in 3 minutes"). Since #330 they show every feature in short
captioned scenes (2–5 s), grouped into seven chapters:

1. **Save a link**: landing → "Open the demo" → paste a link, the preview fills in, folder, tag
   and note, the card lands; the "already saved" notice; "Add several links" with a pasted list.
2. **Folders and tags**: a nested folder and its empty state, a color and an emoji found through
   the emoji picker's search, expand / collapse, pin, reorder Pinned by drag (the drop line), Unpin
   with Undo, reorder folders, filter by a tag, rename a tag into another one and merge, Favorites.
3. **Many at once**: the Move to folder picker (search, the current folder) and the toast's Undo,
   dragging two cards onto a sidebar folder, selecting links and the bulk bar (tags, favorite,
   copy, open all, move).
4. **Find it again**: ⌘K and the inline search panel, saved views and "Save this view", sort and
   Cards ↔ List, Recently opened (type filter, search, pause), an empty state.
5. **Undo and Trash**: delete with Undo, Trash and restore, the retention setting.
6. **Make it yours**: dark, Custom on the dark base with an own accent (a faint one first, so the
   4.5:1 guard shows), text size, font, density and card preview with the live preview, a
   language switch, the "?" shortcuts dialog, Send feedback (with a screenshot on the desktop).
7. **Share and export**: a public folder page (Share… → "Public folder" → Copy link), the rating
   question, the Account page (the provider photo, "Your shelf", connected accounts) and export
   from its "Your data" (JSON / bookmarks HTML), the page as a guest.

The phone recording skips the desktop-only scenes (mouse drags, the inline search panel, the
shortcuts) and a few repeats, and shows the tab bar, a long press, touch reorder, bottom sheets
(the Move to folder picker), installing the app and the share target instead.

Demo accounts cannot share, so the last chapter switches to a made-up regular mock account
(`PROMO_SHARE`, Sam Rivera, no personal data; a drawn SVG face stands in for the provider photo)
under the mock `showcase` scenario (`sm-mock-links-scenario`), which starts every mock session, the
guest's too, from the demo's mockup library; under it the share dialog shows the production origin
(`MOCK_PUBLIC_ORIGIN`), never the local server. The account is nine days old, so the rating question
comes once the share dialog closes. The guest is the same tab without the session. It never runs
with the e2e suite: it has its own config (`playwright.promo.config.mts`) and file pattern.

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
| `.mp4`  | H.264 (High, level 4.0), no audio, faststart; what the dialog plays |
| `.webm` | VP9, no audio; the fallback for browsers without H.264              |
| `.webp` | Poster: the library right after the save                            |
| `.vtt`  | English captions, one cue per step, times measured during the run   |

Two recordings (#315): the desktop at 1440 × 900 (H.264 level 4.0) and the phone at 390 × 844
(touch, the tab bar), both starting in the light theme. The desktop runs about 3:15, the phone
about 2:40; the MP4s stay near 4 MB and 2.5 MB (CRF 34 / VP9 46). Commit the files after checking them; the dialog plays the one that
fits the layout (`ViewportService.phone`), shows only the poster under reduced motion and starts
playing on request.

**Requires a full ffmpeg** with `libx264`, `libvpx-vp9` and `libwebp` (macOS: `brew install ffmpeg`;
or set `FFMPEG_PATH`). Playwright's bundled ffmpeg only writes the raw VP8 recording, so the
script checks for the encoders first and stops with the fix.

## How it works

- `models/promo-steps.const.ts` is the script: each step has a caption and an action; the
  recorder measures when each step starts and writes the captions from those times.
- Chapters: a step with `chapter` waits until that chapter's start in its recording
  (`PROMO_CHAPTER_START_MS`, one set per device: desktop 0:00, 0:33, 1:10, 1:41, 2:10, 2:27,
  2:57; phone 0:00, 0:27, 0:59, 1:22, 1:42, 1:56, 2:15), so the captions line up with the
  dialog's chapter buttons (`HOW_IT_WORKS_CHAPTERS` in `apps/web`, which shows the times of the
  recording it plays). If a chapter starts more than 0.5 s late, the run
  fails: shorten the steps before it, or move both constants to the new time (a `PROMO_MEASURE=1`
  run prints where each chapter would start with no holds). A step with `only` runs on one device.
- `support/promo-director.ts` paces the run: pointer glides, typing with a delay, pauses. The
  pointer dot (and the tap ripple on the phone) is injected by the recorder only, as a manual
  popover so it stays above the app's dialogs; it is hidden in the poster.
- Both recordings start in the light system colour scheme; the video switches to dark and an own
  accent (Custom on the dark base) in its "Make it yours" chapter through Settings › Appearance;
  the share chapter keeps that look (the mock appearance stays in the browser).
  The desktop uses a Mac user agent, so the app shows ⌘ and answers ⌘K.
- Everything happens inside the app (no reloads), since a reload starts a fresh demo library;
  the exceptions come in the last chapter: the phone's install and share-target steps and the
  share scenes (the switch to the account, then the guest page) use `page.goto`. Each load runs
  in `director.cut()`: the stretch from the navigation until the new page shows is left out of
  the final video (ffmpeg joins the kept pieces), so no blank frame appears, and the captions
  after it move up with it. The switch to the account also boots on the dark scheme
  (`emulateMedia`), the look the video keeps from "Make it yours".
- "Open all" opens real tabs: the recorder closes them as they come, behind the recorded page.
- The raw recording starts when the page opens; ffmpeg cuts it from the first frame of the
  loaded landing.

## When the UI changes

Re-run the recorder. A step fails like a test when its target is gone (15 s timeout); update the
locator in `promo-steps.const.ts`. Captions are plain English text in the media files, not UI
strings, so they are not translation keys.
