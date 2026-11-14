import {
  DRIFT_CARD_HEIGHT,
  DRIFT_CARD_WIDTH,
  driftBoxes,
  driftBoxesFit,
} from '../sign-in-drift/drift-layout';
import { SIGN_IN_PHONE_CARD_IDS } from './models/sign-in-phone-card-ids.const';
import { SIGN_IN_PHONE_FRAME } from './models/sign-in-phone-frame.const';
import { layoutPhoneCards, phoneCards } from './phone-layout';

describe('layoutPhoneCards', () => {
  const items = layoutPhoneCards();
  const layers = items.map((item) => item.card.layer);
  const boxes = driftBoxes(
    layers,
    items.map((item) => item.place),
    SIGN_IN_PHONE_FRAME,
  );

  it('shows six of the desktop cards, in the listed order, in all three depth layers', () => {
    expect(items.map((item) => item.card.id)).toEqual([...SIGN_IN_PHONE_CARD_IDS]);
    expect(phoneCards()).toHaveLength(6);
    expect(new Set(layers)).toEqual(new Set(['near', 'mid', 'far']));
  });

  it('is the same on every call', () => {
    expect(layoutPhoneCards()).toEqual(items);
  });

  it('draws the cards small: the largest is under half of the desktop card', () => {
    expect(Math.max(...items.map((item) => item.place.scale))).toBeLessThan(0.5);
    expect(DRIFT_CARD_WIDTH * Math.max(...items.map((i) => i.place.scale))).toBeLessThan(130);
    expect(DRIFT_CARD_HEIGHT).toBeGreaterThan(0);
  });

  it('keeps cards apart (a far card may tuck a little behind a nearer one)', () => {
    for (const [i, a] of boxes.entries()) {
      for (const [j, b] of boxes.entries()) {
        if (j > i) {
          expect(driftBoxesFit(a, b), `cards ${i} and ${j}`).toBe(true);
        }
      }
    }
  });

  it('keeps every card inside the strip, hanging over the edge by a quarter at most', () => {
    for (const [i, box] of boxes.entries()) {
      expect(box.x + box.w / 2, `card ${i} right`).toBeLessThanOrEqual(
        SIGN_IN_PHONE_FRAME.width + 0.01,
      );
      expect(box.x - box.w / 2, `card ${i} left`).toBeGreaterThanOrEqual(-box.w * 0.3);
      expect(box.y - box.h / 2, `card ${i} top`).toBeGreaterThanOrEqual(-box.h * 0.25);
      // The band is 300px: a card that hangs over the lane's bottom (and floats up to 15px) stays above its line.
      expect(box.y + box.h / 2, `card ${i} bottom`).toBeLessThanOrEqual(285);
    }
  });

  it('staggers the fly-in: every card has its own turn', () => {
    expect(new Set(items.map((item) => item.place.wave)).size).toBe(6);
  });
});
