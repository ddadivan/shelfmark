Toast confirms a completed action and offers undo for deletions.

**Angular:** `ToastService.show({text, kind: 'info' | 'success' | 'error', action?: {label, run}, duration?})`; rendered in a CDK Overlay at the bottom (centre on phones, bottom-left on desktop; the app overrides this with bottom centre on every screen, the author's decision, see `libs/ui/CLAUDE.md`).

**Classes:** `sm-toast` (`--success`, `--error`), `sm-toast__text`, `sm-toast__action`; enters with `sm-slide-up`.

- 4 s by default, 8 s with an action; pauses on hover and while focus is inside; announced via `aria-live="polite"`.
- Keyboard: `Alt+Shift+T` (`Option+Shift+T` on macOS) moves focus to the action of the toast on screen (`ToastService.handleShortcut`, bound by the app). A visually hidden hint ("Press Alt+Shift+T to reach Undo", `actionHint`) is announced with the toast, and a small `kbd` with the keys sits before the action from the tablet breakpoint up (hidden on phones). When a focused toast closes by action or dismissal, focus returns to where it was.
- Text is short and past tense: «Link saved». No «successfully».
