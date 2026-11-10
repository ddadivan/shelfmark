Toast confirms what just happened, names what it happened to, and offers Undo or a next step.

**Angular:** `ToastService.show({title, detail?, kind: 'saved' | 'moved' | 'success' | 'danger' | 'warn' | 'info', thumb?, folder?, action?: {label, run}, secondary?, duration?})`; rendered in a CDK Overlay, centred at the bottom, lifted above any bottom bar.

**Classes:** `sm-toast` (`--success`, `--danger`, `--warn`), `sm-toast__icon`, `sm-toast__thumb` + `sm-toast__badge`, `sm-fic fc-<colour>` as the lead for moves, `sm-toast__text` with `<small>` for the second line, `sm-toast__action` (`--ghost`), `sm-toast__close`, `sm-toast__timer` (`--dur`), `sm-toast-stack`. Glass surface, enters with `sm-toast-in` (420 ms spring), fades with reduced motion.

- Durations: 3 s quick confirmation, 4–5 s save or status, 8 s with Undo (countdown line), errors and reminders stay until handled. Hover, focus or touch pauses the timer.
- `role="status"`; errors `role="alert"`. Undo is a button reachable by Tab; ⌘Z also undoes while it is visible; Esc dismisses.
- Up to three stack, newest in front; many saves at once collapse into one summary toast.
- Width follows the text up to 540px; the second line truncates with “…”.
