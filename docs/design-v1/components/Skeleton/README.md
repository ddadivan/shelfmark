Skeleton holds the place of content on its first load — cards, rows, the folder tree and the preview box. It repeats the real layout, so nothing jumps when data arrives.

**Angular:** `ui-skeleton` — inputs `shape: 'card' | 'row' | 'tree' | 'preview' | 'line'`, `count`.

**Classes:** `sm-skel` (shimmer, off with reduced motion) + shape helpers `sm-skel--line`, `--title`, `--icon`, `--media`, `--chip`.

- Use for first loads instead of a spinner; show as many placeholders as fit a typical screen (6 cards, 8 rows, 5 folders).
- Vary line widths (90 / 70 / 50%) so it reads as text, not as bars.
- Header, sidebar frame and toolbar render immediately; only the data parts are skeletons.
- Swap to content with `sm-reveal` (200 ms fade). Later refetches use the top bar, never skeletons again.
- See Loading for the full rule set and timing (300 ms delay, 400 ms minimum).
