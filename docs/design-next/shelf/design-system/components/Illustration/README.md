# Illustration
A square, quiet scene for a state: an empty space, nothing found, offline, an error, a signed-out session, a finished queue, a welcome step. It stands straight on the page (no disc, no card) and moves slowly, forever, without asking for attention.

**Source:** the author-approved redesign v3 of all 17 scenes (`ui-illustration` in `libs/ui`). This spec replaces the scene look of `StateScene` (the sage disc, the 240×150 size and the play-once motion are gone); `StateScene` still lists where each state is used.
**In code:** `ui-illustration` (`name`, `motion`, `label`), `--ui-illustration-size`; keyframes `ui-ill-*` in `libs/ui/src/styles/_illustration.scss`; scenes in `illustration.component.html`.

## Grid and anatomy
- **ViewBox** `0 0 120 120`, a 12 margin: nothing important outside 12 to 108.
- **Stage card:** 88 × 60 at (16, 30), radius 10. The page, the link, the library: one white card with skeleton lines on it.
- **Corner badge:** a circle r = 16 at (86, 84), overlapping the card's bottom-right corner. It carries the one sage detail of most scenes (a plus, a star, a clock, a check, the warning mark).
- **Sparks:** four-point stars at (104, 20) size 6 and (18, 104) size 4, **at most two** per scene, sage, twinkling.
- Scenes that are not a card (folder, bin, cloud, lock, tray) keep the same centre of gravity and the same margins; their one sage detail sits where the badge would.

## Size
- **240 × 240** on desktop, **160 × 160** below 40em (a phone). The scene is always square.
- `--ui-illustration-size` sets the side (a length, or `100%` of the parent); the default is 15rem, 10rem on a phone, never wider than the parent. The page empty state leaves the default; the inline empty state, the drop zone, the onboarding and the Add dialogs use 10rem.

## Lines (independent of the drawn size)
| Part | Width on screen |
| --- | --- |
| Card edge (`line-strong`) | 1px |
| Dashed placeholder | 1.5px, dash 5 / gap 5 |
| Line art (`ink`) and sage strokes | 2px at 160, 2.5px at 240 |
| Lens handle | 4.5px at 160, 6px at 240 |

Strokes are non-scaling (`vector-effect: non-scaling-stroke`) and the widths follow the rendered size through the host's container width (`clamp(2px, 1.04cqi, 2.5px)`, handle `clamp(4.5px, 2.5cqi, 6px)`), so a scene looks equally fine at 160 and at 240. Round caps and joins.

## Colour 70 / 20 / 10 (tokens only)
- **70%, objects, neutral:** white parts are `surface` with a `line-strong` edge; skeleton lines and ground shadows are `surface-pressed`.
- **20%, line art:** `text-muted` strokes on a `surface` fill (folder, bin, cloud, lock, lens ring, tag).
- **10%, one small sage detail per scene:** `ai` for its marks, `ai-bg` only inside it (the badge circle, the lens glass, the active filter chip), `ai-line` for a sage edge. The sparks are sage too.
- **`error`** uses `danger` and `danger-bg` in place of sage. Nothing else is red.
- **Dashes:** `text-muted` at 40%, which reads like a hairline of the sketch.
- No new colours: a colour is a token first (DS guard, ADR 0062). The component has one class per part (`__card`, `__line`, `__dash`, `__ink`, `__ink--open`, `__ink-dot`, `__accent`, `__accent-stroke`, `__accent-tint`, `__accent-edge`, `__accent-frame`, `__handle`, `__danger`, `__danger-stroke`, `__danger-tint`, `__spark`), and the one sage detail sits in `<g class="ui-illustration__focus">`. A new scene uses these classes and cannot invent a colour or a width.

## Motion
- **Every scene loops** (default `motion="loop"`): one slow movement on the sage detail, plus the sparks' twinkle (2s). Cycles are 1.4 to 5s; nothing jumps, nothing flashes.
- Movements: the lens glides over the card; a card bobs 5 units; the badge breathes (scale 1.1); the folded corner flaps; the tag swings ±9°; the bin lid lifts; the lock's shackle rises; the signal waves light in turn; the clock's minute hand turns (5s); a ring leaves the check; the warning badge shudders now and then; the filter highlight steps over three chips; a new card lands on the stack; the lens finds the card; the ribbon settles.
- **`none`** and **reduced motion** (OS setting and the app's Animations setting) show the still drawing, which is the scene's resting frame: sage detail in place, ring hidden, sparks full.
- **Pauses:** the loop pauses (`animation-play-state: paused`, the scene keeps its place) while it is off screen (`uiInView`) and while the tab is hidden. A browser without `IntersectionObserver` never pauses.
- **`once`** is kept for callers that pass it: the moving parts play a single move and hold its end frame; the others stay still. No scene defaults to it.
- Keyframes live in the shared styles (`ui-ill-*`); a component never declares its own.

## Scenes
| Scene | Use | Sage detail and move |
| --- | --- | --- |
| `not-found` | Search with no results | Lens glass and handle glide over a card |
| `empty-filter` | Filters that match nothing | The active chip steps over three chips |
| `empty-feed` | An empty view or library | Plus badge breathes, the card bobs |
| `empty-folder` | A folder with nothing in it | A card bobs inside the folder |
| `empty-trash` | Trash is empty | The lid lifts (its detail is neutral: no sage) |
| `empty-recent` | Nothing opened recently | Clock badge, minute hand turns |
| `empty-favorites` | No favorites yet | Star badge breathes |
| `empty-unsorted` | Unsorted is empty | A card bobs over the tray |
| `empty-tags` | No tags yet | A tag swings on the card corner |
| `offline` | No connection | Signal waves light in turn |
| `page-not-found` | Unknown address (404) | The folded corner flaps |
| `error` | A load or save failed | Danger badge shudders now and then |
| `signed-out` | The session ended | The shackle rises |
| `all-done` | Nothing waiting | A ring leaves the check badge |
| `welcome-collect` | Onboarding: collecting | A card lands on the stack |
| `welcome-save` | Onboarding: saving | The ribbon settles on the card |
| `welcome-find` | Onboarding: finding | The lens finds the right card |

## Do / don't
- Do keep one sage detail and at most two sparks; do build a scene from the part classes.
- Do show it with a heading and one sentence that say the same in words; the scene is decorative (`aria-hidden`) unless it gets a `label`.
- Do check it in both themes and at 160 and 240.
- Don't add a disc, a card or a shadow behind it; don't draw a second sage detail; don't use a colour that is not a token.
- Don't scale a scene with `transform` or set a width on the SVG: set `--ui-illustration-size`.
- Don't let a state animation run faster than 1.4s, or add a movement that is not slow and repeatable.
- Don't use an illustration as decoration on a normal screen: one scene per state.
