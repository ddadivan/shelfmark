# Search
The one field for finding and asking: words, meaning and "Ask your shelf" live in the same place.

**Anatomy:** search icon · input ("Search or ask your shelf") · `Ctrl K` / `⌘K` key cap. 40px, `radius-sm`, L1 surface.
**Behaviour:** ⌘K focuses it from anywhere; results open in a popover panel under it (desktop) or full screen (phone); the last row asks the question when AI is on.

## Rules
- No other search fields in the app shell; filters live in the results and the library toolbar.
- The key cap hides on touch screens.

## In code
`ui-command-list` in popup mode, `ui-search-trigger`.
