/** A retrieved link as the mock answer sees it: its number among the sources and its text. */
export interface MockAskSource {
  readonly n: number;
  readonly title: string;
  readonly host: string;
  readonly tags: readonly string[];
  readonly summary: string | null;
}
