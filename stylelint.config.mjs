import shelfTokens from './tools/stylelint/shelf-tokens.mjs';

// The token files are the only place where raw colours live (ADR 0062, DS guard).
const TOKEN_FILES = ['libs/ui/src/styles/tokens/**'];

/** @type {import('stylelint').Config} */
export default {
  extends: ['stylelint-config-standard-scss'],
  plugins: shelfTokens,
  // docs/design holds exported design-system references, not app code.
  ignoreFiles: [
    'docs/**',
    '**/storybook-static/**',
    '**/dist/**',
    '**/coverage/**',
    '**/.angular/**',
  ],
  reportDescriptionlessDisables: true,
  rules: {
    // Sizes in rem; px only where the design system allows it (border widths, outline, shadows).
    'unit-disallowed-list': [
      ['px'],
      {
        ignoreFunctions: ['rem'],
        ignoreProperties: {
          px: [
            '/^border(-(top|right|bottom|left|block|inline)(-(start|end))?)?(-width)?$/',
            '/^outline(-width|-offset)?$/',
            'box-shadow',
            '/^--shadow-/',
          ],
        },
      },
    ],
    // BEM class names: block__element--modifier, digits allowed (`ui-icon--20`).
    'selector-class-pattern': [
      '^[a-z][a-z0-9]*(-[a-z0-9]+)*(__[a-z0-9]+(-[a-z0-9]+)*)?(--[a-z0-9]+(-[a-z0-9]+)*)?$',
      { message: 'Expected class selector to be BEM (block__element--modifier, kebab-case)' },
    ],
    // Both `(min-width: 40em)` and `(width >= 40em)` are fine; only the unit matters.
    'media-feature-range-notation': null,
    // Breakpoints in em only.
    'media-feature-name-unit-allowed-list': [{ '/^(min-|max-)?(width|height)$/': ['em'] }],

    // DS guard (ADR 0062): colours, radii, font sizes and shadows only through libs/ui tokens.
    // `transparent`, `currentcolor` and `inherit` stay allowed; `color-mix()` over tokens too.
    'color-no-hex': true,
    'color-named': 'never',
    'function-disallowed-list': [
      ['rgb', 'rgba', 'hsl', 'hsla', 'hwb', 'lab', 'lch', 'oklab', 'oklch', 'color'],
      { message: (name) => `Unexpected colour function "${name}()". Use a var(--…) token` },
    ],
    'shelf/radius-token': true,
    'shelf/font-size-token': true,
    'shelf/shadow-token': true,
  },
  overrides: [
    {
      files: TOKEN_FILES,
      rules: {
        'color-no-hex': null,
        'color-named': null,
        'function-disallowed-list': null,
        'shelf/shadow-token': null,
      },
    },
  ],
};
