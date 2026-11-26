How the feed looks: a View button opening a menu with the grid size and what cards show, next to the view switch.

## Anatomy
- **View** button: a pill on `surface-hover`, label and a chevron that turns up while open.
- **Menu** (260px, `surface`, `shadow-l2`, radius 12): a preview-image choice (Large, Small, Off), then switches: **Show site, Note, Hashtags, Folder, Date, Description**.
- **View switch** beside it: Masonry, Cards, List, Headlines, as 36×28 icon buttons on a `surface-hover` track; the current one on `surface`.
- **Desktop toolbar:** Filter, Sort, View, the four-way switch (Masonry, Cards, List, Headlines), Export, Select, Side by side, Save view.
- **Below 64em** the head is the saved-view picker, Filter, Sort, View and ⋯ (Select, Export). The View menu opens as a bottom sheet holding the view switch.

## Behaviour
Changes apply at once and are remembered per feed. The slider moves in whole steps; arrow keys move it one step. Esc or a click outside closes the menu.
