import type { NestExpressApplication } from '@nestjs/platform-express';
import type { Test } from 'supertest';
import { expect } from 'vitest';
import { ISOLATION_OPERATION } from '../models/isolation-operation.const';
import type { IsolationScenario } from '../models/isolation-scenario.interface';
import type { IsolationOperationRequest } from '../models/isolation-operation-request.type';
import type { IsolationUsers } from '../models/isolation-users.interface';
import type { RequestOutcome } from '../models/request-outcome.interface';
import { randomUuidV7 } from './random-uuid-v7';
import { anonymous, asUser } from './test-agent';

const API_ERROR_KEYS = ['error', 'message', 'requestId', 'statusCode'];

async function run(test: Test): Promise<RequestOutcome> {
  const response = await test;
  return { status: response.status, body: response.body };
}

function keysOf(body: unknown): string[] {
  return typeof body === 'object' && body !== null ? Object.keys(body).sort() : [];
}

/** An error without the request id and with the probed id masked, so two calls compare equal. */
function shape(outcome: RequestOutcome, id: string): unknown {
  const body: unknown = outcome.body;
  if (typeof body !== 'object' || body === null) return body;
  const { statusCode, error, message } = body as Record<string, unknown>;
  const mask = (value: unknown): unknown =>
    typeof value === 'string' ? value.split(id).join('<id>') : value;
  return { statusCode, error, message: mask(message) };
}

/**
 * Runs the data-isolation checks of PROJECT.md 5.8 for one user-owned resource:
 * 1. every anonymous operation is a 401 `ApiError`;
 * 2. the intruder's read, update, remove and reference are a 404 `ApiError` that carries no resource
 *    field and looks exactly like the same call on an id that does not exist;
 * 3. the intruder's list is a 200 that does not contain the id;
 * 4. the owner still reads the same resource afterwards (nothing changed or deleted) and lists it.
 * `update`, `remove`, `list` and `reference` must be provided or skipped with a reason.
 * Throws (vitest assertion) on the first violation.
 */
export async function expectIsolated(
  app: NestExpressApplication,
  users: IsolationUsers,
  scenario: IsolationScenario,
): Promise<void> {
  for (const operation of Object.values(ISOLATION_OPERATION)) {
    const reason = scenario.skip?.[operation];
    if (scenario[operation] === undefined) {
      expect(
        reason?.trim(),
        `${operation} is neither provided nor skipped with a reason`,
      ).toBeTruthy();
    }
  }

  const owner = asUser(app, users.owner);
  const intruder = asUser(app, users.intruder);
  const nobody = anonymous(app);
  const id = await scenario.create(owner);

  const before = await run(scenario.read(owner, id));
  expect(before.status, 'the owner must read the new resource (status 200)').toBe(200);

  const operations: [string, IsolationOperationRequest | undefined][] = [
    ['read', (agent, target) => scenario.read(agent, target)],
    ['update', scenario.update?.bind(scenario)],
    ['remove', scenario.remove?.bind(scenario)],
    ['reference', scenario.reference?.bind(scenario)],
  ];
  const present = operations.filter(
    (entry): entry is [string, IsolationOperationRequest] => entry[1] !== undefined,
  );

  for (const [name, operation] of present) {
    const outcome = await run(operation(nobody, id));
    expect(outcome.status, `anonymous ${name}`).toBe(401);
    expect(keysOf(outcome.body), `anonymous ${name} must answer a bare ApiError`).toEqual(
      API_ERROR_KEYS,
    );
  }

  for (const [name, operation] of present) {
    const foreign = await run(operation(intruder, id));
    expect(foreign.status, `intruder ${name} of a foreign id must be 404`).toBe(404);
    expect(keysOf(foreign.body), `intruder ${name} must answer a bare ApiError`).toEqual(
      API_ERROR_KEYS,
    );

    const missingId = scenario.missingId?.() ?? randomUuidV7();
    const missing = await run(operation(intruder, missingId));
    expect(
      shape(foreign, id),
      `intruder ${name}: a foreign id must look exactly like a missing one`,
    ).toEqual(shape(missing, missingId));
  }

  if (scenario.list) {
    const intruderList = await run(scenario.list.request(intruder));
    expect(intruderList.status, 'intruder list must be 200').toBe(200);
    expect(
      scenario.list.ids(intruderList.body),
      'intruder list must not hold the id',
    ).not.toContain(id);
  }

  const after = await run(scenario.read(owner, id));
  expect(after.status, 'the owner must still read the resource (nothing deleted)').toBe(200);
  expect(after.body, 'the resource must be unchanged after the intruder attempts').toEqual(
    before.body,
  );

  if (scenario.list) {
    const ownerList = await run(scenario.list.request(owner));
    expect(ownerList.status, 'owner list').toBe(200);
    expect(scenario.list.ids(ownerList.body), 'owner list must hold the id').toContain(id);
  }
}
