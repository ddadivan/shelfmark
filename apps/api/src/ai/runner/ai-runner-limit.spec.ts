import { AI_RUNNER_LIMIT } from '../models/ai-runner-limit.const';
import { ANTHROPIC_LIMIT } from '../models/anthropic-limit.const';
import { EXCERPT_FETCH_LIMITS } from '../models/excerpt-limit.const';

describe('AI_RUNNER_LIMIT', () => {
  it('holds a lease longer than the page read, the model call and the margin together', () => {
    const fetchMs = EXCERPT_FETCH_LIMITS.totalTimeoutMs ?? Number.POSITIVE_INFINITY;
    const leaseMs = AI_RUNNER_LIMIT.LeaseSeconds * 1000;
    expect(fetchMs + ANTHROPIC_LIMIT.TimeoutMs + AI_RUNNER_LIMIT.LeaseMarginMs).toBeLessThan(
      leaseMs,
    );
  });
});
