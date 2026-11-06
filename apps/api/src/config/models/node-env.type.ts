import type { NODE_ENV } from './node-env.const';

export type NodeEnv = (typeof NODE_ENV)[keyof typeof NODE_ENV];
