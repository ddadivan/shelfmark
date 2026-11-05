Button triggers an action; one `primary` per view (usually “Add link”), everything else `secondary` or `ghost`.

**Angular:** `ui-button` — inputs `variant: 'primary' | 'secondary' | 'ghost' | 'danger'` (default `secondary`), `size: 'sm' | 'md' | 'lg'` (default `md`), `iconLeft`, `iconRight`, `iconOnly` (requires `ariaLabel`), `loading`, `disabled`, `type`. Content: the label text.

**Classes:** `sm-btn` + `sm-btn--{variant}`, `sm-btn--sm|lg`, `sm-btn--icon`; loading = `aria-busy="true"` + `sm-spinner`.

- Press: scale 0.97 (80 ms down, `ease-spring` back) plus a ripple from the touch point (see Ripple); hover: `duration-fast`; focus: 2px `focus-ring`.
- `danger` only for irreversible actions, and only inside a confirmation dialog or menu.
- Labels are verb-first, sentence case, no period. Icon-only buttons always get an `aria-label` and a tooltip.
- Prefer keeping buttons enabled and explaining errors over `disabled`.
- `loading` locks the button's width before the label changes, so it never jumps; the spinner grows in (see Loading, Motion).
