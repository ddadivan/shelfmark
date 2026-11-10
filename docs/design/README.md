# Shelfmark design handoff — 2027 Refresh

Exported from Claude Design. This folder is the source of truth for how the UI looks and moves. It replaces the first design (kept in `docs/design-v1/` for reference while stage 1 is migrated). The live versions:

- Design system: https://claude.ai/artifact/Ava7gbfpGLJww8VXqjDSWc
- Screens (canvas, interactive in Play): https://claude.ai/artifact/UVhgusvAFndkoJDgQaqVwa
- Project document: https://claude.ai/artifact/G24HpUmLTyGLtBZ8jxovSW (copy in `docs/PROJECT.md`)

## What is here

| Path | What it is | How to use it |
|---|---|---|
| `BRAND.md` | Brand book: content rules, colour, glass, type, space and radii, motion, loading, settings, toasts, icons, layout | Read before any UI work |
| `CHANGES.md` | What changed from the first design, and what it means for code already written | Read before migrating stage 1 |
| `tokens.json`, `tokens.css` | Design tokens for light and dark: colours (incl. `glass`, `glass-line`, 8 folder colour pairs), type, space, radius (8/14/22/28/full), shadow (`shadow-card`, `shadow-float`), duration, easing | Port to `libs/ui/src/styles/_tokens.scss` as CSS custom properties; sizes in `rem` (PROJECT.md 7) |
| `reference.css` | The CSS the mockups render with (`sm-*` classes). The first part is the original system, the part after "Shelfmark 2027 refresh layer" overrides and extends it | **Reference only.** Re-implement per component in `libs/ui` (SCSS, `rem`, Angular Aria/CDK). Do not copy it wholesale |
| `components/<Name>/README.md` | Spec per component: Angular API, classes, behaviour, rules | One `libs/ui` component (or directive) per folder |
| `components/<Name>/preview.html` | Component preview (expects `tokens.css` + `reference.css` loaded) | Visual reference / Storybook stories |
| `components/Motion/README.md` | Motion spec: principles, timing table, reduced motion | Every animation must match it |
| `screens/INDEX.md` | List of every screen by flow (sign in, library, add link, search, organise, reminders, sharing, settings, feedback, extension) | Find the screen for a task |
| `screens/*.dc.html` | Every screen as HTML mockups, desktop and phone, light and dark (`dark` prop) | Layout and copy reference. They use a small template syntax (`{{value}}`, `<sc-if>`, `<sc-for>`) and a `class Component` script with demo state — read them as markup, not as code to run. `boards.css` only lays out the canvas, not the app |
| `assets/` | Icons, illustrations, logos — unchanged from the first design | `ui-icon`, `ui-illustration`, header and PWA icons |

## Rules

- UI text is English and goes through translation keys (Ukrainian comes later).
- Sentence case, no ALL CAPS. Metadata follows BRAND.md («Don't chain metadata with middle dots»): where a mockup shows `A · B · C`, render the parts as separate elements (favicon + domain, date on the right) or as words.
- One signature animation (saving a link). Everything else is quiet; see Motion.
- Glass only on floating layers (menus, toasts, phone tab bar, bulk bar, sign-in card).
- Light and Dark themes are fixed; only the Custom theme changes token values.
- No AI features yet — none are designed.
- Never use icons from another set.
