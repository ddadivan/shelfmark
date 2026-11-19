Popover is a small glass panel above a trigger with a heading and a few controls, such as all the tags of a card behind its «+N» chip (`screens/CardTags.dc.html`).

**Angular:** `ui-popover` — input `heading` (visible title and accessible name), `inline` (docs and Storybook only); outputs `opened`, `closed`; API `openFrom(element, { focus })`, `close({ restoreFocus })`, `focusFirst()`, signals `isOpen`, `anchor`, `hovered`; content projected. Trigger: the `uiPopoverTrigger` directive on a `ui-button` or a clickable `ui-chip` (`uiPopoverTriggerHover`, default on). CDK Overlay through `UiOverlay` (layer `menu`).

**Look:** `@include glass` like a menu (18px corners, padding 10px 12px 12px, 160px to 320px wide, scrolls past 320px tall); heading in `caption`, 600, `text-muted`; gap `space-2`. Grows from the corner next to the trigger (`enter(pop)` / `leave(pop)`; a fade under reduced motion). Both themes follow `<html>`.

**Position:** above the trigger, start edges aligned; then end edges; then below.

**Behaviour:**

- Hover (mouse, pen) or keyboard focus on the trigger opens it after 150 ms without moving focus; it closes 250 ms after the pointer and focus left both the trigger and the panel, so the pointer can travel into it.
- A click or tap pins it open (touch never hovers); a keyboard activation (Enter, Space) also moves focus to its first control; a second click closes it.
- Esc closes it and gives focus back to the trigger; a press outside closes it; Tab past either end of its content closes it and continues from the trigger.
- `role="dialog"` named by the heading, non-modal (nothing is trapped); the trigger has `aria-haspopup="dialog"`, `aria-expanded` and `aria-controls`.
- Never put the only way to do something in a hover: the same content opens with a click, a tap and the keyboard.
