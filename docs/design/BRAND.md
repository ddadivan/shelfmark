Shelfmark is a calm shelf for everything people save: videos, articles, clothes, courses, tools. The interface stays quiet and graphite so the link previews are the colour on the screen; sage appears only where colour carries meaning.

**Shelfmark 2027 — Refresh.** Same brand: graphite, sage, Onest. What changed from the first system: softer concentric corners, pill-shaped controls with 40–48px heights, cards that sit on a whisper ring instead of a hairline, frosted glass on short-lived floating layers only, a floating tab bar on phones, richer toasts that name what happened and to what, folder colours and icons, and one fixed Light and Dark theme plus a Custom theme people can tune.

## Content fundamentals

- The interface is in English (a Ukrainian translation comes later, so every string goes through a translation key). Write short, plain, friendly copy; address the user as «you» only when needed and prefer verbs: «Add link», «Saved», «Nothing found».
- Buttons are verb-first, 1–3 words, sentence case, no final period: «Add link», «Delete folder», «Open».
- Empty states invite, not apologise: headline names the space («Your links will live here»), one sentence explains, one button acts.
- Errors say what happened and what to do, in one sentence: «Couldn't load a preview. The link is saved with its address as the title.»
- No emoji, no exclamation marks in system copy, no «successfully».
- Labels and section names are sentence case, never ALL CAPS. Don't chain metadata with middle dots: show the domain with its favicon, put the date on the right or in a tooltip, and write counts as words («12 links, 2 subfolders»).

## Illustration

- Flat geometric scenes made of the product's own shapes — link cards, tag pills, favicon squares (component Illustration). Only token colours; sage marks the one meaningful element.
- No people, mascots or detailed objects. They animate once and hold still; reduced motion shows the final frame.

## Colour

- Page background is `bg`; cards, panels, dialogs and inputs sit on `surface`. Resting cards, panels and the sidebar carry `shadow-card` — a 1px whisper ring, no hairline border, no drop shadow.
- Glass (`glass` fill, `glass-line` edge, `shadow-float`, 24px blur) is only for layers that float for a moment or stay pinned above content: menus and listboxes, toasts, the phone tab bar, the bulk-action bar, the sign-in card. Never on cards or panels. `glass` is opaque enough that text keeps 4.5:1 even where blur is off (reduced motion, old browsers).
- Folder colours: eight pairs `folder-<name>` (glyph) on `folder-<name>-bg` (tile), applied with `fc-<name>` on an `sm-fic` tile. Graphite is the default; colour is chosen by the person, it is never decoration we add.
- Set all text in `text`; secondary text (domains, dates, helper text) in `text-muted`. Both pass 4.5:1 on `bg`, `surface`, `surface-hover`, `surface-pressed` and `accent-bg` in light and dark, so muted text stays readable on hovered, pressed and selected rows. Never fade text with opacity to show a busy or stale state.
- `primary` is graphite: use it for the ONE main action per view (usually «Add link»), with `on-primary` text. Every other button is secondary or ghost.
- Sage (`accent`, `accent-bg`, `accent-text`) is a signal, never decoration: the favorite star, the active nav item, tag chips, the selected row and `focus-ring`. Never fill a large area or a primary button with sage.
- Controls (inputs, selects, checkboxes) use `border-control`, not `border` — it holds 3:1 for form boundaries.
- Status: `danger` for destructive actions and errors, `warning` / `warning-bg` for the duplicate-link notice, `success` for confirmations. Each status also carries an icon and words — never colour alone.
- Dark theme is not pure black and text is not pure white. The theme follows the system by default. Light and Dark are fixed: people cannot change their colours, so they always look as designed and stay checked for contrast. A separate Custom theme (Settings › Appearance) starts from the light or dark base and lets people pick the accent, background and corners; it only swaps token values.

## Type

- One family: Onest (Google Fonts, full Cyrillic), `font-sans`. JetBrains Mono (`font-mono`) only for URLs in the edit form and keyboard hints.
- Styles: `display` (40/44, −0.03em) for page titles and sign-in, `title` for dialogs and panels, `heading` for card titles, `body` by default, `label` for buttons, nav and chips, `caption` for meta in `text-muted`.
- Card titles clamp to two lines; domains to one.

## Space, radius, elevation

- Spacing is a 4px scale: `space-1` … `space-8`. Card padding `space-4`, gap between cards `space-6`, page gutter `space-4` on phones and `space-8` on desktop.
- Radii are concentric: an inner corner = outer corner minus the padding. `radius-sm` (8) for keys and tiny parts, `radius-md` (14) for inputs and rows, `radius-lg` (22) for cards, panels and the sidebar, `radius-xl` (28) for dialogs and sheets, `radius-full` for buttons, chips, saved views and avatars. A card's preview is inset 6px with a 16px corner.
- Shadows: `shadow-card` at rest, `shadow-card-hover` for hover and drag, `shadow-float` for glass and dialogs, `shadow-popover` kept for tooltips.
- Sizes: buttons 40px (`--sm` 32, `--lg` 48), inputs 44px, sidebar rows 36px; on touch every target is at least 44×44.

## Motion and states

