import { describe, expect, it } from 'vitest';
import { DEMO_LIMIT } from '../demo/demo-limit.const';
import { linkCapFor } from './link-cap-for';
import { LINK_LIMIT } from './link-limit.const';

describe('linkCapFor', () => {
  it('is the per-user cap for a real account and the demo cap for a sandbox', () => {
    expect(linkCapFor(false)).toBe(LINK_LIMIT.PerUserMax);
    expect(linkCapFor(true)).toBe(DEMO_LIMIT.MaxLinks);
  });
});
