---
name: angular-v22-rules
description: Shelfmark's Angular 22 rules on top of the official Angular AI config - what to use and what is forbidden (NgModules, *ngIf, Reactive Forms, @Injectable, zone.js, classic NgRx Store). Load before writing or reviewing any code in apps/web or libs/ui.
---

# Angular 22 rules for Shelfmark

Applies to `apps/web` and `libs/ui`. Official Angular guidance (AI config, Agent Skills, Angular CLI MCP) is the base; these rules win where they are stricter. Source: `docs/PROJECT.md` 5.1, 7.4.

## Use

| Area                 | Use                                                                                                                                             |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Components           | standalone (default, do not write `standalone: true`), `ChangeDetectionStrategy.OnPush`, `host: {}` instead of `@HostBinding` / `@HostListener` |
| Change detection     | zoneless (`provideZonelessChangeDetection()`); no `zone.js` in polyfills                                                                        |
| Templates            | `@if`, `@for` (always with `track`), `@switch`, `@defer`, `@let`; `[class.x]` / `[style.x]` bindings                                            |
| Inputs / outputs     | `input()`, `input.required()`, `output()`, `model()`; `viewChild()`, `contentChildren()` signal queries                                         |
| Reactivity           | `signal`, `computed`, `linkedSignal`, `effect` only for side effects outside Angular (DOM, storage)                                             |
| Data loading         | `resource` / `httpResource`; HTTP via `HttpClient` with functional interceptors                                                                 |
| Forms                | Signal Forms (`form()`, schema validators); `libs/ui` inputs integrate with them                                                                |
| Services             | `@Service()` decorator; `inject()` function, never constructor parameter injection                                                              |
| State                | NgRx SignalStore (`signalStore`, `withState`, `withEntities`, `withMethods`, `withComputed`); local component state in `signal()`               |
| Routing              | `loadComponent` lazy features, functional guards / resolvers, `withComponentInputBinding()` — route params arrive as `input()`                  |
| Animations           | CSS + `animate.enter` / `animate.leave`; timings from Motion tokens. No `@angular/animations`                                                   |
| Behaviour primitives | Angular Aria, CDK (Dialog, Overlay, A11y)                                                                                                       |
| i18n                 | Transloco keys for every UI string                                                                                                              |
| Images               | `NgOptimizedImage` for static images                                                                                                            |

## Forbidden

- `NgModule`, `CommonModule` imports, `*ngIf`, `*ngFor`, `*ngSwitch`, `[ngClass]`, `[ngStyle]`
- Reactive Forms (`FormGroup`, `FormControl`, `FormBuilder`) and template-driven `ngModel`
- `@Injectable` (use `@Service()`), constructor DI
- `@Input()`, `@Output()`, `@ViewChild()`, `@HostBinding`, `@HostListener` decorators
- `zone.js`, `NgZone`, `ChangeDetectorRef.detectChanges()` as a workaround
- Classic NgRx Store / Effects, `BehaviorSubject` as state store
- Manual `subscribe()` in components without `takeUntilDestroyed()`; prefer signals (`toSignal`) or `resource`
- `innerHTML`, `DomSanitizer.bypassSecurityTrust*`
- Angular Material, Tailwind, third-party icon sets, animation libraries
- Bare styled `<button>`, `<input>`, `<select>`, `<textarea>` in feature code — use `libs/ui`
- Hard-coded UI strings, colours, px sizes (see `libs/ui/CLAUDE.md` for the px exceptions)

## File layout (apps/web)

`src/app/` → `app.routes.ts`, `app.config.ts`, `shell/`, `core/` (guards, interceptors, `AuthStore`, `TitleStrategy`, `DialogService`), `features/<name>/` (`<name>.page.ts` + local components), `stores/`. File names `kebab-case.<type>.ts`; pages export a default component for `loadComponent`.

Types (PROJECT.md 5.0): no `any` / `as any` (use `unknown` + narrowing or generics), no `@ts-ignore`. One interface / type / enum / array-of-objects constant per file — `<kebab-name>.interface.ts`, `.type.ts`, `.enum.ts`, `.const.ts` — in a `models/` folder next to its users (e.g. `core/theme/models/theme-preference.type.ts`, `features/links/models/link-sort.enum.ts`). No dump files (`types.ts`, `models.ts`, `constants.ts`); `index.ts` only re-exports. API shapes come from `@shelfmark/contracts`, never redeclared.

## When unsure

Ask the Angular CLI MCP (`get_best_practices`, `search_documentation`) for the v22 API before guessing. If the official guidance conflicts with this file, follow this file and mention the conflict in the report.
