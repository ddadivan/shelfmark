# Button
A labelled action; one **primary** per view (usually Add link), everything else secondary or ghost.

**Variants:** `primary` (accent fill: the one main action), `secondary` (surface with `line-strong` edge: Cancel, Open), `ghost` (no fill until hover: toolbar and inline actions), `danger` (destructive confirmation only).
**Sizes:** `sm` 32 (toolbars, cards), `md` 40 (default), `lg` 48 (phone sheets, sign-in).
**Shape:** `radius-sm` (8). Never a pill.

## Rules
- Label is a verb, 1–3 words, sentence case: "Add link", "Move to Trash". No "OK" or "Submit".
- Icon left at 16px, only when it helps recognition.
- Loading: spinner replaces the icon, label changes to the -ing form ("Saving…"), width stays.
- Disabled only when the reason is visible next to it; prefer an enabled button and an error.

## Accessibility
Native `<button>`; focus ring `focus` 2px with 2px offset; touch target 44×44 (the hit area grows, not the look).

## In code
`libs/ui` `ui-button` (`variant`, `size`, `loading`, `iconLeft`).
