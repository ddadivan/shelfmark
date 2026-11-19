import type { ASK_GROUP_BY } from './ask-group-by.const';

/** One of `ASK_GROUP_BY`. */
export type AskGroupBy = (typeof ASK_GROUP_BY)[keyof typeof ASK_GROUP_BY];
