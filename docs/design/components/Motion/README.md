Motion defines Shelfmark's few animations. The one signature moment is saving a link; everything else only answers the user's action. Every animation uses `duration-*` and `ease-*` tokens.

## Principles

1. **Motion answers the user.** Nothing moves on its own except loaders. No entrance animations on page sections, no ambient loops. One proposed exception, **pending the author's decision** (#562): the first load settle below; drop its row and `FirstSettleDirective` to keep this rule absolute.
2. **Fast in, faster out.** Entrances `duration-base` (200 ms), exits `duration-fast` (120 ms), press-down `duration-instant` (80 ms). Only the saved card, toasts and sheets use `duration-slow` (320 ms). Nothing in the UI runs longer than 320 ms except the 1.8 s sage ring fading from a new card.
3. **The right curve for the job.**
   - `ease-out` — anything appearing or reacting: menus, dialogs, toasts, spinners, press-down.
   - `ease-in` — only for things leaving the screen (a toast or sheet dismissed).
   - `ease-in-out` — things moving across the screen: cards shifting in the feed, the tree expanding.
   - `ease-drawer` — bottom sheets and the mobile menu.
   - `ease-spring` — a small overshoot for small things: the landed card, the star, press release. Never on dialogs or large surfaces.
   - Never `linear` except for spinners and the indeterminate bar.
