# apps/extension

Chrome Manifest V3 extension (#445): a popup that saves the current tab to the user's Shelfmark library. Design: `docs/design/screens/Extension.dc.html`; auth decision: ADR 0046; author steps: `docs/SETUP.md` 5.9; store texts and images: `docs/store/extension/`.

## Rules

- **Permissions stay minimal**: `activeTab` and host access to `<origin>/api/*` only. No `tabs`, `storage`, `scripting`, content scripts, background worker or `<all_urls>`; a new permission needs the author's OK (it changes the install warning and the store review). `core/config/config-check.spec.ts` enforces the manifest.
- **Data**: only the chosen tab's URL and title, plus the folder, tags and note the user picks, ever leave the browser. Nothing is saved until Save. The popup never reads the session cookie; the browser attaches it (`credentialsInterceptor`, Shelfmark origin only).
- **Two builds**: `shelfmark-origin.const.ts` (production) is swapped for `shelfmark-origin.development.const.ts` by the `development` configuration, and each build copies its own `manifest/<config>/manifest.json`; keep the origin, the host permission and the CSP `connect-src` / `img-src` in step.
- Angular 22 like `apps/web` (load the `angular-v22-rules` skill): standalone, zoneless, signals, `@Service()`, only `libs/ui` components, tokens and `rem`, both themes (no `data-theme`: the popup follows the browser's colour scheme), reduced motion.
- One fixed popup size, 360 x 520 (`styles.scss`); every screen uses the global `ext-screen` frame. State and flow live in `PopupStore`; components bind it.
- UI text through Transloco keys in `src/app/core/i18n/en.json`, every key in all seven language files (a spec checks it); the store name and description are `public/_locales/*/messages.json`.
- Version: `version` in both manifests; raise it before every store upload.

## Commands

```bash
npm run extension:dev        # dist/apps/extension-dev, load unpacked, talks to localhost:4200
npm run extension:watch      # the same, rebuilt on every change (reload the extension card after)
npm run extension:build      # store build in dist/apps/extension
npm run extension:package    # store build + dist/shelfmark-extension-<version>.zip
npx nx test extension [--configuration=coverage]
npx nx run extension:typecheck
npx nx lint extension
npm run extension:icons      # icons from the design-system app icon
```
