import type { MockAskCall } from './mock-ask-call.interface';

/** What the mock model does in one round. */
export type MockAskRound =
  | { kind: 'fail' }
  | { kind: 'refuse' }
  | { kind: 'reply'; text: string; calls: MockAskCall[]; slow: boolean; cut: boolean };
