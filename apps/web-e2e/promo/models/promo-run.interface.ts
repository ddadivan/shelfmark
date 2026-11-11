import type { PromoChapter } from './promo-chapter.type';
import type { PromoCue } from './promo-cue.interface';

/** What one run of the step list measured, in milliseconds from the start of the video. */
export interface PromoRun {
  readonly cues: readonly PromoCue[];
  readonly chapters: Partial<Record<PromoChapter, number>>;
  readonly duration: number;
}
