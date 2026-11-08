import { DEMO_ERROR } from './demo-error.const';

export type DemoError = (typeof DEMO_ERROR)[keyof typeof DEMO_ERROR];
