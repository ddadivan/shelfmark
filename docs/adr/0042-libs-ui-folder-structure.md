# 0042. Folder structure of libs/ui: components, directives, services, utils, models

- Status: Accepted
- Date: 2026-11-12
- Source: issues #318 (libs/ui) and #324 (apps/web); author's request Nov 11, 2026, approval of the apps/web part Nov 12, 2026; `CLAUDE.md` (one type per file, `models/` folders); builds on ADR 0017 (libs/ui foundation)

## Context

`libs/ui/src/lib` grew to 63 folders side by side. A folder could be a component (`button/`), a component with its sub-components (`menu/` held `menu`, `menu-item`, `menu-label`, `menu-separator` and the `menu-trigger` directive together), a service with its component (`dialog/`, `toast/`, `drawer/`), a directive (`ripple/`), pure helpers (`media/media-match.ts`, `loader-timing/`) or only constants (`keyboard/` is `KEYBOARD_KEY`). The kind of a folder could not be told from its place, and growing folders mixed several public pieces.

## Decision

1. **Five top folders under `libs/ui/src/lib/`**, chosen by what the folder exports:

   ```
   components/<name>/     one component per folder: <name>.component.ts|html|scss|spec.ts, <name>.stories.ts,
                          index.ts, models/; its sub-components in sub-folders (components/menu/menu-item/)
   directives/<name>/     attribute directives with no template of their own: ripple, long-press,
                          pointer-shadow, tooltip (its panel in directives/tooltip/tooltip-panel/),
                          menu-trigger, focus-target (the UI_FOCUS_TARGET contract)
   services/<name>/       injectable services with their own API: dialog (DialogService, UiDialogRef,
                          injectDialogData, the modal overlay), drawer, toast (ToastService, its store),
                          overlay (UiOverlay), motion (ReducedMotion)
   utils/<name>/          pure functions shared beyond one component: media (matchMedia), loader-timing,
                          colour-contrast, custom-accent, reorder-drop-line
   models/<domain>/       constants and types with no component: keyboard, heading, theme
   ```

2. **Split by role.** A folder that held a component and the service that opens it is split: the component stays in `components/<name>/`, the service goes to `services/<name>/`. A model file goes with the side that uses it (the service's options and refs with the service, the drawing's sizes and drag constants with the component); a union type sits next to its `as const` object.
3. **Private helpers stay with their owner.** A helper that only one component uses (`select-rows.ts`, `tag-input-rows.ts`, `breadcrumbs-trail.ts`, `sheet-drag.ts`, the tree's internal reorder directives) stays in that component's folder; it moves to `utils/` when a second user appears.
4. **One index per top folder.** Each `components|directives|services|utils|models/<name>/index.ts` re-exports that folder, including its sub-folders. `libs/ui/src/index.ts` re-exports the folders grouped by kind. The public API `@shelfmark/ui` keeps every name, so `apps/web` does not change.
5. **Files move with `git mv`.** Specs, stories and their Storybook titles move with their files (titles do not change); SCSS keeps `@use '<relative path>/styles/ui' as *`, now one or two levels deeper. Paths written as strings (`compileScss('lib/…')`, the icon script's `icon-names.const.ts`) follow.

## apps/web (accepted Nov 12, 2026, issue #324)

`apps/web/src/app/features/<name>/` mixed the page, its sub-components, services, stores, pure helpers (`feed-sort.ts`, `links-filter.ts`, `search-query.ts`), `http/`, `mock/` and `models/` in one folder (`features/links/` had 30 entries). The same rules now apply to every feature:

```
features/<name>/
  <name>.page.ts|html|scss|spec.ts     the routed page (default export), stays at the root
  <name>.routes.ts, *.guard.ts,        route wiring, guards, load-*-page loaders, provide-*-api.ts,
  provide-*-api.ts, _<name>.scss       shared Sass partials stay at the root
  components/<sub>/                    sub-components: <sub>.component.ts|html|scss|spec.ts
  pages/<sub>/                         further routed pages that lived in a sub-folder (settings, recent, ...)
  directives/                          attribute directives of the feature
  services/                            *.service.ts and *.store.ts of the feature, with their specs
  utils/                               pure helpers (feed-sort, links-filter, search-query, ...), with specs
  http/, mock/, models/                unchanged
```

Rules for the edge cases:

- **Root files stay.** The routed page(s) at the root (a feature with two root pages, `auth`, keeps both), route files, guards, route loaders (`load-library-page.ts`), the `provide-*-api.ts` providers (the `fileReplacements` of `apps/web/project.json` name them) and `_*.scss` partials. Specs of the page (`library.page.selection.spec.ts`) stay with it.
- **A component folder keeps its private parts**: its own `models/`, helpers (`drift-layout.ts`, `folder-options.ts`) and nested components (`date-time-settings` inside `pages/appearance/`). A helper moves to the feature's `utils/` when a second user appears. A `*.service.ts` or store found inside a component folder (`add-link-dialog.service.ts`) goes to the feature's `services/`.
- **Sub-folders with a routed page** (`settings/account`, `tags/tags-page`, `library/phone-library`, `admin/admin-feedback`) go to `pages/<name>/` with everything they hold.
- **Folders that were not components are dissolved** into the kinds above (`links/bulk`, `drag`, `selection`, `recent`, `in-view`): services to `services/`, helpers to `utils/`, the directive to `directives/`, their dialogs and the drag slot to `components/`, the recent page to `pages/recent/`, their `models/` files merged into the feature's `models/`.
- **Flat features.** A feature that is one page plus at most one component and nothing else stays flat (`e2e-csp`); `e2e-add-link` and `privacy` hold only a page and `models/`, so nothing moves.
- **Not covered:** `core/` (app-wide singletons by domain), `shell/` and `stores/` (app-level) keep their layout.

Only `git mv` and import path fixes were applied, one commit per feature; no code, names or tests changed.

## Consequences

- The place of a file says what it is; a new component goes to `components/`, a new helper to `utils/` (the `create-ui-component` skill and `libs/ui/CLAUDE.md` describe it).
- Imports inside the library are longer by one level (`../../../styles/ui`), and a component that uses a service imports it across top folders (`../../../services/overlay`).
- Open branches that touch `libs/ui` need the moves merged in; git follows the renames (640 of them are detected as renames).
