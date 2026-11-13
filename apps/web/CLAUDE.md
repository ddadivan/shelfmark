# apps/web

Angular 22 client (CSR only, zoneless). Read `docs/PROJECT.md` 5.1 and 7 first. Load the `angular-v22-rules` skill before writing code — it is authoritative.

## Layout (`src/app/`)

- `app.ts`, `app.html` (only `<router-outlet />`), `app.config.ts`, `app.routes.ts`
- `core/` — app-wide singletons: `i18n/`, `theme/`, `api/`, later guards, interceptors, `AuthStore`
- `features/<name>/` (ADR 0042) — `<name>.page.ts|html|scss|spec.ts` (default export, lazy via `loadComponent`) at the root with `*.routes.ts`, guards and `provide-*-api.ts`; `components/<sub>/` sub-components (own `models/` and private helpers stay with them); `pages/<sub>/` further routed pages; `directives/`; `services/` (`*.service.ts`, `*.store.ts`); `utils/` pure helpers with their specs; `http/`, `mock/`, `models/`. A feature of one page and at most one component stays flat. `core/`, `shell/` and `stores/` keep their own layout
- `shell/` — layout around pages; `stores/` — NgRx SignalStore stores
- `src/testing/` — spec-only helpers (axe runner, translated component factory); excluded from the app build
- File names `kebab-case.<type>.ts`. Types live one per file in a `models/` folder next to their use (`<name>.type.ts`, `.interface.ts`, `.const.ts`); no TS `enum` (fixed value sets are `as const` objects, ADR 0024); no `any`, no `@ts-ignore`.

## Rules

