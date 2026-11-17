Suggestion is a chip the model proposes: an existing tag, at most one new tag, or an existing folder. It has a dashed indigo edge (`ai-line`) and no fill until the user taps it; then it becomes the ordinary thing (a sage tag chip, the chosen folder). Screens: `AiTags`, `AiTidy`, `MobileAi`.

**Angular:** `ui-suggestion` — inputs `label`, `kind: 'tag' | 'new-tag' | 'folder'`, `folderColor?`, `folderIcon?`, `selected` (for review lists); outputs `accepted`, `dismissed`, `toggled`. `ui-suggestion-row` — inputs `label` (default "Suggested"), `ariaLabel`, `addAll: boolean`; projects the chips; output `acceptAll`. Built on Angular Aria toolbar behaviour: one tab stop per row, arrow keys between chips.

**Classes:** `sm-suggest-row`, `sm-suggest-row__label` (spark + "Suggested"), `sm-suggest`, `sm-suggest__apply` (the chip's main button: + icon, optional folder tile, label), `sm-suggest__plus`, `sm-suggest__new` ("New" after a new tag's name), `sm-suggest__dismiss` (×), `sm-suggest.is-accepted` (solid `accent-bg`, check icon). Loading: `sm-skel sm-ai-chip-skel` pills in the same row with the label "Suggesting…".

Behaviour:

- **Tap / Enter** applies: a tag chip flashes solid (`is-accepted`, 200 ms `ease-spring`) and moves into the Tags field as an ordinary `sm-chip`; a folder chip fills the Folder field and the folder row disappears.
- **×** hides that suggestion for this link (remembered, so it does not come back on reprocessing).
- **Add all** applies every chip in the row; shown when the row has two or more chips.
- **Review lists** (Tidy Unsorted): chips start `is-accepted` (will be applied) and tapping toggles them back to dashed; nothing changes until the page's Apply.
- At most three existing tags, one new tag (always marked "New") and one folder per link. Only the user's own tags and folders; never another user's.
- Hidden entirely when AI is off, when nothing fits, or on error. The row's place collapses; no placeholder. Limit reached and "not available right now" replace the row with one `sm-ai-line` (AiSummary spec).

The user's choice wins (author's decision, Nov 17, 2026):

- A folder or tags the user picked are never replaced. The folder row then reads "Also fits" and stays a quiet chip; Automatic mode does not apply to it.
- **Automatic mode** (opt-in per feature in Settings › AI, off by default) applies the top suggestion in the background only to what the user left empty: Unsorted for the folder, no tags for tags. It always shows a toast naming the change with Undo (8 s, `sm-toast__timer`), and marks the result while it can be undone: a "Moved by AI" badge with Undo on the Folder field and a spark inside each auto-added tag chip in Edit link, until the user keeps or changes them.
- Learning from accepts, dismissals and moves only changes future suggestions. Existing links are never moved on their own; re-sorting goes through Tidy Unsorted (review with preview).

Accessibility:

- `sm-suggest__apply` gets an `aria-label` that says what happens: "Add tag signals", "Create and add tag state management", "Move to Angular". × is "Dismiss suggestion signals".
- The row is `role="group"` with "Suggested tags" / "Suggested folder"; the loading row is `role="status"` `aria-busy="true"`.
- After an accept, focus moves to the next chip in the row (or to the field when the row is empty), and a polite live region says "Tag signals added".
- Touch: the pill is 28px but the hit area is extended to 44px (`pointer: coarse`); × is always visible on touch.
- Dashed edge uses `ai-line` (3:1), the + uses `ai`, text uses `text` (4.5:1) in both themes.
