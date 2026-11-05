Toast confirms a completed action and offers undo for deletions.

**Angular:** `ToastService.show({text, kind: 'info' | 'success' | 'error', action?: {label, run}, duration?})`; rendered in a CDK Overlay at the bottom (centre on phones, bottom-left on desktop).

**Classes:** `sm-toast` (`--success`, `--error`), `sm-toast__text`, `sm-toast__action`; enters with `sm-slide-up`.

- 4 s by default, 8 s with an action; pauses on hover; announced via `aria-live="polite"`.
- Text is short and past tense: "Link saved". No "successfully".
