# 0009. Angular 22 with NgRx SignalStore

- Status: Accepted
- Date: 2026-11-05
- Source: `docs/PROJECT.md` 5.1, 7.4; `apps/web/CLAUDE.md`

## Context

Shelfmark needs a typed SPA framework for a links library with folders, tags, search and dialogs, and the project is a portfolio piece meant to show current practice. PROJECT.md 5.1 asks for "only modern v22 approaches, no legacy". Rendering mode, zoneless setup, tests, i18n and theming are covered by [0005](0005-web-csr-zoneless-angular.md); this ADR covers the framework and state management.

## Decision

- **Angular 22** on TypeScript 6: standalone components, new control flow (`@if`, `@for`, `@switch`), signals everywhere, data loading via `resource` / `httpResource`, **Signal Forms** instead of Reactive Forms, the `@Service()` decorator instead of `@Injectable`, functional guards and interceptors, lazy features via `loadComponent`.
- **State: NgRx SignalStore v22**:
  - local component state — plain `signal()`;
  - `LinksStore` — links, filters, sorting (`withEntities`);
  - `FoldersStore` — folder tree;
  - `TagsStore` — tags;
  - `UiStore` — cards/list view and "Recently opened" panel visibility, persisted in `localStorage`;
  - `AuthStore` in `core/` caches the session (one request on start).
- **No classic NgRx Store** (actions, reducers, effects): excessive for this app.
- State that should be shareable or survive "Back" (tags, sort, query) lives in the URL query, not in stores.
- Agents follow the official Angular AI config, Angular Agent Skills and Angular MCP plus the project skill `angular-v22-rules` (PROJECT.md 8).

## Consequences

- One reactive model (signals) from component to store to router inputs (`withComponentInputBinding`).
- Legacy APIs (`NgModule`, `*ngIf`, Reactive / Template forms, `@Injectable`, `@Input`/`@Output`) are banned by lint and skill; examples from older Angular code do not apply.
- SignalStore keeps stores small and typed; if cross-store orchestration grows heavy, revisit with a new ADR.

## Alternatives considered

- **Classic NgRx Store** — boilerplate (actions, reducers, effects) not justified by the app's size (PROJECT.md 5.1).
- **Reactive Forms** — replaced by Signal Forms, stable in v22.
