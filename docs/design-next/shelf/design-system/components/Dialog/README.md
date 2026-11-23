# Dialog
A modal L3 panel, kept for the few things that must interrupt: confirming a permanent action, the export, the AI intro, shortcuts, What's new.

`radius-lg`, 24px padding, `title-m` heading, over `scrim`. Destructive confirmations name the thing ("Delete “Wool overshirt” forever?"), use a danger verb, focus Cancel. Never a dialog on a dialog; never a dialog for a task under 10 seconds (use a Popover) or longer than one step (use a page).

## In code
`DialogService.open()`, `confirm()`.
