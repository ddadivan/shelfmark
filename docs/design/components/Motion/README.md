Motion defines Shelfmark's few animations. The one signature moment is saving a link; everything else only answers the user's action. Every animation uses `duration-*` and `ease-*` tokens.

## Principles

1. **Motion answers the user.** Nothing moves on its own except loaders and illustrations in their `loop` mode (landing, welcome steps, sign-in). No entrance animations on page sections, no other ambient loops.
2. **Fast in, faster out.** Entrances `duration-base` (200 ms), exits `duration-fast` (120 ms), press-down `duration-instant` (80 ms). Only the saved card, toasts and sheets use `duration-slow` (320 ms). Nothing in the UI runs longer than 320 ms except the 1.8 s sage ring fading from a new card.
3. **The right curve for the job.**
   - `ease-out` — anything appearing or reacting: menus, dialogs, toasts, spinners, press-down.
   - `ease-in` — only for things leaving the screen (a toast or sheet dismissed).
   - `ease-in-out` — things moving across the screen: cards shifting in the feed, the tree expanding.
   - `ease-drawer` — bottom sheets and the mobile menu.
   - `ease-spring` — a small overshoot for small things: the landed card, the star, press release. Never on dialogs or large surfaces.
   - Never `linear` except for spinners and the indeterminate bar.
4. **Animate `transform` and `opacity`.** Colour changes use transitions on `background-color`, `color`, `border-color`. Two deliberate exceptions: the button spinner animates its margin so the label slides over (one tiny element, 200 ms), and the tree uses `grid-template-rows` to expand. No animation libraries.
5. **Start from something real.** Scale from 0.96 (dialogs) or 0.4 (spinners), never from 0. Menus and listboxes scale from the trigger (`transform-origin` set from the anchor via `--sm-origin` in the reference; `libs/ui` names it `--ui-origin`); dialogs from the centre.
6. **Interruptible.** Hover, press, tree and theme use CSS transitions so a reversed action reverses smoothly. In Angular, menus and dialogs open with `animate.enter` and close with `animate.leave`; a second click mid-animation must work.
7. **Hover only where there is a pointer.** All `:hover` styles live in `@media (hover: hover)`, so tapping on a phone never leaves a stuck highlight.

## Catalogue

| Moment | What moves | Timing |
|---|---|---|
| Press a button | scale 0.97 down, spring back | 80 ms `ease-out` / 120 ms `ease-spring` |
| Hover | colour only for controls. Cards: shadow spreads out from under the card (320 ms), preview zooms to 1.06, an “Open ↗” bar slides up 8 px over the preview, ⋯ actions fade in. Press: shadow tightens back, bar darkens (80 ms) | 200–320 ms |
| View switch (cards ↔ list) | thumb slides; each card morphs into its row (View Transitions) | 200 / 320 ms `ease-in-out` |
| Ripple (buttons, rows, menus, chips) | circle of `currentColor` (6% light, 10% dark, 20% on filled buttons) grows from the touch point, fades on release; buttons also scale to 0.97; not on cards | 450 / 350 ms |
| Field focus | border turns `focus-ring` + 3px halo | 120 ms |
| Welcome steps | content slides 24 px in the direction of travel and fades; the app behind the scrim plays the step's story (cards fly onto the shelf, a new card lands, search finds one card) | 320 ms |
| Menu, listbox | fade + scale 0.96→1 from the trigger; out: fade + 0.98 | 200 / 120 ms |
| Dialog | scrim fades, panel fade + scale 0.96→1; out: `sm-pop-out` | 200 / 120 ms |
| Bottom sheet (phone) | slides up from below the screen; drag follows the finger, release past 30% or a fast flick closes | 320 ms `ease-drawer` / 200 ms `ease-in` |
| Toast | slides up 12 px + fade; out: down 8 px + fade | 320 / 120 ms |
| **Save link** | new card drops in (`sm-card--landed`, 320 ms `ease-spring`), the rest shift one slot (FLIP, 320 ms `ease-in-out`), sage ring fades over 1.8 s. In list view the new row slides down and holds `accent-bg` for 1.5 s | — |
| Favorite | star scales 1→1.25→1, turns sage; un-favorite has no animation | 200 ms `ease-spring` |
| Delete | card fades and collapses, neighbours close the gap (FLIP) | 200 ms |
| Tree expand | chevron rotates, children open by height | 120 / 200 ms `ease-in-out` |
| Spinner | grows in from 40%, label makes room; leaves the same way | 200 / 120 ms |
| Top progress bar | appears only after 300 ms; on finish fills to 100% and fades | — |
| Skeleton → content | content fades in | 200 ms |
| Theme switch | colour cross-fade via the View Transitions API (one snapshot, not every element) | 200 ms |
| First sign-in | logo card scales in, bookmark drops into the notch, once per account | ~900 ms |

Feed shifts and deletes use FLIP: measure positions before and after, then animate `transform` from the old place. In Angular: `animate.leave` on the removed card plus a small FLIP helper in `libs/ui` (no library).

## Reduced motion

`prefers-reduced-motion: reduce` removes all movement and scale. Dialogs, menus, toasts, sheets and the landed card simply fade in (200 ms), the sage ring still fades so the new card is findable, colour transitions stay. Spinners and the progress bar keep moving, slower — they are status, not decoration.

## Button loading

When `ui-button` enters `loading`, it locks its current width first, so “Save link” → “Saving…” never makes the button jump. The width is released after the spinner leaves.

## Landing exceptions

- The landing page is the only place with scroll reveals (fade + 1rem rise, 320 ms, children staggered 60 ms, once), the hero chat feed (an endless loop) and before/after scene loops (drift, "+1" ping, 9 s shelf cycle). They are illustrations in `loop` mode, the case principle 1 allows (PROJECT.md story 20), not UI.
- Loops run only in view and in a visible tab, pause on hover/focus over the illustration and via a pause button (WCAG 2.2.2), and are static under reduced motion. The pause button sits outside the hover/focus area, so pressing it twice always resumes.
- Chat feed cadence 1.8 s, rise 650 ms, clear 520 ms, shelf landing staggers 160 ms per folder and 80 ms per card. They are named constants in `landing-chat-timing.const.ts`, not tokens.
