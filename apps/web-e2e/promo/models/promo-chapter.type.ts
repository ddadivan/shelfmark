import type { PROMO_CHAPTER_START_MS } from './promo-chapter.const';

export type PromoChapter = keyof (typeof PROMO_CHAPTER_START_MS)['desktop'];
