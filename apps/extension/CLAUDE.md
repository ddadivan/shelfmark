# apps/extension

Chrome Manifest V3 extension (#445): a popup that saves the current tab to the user's Shelfmark library. Design: `docs/design/screens/Extension.dc.html` and `ExtensionTabs.dc.html` (All tabs, #569); auth decision: ADR 0046; author steps: `docs/SETUP.md` 5.9; store texts and images: `docs/store/extension/`.

## Rules

- **Permissions stay minimal**: `activeTab` and host access to `<origin>/api/*`, plus the **optional** `tabs` permission (`optional_permissions`, author-approved for #569): asked at run time, once, by `chrome.permissions.request` on the first switch to All tabs (Chrome's own prompt; declined = stay on This page) and used for `chrome.tabs.query({ currentWindow: true })` (addresses and titles of the window's tabs) and `chrome.tabs.remove` (Close saved tabs). No `storage`, `scripting`, content scripts, background worker or `<all_urls>`; any other permission needs the author's OK (it changes the install warning and the store review). Keep the chrome calls literal (`chrome.tabs.*`, `chrome.permissions.*`, see `browser-tabs.service.ts`). `core/config/config-check.spec.ts` enforces the manifest.
- **Data**: only the open tab's URL (without the fragment, for the duplicate check on open) and, on Save, its URL and title plus the folder, tags and note the user picks ever leave the browser. When the user clicks Fill in with AI and AI is on for the account, the page address and title (and the note, with "Include my notes") also go to Shelfmark for AI suggestions, under the existing AI terms; no draft starts on open, and without AI the popup has no AI UI. In All tabs, switching to it (a user action, like opening the popup) checks the listed tabs' addresses, without the #fragment, against the library with the lookup route (the first 24 tabs, the route allows 30 a minute) so "Saved" can show; tab titles stay in the browser. Only the ticked tabs are saved (`POST /api/links/batch`) or sent for AI (Sort with AI: one `POST /api/ai/drafts` per ticked tab, at most 25). Nothing is saved until Save; keep the privacy page and `docs/store/extension/listing.md` in step with this. The popup never reads the session cookie; the browser attaches it (`credentialsInterceptor`, Shelfmark origin only).
- **Two builds**: `shelfmark-origin.const.ts` (production) is swapped for `shelfmark-origin.development.const.ts` by the `development` configuration, and each build copies its own `manifest/<config>/manifest.json`; keep the origin, the host permission and the CSP `connect-src` / `img-src` in step.
- Angular 22 like `apps/web` (load the `angular-v22-rules` skill): standalone, zoneless, signals, `@Service()`, only `libs/ui` components, tokens and `rem`, both themes (no `data-theme`: the popup follows the browser's colour scheme), reduced motion.
- One fixed popup size, 360 x 600 (Chrome's maximum height) (`styles.scss`); every screen uses the global `ext-screen` frame. State and flow live in `PopupStore`; components bind it.
- UI text through Transloco keys in `src/app/core/i18n/en.json`, every key in all seven language files (a spec checks it); plural keys (`one` / `other`, more categories where the language needs them) are built with `pluralKey(base, count, lang)` (`popup/utils/plural-key.ts`); the store name and description are `public/_locales/*/messages.json`.
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
