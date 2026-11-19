/** A tool result the mock model reads back from the transcript. */
export interface MockAskResult {
  name: string;
  isError: boolean;
  /** The parsed JSON content, or the error text. */
  data: unknown;
}
