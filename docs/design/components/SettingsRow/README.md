SettingsRow is one setting: what it is on the left, the control on the right.

**Angular:** `ui-settings-section` (input `title`) holding `ui-settings-row` — inputs `title`, `description?`, `icon?`, `align: 'center' | 'top'`; the control goes in the default slot (switch, segmented control, select, button).

**Classes:** `sm-panel sm-settings` + `sm-settings__title` for the group; `sm-setting` (`--top` to align to the first line), `sm-setting__title`, `sm-setting__desc` (max 380px), `sm-setting__icon` (36px tile) for rows about a device, account or service. Rows are separated by a `border` line; the first has none.

- The description says what changes, not how the control works: «Shows where you already saved the same link», not «Toggle duplicates».
- Rows wrap on narrow screens: the control drops under the text.
- Instant settings use Switch; choices of 2–4 use SegmentedControl; longer lists use Select.
