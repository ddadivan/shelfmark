import type { ACCOUNT_PLAN } from './account-plan.const';

/** One of `ACCOUNT_PLAN`. */
export type AccountPlan = (typeof ACCOUNT_PLAN)[keyof typeof ACCOUNT_PLAN];
