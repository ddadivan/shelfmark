import type { Test } from 'supertest';
import type { IsolationOperation } from './isolation-operation.type';
import type { TestAgent } from './test-agent.interface';

/**
 * How one user-owned resource is created and reached; `expectIsolated` runs the attacks.
 * `update`, `remove`, `list` and `reference` must each be provided or listed in `skip` with a
 * reason, so an omission is always deliberate (`expectIsolated` throws otherwise).
 */
export interface IsolationScenario {
  /** Creates a resource as the owner and returns its id. */
  create(owner: TestAgent): Promise<string>;
  /** Reads the resource by id. Also the owner's "still intact" check, so it must answer 200. */
  read(agent: TestAgent, id: string): Test;
  update?(agent: TestAgent, id: string): Test;
  remove?(agent: TestAgent, id: string): Test;
  list?: {
    request(agent: TestAgent): Test;
    /** Extracts the resource ids from the list response body. */
    ids(body: unknown): string[];
  };
  /** Uses the foreign id as a reference, e.g. creates a link with the owner's `folderId`. */
  reference?(agent: TestAgent, foreignId: string): Test;
  /** Operations that do not exist for this resource, each with the reason. */
  skip?: Partial<Record<IsolationOperation, string>>;
  /** An id that does not exist, for the "foreign looks like missing" comparison. Default: a UUIDv7. */
  missingId?(): string;
}
