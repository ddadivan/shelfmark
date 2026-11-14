Sheet slides up from the bottom on phones for short lists and choices: Recently opened, Remind me, move to folder.

**Angular:** `ui-sheet` (CDK Dialog with the bottom-sheet position) — inputs `title`, `height: 'auto' | 'tall'`; slots for header actions and body. On desktop the same content opens as a Dialog.

**Classes:** `sm-scrim` behind, `sm-sheet` (28px top corners, `ease-drawer`), `sm-sheet__grip`, `sm-sheet__head` + `sm-sheet__title`, body below.

- Drag the grip or swipe down to close; the close button stays for people who don't swipe. Esc closes on keyboards.
- A tall sheet leaves at least 150px of the page visible above it, so it's clear where you are.
