---
name: create-ui-component
description: Step-by-step template for a new Shelfmark libs/ui component or directive - typed variant inputs, tokens and rem, Angular Aria/CDK behaviour, Storybook story for every variant in both themes, unit and a11y tests. Use when adding or reworking a ui-* component.
---

# Create a libs/ui component

## 1. Read the spec

- `docs/design/components/<Name>/README.md` — API, variants, states, behaviour, rules.
- `docs/design/components/<Name>/preview.html` — visual reference (loads `tokens.css` + `reference.css`).
- `docs/design/BRAND.md` and, for any motion, `docs/design/components/Motion/README.md`.
- `docs/PROJECT.md` 7.4 table — expected variants and behaviour base.

## 2. Files

```
libs/ui/src/lib/<name>/
  <name>.component.ts        # or <name>.directive.ts
  <name>.component.scss
  <name>.component.spec.ts
  <name>.stories.ts
  index.ts                   # re-exported from libs/ui/src/index.ts
```

## 3. Component

```ts
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'ui-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ui-button',
    '[class.ui-button--primary]': "variant() === 'primary'",
    '[attr.aria-busy]': 'loading() || null',
  },
  templateUrl: './button.component.html',
  styleUrl: './button.component.scss',
})
export class ButtonComponent {
  readonly variant = input<ButtonVariant>('secondary');
  readonly size = input<ButtonSize>('md');
  readonly loading = input(false, { transform: booleanAttribute });
}
```

- Variants are typed union inputs with sensible defaults; booleans use `booleanAttribute`.
- Keyboard, focus, ARIA and overlays come from Angular Aria / CDK — do not hand-roll them.
- Form controls integrate with Signal Forms.
- No business logic, no HTTP, no stores — `libs/ui` is presentational.

## 4. Styles

- Only CSS custom properties from tokens (`var(--surface)`, `var(--space-4)`, `var(--duration-base)`, `var(--ease-out)`).
- Sizes in `rem` via `rem($px)`; px only for border widths, outline, outline-offset, box-shadow, the 2px progress bar. Breakpoints in `em`.
- `:hover` only inside `@media (hover: hover)`; `:focus-visible` ring per BRAND; `@media (prefers-reduced-motion: reduce)` removes movement and scale.
- No `::ng-deep`, no hard-coded colours, no `!important`.

## 5. Story

- One story per variant and state (default, hover via pseudo-states, focus, disabled, loading, error), plus a "All variants" grid.
- Theme toolbar shows light and dark; check both.
- Use args for inputs so the controls panel works.

## 6. Tests

- Renders each variant (host classes / ARIA attributes).
- Inputs and outputs: clicks, keyboard (Enter, Space, arrows, Esc where relevant), disabled blocks interaction.
- a11y: accessible name, role, `aria-*` states; run axe in the story or test.
- Coverage ≥ 80% for the file.

## 7. Done when

`npx nx lint ui`, `npx nx test ui --coverage`, `npx nx build ui`, `npx nx build-storybook ui` pass and the story matches `preview.html` in both themes.
