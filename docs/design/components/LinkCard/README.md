LinkCard shows one saved link in the cards view: preview image, site, title, note and tags.

**Angular:** domain component `link-card` (feature library) built from `ui-card`, `ui-chip`, `ui-menu`: input `link` (`Link` from `libs/shared/contracts`); outputs `opened`, `favoriteToggled`, `edit`, `delete`.

**Classes:** `sm-card` (hover: a soft shadow spreads out from under the card without moving it, the preview zooms to 1.06, and an `sm-card__open` bar slides up over the preview with the address and “Open ↗”; press: the shadow tightens back and the bar darkens — no scale, never lifts). Dark theme: a black shadow is invisible on dark ground, so the card also brightens a little (surface + 8% white), its border lightens and a faint light glow spreads under it, `sm-card__media` (16:9, clips) + `sm-card__img` (the image that zooms; falls back to the site letter on `accent-bg`), `sm-card__body`, `sm-card__meta`, `sm-favicon`, `sm-card__title` (2 lines), `sm-card__note` (2 lines, `text-muted`), `sm-card__tags`, `sm-card__actions` (⋯ menu: edit, move, delete; fades in on hover or keyboard focus, always visible on touch), `sm-star` (`is-on` pops in sage).

- The whole card opens the link in a new tab; actions stop propagation.
- Grid: `repeat(auto-fill, minmax(240px, 1fr))`, gap `space-6`; one column on phones.
