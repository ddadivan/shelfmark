/** Bounds on untrusted share input, applied before any parsing. */
export const SHARE_INPUT_LIMIT = {
  /** Characters of one query parameter that are looked at; the rest is dropped. */
  ParamMax: 8192,
} as const;