4. **Animate `transform` and `opacity`.** Colour changes use transitions on `background-color`, `color`, `border-color`. Deliberate exceptions: the button spinner animates its margin so the label slides over (one tiny element, 200 ms), the tree uses `grid-template-rows` to expand, and the fluid hover highlight (#562) transitions its own width and height along with its transform (one absolutely positioned, `pointer-events: none` leaf, so nothing around it lays out again). No animation libraries.
5. **Start from something real.** Scale from 0.96 (dialogs) or 0.4 (spinners), never from 0. Menus and listboxes scale from the trigger (`transform-origin` set from the anchor via `--sm-origin`); dialogs from the centre.
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
| **Create link** | new card drops in (`sm-card--landed`, 320 ms `ease-spring`), the rest shift one slot (FLIP, 320 ms `ease-in-out`), sage ring fades over 1.8 s. In list view the new row slides down and holds `accent-bg` for 1.5 s | — |
| Favorite | star scales 1→1.25→1, turns sage; un-favorite has no animation | 200 ms `ease-spring` |
| Accept a suggestion (AI) | the dashed chip turns solid sage and pulses 1→1.06→1, then moves into the field as a tag; × fades the chip out | 200 ms `ease-spring` / 120 ms |
| Ask answer streams (AI) | text appends in place with a 2px `ai` caret blinking (1 s steps); sources fade in when complete; reduced motion: no blink, text in chunks | — |
| «Fill in with AI» appears (AI) | when suggestions become ready the button fades in and grows 0.96→1, once per appearance (`animate.enter`); it leaves with a fade (`animate.leave`); no loop of its own; reduced motion: fade only | 200 ms `ease-out` / 120 ms `ease-in` |
| «Fill in with AI» runs (AI) | while the draft is awaited (a loader): the spark keeps its place and pulses (scale 0.85→1.12, opacity 0.55→1) and a soft light sweeps across the button (40% wide, `ai` at 22%, translateX −120%→320%); both loop until the draft arrives or times out; reduced motion: static spark, no sweep | 1.2 s / 1.6 s `ease-in-out` |
| One-time AI announcement (AI) | the spark tile scales 0.6→1.08→1 and rotates −20°→4°→0 (`ease-spring`), the title rises 16 px, the four feature cards rise 10 px one after the other, the buttons rise last; a soft glow breathes behind; reduced motion: everything at once, glow still | 0.3–1 s `ease-out` / `ease-spring` |
| AI content arrives | skeleton chips or summary lines (loader), then the content fades in (`sm-reveal`); no typing effect for summaries | 200 ms |
| Delete | card fades and collapses, neighbours close the gap (FLIP) | 200 ms |
| Tree expand | chevron rotates, children open by height | 120 / 200 ms `ease-in-out` |
| Spinner | grows in from 40%, label makes room; leaves the same way | 200 / 120 ms |
| Top progress bar | appears only after 300 ms; on finish fills to 100% and fades | — |
| Skeleton → content | content fades in | 200 ms |
| Theme switch | colour cross-fade via the View Transitions API (one snapshot, not every element) | 200 ms |
| First sign-in | logo card scales in, bookmark drops into the notch, once per account | ~900 ms |
| First load settle (#562, pending the author's decision) | once per app load, the first page's top-level blocks in the main column fade in 60 ms apart (fade only, no rise, nothing on scroll, never on later pages); after the boot skeleton this is the «Skeleton → content» fade, staggered | 200 ms `ease-out` each, last step ≤ 560 ms |
| **Drag a link (#562)** | the preview (0.65, down-right of the pointer, −4° base tilt) hangs from the pointer: its tilt follows the smoothed horizontal pointer velocity (target `clamp(vx · 6°/(px/ms), ±10°)`) through a damped spring (stiffness 220, damping 18, rAF), so it leans into a fast move and sways back once when the pointer stops; a fast vertical move squashes it by at most 4%. A dragged selection (the deck and its badge) wobbles as one piece. Only `transform` of an inner wrapper is written; the CDK keeps the root's `transform` | spring, settles in ~400 ms after the pointer stops (a physics loader, not a timed transition) |
| Drop a link on a folder (#562) | the preview shrinks to 0.2, fades and flies into the folder row under the pointer; the row then bumps 1→1.06→1 | 320 ms `ease-in-out` / 200 ms `ease-spring` |
| Cancel a drag (Esc, dropped outside a folder) (#562) | the preview springs back into the slot it left; its tilt springs to rest | 320 ms `ease-spring` |
| Fluid hover (#562) | in the tree, menus and picker menus one highlight glides from row to row under the mouse (transform + height of one element) instead of each row blinking; leaving the list fades it out. Mouse only (`hover: hover` and a mouse pointer); keyboard focus keeps the rows' own active style | 200 ms `ease-out`, fade 120 ms |
| Merged selection (#562) | contiguous selected rows in the list view render as one rounded shape: the inner corners between two selected neighbours square off and the gap fills, so a run of rows reads as one block; picking or unpicking a row merges or splits the shape | 200 ms `ease-in-out` (`border-radius`, background colour) |
| Icon swap (#562) | the old icon scales to 0.5, blurs 4px and fades while the new one scales up from 0.5 out of the blur: copy link → check, theme sun ↔ moon, cards ↔ list | 200 ms `ease-out` |
| Number change (#562) | only the digits that changed slide 0.5em (up when the number grows, down when it shrinks) and cross-fade in place; unchanged digits stay still; tabular numbers so the width never jumps: folder counts in the tree, saved view counts, the search result count | 200 ms `ease-out` |
| Check a checkbox (#562) | the tick draws itself along its stroke (`stroke-dashoffset`) while the fill appears; unchecking clears at once. The success toast's check draws the same way when the toast enters | 200 ms `ease-out` |
| Error shake (#562) | a field whose error appears on submit shakes sideways (translateX 0 → −6 → 5 → −3 → 2 → 0 px): the add-link address and the sign-in error. Once per submit, never while typing | 320 ms `ease-out` |
| Pressed while open (#562) | a button that opens a menu (⋯, account, sort) keeps its pressed look (`active` background, scale 0.97 off) while `aria-expanded="true"`; it releases when the menu closes | 120 ms colour |
| Status text shimmer (#562) | loader status lines («Fetching preview…», Ask «Searching…») carry a soft light band sweeping across the letters (background-clip text, `text-muted` → `text` → `text-muted`); a loader, so it loops while the status shows | 1.4 s `ease-in-out` loop (the shared shimmer duration) |
| Text state swap (#562) | when a status or label changes (Ask steps, Create link → Creating… → Saved) the old text blurs 4px and fades up 4px while the new one rises out of the blur; the button keeps its width lock | 200 ms `ease-out` (out 120 ms) |
| Clear search (#562) | pressing × in a clearable field dissolves the text word by word (each word blurs, fades and rises 4px, 30 ms apart, capped at 8 words), then the field is empty and focused | ≤ 320 ms `ease-out` |
| Tooltip travel (#562) | once a tooltip in a toolbar group is open, moving to a neighbour opens its tooltip at once (no 400 ms wait) and the panel travels from the old position to the new one; leaving the group closes it instantly | 200 ms `ease-out` |
| Panel resize (#562) | the link preview card of the Add link dialog changes height smoothly when its content arrives (skeleton → card, a notice) instead of jumping (`uiAutoHeight`: a ResizeObserver on the inner content, the outer height runs old → new, then back to `auto`; the one height animation besides the tree). The preview panel body is always full height, so it has nothing to animate | 200 ms `ease-in-out` |
| Badge pop-in (#562) | a counter badge that appears (Feedback inbox, What's new) scales 0.6→1 with a small overshoot and fades in; a changing number uses Number change | 200 ms `ease-spring` |
| Two-line rise (#562) | an empty state's title and text, and a Welcome step's title and text, rise 8 px and fade in, the second line 60 ms after the first | 200 ms `ease-out` |

Feed shifts and deletes use FLIP: measure positions before and after, then animate `transform` from the old place. In Angular: `animate.leave` on the removed card plus a small FLIP helper in `libs/ui` (no library).

## Drag physics (#562)

The drag preview's tilt is the one physics-driven motion. `libs/ui` `utils/spring` holds the math (`stepSpring`, `PointerVelocity`, `DragWobble`) and the `uiDragWobble` directive runs it on the preview's inner wrapper while the drag lasts. The velocity is smoothed exponentially (time constant 50 ms) and decays to zero when the pointer rests, so the spring always comes back to the base tilt. The spring writes `transform: rotate() scale()` only; the loop stops once it is at rest. On release the app decides: over a folder the wrapper flies into the folder row (its translate and scale transition with the CDK's own move of the root, same 320 ms `ease-in-out`, so the path is one straight line), otherwise the CDK moves the root back to the slot with `ease-spring` and the spring brings the tilt to rest.

## Reduced motion

`prefers-reduced-motion: reduce` removes all movement and scale. Dialogs, menus, toasts, sheets and the landed card simply fade in (200 ms), the sage ring still fades so the new card is findable, colour transitions stay. Spinners and the progress bar keep moving, slower — they are status, not decoration.

The app's Settings › Appearance › Animations «Reduced» setting (`html[data-motion="reduced"]`, `ReducedMotion` for scripts) is the same switch: every moment above follows it. For the #562 batch that means: the drag preview keeps the static behaviour of before (no tilt, no wobble, no fly, no spring back: it disappears on release); fluid hover fades the highlight in place without travelling; the merged selection, colour changes and the drawn check stay (no movement); icon swaps, text swaps and number changes cross-fade without scale, blur or slide; the error shake becomes the error border alone; the clear dissolve and the tooltip travel are instant; the panel resize jumps; badges and two-line text appear without scale or rise; the status shimmer stops (static muted text); the first load settle does not run.

## Button loading

When `ui-button` enters `loading`, it locks its current width first, so “Create link” → “Creating…” never makes the button jump. The width is released after the spinner leaves.
