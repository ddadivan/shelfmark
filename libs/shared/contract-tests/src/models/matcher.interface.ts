/** A placeholder inside an expected value: stands for any value `test` accepts. */
export interface Matcher {
  readonly matcher: true;
  /** Shown in a mismatch message. */
  readonly label: string;
  test(actual: unknown): boolean;
}
