Shelfmark is a calm shelf for everything people save: videos, articles, clothes, courses, tools. The interface stays quiet and graphite so the link previews are the colour on the screen; sage appears only where colour carries meaning.

## Content fundamentals

- The interface is in English (translations to Ukrainian come later, so every string goes through a translation key). Write short, plain, friendly copy; address the user as «you» only when needed and prefer verbs: «Add link», «Saved», «Nothing found».
- Buttons are verb-first, 1–3 words, sentence case, no final period: «Add link», «Delete folder», «Open».
- Empty states invite, not apologise: headline names the space («Your links will live here»), one sentence explains, one button acts.
- Errors say what happened and what to do, in one sentence: «Couldn't load a preview. The link is saved with its address as the title.»
- No emoji, no exclamation marks in system copy, no «successfully».
- Labels and section names are sentence case, never ALL CAPS. Don't chain metadata with middle dots: show the domain with its favicon, put the date on the right or in a tooltip, and write counts as words («12 links, 2 subfolders»).

## Illustration

- Flat geometric scenes made of the product's own shapes — link cards, tag pills, favicon squares (component Illustration). Only token colours; sage marks the one meaningful element.
- No people, mascots or detailed objects. Motion is chosen by where the scene is shown (`loop` 3–5 s, `once` then hold, `none`); reduced motion shows the final frame.

## Colour

- Page background is `bg`; cards, panels, dialogs and inputs sit on `surface`. Resting cards are flat: a `border` hairline, no shadow.
- Set all text in `text`; secondary text (domains, dates, helper text) in `text-muted`. Both pass 4.5:1 on `bg` and `surface` in light and dark.
- `primary` is graphite: use it for the ONE main action per view (usually «Add link»), with `on-primary` text. Every other button is secondary or ghost.
- Sage (`accent`, `accent-bg`, `accent-text`) is a signal, never decoration: the favorite star, the active nav item, tag chips, the selected row and `focus-ring`. Never fill a large area or a primary button with sage.
- Controls (inputs, selects, checkboxes) use `border-control`, not `border` — it holds 3:1 for form boundaries.
- Status: `danger` for destructive actions and errors, `warning` / `warning-bg` for the duplicate-link notice, `success` for confirmations. Each status also carries an icon and words — never colour alone.
- Dark theme is not pure black and text is not pure white. The theme follows the system by default; the header toggle overrides it. All colours are CSS variables, so a future custom theme only swaps their values.

## Type

- One family: Onest (Google Fonts, full Cyrillic), `font-sans`. JetBrains Mono (`font-mono`) only for URLs in the edit form and keyboard hints.
- Styles: `display` for empty states and sign-in, `title` for pages and dialogs, `heading` for card titles, `body` by default, `label` for buttons, nav and chips, `caption` for meta in `text-muted`.
- Card titles clamp to two lines; domains to one.

## Space, radius, elevation

- Spacing is a 4px scale: `space-1` … `space-8`. Card padding `space-4`, gap between cards `space-6`, page gutter `space-4` on phones and `space-8` on desktop.
- Radii: `radius-md` for buttons, inputs and rows; `radius-lg` for cards and dialogs; `radius-full` for chips, avatars and the view switch.
- Only two shadows: card hover / drag shadow and `shadow-popover` (menus, tooltips, dialogs).

## Motion and states

Spend motion in one place. The signature moment is saving a link: the new card drops into the first slot (`sm-card--landed`: `duration-slow`, `ease-spring`), the rest of the feed shifts one place, and a sage ring fades from the new card. Everything else is quiet. Full rules and the timing table live in the Motion component.

- Fast in, faster out: entrances 200 ms, exits 120 ms, press-down 80 ms; nothing over 320 ms except the ring.
- `ease-out` for appearing, `ease-in` only for leaving the screen, `ease-in-out` for moving across it, `ease-drawer` for sheets, `ease-spring` only on small things.
- Hover: only on devices with a pointer (`@media (hover: hover)`). Controls change colour. A card stays in place: a soft shadow spreads out from under it, the preview zooms to 1.06, an “Open ↗” bar slides up over the preview, ⋯ actions fade in; on press the shadow tightens back. Cards never lift or scale.
- Switching cards ↔ list morphs each card into its row (View Transitions); the switcher's thumb slides.
- Press: scale 0.97 and `surface-pressed`, released with `ease-spring`.
- Focus-visible: buttons, rows and cards get a solid 2px `focus-ring` with a 2px offset; text fields instead turn their border `focus-ring` with a soft 3px halo hugging the field.
- Menus scale from their trigger, dialogs from the centre, sheets slide from the bottom edge. Every overlay has an exit animation.
- Illustrations follow the three-mode rule: `loop` (slow 3–5 s cycle) on the landing page, the welcome steps and the sign-in screen; `once` then hold still for in-app empty states and errors; `none` is static. No ambient loops elsewhere, no entrance animations on page sections.
- `prefers-reduced-motion`: no movement or scale; overlays and the new card simply fade; loaders keep moving slowly.

### Loading

One indicator per wait, chosen by what is loading (full rules in the Loading component):
- First load of lists, tree, preview → skeleton in the content's shape, then a 200 ms fade (`sm-reveal`).
- Navigation and refetch → 2px sage bar at the top (`sm-progress`), old content stays.
- An action the user started → spinner inside that button, “Saving…”.
- Favorite, move, rename, tag → optimistic, no loader; roll back with an error toast on failure.
- Nothing appears before 300 ms; once shown, it stays at least 400 ms. No full-screen spinners.

## Iconography

- Shelfmark's own icon set (assets › Icons, component Icons): 44 outline icons, 24px grid, drawn with a 1.75px line, round caps, 3px corners like the cards, and shipped as filled shapes (no `stroke`; colour comes from `fill: currentColor`); the bookmark notch from the logo appears in `sm-saved-link` and `sm-bookmark`. 16px in controls, 20px in navigation, colour of their text (`text`, `text-muted`, `accent`). Delivered as one `sprite.svg`. Never mix in icons from another set.
- Website favicons are shown as provided at 16px inside a `radius-sm` square; a missing favicon falls back to a link icon in `text-muted`.
- Logo: the card-with-bookmark mark (assets › Logos) followed by «Shelfmark» in Onest 600 in `text`. Use `shelfmark-mark-light.svg` on light grounds and `shelfmark-mark-dark.svg` on dark; the header shows the lockup, the favicon shows `shelfmark-app-icon.svg`.

## Layout

- Desktop: header (logo left, search centre with ⌘K, «Add link», theme toggle, avatar), left sidebar, content with breadcrumbs, and the collapsible «Recently opened» panel on the right.
- Phone (from 360px): sidebar becomes a slide-in panel from the header button, search collapses to an icon, «Recently opened» moves into the menu, the feed is one column.
