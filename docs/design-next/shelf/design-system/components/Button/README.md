Buttons are pills: one filled primary per view (Add link), quiet fills for the rest.

## Variants
- **Primary** (`sm-btn--primary`): `accent` fill, `on-accent` text: near-black in light, near-white in dark. Add link in the sidebar is the full-width primary, 40px.
- **Secondary** (`sm-btn--secondary`): `surface-hover` fill, `text`. Cancel, Not now, the View button.
- **Ghost** (`sm-btn`): no fill until hover (`fill`). Row actions, toolbar items.
- **Library toolbar buttons** are ghost buttons in `text-muted` at rest and `text` on hover, weight 400, with labels only from 100em (icons with tooltips below).
- **Danger** (`sm-btn--danger`): `danger` fill, only for the final step of a delete.

## Sizes
32px (`--sm`, 12px sides) in toolbars and dialogs, 40px default (16px sides), 48px (`--lg`) on touch. Label 14/22 500; icon 16px, 8px gap.

## Rules
Radius is always `radius-full`. Verb first, one to three words. Hover: primary dims to 90%, the rest take `fill`. Focus: 2px `focus` ring, 2px offset.
