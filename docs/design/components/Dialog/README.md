Dialog asks for a decision or holds a short form (add / edit link, delete folder, welcome).

**Angular:** `ui-dialog` (opened via a `DialogService` on CDK Dialog) — inputs `title`, `size: 'sm' | 'md'`; slots for body and footer; preset `confirm({title, message, confirmLabel, cancelLabel, destructive, closeLabel?})` resolving to a boolean (`closeLabel` is the accessible name of the optional header close button; every string comes from the caller). On phones it renders as a bottom sheet (`sm-sheet`).

**Classes:** `sm-scrim` (`overlay`), `sm-dialog` (`--md`), `sm-dialog__head|title|text|foot`, `sm-pop-in`; mobile `sm-sheet` + `sm-sheet__grip`.

- Focus moves into the dialog and returns to the trigger on close; Esc closes; scrim click closes non-destructive dialogs only.
- Footer: secondary "Cancel" left of the main action; destructive confirmations use `destructive` (red confirm button, `alertdialog`, scrim does not close, Cancel has focus).
