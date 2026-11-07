TagInput adds several tags to a link with autocomplete from existing tags and creation of new ones.

**Angular:** `ui-tag-input` — inputs `label`, `suggestions` (existing tags with counts), `maxTags`, `placeholder`; model `tags: string[]`. Behaviour from Angular Aria combobox.

**Classes:** `sm-field__control sm-taginput` with `sm-chip` + `sm-chip__remove`; suggestions in `sm-listbox`.

- Enter or comma adds; Backspace on empty input removes the last chip.
- The last suggestion is always «Create tag “…”» when the text is new.
- **Accessibility:** the input is `role="combobox"` with `aria-expanded`, `aria-controls` (the listbox id), `aria-autocomplete="list"` and `aria-activedescendant` for the highlighted option; the listbox has `aria-label="Tag suggestions"`; dividers inside it are `role="none"` (a listbox may hold only options and groups). Each chip remove button is named «Remove tag <name>».
