Tooltip names an icon-only control or shows its shortcut.

**Angular:** `uiTooltip` directive — inputs `uiTooltip` (text), `position`, `delay` (default 400ms); CDK Overlay.

**Classes:** `sm-tooltip`. Graphite (`primary` / `on-primary`) in both themes.

- Never put essential information only in a tooltip; on touch devices they don't show.
- Motion (#562): inside a group (`uiTooltipGroup`) the first tooltip waits the delay, neighbours open at once and the panel travels to them; leaving the group closes it instantly.
