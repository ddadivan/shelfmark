# Chip
A small toggle or filter: saved views, filter values, AI suggestions.

**Variants:** default (surface, hairline), pressed (`accent-bg`), `dashed` ("Save view": an action that creates), `ai` (dashed `ai` edge with the spark: a suggestion not yet accepted).
**Shape:** 32px, `radius-sm` (40px on phones).

## Rules
- Counts sit inside the chip in `meta`.
- A suggestion becomes an ordinary solid chip once accepted.
- Static metadata is never a chip: use Tag or plain text.

## In code
`ui-saved-views`, `ui-chip`, `ui-suggestion`.
