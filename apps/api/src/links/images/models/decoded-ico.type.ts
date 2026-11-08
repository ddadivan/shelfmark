import type { DECODED_ICO_KIND } from './decoded-ico-kind.const';

/** The biggest image of an ICO file: an embedded PNG, or decoded RGBA pixels of a BMP entry. */
export type DecodedIco =
  | { kind: typeof DECODED_ICO_KIND.Png; png: Buffer }
  | { kind: typeof DECODED_ICO_KIND.Raw; raw: Buffer; width: number; height: number };
