# 0024. Named constants: `as const` objects with derived union types, no TS `enum`

- Status: Proposed
- Date: 2026-11-06
- Source: issue #44 (decision by the author, Nov 6); `docs/PROJECT.md` 5.0; ADR 0004; reference code in PR #52 (`tree`) and PR #53 (`select`)

## Context

Fixed value sets are spelled as string literals in many files: theme names (`'light'`, `'dark'`, `'system'`), the theme attribute (`'data-theme'`), the storage key (`'sm-theme'`), component variants, sizes and kinds, overlay layers, menu item types, `KeyboardEvent.key` values, `NODE_ENV` values. Renaming a value means a text search, `KeyboardEvent.key` is typed `string` so a typo compiles, and story controls copy each union by hand. ADR 0004 already allows `.enum.ts` files but says nothing about when a named constant is needed or which construct to use.

TypeScript 6 and Node 26 run TypeScript by type stripping, which only accepts erasable syntax; a TS `enum` emits runtime code and is not erasable. Angular templates bind public inputs as plain attributes (`variant="primary"`), which only type-checks if the input type is a string-literal union.

## Decision

**Construct.** A fixed value set is an `as const` object plus a union type derived from it. TS `enum` (including `const enum`) is not used anywhere.

```ts
// theme.const.ts
export const THEME = { Light: 'light', Dark: 'dark' } as const;
// theme.type.ts
import type { THEME } from './theme.const';
export type Theme = (typeof THEME)[keyof typeof THEME];
```

**Naming and files** (amends ADR 0004 and PROJECT.md 5.0):

- The object is `UPPER_SNAKE` and is the type name in upper snake case (`ButtonVariant` / `BUTTON_VARIANT`, `UiTreeContextMenuTrigger` / `UI_TREE_CONTEXT_MENU_TRIGGER`). Members are `PascalCase`; values are the exact wire strings (`WelcomeCollect: 'welcome-collect'`, `Space: ' '`). Member order is the canonical order (story controls use `Object.values(...)`).
- The object lives in `<name>.const.ts`, the union in `<name>.type.ts`, same kebab stem, one export per file, in the `models/` folder next to the users. The `.type.ts` file exists only when something is typed by the union (an input, a parameter, a signal); a set used only for comparisons (`TREE_KEY`) needs no type file. The `.enum.ts` suffix is retired.
- A single named value (attribute name, storage key) is a scalar `const` in its own `<name>.const.ts` when more than one file uses it; a scalar used in one file only may stay module-local.
- Shared by web and api: `libs/shared/contracts/src/<domain>/`. Shared inside the front end: the lowest project that owns the concept (`libs/ui` owns themes and keyboard keys, because `global.scss` defines `[data-theme]` and the components handle keys). App-only sets stay in the app (`ThemePreference` with `system` and the storage key in `apps/web/src/app/core/theme/models/`).

**Where the constant is required.**

- TypeScript code, including specs, stories, Storybook config and the `libs/ui/a11y` runner: compare, assign, default and pass values through the constant (`input<ButtonVariant>(BUTTON_VARIANT.Secondary)`, `event.key === KEYBOARD_KEY.Escape`, story `argTypes.options: Object.values(BUTTON_VARIANT)`).
- Component templates and `host` expressions of the component that owns the value: expose the object as a field named like the constant (`protected readonly CHIP_VARIANT = CHIP_VARIANT;`) and use it (`variant() === CHIP_VARIANT.Tag`, `@case (SAVE_STATUS_STATE.Saving)`), or move the check into a `computed`.
- Public inputs keep the string-literal union type, so consumers may write static attributes (`<ui-button variant="primary">`, `<ui-icon name="folder">`) in templates; `strictTemplates` checks them against the union. Bound expressions in TypeScript-backed code use the constant.

**Out of scope (no constant needed).**

