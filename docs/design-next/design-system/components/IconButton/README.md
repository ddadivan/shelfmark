# IconButton
A square 32px button with one icon, for toolbars and card actions; always has a name and a tooltip.

**Variants:** default (muted icon, hover fill), `boxed` (surface with edge: actions over a card cover), pressed (`aria-pressed`: Details, Side by side).
**Shape:** `radius-sm`.

## Rules
- Every icon button has `aria-label` and a tooltip with the same words plus its shortcut.
- Use only for actions people recognise from the icon (favorite, more, close, prev/next); otherwise a labelled Button.
- Touch: hit area 44×44.

## In code
`ui-button` icon-only (`ariaLabel`), tooltip from `uiTooltip`.
