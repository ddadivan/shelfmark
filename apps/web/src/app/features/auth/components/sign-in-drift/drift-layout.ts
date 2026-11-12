import type { SignInDriftBox } from './models/sign-in-drift-box.interface';
import type { SignInDriftFrame } from './models/sign-in-drift-frame.interface';
import { SIGN_IN_DRIFT_LAYER } from './models/sign-in-drift-layer.const';
import type { SignInDriftLayer } from './models/sign-in-drift-layer.type';
import type { SignInDriftPlacement } from './models/sign-in-drift-placement.interface';

/** The base card is 240px wide; its height with a two-line title, a little rounded up. */
export const DRIFT_CARD_WIDTH = 240;
export const DRIFT_CARD_HEIGHT = 284;

/** How far a card may hang over the lane's outer edge (share of its width) and over the top or bottom (of its height). */
export const DRIFT_OFF_EDGE_X = 0.3;
export const DRIFT_OFF_EDGE_Y = 0.22;

/** Room kept between two cards that must not touch (float and lean included), in pixels at scale 1. */
export const DRIFT_GAP = 14;

/** A far card may tuck behind a nearer one by at most this share of its own box. */
export const DRIFT_FAR_TUCK = 0.2;

const LAYER_SCALE: Record<SignInDriftLayer, readonly [number, number]> = {
  near: [0.8, 0.88],
  mid: [0.6, 0.68],
  far: [0.42, 0.5],
};

const LAYER_SECONDS: Record<SignInDriftLayer, readonly [number, number]> = {
  near: [6.5, 8.5],
  mid: [8.5, 11],
  far: [11, 15],
};

const LAYER_AMP: Record<SignInDriftLayer, readonly [number, number]> = {
  near: [9, 13],
  mid: [6, 9],
  far: [4, 6],
};

const LAYER_ORDER: Record<SignInDriftLayer, number> = { near: 0, mid: 1, far: 2 };

/** Candidate spots tried per card; the one farthest from the others wins (best-candidate sampling). */
const CANDIDATES = 160;
const ROUNDS = 6;

/** Deterministic pseudo-random numbers in [0, 1) from a seed (mulberry32). */
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

/** The outline of a rotated card, as an axis-aligned box. */
function outline(scale: number, rotate: number): { w: number; h: number } {
  const w = DRIFT_CARD_WIDTH * scale;
  const h = DRIFT_CARD_HEIGHT * scale;
  const rad = (Math.abs(rotate) * Math.PI) / 180;
  return {
    w: w * Math.cos(rad) + h * Math.sin(rad),
    h: w * Math.sin(rad) + h * Math.cos(rad),
  };
}

function overlap(a: SignInDriftBox, b: SignInDriftBox, gap: number): number {
  const x = Math.min(a.x + a.w / 2, b.x + b.w / 2) - Math.max(a.x - a.w / 2, b.x - b.w / 2) + gap;
  const y = Math.min(a.y + a.h / 2, b.y + b.h / 2) - Math.max(a.y - a.h / 2, b.y - b.h / 2) + gap;
  return x > 0 && y > 0 ? x * y : 0;
}

/**
 * Whether two cards may sit where they are: near and mid cards keep a gap from each other and far
 * cards from far cards; a far card may tuck slightly behind a nearer one (its depth reads as
 * behind), never more than `DRIFT_FAR_TUCK` of its box.
 */
export function driftBoxesFit(a: SignInDriftBox, b: SignInDriftBox): boolean {
  const aFar = a.layer === SIGN_IN_DRIFT_LAYER.Far;
  const bFar = b.layer === SIGN_IN_DRIFT_LAYER.Far;
  if (aFar !== bFar) {
    const far = aFar ? a : b;
    return overlap(a, b, 0) <= far.w * far.h * DRIFT_FAR_TUCK;
  }
  return overlap(a, b, DRIFT_GAP) === 0;
}

