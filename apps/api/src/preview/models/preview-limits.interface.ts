export interface PreviewLimits {
  maxTitleLength: number;
  maxDescriptionLength: number;
  /** Only this many leading characters are parsed; parse5 is quadratic on deeply nested markup. */
  maxParsedChars: number;
}
