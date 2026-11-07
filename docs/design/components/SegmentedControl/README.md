SegmentedControl switches between 2–4 views; in Shelfmark it toggles cards and list.

**Angular:** `ui-segmented-control` — inputs `options: {value, label, icon}[]`, `iconOnly`; model `value`. Behaviour from Angular Aria (arrow keys).

**Classes:** `sm-seg`, `sm-seg__item`, active `is-active`. Add `sm-seg--slide` with `--seg-n` (options) and `--seg-i` (active index): items get equal widths and one white thumb slides between them (200 ms `ease-out`) instead of jumping.

- **Accessibility:** the group is `role="radiogroup"` with an `aria-label`; each item is `role="radio"` with `aria-checked="true|false"` (never only the `is-active` class), one tab stop, arrow keys move the choice. Icon-only items need `aria-label` and a tooltip.
- On phones use the icon-only form; the choice is remembered (UiStore).
- Switching cards ↔ list morphs the content: every link has `view-transition-name: link-<id>`, the change runs inside `document.startViewTransition`, so each card glides into its row (320 ms `ease-in-out`). No morph with reduced motion or without browser support — the view just swaps.
