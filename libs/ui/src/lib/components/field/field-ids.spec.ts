import { describe, expect, it } from 'vitest';
import { fieldDescribedBy, fieldErrorId, fieldHintId, nextFieldId } from './field-ids';

describe('field ids', () => {
  it('generates unique ids with a prefix', () => {
    const a = nextFieldId('ui-input');
    const b = nextFieldId('ui-input');
    expect(a).toMatch(/^ui-input-\d+$/);
    expect(a).not.toBe(b);
    expect(nextFieldId()).toMatch(/^ui-field-\d+$/);
  });

  it('derives the message ids from the control id', () => {
    expect(fieldHintId('x')).toBe('x-hint');
    expect(fieldErrorId('x')).toBe('x-error');
  });

  it('links error, hint and counter in this order and nothing when none exists', () => {
    expect(fieldDescribedBy('x', { hint: true, error: true, counter: true })).toBe(
      'x-error x-hint x-counter',
    );
    expect(fieldDescribedBy('x', { hint: true, error: false, counter: false })).toBe('x-hint');
    expect(fieldDescribedBy('x', { hint: false, error: false, counter: false })).toBeNull();
  });
});
