import type { TEXT_SIZE } from './text-size.const';

/** One of `TEXT_SIZE`. */
export type TextSize = (typeof TEXT_SIZE)[keyof typeof TEXT_SIZE];
