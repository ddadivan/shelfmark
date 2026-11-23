# NavItem
A row of the sidebar: icon, name, and a count or a dot.

32px (40 on touch), `radius-sm`, `label` text. Current page: `accent-bg` with `accent-text`. Folders show their colour only in the 24px tile; the row never fills with the folder colour. Counts in `meta`, muted; a waiting count (Revisit) is a `radius-full` dot in `accent`.

Sections: Library (All links, Unsorted, Favorites), Revisit, Pinned, Folders, Tags, Trash at the bottom.

## In code
`ui-tree` rows, shell sidebar.