- Translation keys `feature.section.key` in `core/i18n/en.json`. No UI text in templates or TS (brand name in `index.html` is the only exception).
- Languages (#274): `en.json` is the source; `fr.json`, `de.json`, `it.json`, `es.json`, `pt.json` (Brazilian) sit next to it as lazy chunks. **A new or changed key goes into every language file in the same change** (natural, concise product tone; sentence case where the language uses it; keep `{{placeholders}}` and `{name}`); `core/i18n/translations.spec.ts` fails on a missing or extra key, a changed placeholder or missing plural categories. Plural keys: build them with `pluralKey(base, count)` (`Intl.PluralRules` of the active language) and give each language the categories it needs (`one`/`other`; French, Italian, Spanish and Portuguese also `many`). Language names are `LANGUAGE_NAMES` (each in its own name, not translated).
- Locale only through `LocaleService` (`core/i18n`), the only writer of `<html lang>` and of Transloco's active language: `init()` (app initializer: reads `localStorage` `sm-language`, resolves "Match my browser" from `navigator.languages`, loads the lazy file before the first render), `apply(settings)`, signals `settings`, `lang` (= `activeLang`, set once the file is loaded), `wantedLang`, `browserLang`, `locale` (BCP 47 for `Intl`), `firstDay` (no `spellcheck` since #326: the note field always spell-checks; a stored copy that still has the key is read without it); formatting `formatDate` (date format), `formatTime` / `dateTimeFormat` (clock), `formatWeekday`, `formatRelative`, `formatNumber`, pipe `appDate`. Never hard-code `'en'`/`'en-GB'` or call `getActiveLang()` for `Intl`, and never use Angular's `DatePipe`. The account wins: `UserSettingsStore` applies it when `languageSaved`, else saves a valid local choice once; `setLanguage(change)` is optimistic with rollback. `translate()` is not reactive: a `computed` that builds labels with it reads `activeLang()` (or `pluralKey`, which does), so it follows a switch.
- Layout for translations (Languages mockup): plan for 40% longer strings; buttons never cut their text (`ui-button wrap` where a label may wrap), toolbars and saved views wrap, sidebar rows and card titles truncate with "…", fixed-width controls fit the longest language; check French and German on desktop and the 360px phone.
- Appearance only through `ThemeService` (`core/theme`), which owns `html[data-theme]` (`light` | `dark` | `custom`), `html[data-custom-base|accent|background|corners]`, `html[data-motion]`, the layout attributes of #285 (`LAYOUT_ATTRIBUTE`: `data-text-size`, `data-font`, `data-density`, `data-card-preview|site|notes|tags`, left out for the defaults) and `color-scheme` (from the base), and calls `ReducedMotion.setAppReduced`. An own accent sets the four accent tokens and an own page background (#335) `data-custom-background="own"` and `--bg` on `html` (CSSOM, nearest readable shade). Never set them elsewhere. API: `init()` (idempotent, app initializer: reads `localStorage` `sm-theme`, `sm-custom-theme`, `sm-motion`, `sm-layout` for the first paint, follows the system scheme and other tabs through the `storage` event), `setPreference` / `setCustomTheme` / `setMotion` / `setLayout` / `apply(appearance)` (apply and remember locally), signals `preference`, `customTheme`, `motion`, `layout`, `resolved` (the base) and `appearance`. The account is the source of truth: `UserSettingsStore` applies `/api/me/settings` when it loads (only when `appearanceSaved`; otherwise a valid local appearance, `hasStoredAppearance()`, is kept and saved once, silently) and `setAppearance(change)` saves a change optimistically (rollback on failure); UI changes go through the store. Script-driven motion checks `ReducedMotion` from `@shelfmark/ui`, never `matchMedia` directly.
- Settings › Library (#284): `UserSettingsStore.libraryShown` / `setLibrary(change)` (optimistic, rollback). The feed's view and sort come from `FeedMemoryService` (per feed on the device, `sm-feed-memory`) and fall back to the account's `defaultView` / `defaultSort`; `?sort=` wins and is written only when it differs from the default. `UiStore` no longer keeps the view.
- Styles: tokens only, `rem` / `em` (breakpoints in `em`), both themes, phone from 360px, honour `prefers-reduced-motion`.
- Breakpoints (#316): navigation switches at 64em. `ViewportService.compact` (and the Sass `compact` mixin) is the mobile shell below it: the tab bar, no sidebar or top bar, the Library / Tags / You pages, touch sizes, long press to select, swipe rows, the stacked bulk bar; `desktop` from 64em is the sidebar layout; `ViewportService.wide` (and `wide`) from 80em is the inline header search (#329: a real field with a results panel; 64em to 80em a "Search" button opens the dialog). `ViewportService.phone` (and `phone`) is only for small-screen details: bottom-sheet dialogs, the one View menu, short labels, block buttons. Touch affordances (checkboxes, the star, "…") follow the input (`hover: none` / `pointer: coarse`), not the width. Content stays fluid (the card grid keeps `auto-fill` columns).
- Build UI from `libs/ui` components; no bare styled `<button>` / `<input>` in features.
- Components stay thin (#338): a page or component binds signals, calls services and renders. Logic lives elsewhere: state, derived lists, URL params and flows in a store or service (`services/*.service.ts`, `*.store.ts`; scoped to the page or dialog through its `providers` when it holds per-instance state), DOM behaviour (drag, keyboard, long press) in a directive (`directives/`), pure calculations in `utils/` with their own spec. Aim for at most ~250–300 lines of TS per page and ~200–250 per component; when one grows past that, extract before adding more. Specs move with the code they test; the component spec stays as the integration test.
- HTTP: relative `/api` URLs (`API_BASE_URL`); the dev server proxies `/api` to `http://localhost:3000` (`proxy.conf.json`).
- Security: no `innerHTML` / `bypassSecurityTrust*`; nothing inline in `index.html` (strict CSP: `optimization.styles.inlineCritical` is `false` in `project.json`; keep it that way).

## Commands

```bash
npx nx serve web                      # http://localhost:4200, /api proxied
npx nx build web
npx nx test web [--configuration=coverage]
npx nx run web:typecheck              # ngc, includes template checks
npx nx lint web
npx playwright install chromium       # once per machine
npx nx e2e web-e2e                    # desktop, tablet and phone; E2E_PORT=4210 npx nx e2e web-e2e if 4200 is busy
CI=1 npx nx e2e web-e2e               # CI mode: serves the production build, retries 2
```

## Tests

- A `*.spec.ts` next to every service and page (Vitest via `@angular/build:unit-test`).
- Visual regression screenshots of the key screens: `apps/web-e2e/visual/` (`npm run e2e:visual`); baselines come from CI, see its [README](../web-e2e/visual/README.md) for review and update.
- e2e in `apps/web-e2e` runs on the `desktop`, `tablet` (820 x 1180, touch, #316) and `phone` (360px) projects. `isCompact(page)` (below 64em) picks the mobile-shell path (tab bar, Library / Tags / You pages), `isPhone(page)` (below 40em) only small-screen details (bottom-sheet dialogs, the one View menu).

## Official Angular AI config

Generated with `ng generate ai-config --tool=claude-code` (Angular CLI 22.2) and merged here with project overrides; regenerate and re-merge when Angular updates it. For live v22 guidance use the Angular CLI MCP (`get_best_practices`, `search_documentation`) from `.mcp.json`.

**Project overrides** — where this file, the `angular-v22-rules` skill or ESLint (`eslint.angular.mjs`) disagree with the official text below, they win:

- Forms: Signal Forms only. Reactive and template-driven forms are banned (no fallback to Reactive forms).
- `changeDetection: OnPush` is still set explicitly: our ESLint rule `prefer-on-push-component-change-detection` requires it.
- Templates and styles live in external files (`templateUrl` / `styleUrl`); styles must stay external for stylelint and the strict CSP.
- Observables: signals first — convert with `toSignal()` or use `resource` / `rxResource` / `httpResource` instead of the async pipe.
- Services: `@Service()` only (`@Injectable` is banned by ESLint); no `providedIn` objects.
- Accessibility: AXE + WCAG AA as below, plus the Storybook a11y panel for `libs/ui`.

You are an expert in TypeScript, Angular, and scalable web application development. You write functional, maintainable, performant, and accessible code following Angular and TypeScript best practices.

### TypeScript best practices

- Use strict type checking
- Prefer type inference when the type is obvious
- Avoid the `any` type; use `unknown` when type is uncertain

### Angular best practices

- Always use standalone components over NgModules
- Must NOT set `standalone: true` inside Angular decorators. It's the default in Angular v20+.
- Do NOT set `changeDetection: ChangeDetectionStrategy.OnPush` explicitly. `OnPush` is the default in Angular v22+. _(Overridden above.)_
- Use signals for state management
- Implement lazy loading for feature routes
- Do NOT use the `@HostBinding` and `@HostListener` decorators. Put host bindings inside the `host` object of the `@Component` or `@Directive` decorator instead
- Use `NgOptimizedImage` for all static images.
  - `NgOptimizedImage` does not work for inline base64 images.

### Accessibility requirements

- It MUST pass all AXE checks.
- It MUST follow all WCAG AA minimums, including focus management, color contrast, and ARIA attributes.

### Components

- Keep components small and focused on a single responsibility
- Use `input()` and `output()` functions instead of decorators
- Use `model()` for two-way bound properties with `[(prop)]` syntax instead of pairing `input()` with `output()`
- Use `computed()` for derived state
- Use `linkedSignal()` for state derived from multiple reactive sources that must stay synchronized
- Prefer inline templates for small components _(overridden above: external files)_
- Prefer Signal Forms (`@angular/forms/signals`) for new forms. They are stable in Angular v22+ and provide signal-based state, type-safe field access, and schema-based validation
- When not using Signal Forms, prefer Reactive forms instead of Template-driven ones _(overridden above: Signal Forms only)_
- Do NOT use `ngClass`, use `class` bindings instead
- Do NOT use `ngStyle`, use `style` bindings instead
- Do NOT import `CommonModule`, import only the directives and pipes the template uses, such as `AsyncPipe` or `DatePipe`
- When using external templates/styles, use paths relative to the component TS file.

### State management

- Use signals for local component state
- Use `computed()` for derived state
- Keep state transformations pure and predictable
- Do NOT use `mutate` on signals, use `update` or `set` instead

### Templates

- Keep templates simple and avoid complex logic
- Use native control flow (`@if`, `@for`, `@switch`) instead of `*ngIf`, `*ngFor`, `*ngSwitch`
- Use the async pipe to handle observables _(overridden above: signals first)_
- Do not assume globals like (`new Date()`) are available.

### Services

- Design services around a single responsibility
- Use the `providedIn: 'root'` option for singleton services _(overridden above: `@Service()` only)_
- Prefer the `@Service` decorator over `@Injectable({providedIn: 'root'})` for new singleton services (Angular v22+)
- Use the `inject()` function instead of constructor injection
