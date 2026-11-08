import type { ISOLATION_OPERATION } from './isolation-operation.const';

export type IsolationOperation = (typeof ISOLATION_OPERATION)[keyof typeof ISOLATION_OPERATION];
