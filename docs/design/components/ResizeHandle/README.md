ResizeHandle is the draggable divider between two panes of a split view, such as the link list and its preview panel. It is always visible, so people can see that the panes can be resized (#553).

**Angular:** `ui-resize-handle` — inputs `label` (required, the accessible name), `value` (model, px: the width of the pane before the handle), `min`, `max` (px), `hint` (optional tooltip text, for example «Drag or use ← → to resize»); output `resetRequested` (named so because `reset` is a native event name). The owner applies `value` to its pane and keeps it. Harness `UiResizeHandleHarness` (`label`, `getValue`, `getLimits`, `pressKey`, `doubleClick`).

**Look:** a 14px strip that stretches to the height of the row, `cursor: col-resize`, with a pill 4px wide and 44px tall (`radius-full`) in `border-control` (3:1 on the page). Hover, keyboard focus and dragging turn the pill `accent`; keyboard focus adds the focus ring around the strip. The pointer target is 24px wide (44px on touch). The colour change is a 120 ms transition, none under reduced motion.

**Behaviour:**

- Dragging uses pointer capture and emits clamped values while moving; while it lasts the page shows `col-resize` and no text is selected.
- ArrowLeft / ArrowRight move the handle 16px (Shift: 64px), Home and End jump to `min` and `max`; Enter or a double click emits `resetRequested`. In right-to-left pages the directions flip.
- `role="separator"`, `aria-orientation="vertical"`, `tabindex="0"`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax`.
- `hint` shows as a tooltip beside the handle on hover and focus and is also its description.
