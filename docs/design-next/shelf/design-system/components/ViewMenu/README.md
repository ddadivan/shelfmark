How the feed looks: a View button opening a menu with the grid size and what cards show, next to the view switch.

## Anatomy
- **View** button: a pill on `surface-hover`, label and a chevron that turns up while open.
- **Menu** (260px, `surface`, `shadow-l2`, radius 12): *Grid size* with its step ("4 / 6"), a six-step slider from Small to Large (130 to 300px columns; disabled in List), then four switches: **Note, Hashtags, Folder, Date**.
- **View switch** beside it: Masonry, Cards, List, as 36×28 icon buttons on a `surface-hover` track; the current one on `surface`.
- A ⋯ button after the switch holds the rest: Sort by, Filter, Select links, Side by side, Export this view.

## Behaviour
Changes apply at once and are remembered per feed. The slider moves in whole steps; arrow keys move it one step. Esc or a click outside closes the menu. Phone: the View button is hidden; two columns, the switch stays.
