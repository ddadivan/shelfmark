import { SIGN_IN_SLOT_ORDER } from './models/sign-in-slot-order.const';
import { SIGN_IN_SWAPS } from './models/sign-in-swaps.const';
import { swapTiles } from './swap-tiles';

describe('swapTiles', () => {
  it('trades the slots of two tiles', () => {
    const next = swapTiles(SIGN_IN_SLOT_ORDER, [0, 6]);

    expect(next[0]).toBe('g');
    expect(next[6]).toBe('a');
  });

  it('treats index 4 as the tile in the wide slot', () => {
    const moved = swapTiles(SIGN_IN_SLOT_ORDER, [2, 6]);
    const next = swapTiles(moved, [4, 0]);

    expect(next[4]).toBe('a');
    expect(next[0]).toBe('e');
  });

  it('keeps every slot used exactly once through the whole loop', () => {
    let slots = SIGN_IN_SLOT_ORDER;
    for (let i = 0; i < SIGN_IN_SWAPS.length * 3; i++) {
      slots = swapTiles(slots, SIGN_IN_SWAPS[i % SIGN_IN_SWAPS.length]);
      expect(new Set(slots).size).toBe(8);
    }
  });
});
