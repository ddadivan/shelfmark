import {
  DRIFT_CARD_HEIGHT,
  DRIFT_CARD_WIDTH,
  DRIFT_OFF_EDGE_X,
  DRIFT_OFF_EDGE_Y,
  driftBoxes,
  driftBoxesFit,
  layoutDriftLane,
  seededRandom,
} from './drift-layout';
import { SIGN_IN_DRIFT_CARDS } from './models/sign-in-drift-cards.const';
import { SIGN_IN_DRIFT_FRAMES } from './models/sign-in-drift-frames.const';
import { SIGN_IN_DRIFT_LAYER } from './models/sign-in-drift-layer.const';
import { SIGN_IN_DRIFT_SIDE } from './models/sign-in-drift-side.const';

const LAYOUTS = [
  { name: 'wide', frame: SIGN_IN_DRIFT_FRAMES.wide, narrowOnly: false },
  { name: 'narrow', frame: SIGN_IN_DRIFT_FRAMES.narrow, narrowOnly: true },
] as const;

describe('seededRandom', () => {
  it('gives the same sequence for the same seed and numbers in [0, 1)', () => {
    const a = seededRandom(7);
    const b = seededRandom(7);
    const values = Array.from({ length: 50 }, () => a());

    expect(values).toEqual(Array.from({ length: 50 }, () => b()));
    expect(values.every((v) => v >= 0 && v < 1)).toBe(true);
    expect(seededRandom(8)()).not.toBe(values[0]);
  });
});

describe('layoutDriftLane', () => {
  for (const { name, frame, narrowOnly } of LAYOUTS) {
    Object.values(SIGN_IN_DRIFT_SIDE).forEach((side, sideIndex) => {
      const layers = SIGN_IN_DRIFT_CARDS.filter(
        (card) => card.side === side && (!narrowOnly || card.narrow),
      ).map((card) => card.layer);
      const placements = layoutDriftLane(layers, frame, frame.seeds[sideIndex]);
      const boxes = driftBoxes(layers, placements, frame);

      it(`${name} ${side}: no two cards collide (a far card only tucks slightly behind a nearer one)`, () => {
        for (const [i, a] of boxes.entries()) {
          for (const [j, b] of boxes.entries()) {
            if (j > i) {
              expect(driftBoxesFit(a, b), `cards ${i} and ${j}`).toBe(true);
            }
          }
        }
      });

      it(`${name} ${side}: nothing crosses the inner edge; the outer edges are crossed only a little`, () => {
        for (const [i, box] of boxes.entries()) {
          const where = `card ${i}`;
          const { scale } = placements[i];
          expect(box.x + box.w / 2, where).toBeLessThanOrEqual(frame.width + 0.01);
          expect(box.x - box.w / 2, where).toBeGreaterThanOrEqual(
            -DRIFT_CARD_WIDTH * scale * DRIFT_OFF_EDGE_X - 0.01,
          );
          expect(box.y - box.h / 2, where).toBeGreaterThanOrEqual(
            -DRIFT_CARD_HEIGHT * scale * DRIFT_OFF_EDGE_Y - 0.01,
          );
          expect(box.y + box.h / 2, where).toBeLessThanOrEqual(
            frame.height + DRIFT_CARD_HEIGHT * scale * DRIFT_OFF_EDGE_Y + 0.01,
          );
        }
      });

      it(`${name} ${side}: every card has its own float and a place in the wave`, () => {
        expect(placements.map((p) => p.wave).sort((a, b) => a - b)).toEqual(
          placements.map((_, i) => i),
        );
        expect(new Set(placements.map((p) => p.duration)).size).toBe(placements.length);
        expect(new Set(placements.map((p) => p.delay)).size).toBe(placements.length);
        for (const p of placements) {
          expect(p.delay).toBeLessThanOrEqual(0);
          expect(p.delay).toBeGreaterThan(-p.duration);
        }
      });
    });
  }

  it('is deterministic: the same seed gives the same scatter', () => {
    const layers = [SIGN_IN_DRIFT_LAYER.Near, SIGN_IN_DRIFT_LAYER.Mid, SIGN_IN_DRIFT_LAYER.Far];
    const frame = SIGN_IN_DRIFT_FRAMES.wide;

    expect(layoutDriftLane(layers, frame, 42)).toEqual(layoutDriftLane(layers, frame, 42));
    expect(layoutDriftLane(layers, frame, 42)).not.toEqual(layoutDriftLane(layers, frame, 43));
  });

  it('is not a grid: the cards of a wide lane sit at many different heights and depths', () => {
    const layers = SIGN_IN_DRIFT_CARDS.filter((c) => c.side === SIGN_IN_DRIFT_SIDE.Start).map(
      (c) => c.layer,
    );
    const placements = layoutDriftLane(
      layers,
      SIGN_IN_DRIFT_FRAMES.wide,
      SIGN_IN_DRIFT_FRAMES.wide.seeds[0],
    );
    const rows = new Set(placements.map((p) => Math.round(p.y * 40)));
    const sizes = new Set(placements.map((p) => p.scale));

    expect(rows.size).toBeGreaterThanOrEqual(placements.length - 1);
    expect(sizes.size).toBe(placements.length);
  });
});
