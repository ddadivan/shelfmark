AiSummary is the one- or two-sentence summary AI writes for a link, and AiLine is the quiet one-line status that stands in for AI content when it cannot appear. Screens: `AiSummary`, `AiTags`, `MobileAi`.

**Angular:** part of the domain `link-card` / `link-row` (feature library): input `link.summary` with `link.summarySource: 'ai' | 'user'` and `link.aiStatus: 'pending' | 'done' | 'failed' | 'skipped'` from `libs/shared/contracts`. `ui-ai-line` — inputs `text`, `actionLabel?`; output `action`.

**Classes:** `sm-ai-summary` (+ `--row` for one line) holding `sm-ai-mark` and `sm-ai-summary__text` (2-line clamp; 1 line in rows). `sm-ai-line` (spark, text, optional ghost button).

Summary rules:

- Sits in the card's note slot, `text-muted`, 13/18. The user's note wins the slot; the summary then shows in Edit link and in search results only.
- `summarySource: 'ai'` shows the mark; `'user'` (any edit) shows plain text with no mark and is never rewritten by reprocessing or backfill.
- **Pending** (just saved): two `sm-skel sm-skel--line` bars in the slot for up to \~10 s, then the text fades in (`sm-reveal`, 200 ms). Past 10 s the skeleton goes away and the summary appears on the next load.
- **Failed / skipped / off:** nothing; the card is exactly today's card.
- Plain text only, rendered with text interpolation: no links, no Markdown, no HTML. Written in the interface language.
- Edit link: a "Summary" field with a badge ("Written by AI" with the spark, or "Edited by you"), "Rewrite" (ghost, only while AI-written), and a hint: "Edit it and it becomes yours: AI never rewrites your text."

AiLine rules:

- One sentence, `text-muted`, 12/16, with the spark: what happened and what still works. "Suggestions are paused until Dec 1. You used this month's 100 links." / "Suggestions aren't available right now. Your link saves as usual."
- Optional ghost button: "Try again" (provider error, once) or "AI settings" (limit).
- Never red, never a toast, never more than one per dialog or sheet. Settings › AI is the only place that uses `sm-notice--warning` for AI status.
