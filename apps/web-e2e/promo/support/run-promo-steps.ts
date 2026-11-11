import { test } from '@playwright/test';
import type { PromoChapter } from '../models/promo-chapter.type';
import type { PromoContext } from '../models/promo-context.interface';
import type { PromoRun } from '../models/promo-run.interface';
import { PROMO_STEPS } from '../models/promo-steps.const';
import { HIDE_CURSOR_CSS } from './promo-director';

/**
 * Runs PROMO_STEPS in order: holds until each chapter's start, measures when every step starts
 * (its caption runs until the next one starts) and saves the poster after the poster step.
 */
export async function runPromoSteps(context: PromoContext, posterPath: string): Promise<PromoRun> {
  const { page, phone, director } = context;
  const starts: { readonly start: number; readonly text: string }[] = [];
  const chapters: Partial<Record<PromoChapter, number>> = {};

  for (const step of PROMO_STEPS) {
    if (step.chapter) {
      chapters[step.chapter] = await director.holdUntil(step.chapter);
    }
    starts.push({
      start: director.elapsed(),
      text: (phone && step.caption.phone) || step.caption.desktop,
    });

    await test.step(step.id, () => step.run(context));

    if (step.poster) {
      await page.screenshot({ path: posterPath, style: HIDE_CURSOR_CSS });
    }
  }

  const duration = director.elapsed();
  const cues = starts.map((cue, index) => ({
    ...cue,
    end: starts[index + 1]?.start ?? duration,
  }));
  return { cues, chapters, duration };
}