- Data: database ids (UUIDs), user content, translation keys (Transloco owns them), routes until a route set is shared.
- Platform and protocol identifiers that we do not define: HTTP header names, MIME types, ARIA attributes and role names, DOM event names, CSS property names, CDK position values (typed by the CDK). Exception: `KeyboardEvent.key` values get `KEYBOARD_KEY` because they are typed `string` and repeated across components.
- Catalogues kept as `as const` tuples for iteration and drift tests (`ICON_NAMES`, `ILLUSTRATION_NAMES`); a specific member referenced in TypeScript uses `satisfies IconName`, or a small named map when repeated (`SELECT_ICON`). Keys of a `Record<Union, T>` are checked for exhaustiveness by the compiler and may stay literal property names.
- Fixtures: readable demo ids in stories and specs are data, but an id referenced more than once (`activeId`, `menuNodeId`, an expected value) comes from a fixture constant (`TREE_STORY_ID`, `SELECT_FIXTURE_ID`), not a repeated literal.
- `middleware.ts` `config` (Vercel reads it by static analysis; it must be literals, guarded by `deploy-config.spec.ts`), Sass (`[data-theme='dark']` cannot import TypeScript; a spec checks the compiled CSS against `THEME` instead) and Playwright e2e assertions on the rendered DOM (`apps/web-e2e`, a black-box check that must not import Angular code).
- A spec may pin a persisted or wire value once on purpose (`expect(THEME_STORAGE_KEY).toBe('sm-theme')`): changing it would drop saved user preferences.

**Enforcement.** Lint catches what is syntactically recognisable; the rest is a review item.

- ESLint `no-restricted-syntax` (error), selectors shared by the root config and `eslint.angular.mjs` (a later flat-config entry replaces the rule's options, so both import one array from a shared module):
  - `TSEnumDeclaration`: "Use an `as const` object and a derived union type (ADR 0024)."
  - `KeyboardEvent.key` literals: `BinaryExpression[left.property.name='key'][right.type='Literal']` and `SwitchStatement[discriminant.property.name='key'] > SwitchCase > Literal.test`: "Use `KEYBOARD_KEY`."
  - Known singletons: `Literal[value='data-theme']`, `TemplateElement[value.raw=/data-theme/]`, `Literal[value='sm-theme']`, `Literal[value=/^ui-overlay-layer--/]`, with the defining `.const.ts` files and `apps/web-e2e/**` excluded.
- Not lintable without a type-aware custom rule: a literal that happens to be a member of some union (`'primary'`), and anything in Angular templates. These go into the `code-reviewer` checklist, next to the one-type-per-file item.

## Consequences

- One source per value set: renames are one edit, story controls and validators derive from `Object.values(...)`, typos in key handling fail lint.
- No runtime enum code; the pattern is erasable and matches what the Prisma client generates for database enums. Nest DTOs validate with `@IsIn(Object.values(X))` and document with `@ApiProperty({ enum: Object.values(X) })`.
- Two files per typed set and a protected field per component that compares in its template.
- A runtime constant in `libs/shared/contracts` needs the api webpack `resolve.alias` (and bundling of the lib, which is excluded by `externalDependencies: 'all'` today) before the api can import it; until then contracts stay type-only.
- PROJECT.md 5.0, ADR 0004 (the `.enum.ts` suffix), `CLAUDE.md`, `libs/ui/CLAUDE.md`, the `angular-v22-rules`, `create-ui-component`, `create-api-module` skills and the `code-reviewer` agent are updated in the implementing PR.
- Revisit if TypeScript ships an erasable enum, or if a type-aware lint rule becomes cheap enough to catch union literals.

## Alternatives considered

- **TS `enum` / `const enum`** — not erasable (Node 26 type stripping, `isolatedModules`), emits runtime objects with reverse mappings for numeric members, and an enum-typed input rejects `variant="primary"` in templates, which breaks the public component API.
- **Plain union types only** — no named source to import; values stay repeated, story controls and validators copy the list by hand.
- **`as const` tuple for every set** (`['light', 'dark'] as const`) — fine for catalogues, but members cannot be referenced by name (`THEME.Dark`), so call sites still spell the string.
- **Compiler option `erasableSyntaxOnly`** — would reject enums at compile time, but also parameter properties (`libs/ui` `dialog-ref.ts` uses them); possible later as a separate change.
- **Type-aware custom lint rule for union literals** — catches the general case but needs type information in lint (slower, more setup) for a small codebase; deferred.
