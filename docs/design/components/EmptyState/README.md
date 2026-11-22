EmptyState invites the next action when a space has nothing in it: no links, empty folder, nothing found.

**Angular:** `ui-empty-state` — inputs `icon`, `title`, `text`; projected action button.

**Classes:** `sm-empty`, `sm-empty__art`, `sm-empty__title`, `sm-empty__text`.

- Variants: «Your links will live here» (+ Add link), «This folder is empty» (+ Open Unsorted, Add link), «Nothing found for “…”» (+ Clear search, Search all folders), «You're offline» (+ Try again), «This page doesn't exist» (+ Go to all links).
- Motion (#562): the title and text rise 8 px and fade in, the text 60 ms after the title; reduced motion: plain fade.
