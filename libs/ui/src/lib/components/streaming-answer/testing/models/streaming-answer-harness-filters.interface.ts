import type { BaseHarnessFilters } from '@angular/cdk/testing';

export interface StreamingAnswerHarnessFilters extends BaseHarnessFilters {
  /** The question in the bubble, text or pattern. */
  question?: string | RegExp;
}
