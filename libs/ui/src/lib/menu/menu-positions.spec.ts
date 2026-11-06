import { overlayTransformOrigin } from '../overlay/overlay-origin';
import { menuPositions, pointPositions } from './menu-positions';

describe('menu positions', () => {
  it('start aligns the menu with the left edge below the trigger, then flips', () => {
    const origins = menuPositions('start').map((p) => overlayTransformOrigin(p));
    expect(origins).toEqual(['0 0', '100% 0', '0 100%', '100% 100%']);
  });

  it('end aligns the menu with the right edge below the trigger, then flips', () => {
    const origins = menuPositions('end').map((p) => overlayTransformOrigin(p));
    expect(origins).toEqual(['100% 0', '0 0', '100% 100%', '0 100%']);
  });

  it('a point menu starts at the pointer and flips left and up', () => {
    const positions = pointPositions();
    expect(positions.every((p) => p.originX === 'start' && p.originY === 'top')).toBe(true);
    expect(positions.map((p) => overlayTransformOrigin(p))).toEqual([
      '0 0',
      '100% 0',
      '0 100%',
      '100% 100%',
    ]);
  });
});
