Checkbox selects items for bulk actions and marks options in forms.

**Angular:** native `<input type="checkbox">` with Signal Forms `[field]`; on cards it appears on hover or in select mode.

**Classes:** `sm-check` (drawn: 22px, 7px corners, `border-control` outline, `primary` fill with an `on-primary` tick when checked). Selected cards get `sm-card is-selected` (2px `primary` ring); selected rows `sm-row is-selected`.

- Always pair with a visible label or an `aria-label` naming the item («Select Wool coat»).
- Shift-click selects a range; ⌘A selects all in the view.
- Motion (#562, #564): checking fills the box (120 ms), then draws the tick along its stroke (200 ms `ease-out`, after a 120 ms wait); unchecking clears at once; reduced motion shows the tick at once.
- Tick size (#564): the glyph box is 20px in the 22px box, 28px in the card's 32px box and 34px in its 40px touch box (the drawn stroke is about 60% of the glyph box).
