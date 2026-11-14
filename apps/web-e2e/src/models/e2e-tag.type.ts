import type { E2E_TAG } from './e2e-tag.const';

export type E2eTag = (typeof E2E_TAG)[keyof typeof E2E_TAG];
