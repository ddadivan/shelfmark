import type { E2E_PROJECT } from './e2e-project.const';

export type E2eProject = (typeof E2E_PROJECT)[keyof typeof E2E_PROJECT];
