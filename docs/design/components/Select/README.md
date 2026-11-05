Select picks one value from a list; in Shelfmark it chooses the folder for a link, with nested folders indented.

**Angular:** `ui-select` — inputs `label`, `options` (tree of `{id, name, children}`), `searchable`, `emptyLabel` (default "Unsorted" = `null`), `placeholder`; Signal Forms binding. Behaviour from Angular Aria combobox + listbox.

**Classes:** trigger `sm-field__control` + `sm-select__value`; popup `sm-listbox` (`sm-pop-in`), items reuse `sm-menu__item`, selected `is-selected`.

- Nested levels indent by 16px; the selected item shows a check and `accent-bg`.
- Keyboard: arrows move, Enter selects, typing filters, Esc closes.
