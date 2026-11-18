/** A line in place of an Ask answer: its translation key and parameters. */
export interface AskLine {
  readonly key: string;
  readonly params: Readonly<Record<string, string>>;
}
