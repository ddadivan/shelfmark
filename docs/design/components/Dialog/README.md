Dialog asks for a decision or holds a short form (add / edit link, delete folder, welcome).

**Angular:** `ui-dialog` (opened via a `DialogService` on CDK Dialog) — inputs `title`, `size: 'sm' | 'md'`; slots for body and footer; preset `confirm({title, text, confirmLabel, danger})`. On phones it renders as a bottom sheet (`sm-sheet`).

**Classes:** `sm-scrim` (`overlay`), `sm-dialog` (`--md`), `sm-dialog__head|title|text|foot`, `sm-pop-in`; mobile `sm-sheet` + `sm-sheet__grip`.

- Focus moves into the dialog and returns to the trigger on close; Esc closes; scrim click closes non-destructive dialogs only.
- `role="dialog"` (or `alertdialog` for destructive confirmations) and `aria-modal` live on the CDK overlay container with `aria-labelledby` pointing at the title; the `<form>` inside stays a plain form, so Enter submits it.
- Footer: secondary «Cancel» left of the main action; destructive confirmations use `danger`.
- Phone sheet footer (#512): the main action (the last footer button) is alone on the bottom row at full width; every other footer button shares ONE row above it in equal widths (two: halves, three: thirds; a single other button is a full-width row). A plain Cancel next to the dialog's own × is marked `uiDialogCancel` and not shown on the sheet while `closeLabel` is set (the × does the same); confirm dialogs without × keep their Cancel. Labels that would not fit a third get a short form (Fill in with AI: «Fill», accessible name unchanged). Desktop dialogs are unchanged.
