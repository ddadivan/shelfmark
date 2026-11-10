Ripple is the press feedback for rows and quiet controls: a soft circle of the text colour grows from the exact point you touched and fades. It answers taps on phones, where hover doesn't exist, and makes long lists feel physical.

**Angular:** directive `uiRipple` (in `libs/ui`), applied by default inside `ui-tree-item`, `ui-menu-item`, `link-row`, every `ui-button` and clickable `ui-chip`. Opt out with `[uiRipple]="false"`.

**Classes:** host gets `sm-ripple-host`; the directive appends `<span class="sm-ripple">` positioned at the pointer, sized to the farthest corner (`2 × distance`), and removes it on `animationend`.

Where:
- Yes: all buttons (together with their 0.97 press scale), sidebar rows (folders, All links, Unsorted, Favorites), mobile menu rows, menu and listbox items, list-view rows, clickable tag chips, segmented control items.
- No: link cards (they have the shadow-and-Open hover), text inputs, dialogs, the landing.
- On filled buttons (primary, danger) the ripple is the button's text colour at 22%, so it reads on graphite and red.

Behaviour:
- Colour: `currentColor` at 6% in the light theme and 10% in the dark one (20% on filled buttons), so it is graphite on neutral rows and sage on the active (sage) row; works in both themes without extra tokens.
- Grows from the touch point over 450 ms `ease-out` and stays while the pointer is down; on release it fades in 350 ms (`is-out`) while still finishing its growth, so a quick tap and a long press both feel right.
- Keyboard (Enter/Space): starts from the centre.
- Starts on `pointerdown`, not on click, so it feels instant. If the pointer moves more than 10 px (a scroll), the ripple is cancelled.
- `prefers-reduced-motion`: no ripple; the row just shows `surface-pressed` while pressed.
