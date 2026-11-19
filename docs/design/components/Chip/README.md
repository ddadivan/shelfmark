Chip shows a tag; clickable chips filter the feed by that tag, removable chips live in TagInput.

**Angular:** `ui-chip` — inputs `variant: 'tag' | 'neutral'`, `clickable`, `removable`, `icon`, `truncate` (the label ends in “…” inside the pill, up to `--ui-chip-max-inline-size`), `ariaLabel` (name of the clickable body when its text says too little, such as “+2”); outputs `removed`, `clicked`.

**Classes:** `sm-chip`, `sm-chip--neutral`, `sm-chip--clickable`, `sm-chip__remove`.

- Tags use sage (`accent-bg` / `accent-text`); neutral chips for filters and states.
- A card shows only its first tag; the rest collapse to «+2», which opens the “All tags” popover (`components/Popover`, `screens/CardTags.dc.html`).
