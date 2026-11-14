Input is a single-line text field with label, optional icon, hint and error.

**Angular:** `ui-input` — inputs `label`, `type: 'text' | 'url' | 'search'`, `placeholder`, `hint`, `icon`, `clearable`, `shortcut` (shows a `sm-kbd` hint like ⌘K), `disabled`; bound to Signal Forms (`[field]`), error text comes from the field's validation.

**Classes:** `sm-field` > `sm-field__label`, `sm-field__control` (+`--url` for mono URLs), `sm-field__hint`; error: `sm-field--error`.

- Label is always visible above the field; placeholder shows an example, never the label.
- Errors say what to do: “Enter an address that starts with https://”.
- Borders use `border-control` (3:1); focus turns the border `focus-ring` and adds a soft 3px halo hugging the field (no offset outline, so the ring never floats away from the control). Buttons and other controls keep the 2px outline with a 2px offset.
