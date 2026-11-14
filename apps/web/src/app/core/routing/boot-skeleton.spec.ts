import { describe, expect, it } from 'vitest';
import { keepsBootSkeleton, removeBootSkeleton } from './boot-skeleton';
import { KEEP_BOOT_SKELETON_DATA } from './models/keep-boot-skeleton-data.const';

describe('boot skeleton', () => {
  it('removes the skeleton element and tolerates its absence', () => {
    const skeleton = document.createElement('div');
    skeleton.setAttribute('data-app-skeleton', '');
    document.body.append(skeleton);
    removeBootSkeleton(document);
    expect(document.querySelector('[data-app-skeleton]')).toBeNull();
    expect(() => removeBootSkeleton(document)).not.toThrow();
  });

  it('stays only for a route that asks for it', () => {
    expect(keepsBootSkeleton({ [KEEP_BOOT_SKELETON_DATA]: true })).toBe(true);
    expect(keepsBootSkeleton({ [KEEP_BOOT_SKELETON_DATA]: 'yes' })).toBe(false);
    expect(keepsBootSkeleton({})).toBe(false);
    expect(keepsBootSkeleton(undefined)).toBe(false);
  });
});
