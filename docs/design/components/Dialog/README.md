Dialog asks for a decision or holds a short form (add / edit link, delete folder, welcome).

**Angular:** `ui-dialog` (opened via a `DialogService` on CDK Dialog) — inputs `title`, `size: 'sm' | 'md'`; slots for body and footer; preset `confirm({title, text, confirmLabel, danger})`. On phones it renders as a bottom sheet (`sm-sheet`).

**Classes:** `sm-scrim` (`overlay`), `sm-dialog` (`--md`), `sm-dialog__head|title|text|foot`, `sm-pop-in`; mobile `sm-sheet` + `sm-sheet__grip`.

- Focus moves into the dialog and returns to the trigger on close; Esc closes; scrim click closes non-destructive dialogs only.
- `role="dialog"` (or `alertdialog` for destructive confirmations) and `aria-modal` live on the CDK overlay container with `aria-labelledby` pointing at the title; the `<form>` inside stays a plain form, so Enter submits it.
- Footer: secondary «Cancel» left of the main action; destructive confirmations use `danger`.
