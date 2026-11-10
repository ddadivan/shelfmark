Breadcrumbs show where the current folder sits and let the user jump up any level.

**Angular:** `ui-breadcrumbs` — input `items: {label, link}[]`, `maxItems` (default 4: middle levels collapse into «…» with a menu).

**Classes:** `sm-crumbs`, `sm-crumbs__sep`, `sm-crumbs__current` (`aria-current="page"`).

- Sits above the feed, never in the header. On phones only the parent and current level show.
