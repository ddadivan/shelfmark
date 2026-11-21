import { describe, expect, it } from 'vitest';
import { neighbourId } from './neighbour-id';

describe('neighbourId', () => {
  const ids = ['a', 'b', 'c'];

  it('steps through the list', () => {
    expect(neighbourId(ids, 'b', 1)).toBe('c');
    expect(neighbourId(ids, 'b', -1)).toBe('a');
  });

  it('stops at the ends and for unknown ids', () => {
    expect(neighbourId(ids, 'c', 1)).toBeNull();
    expect(neighbourId(ids, 'a', -1)).toBeNull();
    expect(neighbourId(ids, 'x', 1)).toBeNull();
    expect(neighbourId(ids, null, 1)).toBeNull();
  });
});
