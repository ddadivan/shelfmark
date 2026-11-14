Tree is the sidebar navigation: fixed sections, then the nested folder tree with counts.

**Angular:** `ui-tree` — input `nodes: {id, name, icon, count, children}[]`, `activeId`; outputs `selected`, `toggled`, `contextMenu`. Behaviour from Angular Aria tree (arrows expand/collapse, Enter opens).

**Classes:** `sm-tree`, `sm-tree__row` (`is-active`, hover), `sm-tree__twist` (`is-open`), `sm-tree__count`, `sm-tree__section`.

- Each level indents 16px. Active row uses `accent-bg` — the main place sage appears in navigation.
- Right click or the «…» button opens the folder Menu.
