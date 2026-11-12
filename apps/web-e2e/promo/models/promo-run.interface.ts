import type { PromoChapter } from './promo-chapter.type';
import type { PromoCue } from './promo-cue.interface';
import type { PromoCut } from './promo-cut.interface';

/** What one run of the step list measured, in milliseconds from the start of the video. */
export interface PromoRun {
  readonly cues: readonly PromoCue[];
  readonly chapters: Partial<Record<PromoChapter, number>>;
  readonly duration: number;
  /** Length of the raw recording from the first kept frame, cuts included. */
  readonly rawDuration: number;
  /** Page loads left out of the final video, in raw recording time. */
  readonly cuts: readonly PromoCut[];
}
