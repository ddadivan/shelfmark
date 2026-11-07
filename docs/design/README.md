# Shelfmark design handoff

Exported from Claude Design. This folder is the source of truth for how the UI looks and moves. The live versions:

- Design system: https://claude.ai/artifact/BQrxb4RyTEo89FzAwgRFv7
- Screens (canvas, interactive in Play): https://claude.ai/artifact/8vqtkwVg3JcrKZFQoe9Cs9
- Project document: https://claude.ai/artifact/G24HpUmLTyGLtBZ8jxovSW (copy in `docs/PROJECT.md`)

## What is here

| Path | What it is | How to use it |
|---|---|---|
| `BRAND.md` | Brand book: content rules, colour, type, space, motion, loading, icons, layout | Read before any UI work |
| `tokens.json`, `tokens.css` | Design tokens (colours for light/dark, type, space, radius, shadow, duration, easing) | Port to `libs/ui/src/styles/_tokens.scss` as CSS custom properties; sizes in `rem` (see PROJECT.md 7) |
| `reference.css` | The CSS the mockups render with (`sm-*` classes) | **Reference only.** Re-implement per component in `libs/ui` (SCSS, `rem`, Angular Aria/CDK). Do not copy it wholesale |
| `components/<Name>/README.md` | Spec per component: Angular API, classes, behaviour, rules | One `libs/ui` component (or directive) per folder |
| `components/<Name>/preview.html` | Component preview (loads tokens + reference.css) | Visual reference / Storybook stories |
| `components/Motion/README.md` | Motion spec: principles, timing table, reduced motion | Every animation must match it |
| `assets/icons/` | 44 custom icons + `sprite.svg` | Copy to `libs/ui/assets/icons`, use via `ui-icon` |
| `assets/illustrations/` | 8 SVG illustrations using `var(--token, fallback)` | `ui-illustration` |
| `assets/logos/` | Logo mark (light, dark, mono) and app icon | Header, favicon, PWA icons |
| `screens/*.dc.html` | Every screen of stage 1 as HTML mockups (desktop and phone) | Layout and copy reference. They use a small template syntax (`{{value}}`, `<sc-if>`, `<sc-for>`) and a `class Component` script with demo state — read them as markup, not as code to run |
| `previews/*.html` | Standalone interactive previews (sign-in mosaic, card hover) | Open in a browser to see the intended interaction |

## Rules

- UI text is English and goes through translation keys.
- Sentence case, no ALL CAPS, no `·` metadata chains.
- One signature animation (saving a link). Everything else is quiet; see Motion.
- Never use icons from another set.
