import type { MOCK_LINKS_SCENARIO } from './mock-links-scenario.const';

export type MockLinksScenario = (typeof MOCK_LINKS_SCENARIO)[keyof typeof MOCK_LINKS_SCENARIO];
