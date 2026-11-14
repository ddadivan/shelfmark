TabBar is the phone's main navigation: a floating glass bar with Library, Search, Add, Tags and You.

**Angular:** `ui-tab-bar` — input `active`; output `add`. Fixed 16px from the sides and 20px from the bottom, above the home indicator (`env(safe-area-inset-bottom)`).

**Classes:** `sm-glass` container (26px corners, 68px tall), `sm-tab` (`is-on`), the primary Add button in the middle (56px, 20px corners).

- Five slots, never more. Labels always visible.
- Toasts and sheets sit above it with a 12px gap; the content scrolls under it with 110px bottom padding.
