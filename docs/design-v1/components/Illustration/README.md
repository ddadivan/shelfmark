Illustration is a set of flat geometric scenes built from the product's own shapes — link cards, tag pills, favicon squares — coloured only with tokens, so they work in both themes.

**Angular:** `ui-illustration` — inputs `name: 'welcome-collect' | 'welcome-save' | 'welcome-find' | 'empty-feed' | 'empty-folder' | 'not-found' | 'page-not-found' | 'offline'`, `motion: 'loop' | 'once' | 'none'` (default per scene, see below), optional `label` (without it the scene is decorative). Each scene is an inline SVG whose fills are classes bound to tokens (`primary`, `accent`, `accent-bg`, `surface`, `border`, `surface-pressed`, `logo-bookmark`).

- Used in: the 3-step welcome dialog, EmptyState, the error pages and sign-in.
- Motion is chosen by the caller through `motion`, because it depends on where the scene is shown:
  - `loop`: a slow, calm continuous loop with a 3–5 s cycle, for the landing page, the onboarding welcome steps and the sign-in screen (default for `welcome-collect`, `welcome-save`, `welcome-find`);
  - `once`: plays once on appearance, then holds its final frame, for in-app empty states and errors (default for `empty-feed`, `empty-folder`, `not-found`, `page-not-found`, `offline`);
  - `none`: the static final frame.
- Under `prefers-reduced-motion` every scene is static (final frame) whatever `motion` says.
- Shapes only: no people, mascots or detailed objects. Sage marks the one meaningful element in a scene.
