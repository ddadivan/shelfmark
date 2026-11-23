# SegmentedControl
Two to four exclusive choices shown together: the view switch, Site / Reader, reading settings.

**Anatomy:** track (`surface-hover`, `radius-md`, 4px padding) · items 24px high (`radius-sm`, concentric) · the chosen item on `surface` with a hairline.
**Content:** icons (with names and tooltips) or short words.

## Rules
- Use for switching a view of the same thing; for actions use buttons, for many options a menu.
- Arrow keys move and choose; one tab stop.

## In code
`ui-segmented-control` (native radios).
