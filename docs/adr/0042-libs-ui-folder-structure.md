# 0042. Folder structure of libs/ui: components, directives, services, utils, models

- Status: Proposed
- Date: 2026-11-12
- Source: issue #318 (author's request, Nov 11, 2026); `CLAUDE.md` (one type per file, `models/` folders); builds on ADR 0017 (libs/ui foundation)

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

## apps/web (proposal only, not moved)

`apps/web/src/app/features/<name>/` mixes the page, its sub-components, services, stores, pure helpers (`feed-sort.ts`, `links-filter.ts`, `search-query.ts`), `http/`, `mock/` and `models/` in one folder (`features/links/` has 30 entries). The same rules would read:

```
features/<name>/
  <name>.page.ts|html|scss|spec.ts     the routed page (default export)
  components/<sub>/                    components of this feature (link-card, paste-many, …)
  services/                            *.service.ts and stores of the feature
  utils/                               pure helpers (feed-sort, links-filter, search-query, …)
  http/, mock/                         unchanged
  models/                              unchanged
```

It is a larger move across the app with more open conflicts, so it waits for the author's OK and its own issue.

## Consequences

- The place of a file says what it is; a new component goes to `components/`, a new helper to `utils/` (the `create-ui-component` skill and `libs/ui/CLAUDE.md` describe it).
- Imports inside the library are longer by one level (`../../../styles/ui`), and a component that uses a service imports it across top folders (`../../../services/overlay`).
- Open branches that touch `libs/ui` need the moves merged in; git follows the renames (640 of them are detected as renames).
