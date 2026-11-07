import { randomUUID } from 'node:crypto';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { Test } from 'supertest';
import { expect } from 'vitest';
import type { IsolationScenario } from '../models/isolation-scenario.interface';
import type { IsolationUsers } from '../models/isolation-users.interface';
import { anonymous, asUser } from './test-agent';

const API_ERROR_KEYS = ['error', 'message', 'requestId', 'statusCode'];

interface Outcome {
  status: number;
  body: unknown;
}

async function run(test: Test): Promise<Outcome> {
  const response = await test;
  return { status: response.status, body: response.body };
}

/** An error without the request id and with the probed id masked, so two calls compare equal. */
function shape(outcome: Outcome, id: string): unknown {
  const body = outcome.body;
  if (typeof body !== 'object' || body === null) return body;
  const { statusCode, error, message } = body as Record<string, unknown>;
  const mask = (value: unknown): unknown =>
    typeof value === 'string' ? value.split(id).join('<id>') : value;
  return { statusCode, error, message: mask(message) };
}

/**
 * Runs the data-isolation checks of PROJECT.md 5.8 for one user-owned resource:
 * 1. an anonymous read is a 401 `ApiError`;
 * 2. the intruder's read, update, remove and reference are a 404 `ApiError` that carries no resource
 *    field and looks exactly like the same call on an id that does not exist;
 * 3. the intruder's list does not contain the id;
 * 4. the owner still reads the same resource afterwards (nothing changed or deleted) and lists it.
 * Throws (vitest assertion) on the first violation.
 */
export async function expectIsolated(
  app: NestExpressApplication,
  users: IsolationUsers,
  scenario: IsolationScenario,
): Promise<void> {
  const owner = asUser(app, users.owner);
  const intruder = asUser(app, users.intruder);
  const id = await scenario.create(owner);

  const before = await run(scenario.read(owner, id));
  expect(before.status, 'the owner must read the new resource (status 200)').toBe(200);

  const anonymousRead = await run(scenario.read(anonymous(app), id));
  expect(anonymousRead.status, 'anonymous read').toBe(401);
  expect(Object.keys(anonymousRead.body as object).sort()).toEqual(API_ERROR_KEYS);

  const attacks: [string, (agent: typeof intruder, target: string) => Test | undefined][] = [
    ['read', (agent, target) => scenario.read(agent, target)],
    ['update', (agent, target) => scenario.update?.(agent, target)],
    ['remove', (agent, target) => scenario.remove?.(agent, target)],
    ['reference', (agent, target) => scenario.reference?.(agent, target)],
  ];
  for (const [name, attack] of attacks) {
    const foreign = attack(intruder, id);
    if (foreign === undefined) continue;
    const foreignOutcome = await run(foreign);
    expect(foreignOutcome.status, `intruder ${name} of a foreign id must be 404`).toBe(404);
    expect(
      Object.keys(foreignOutcome.body as object).sort(),
      `intruder ${name} must answer a bare ApiError`,
    ).toEqual(API_ERROR_KEYS);

    const missingId = randomUUID();
    const missing = attack(intruder, missingId);
    if (missing === undefined) continue;
    const missingOutcome = await run(missing);
    expect(
      shape(foreignOutcome, id),
      `intruder ${name}: a foreign id must look exactly like a missing one`,
    ).toEqual(shape(missingOutcome, missingId));
  }

  if (scenario.list) {
    const intruderList = await run(scenario.list.request(intruder));
    expect(intruderList.status, 'intruder list').toBe(200);
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
