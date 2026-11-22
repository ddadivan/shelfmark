/** The highlight only exists for a pointer that can hover. */
export const FLUID_HOVER_QUERY = '(hover: hover)';

/** Only a mouse moves the highlight; touch and pen keep the rows as they are. */
export const FLUID_HOVER_POINTER = 'mouse';

/** Classes of the container and of the highlight (their rules are the global `fluid-hover` mixin). */
export const FLUID_HOVER_CLASS = {
  Container: 'ui-fluid-hover',
  /** The container while the directive is active: rows skip their own hover background. */
  On: 'ui-fluid-hover--on',
  Highlight: 'ui-fluid-hover__highlight',
  Shown: 'ui-fluid-hover__highlight--shown',
  /** No travel: the highlight is placed at once and only fades. */
  Jump: 'ui-fluid-hover__highlight--jump',
} as const;
