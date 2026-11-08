/** The biggest image of an ICO file: an embedded PNG, or decoded RGBA pixels of a BMP entry. */
export type DecodedIco =
  { kind: 'png'; png: Buffer } | { kind: 'raw'; raw: Buffer; width: number; height: number };