/**
 * The seeded scatter of one side lane: every card gets a spot, a size within its layer, a tilt
 * and its own float, the same on every visit. Larger cards are placed first, each at the
 * candidate farthest from the cards already there, so the lane fills evenly without a grid look;
 * far cards end up in the gaps. Spots are shares of the reference frame, so the real lane can be
 * any size (see `SignInDriftFrame`). Cards may hang over the outer edge, the top and the bottom,
 * never over the inner edge next to the sign-in card.
 */
export function layoutDriftLane(
  layers: readonly SignInDriftLayer[],
  frame: SignInDriftFrame,
  seed: number,
): SignInDriftPlacement[] {
  const random = seededRandom(seed);
  const between = ([min, max]: readonly [number, number]): number => min + (max - min) * random();
  const order = layers
    .map((layer, index) => ({ layer, index }))
    .sort((a, b) => LAYER_ORDER[a.layer] - LAYER_ORDER[b.layer] || a.index - b.index);

  const placed: SignInDriftBox[] = [];
  const result = new Array<SignInDriftPlacement>(layers.length);
  const boxes = new Array<SignInDriftBox>(layers.length);

  for (const { layer, index } of order) {
    const scale = round(between(LAYER_SCALE[layer]));
    const tilt = 2 + random() * 5;
    const rotate = Math.round((index % 2 === 0 ? -tilt : tilt) * 10) / 10;
    const { w, h } = outline(scale, rotate);
    const minX = w / 2 - DRIFT_CARD_WIDTH * scale * DRIFT_OFF_EDGE_X;
    const maxX = frame.width - w / 2;
    const minY = h / 2 - DRIFT_CARD_HEIGHT * scale * DRIFT_OFF_EDGE_Y;
    const maxY = frame.height - h / 2 + DRIFT_CARD_HEIGHT * scale * DRIFT_OFF_EDGE_Y;

    let best: SignInDriftBox | null = null;
    let bestScore = -Infinity;
    for (let round = 0; round < ROUNDS && !best; round++) {
      for (let i = 0; i < CANDIDATES; i++) {
        const box: SignInDriftBox = {
          layer,
          x: minX + (maxX - minX) * random(),
          y: minY + (maxY - minY) * random(),
          w,
          h,
        };
        if (!placed.every((other) => driftBoxesFit(box, other))) {
          continue;
        }
        const score = Math.min(
          ...placed.map((other) => Math.hypot(box.x - other.x, box.y - other.y)),
          Number.POSITIVE_INFINITY,
        );
        if (score > bestScore) {
          bestScore = score;
          best = box;
        }
      }
    }
    // A frame too small for its cards: the last candidate stands; the unit tests catch it.
    const box = best ?? { layer, x: (minX + maxX) / 2, y: (minY + maxY) / 2, w, h };
    placed.push(box);
    boxes[index] = box;

    const duration = between(LAYER_SECONDS[layer]);
    result[index] = {
      x: box.x / frame.width,
      y: box.y / frame.height,
      scale,
      rotate,
      wave: 0,
      duration: round(duration),
      delay: round(-duration * random()),
      ampY: round(between(LAYER_AMP[layer])),
      ampX: round((random() * 2 - 1) * 5),
      spin: round((random() < 0.5 ? -1 : 1) * (0.8 + random() * 1.2)),
    };
  }

  // The wave: nearest to the sign-in card (inner edge, middle height) first.
  const distance = (box: SignInDriftBox): number =>
    Math.hypot(frame.width - box.x, (frame.height / 2 - box.y) * 0.6);
  const byDistance = boxes.map((box, index) => ({ index, d: distance(box) }));
  byDistance.sort((a, b) => a.d - b.d);
  byDistance.forEach(({ index }, wave) => {
    result[index] = { ...result[index], wave };
  });
  return result;
}

/** Rebuilds the reference boxes of a layout, for the overlap checks in tests. */
export function driftBoxes(
  layers: readonly SignInDriftLayer[],
  placements: readonly SignInDriftPlacement[],
  frame: SignInDriftFrame,
): SignInDriftBox[] {
  return placements.map((p, i) => ({
    layer: layers[i],
    x: p.x * frame.width,
    y: p.y * frame.height,
    ...outline(p.scale, p.rotate),
  }));
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}
