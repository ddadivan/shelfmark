PickerMenu is a title-sized button that opens the folder picker in a popover: the header of each half of the side-by-side view (#386, `screens/SideBySide.dc.html`). It reuses `ui-picker-list` (the "Move to folder" picker) as is; only the trigger and the popover are new.

**Angular:** `ui-picker-menu` — inputs `options` (`PickerOption[]`, same tree as `ui-picker-list`), `value` (the shown id, `null` = the empty row), `label` (visible name of the value), `icon` and `colour` (the tile before the name), `emptyLabel`, `currentIds`, `currentLabel`, `searchLabel`, `listLabel`, `noResultsLabel` (passed to the list), `triggerLabel` (accessible name of the button, e.g. "Left feed: Angular. Change"); output `chosen: string | null`. Every string comes in through an input.

**Classes:** trigger: ghost pill, `title` type (22/28, 600, −0.02em), `min-height` 44px, a small folder tile (`sm-fic sm-fic--sm`), the name (one line, truncated with "…") and `chevron-down` in `text-muted`. Popover: `sm-listbox` on glass (`glass`, `glass-line`, `shadow-float`), 300px wide, max 60vh with its own scroll, the search box on top, rows as `sm-menu__item`.

- The popover is a dialog (`role="dialog"`, named by `listLabel`) anchored below the trigger's start edge; it scales from the trigger (Motion: menu in 200 ms `ease-out`, out 120 ms `ease-in`; reduced motion fades). Esc or a click outside closes it and focus returns to the trigger.
- Opening focuses the search box; arrows, Home / End, Enter and typing work exactly as in `ui-picker-list`. Choosing a row emits `chosen` and closes.
- Rows in `currentIds` show `currentLabel` on the right ("On the left", "On the right") and cannot be chosen; the shown value carries a check.
- The trigger has `aria-haspopup="dialog"` and `aria-expanded`. Hover only with `hover: hover`; focus-visible ring as every button.
- Both themes; nothing below 64em uses it (side by side is desktop only).
