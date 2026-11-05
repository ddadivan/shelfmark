Illustration is a set of flat geometric scenes built from the product's own shapes — link cards, tag pills, favicon squares — coloured only with tokens, so they work in both themes.

**Angular:** `ui-illustration` — input `name: 'welcome-collect' | 'welcome-save' | 'welcome-find' | 'empty-feed' | 'not-found' | 'offline'`, `animated` (default true). Each scene is an inline SVG whose fills are classes bound to tokens (`primary`, `accent`, `accent-bg`, `surface`, `border`, `surface-pressed`, `logo-bookmark`).

- Used in: the 3-step welcome dialog, EmptyState, the error pages and sign-in.
- Motion loops slowly (3–5 s) and calmly; disabled under `prefers-reduced-motion` (the scene shows its final state).
- Shapes only: no people, mascots or detailed objects. Sage marks the one meaningful element in a scene.
