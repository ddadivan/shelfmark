/** A WCAG contrast check between two colour tokens (libs/ui names), used by token-sync.spec.ts. */
export interface ContrastPair {
  readonly fg: string;
  readonly bg: string;
  /** 4.5 for text, 3 for non-text (control edges, focus rings). */
  readonly min: number;
}
