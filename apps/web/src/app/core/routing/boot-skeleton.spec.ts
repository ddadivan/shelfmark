import { describe, expect, it } from 'vitest';
import { removeBootSkeleton } from './boot-skeleton';

describe('boot skeleton', () => {
  it('removes the skeleton element and tolerates its absence', () => {
    const skeleton = document.createElement('div');
    skeleton.setAttribute('data-app-skeleton', '');
    document.body.append(skeleton);
    removeBootSkeleton(document);
    expect(document.querySelector('[data-app-skeleton]')).toBeNull();
    expect(() => removeBootSkeleton(document)).not.toThrow();
  });
});
