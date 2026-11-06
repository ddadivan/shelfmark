/**
 * `no-restricted-syntax` selectors for ADR 0024 (named constants, no TS enum).
 * Flat config replaces a rule's options when a later entry sets it, so every config that sets
 * `no-restricted-syntax` spreads these arrays into its own list instead of adding an entry.
 */

/** Holds everywhere, including e2e. */
export const enumSelectors = [
  {
    selector: 'TSEnumDeclaration',
    message: 'Use an `as const` object and a derived union type (ADR 0024).',
  },
];

/** Hold in every file except e2e, including the files that define the constants. */
export const enumAndKeySelectors = [
  ...enumSelectors,
  {
    selector: "BinaryExpression[left.property.name='key'][right.type='Literal']",
    message: 'Compare KeyboardEvent.key with KEYBOARD_KEY, not a string literal (ADR 0024).',
  },
  {
    selector: "BinaryExpression[right.property.name='key'][left.type='Literal']",
    message: 'Compare KeyboardEvent.key with KEYBOARD_KEY, not a string literal (ADR 0024).',
  },
  {
    selector: "SwitchStatement[discriminant.property.name='key'] > SwitchCase > Literal.test",
    message: 'Switch on KeyboardEvent.key with KEYBOARD_KEY cases, not literals (ADR 0024).',
  },
];

/** Known singletons: spelled once, in the file that defines them (ADR 0024). */
export const singletonSelectors = [
  {
    selector: "Literal[value='data-theme']",
    message: 'Use THEME_ATTRIBUTE from @shelfmark/ui (ADR 0024).',
  },
  {
    selector: 'TemplateElement[value.raw=/data-theme/]',
    message: 'Use THEME_ATTRIBUTE from @shelfmark/ui (ADR 0024).',
  },
  {
    selector: "Literal[value='sm-theme']",
    message: 'Use THEME_STORAGE_KEY (ADR 0024).',
  },
  {
    selector: 'Literal[value=/^ui-overlay-layer--/]',
    message: 'Build overlay layer classes from OVERLAY_LAYER (ADR 0024).',
  },
];

/** Selectors for ordinary source files. */
export const namedConstantSelectors = [...enumAndKeySelectors, ...singletonSelectors];

/** Files that define the constants (they must spell the literal once). */
export const namedConstantDefinitionFiles = ['**/*.const.ts'];
