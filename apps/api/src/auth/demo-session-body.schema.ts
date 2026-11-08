import type { StandardSchemaV1 } from 'better-auth';
import { isRecord } from '../common/util/is-record';
import type { DemoSessionBody } from './models/demo-session-body.interface';

/**
 * Body schema of the server-only demo session endpoint, written against the Standard Schema
 * interface so the package needs no direct dependency on a validation library. It gives the call
 * `auth.api.createDemoSession({ body })` its type and rejects anything but `{ userId: string }`.
 */
export const demoSessionBodySchema: StandardSchemaV1<DemoSessionBody> = {
  '~standard': {
    version: 1,
    vendor: 'shelfmark',
    validate(value) {
      const userId = isRecord(value) ? value['userId'] : undefined;
      if (typeof userId !== 'string' || userId === '') {
        return { issues: [{ message: 'userId is required', path: ['userId'] }] };
      }
      return { value: { userId } };
    },
  },
};
