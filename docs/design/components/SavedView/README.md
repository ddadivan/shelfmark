SavedView chips filter the library by a saved query: All, Videos, Articles, To read. «Save this view» stores the current filter.

**Angular:** `ui-saved-views` — inputs `views: {id, label, count}[]`, `activeId`; outputs `selected`, `save`. A toolbar with arrow-key navigation.

**Classes:** `sm-view` (`is-on`: `primary` fill), the count in `<b>` with tabular numbers.

- Wraps to a new line; never scrolls sideways on desktop. On phones it scrolls horizontally with the first chip flush left.
