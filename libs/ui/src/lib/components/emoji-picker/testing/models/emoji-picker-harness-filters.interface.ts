import type { BaseHarnessFilters } from '@angular/cdk/testing';

/** Filters for `UiEmojiPickerHarness.with()`. */
export interface EmojiPickerHarnessFilters extends BaseHarnessFilters {
  /** Text of the field label. */
  readonly label?: string | RegExp;
  /** The field's value (the emoji). */
  readonly value?: string | RegExp;
}
