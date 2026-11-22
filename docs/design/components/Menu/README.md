Menu lists actions for a link, folder or the account.

**Angular:** `ui-menu` + `ui-menu-item` — item inputs `icon`, `shortcut`, `danger`, `disabled`; `ui-menu-separator`. Behaviour from Angular Aria menu (arrows, Enter, Esc, typeahead), positioned with CDK Overlay.

**Classes:** `sm-menu`, `sm-menu__item` (`--danger`, `is-selected`), `sm-menu__sep`, `sm-menu__hint`.

- Destructive item last, after a separator.
- Motion (#562): with a mouse one highlight glides between items (`uiFluidHover`); the trigger stays pressed while the menu is open (`aria-expanded`).
