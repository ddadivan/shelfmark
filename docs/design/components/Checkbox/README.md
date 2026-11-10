Checkbox selects items for bulk actions and marks options in forms.

**Angular:** native `<input type="checkbox">` with Signal Forms `[field]`; on cards it appears on hover or in select mode.

**Classes:** `sm-check` (drawn: 22px, 7px corners, `border-control` outline, `primary` fill with an `on-primary` tick when checked). Selected cards get `sm-card is-selected` (2px `primary` ring); selected rows `sm-row is-selected`.

- Always pair with a visible label or an `aria-label` naming the item («Select Wool coat»).
- Shift-click selects a range; ⌘A selects all in the view.
