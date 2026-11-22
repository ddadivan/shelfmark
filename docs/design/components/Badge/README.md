Badge is a small status label on a card or row: pinned, overdue, days left, shared.

**Classes:** `sm-badge` (`--accent`, `--warn`, `--danger`), 22px pill, `label`-size text, optional 12px icon first.

- Words first, colour second: «4 days left» in `--warn`, never a coloured dot alone.
- One badge per card; more than one means the information belongs in the meta line.
- Motion (#562): a counter badge pops in (0.6→1, `ease-spring`, 200 ms) when it appears; reduced motion fades.
