import type { REDISCOVER_MODE } from './rediscover-mode.const';

/** One of `REDISCOVER_MODE`. */
export type RediscoverMode = (typeof REDISCOVER_MODE)[keyof typeof REDISCOVER_MODE];
