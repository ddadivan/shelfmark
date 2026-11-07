import type { LEAK } from './leak.const';

export type Leak = (typeof LEAK)[keyof typeof LEAK];
