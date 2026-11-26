/**
 * libs/ui tokens with no Shelf counterpart in tokens.json, each with the reason it exists.
 * token-sync.spec.ts fails for a colour, radius, type, shadow or spacing token that is in the
 * code but neither in tokens.json nor here. A new one is first added to tokens.json (DS guard,
 * ADR 0062); only aliases, derived mixes and values the prototypes draw outside tokens.json
 * belong here.
 */
export const CODE_ONLY_TOKENS: Readonly<Record<string, string>> = {
  // Aliases: the same value under a second name the app already uses.
  canvas: 'Alias of --bg under the Shelf name (canvas maps to bg).',
  border: 'Alias of --sep, the long-standing name of the divider colour.',
  accent: 'Old name of the primary action colour, same value as --primary (Shelf accent).',
  scrim: 'Alias of --overlay under the Shelf name (scrim maps to overlay).',
  'glass-line': 'Alias of --line-strong for the edge of floating layers.',
  'highlight-bg': 'Search highlight background: the Shelf ai-bg, a separate name for ui-highlight.',
  'highlight-text': 'Search highlight text: the Shelf text, a separate name for ui-highlight.',
  'shadow-float': 'Alias of --shadow-l2 for floating layers (menus, popovers, toasts).',
  'shadow-popover': 'Alias of --shadow-l2 kept for the popover mixin.',
  'radius-xl': 'Old name of the panel radius, same value as --radius-lg (16px).',
  // Derived from Shelf tokens with color-mix, so the Custom theme follows its base.
  'primary-hover': 'Hover of the primary button: 90% primary over surface.',
  'ai-fill': 'Fill of the AI action button: 24% ai over surface.',
  'ai-fill-hover': 'Hover of the AI action button: 30% ai over surface.',
  'ai-fill-pressed': 'Pressed AI action button: 36% ai over surface.',
  'card-hover-bg': 'Hovered card fill: the surface, 4% lighter in dark (Shelf shadow-hover usage).',
  'skeleton-shimmer': 'Moving highlight of skeletons, mixed from surface or text.',
  // Values the prototypes draw that tokens.json does not name.
  'ai-line': 'Dashed edge of AI suggestion chips (sage between ai and ai-bg), from 04-organise.',
  'on-glass': 'Glyph colour on the white glass buttons over a preview, fixed in both themes.',
  'frame-canvas': 'White page behind a third-party site preview in both themes (#553).',
  'search-hairline': 'Neutral 25% grey ring of the search fields, as the prototypes draw it.',
  'wave-opacity': 'Opacity of the Ask glow (wave-1…4), a number, not a colour.',
  'radius-tile-sm': '6px corners of small tiles in the prototypes (folder tile sm, key caps).',
  'radius-tile': '8px corners of tiles in the prototypes (folder tile md, note highlight, thumbs).',
  'radius-fab':
    'Corners of the tab bar Add button (12px, 01-library); changes with Custom corners.',
  'font-size-section': '18px section titles of the prototypes (05-settings .sec-t, sheet titles).',
  'line-height-section': '22px line of the 18px section titles.',
  'font-size-micro': '10px letter of a favicon fallback (01-library, the home reference).',
  'shadow-card':
    'Resting card ring: line as a 1px ring in light, none in dark (Shelf shadow-l1 usage).',
  'shadow-card-hover': 'Hovered card: the ring plus shadow-hover.',
  'shadow-card-press': 'Pressed card shadow (80 ms press feedback).',
  'toast-muted': 'Muted text of the inverted toast: 72% bg over text.',
  'toast-tile': 'Button and icon tiles of the inverted toast: bg at 16%.',
  'toast-tile-hover': 'Hovered toast button tile: bg at 26%.',
  'tooltip-kbd': 'Key cap text in the tooltip: 70% on-primary over primary.',
  'card-overlay': 'Translucent bar over a card preview: surface at 88%.',
  'shadow-thumb': 'Soft lift under the range slider thumb.',
};
