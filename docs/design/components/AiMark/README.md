AiMark is the one sign that something was made by AI: a suggestion row, a summary, the AI settings. It is the `spark` icon in `text-muted`, nothing more.

**Angular:** `ui-icon name="spark"` with a `label` where the mark carries meaning alone ("Summary by AI", "Suggested by AI"); inside a labelled row ("Suggested") it is `aria-hidden`.

**Classes:** `sm-ai-mark` (inline-flex, `text-muted`).

**Icon `spark`** (added to the set for #476): a four-point star with concave sides and a small plus at its lower right. Stroke source: `M11 4c.6 3.9 2.6 6 6.5 6.5-3.9.6-5.9 2.6-6.5 6.5-.6-3.9-2.6-5.9-6.5-6.5C8.4 10 10.4 7.9 11 4z M18.5 15v4 M16.5 17h4`; 1.75px line, round caps and joins, converted to filled outlines like every icon (Icons).

- One mark everywhere. No second "AI" glyph, no robot, no wand.
- Colour of its text: `text-muted` next to AI text, `text` in the settings switch row. Never `accent`, never a gradient, never animated on its own.
- 14px next to 12–13px text, 16px in controls and settings, 18px in a settings tile, 32px in the empty-state tile (the largest size).
- The mark leaves when the content becomes the user's: an edited summary has no mark.
