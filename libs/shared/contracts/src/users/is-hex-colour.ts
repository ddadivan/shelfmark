import { HEX_COLOUR_PATTERN } from './hex-colour-pattern.const';
import type { HexColour } from './hex-colour.type';

/** True for a lower-case `#rrggbb` string. */
export function isHexColour(value: unknown): value is HexColour {
  return typeof value === 'string' && HEX_COLOUR_PATTERN.test(value);
}
