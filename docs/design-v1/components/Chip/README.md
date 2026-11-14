Chip shows a tag; clickable chips filter the feed by that tag, removable chips live in TagInput.

**Angular:** `ui-chip` — inputs `variant: 'tag' | 'neutral'`, `clickable`, `removable`, `icon`; outputs `removed`, `clicked`.

**Classes:** `sm-chip`, `sm-chip--neutral`, `sm-chip--clickable`, `sm-chip__remove`.

- Tags use sage (`accent-bg` / `accent-text`); neutral chips for filters and states.
- Never more than 3 chips on a card; the rest collapse to «+2».
