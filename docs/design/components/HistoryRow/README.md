HistoryRow lists a link in Recently opened or Trash, inside day groups.

**Angular:** `ui-history-group` (input `title`: Today, Yesterday, Earlier this week) holding `link-history-row` — inputs `link`, `time` or `daysLeft`, `selectable`; outputs `open`, `restore`, `remove`, `more`.

**Classes:** `sm-history` + `sm-history__title` for a day group, `sm-history__list` for the card that holds the rows, rows are `sm-row` with `sm-row__preview` (72×48; `--sq` 48×48 on phones), `sm-row__main`, the folder (`sm-fic` 18px + name), `sm-row__time`, then actions. In Trash the time becomes a `sm-badge` with days left (`--warn` at 7 or fewer) and actions are Restore and Delete forever.

- Recently opened keeps 30 days; Trash keeps the period set in Settings › Library.
- On phones the actions move to a swipe: left reveals Restore / Delete (Trash) or Remove (history).
