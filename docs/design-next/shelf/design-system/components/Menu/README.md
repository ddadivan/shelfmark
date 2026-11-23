# Menu
A short list of actions on an L2 surface, opened from a "…" or a toolbar control.

**Anatomy:** L2 (`radius-md`, 8px padding) · items 36px (`radius-sm`, concentric), icon 16 muted, label, shortcut cap · group headings (`meta`) · separators · danger item last.
**Behaviour:** opens from its trigger (scale from the trigger, 200 ms), arrows move, Esc closes and returns focus, a choice closes and shows a toast with Undo where possible.

## Link menu (in order)
Open here · Open in browser · Favorite · Pin to top of folder · Pin to sidebar · Move to folder… (M) · Remind me… (R) · Copy link · Rule for this site… · Delete (⌫).

## In code
`ui-menu`, `ui-menu-item`, `uiMenuTrigger`.
