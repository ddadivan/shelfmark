Button triggers an action; one `primary` per view (usually “Add link”), everything else `secondary` or `ghost`.

**Angular:** `ui-button` — inputs `variant: 'primary' | 'secondary' | 'ghost' | 'danger' | 'ai'` (default `secondary`), `size: 'sm' | 'md' | 'lg'` (default `md`), `iconLeft`, `iconRight`, `iconOnly` (requires `ariaLabel`), `loading`, `disabled`, `type`. Content: the label text.

**Classes:** `sm-btn` + `sm-btn--{variant}`, `sm-btn--sm|lg`, `sm-btn--icon`; loading = `aria-busy="true"` + `sm-spinner`.

- Press: scale 0.97 (80 ms down, `ease-spring` back) plus a ripple from the touch point (see Ripple); hover: `duration-fast`; focus: 2px `focus-ring`.
- `danger` only for irreversible actions, and only inside a confirmation dialog or menu.
- `ai` (`sm-btn--ai`) only for the AI entry actions: «Fill in with AI» and the header's «Ask» pill (BRAND › AI): fill `ai-fill` (hover `ai-fill-hover`, press `ai-fill-pressed`), no border by default (the header Ask pill sets `--ui-button-ai-border: var(--ai-line)`), label in `text`, the spark at 20px in `ai` whatever the size (also inside a dialog); never sage, never a gradient. Label 4.5:1 and spark 3:1 on every step in both themes (`styles.spec.ts`).
- Labels are verb-first, sentence case, no period. Icon-only buttons always get an `aria-label` and a tooltip.
- Prefer keeping buttons enabled and explaining errors over `disabled`.
- `loading` locks the button's width before the label changes, so it never jumps; the spinner grows in (see Loading, Motion).
- Hit area: at least 24×24 px everywhere (WCAG 2.5.8); on touch screens (`pointer: coarse`) icon buttons grow to 44×44 and the star and chip-remove targets are widened with an invisible `::after`, so small glyphs stay easy to tap without changing the layout.
