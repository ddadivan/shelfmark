import type { Test } from 'supertest';
import type { TestAgent } from './test-agent.interface';

/** One request of an isolation scenario, for a given agent and resource id. */
export type IsolationOperationRequest = (agent: TestAgent, id: string) => Test;
