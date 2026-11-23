# StateScene
A small animated scene that shows what a state means: a site that can't be shown, nothing found, offline, an error, an empty space, a finished queue.

**Style:** flat scenes made of Shelfmark's own shapes (link cards, text lines, the bookmark notch), in neutral tokens (`surface`, `surface-pressed`, `text-muted`, `control`) with ONE meaningful element in `accent`, `brand-notch`, `success` or `danger`. No people, mascots or detailed objects.
**Sizes:** 240×150 on pages and empty states, 160×100 inside panels and the Link page.
**Motion:** plays once when the state appears, 600–900 ms in steps of 120 ms (`pop`, `drop`, `rise`, `slide`, `sweep`, `shake`), then holds the last frame. No loops. Reduced motion shows the last frame.

## Scenes
| Scene | Use |
| --- | --- |
| `site-blocked` | Link page Site view when the site refuses framing; the Reader page slides in, pointing to "Open in Reader" |
| `empty-library` | The empty library (onboarding) |
| `nothing-found` | Search or filters with no results |
| `offline` | No connection |
| `error` | A load or save failed |
| `revisit-done` | Revisit with nothing waiting |
| `empty-trash` | Trash empty |
| `reader-unavailable` | Reader can't extract text |
| `not-found` | Unknown address (404) |
| `saved` | The saved-link moment (toast lead, extension) |

## Rules
- Always with a heading and one sentence that say the same in words; the scene is `role="img"` with that heading as its name.
- One scene per state; never decoration on a normal screen.
- Colours only from tokens, so both themes work.

## In code
Extends `ui-illustration` (`name`, `motion="once"`); scenes replace the 2027 set.
