EmptyState invites the next action when a space has nothing in it: no links, empty folder, nothing found.

**Angular:** `ui-empty-state` — inputs `heading` (not `title`: a `title` attribute on the host would add a native tooltip), `text`, `icon`, `illustration`, `illustrationMotion` (omit for the scene default), `headingLevel` (1–6, default 2); the action button is projected content. `illustration` wins over `icon`; the art is decorative, the heading names the state.

**Classes:** `sm-empty`, `sm-empty__art`, `sm-empty__title`, `sm-empty__text`.

- Variants: "Your links will appear here" (+ Add link), "This folder is empty" (+ Add link), "Nothing found" (+ Clear search).
