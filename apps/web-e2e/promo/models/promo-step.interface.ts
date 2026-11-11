import type { PromoCaption } from './promo-caption.interface';
import type { PromoChapter } from './promo-chapter.type';
import type { PromoContext } from './promo-context.interface';

/**
 * One scripted step of the promo video. Its caption is shown from the moment the step starts
 * until the next step starts (times measured during the run). A step with `chapter` waits for
 * that chapter's start before it runs.
 */
export interface PromoStep {
  readonly id: string;
  readonly caption: PromoCaption;
  readonly chapter?: PromoChapter;
  /** Takes the poster frame when the step is done. */
  readonly poster?: boolean;
  run(context: PromoContext): Promise<void>;
}