Spend motion in one place. The signature moment is saving a link: the new card drops into the first slot (`sm-card--landed`: `duration-slow`, `ease-spring`), the rest of the feed shifts one place, and a sage ring fades from the new card. Everything else is quiet. Full rules and the timing table live in the Motion component.

- Fast in, faster out: entrances 200 ms, exits 120 ms, press-down 80 ms; nothing over 320 ms except the ring.
- `ease-out` for appearing, `ease-in` only for leaving the screen, `ease-in-out` for moving across it, `ease-drawer` for sheets, `ease-spring` only on small things.
- Hover: only on devices with a pointer (`@media (hover: hover)`). Controls change colour. A card stays in place: a soft shadow spreads out from under it, the preview zooms to 1.06, an “Open ↗” bar slides up over the preview, ⋯ actions fade in; on press the shadow tightens back. Cards never lift or scale.
- Switching cards ↔ list morphs each card into its row (View Transitions); the switcher's thumb slides.
- Press: scale 0.97 and `surface-pressed`, released with `ease-spring`.
- Focus-visible: buttons, rows and cards get a solid 2px `focus-ring` with a 2px offset; text fields instead turn their border `focus-ring` with a soft 3px halo hugging the field.
- Menus scale from their trigger, dialogs from the centre, sheets slide from the bottom edge. Every overlay has an exit animation.
- Illustrations play once when they appear (welcome steps, empty states) and then hold still. No ambient loops, no entrance animations on page sections.
- `prefers-reduced-motion`: no movement or scale; overlays and the new card simply fade; loaders keep moving slowly.

### Loading

One indicator per wait, chosen by what is loading (full rules in the Loading component):
- First load of lists, tree, preview → skeleton in the content's shape, then a 200 ms fade (`sm-reveal`).
- Navigation and refetch → 2px sage bar at the top (`sm-progress`), old content stays.
- An action the user started → spinner inside that button, “Saving…”.
- Favorite, move, rename, tag → optimistic, no loader; roll back with an error toast on failure.
- Nothing appears before 300 ms; once shown, it stays at least 400 ms. No full-screen spinners.

## Iconography

- Shelfmark's own icon set (assets › Icons, component Icons): 44 outline icons, 24px grid, drawn with a 1.75px line, round caps, 3px corners like the cards, and shipped as filled shapes (no `stroke`; colour comes from `fill: currentColor`); the bookmark notch from the logo appears in `sm-saved-link` and `sm-bookmark`. 16px in controls, 20px in navigation, colour of their text (`text`, `text-muted`, `accent`). Delivered as one `sprite.svg`. Never mix in icons from another set. Screens in the 2027 canvas draw the same glyphs inline as stroked SVG for speed; production uses the sprite.
- Website favicons are shown as provided at 16px inside a `radius-sm` square; a missing favicon falls back to a link icon in `text-muted`.
- Logo: the card-with-bookmark mark (assets › Logos) followed by «Shelfmark» in Onest 600 in `text`. Use `shelfmark-mark-light.svg` on light grounds and `shelfmark-mark-dark.svg` on dark; the header shows the lockup, the favicon shows `shelfmark-app-icon.svg`.

## Settings

- One page per section, listed in a settings nav (`sm-tree__row`): Account, Appearance, Library, Notifications and reminders, Language, Keyboard shortcuts, Import and export, Privacy and data, Your feedback.
- Each page is a stack of `sm-panel sm-settings` groups made of `SettingsRow`s. Changes apply at once and sync; no Save button except in forms (name, feedback).
- Destructive actions live only in Account, in their own red-ringed panel, never next to toggles.

## Toasts

- One sentence of what happened, then what it happened to on a second line (`sm-toast__text small`). A lead shows the kind: the link's preview with a check when a link was saved (`sm-toast__thumb`), the folder's coloured tile when something moved (`sm-fic`), a tinted icon otherwise (`sm-toast__icon` with `sm-toast--success`, `--danger`, `--warn`).
- 3 s quick confirmations, 4–5 s saves and status, 8 s with Undo and a countdown line (`sm-toast__timer`), errors and reminders stay until handled. Hover, focus or touch pauses.
- Always centred at the bottom, 24px up; above a bottom bar (phone tab bar, bulk bar) with a 12px gap. Up to three stack (`sm-toast-stack`).

## Layout

- Desktop: an inset sidebar card on the left (logo; All links, Unsorted, Favorites, Recently opened; Pinned; Folders with subfolders; Trash pinned at the bottom under a divider). The sidebar only navigates: lists such as Recently opened and Trash open as their own page in the content area, never as panels inside the sidebar, and the content area with a pill search (⌘K), keyboard shortcuts, theme, «Add link» and the avatar on top; saved views (`sm-view`) above the feed; subfolders as tiles before links.
- Phone (from 360px): a floating glass tab bar (`sm-tab`: Library, Search, Add, Tags, You). Library holds All links, Unsorted, Favorites and Recently opened as tiles, then folders and Trash; Recently opened opens as a bottom sheet (`Sheet`). Search is only for searching. Settings live in You as a list that opens one page per section. The feed is one column.
- Sign in: a centred glass card on `bg` with saved-link cards drifting around it on desktop; on phones a mosaic of link tiles on top and the form below.
