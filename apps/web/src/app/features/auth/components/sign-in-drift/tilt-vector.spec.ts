import { tiltVector, TILT_REACH_PX } from './tilt-vector';

const RECT = { left: 100, top: 100, width: 200, height: 100 };

describe('tiltVector', () => {
  it('is zero with the pointer on the centre of the card', () => {
    expect(tiltVector({ x: 200, y: 150 }, RECT)).toEqual({ x: 0, y: 0 });
  });

  it('points toward the pointer: right is positive, above is negative', () => {
    const right = tiltVector({ x: 200 + TILT_REACH_PX / 2, y: 150 }, RECT);
    const above = tiltVector({ x: 200, y: 150 - TILT_REACH_PX / 2 }, RECT);

    expect(right.x).toBeCloseTo(0.5);
    expect(above.y).toBeCloseTo(-0.5);
  });

  it('stops at 1 far away', () => {
    expect(tiltVector({ x: 99999, y: -99999 }, RECT)).toEqual({ x: 1, y: -1 });
  });
});
