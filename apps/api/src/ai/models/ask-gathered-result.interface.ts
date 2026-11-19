/** A library tool result of the quick loop, handed to the deep loop so no search is repeated. */
export interface AskGatheredResult {
  name: string;
  isError: boolean;
  /** What the model read (JSON data or the fixed error message). */
  data: unknown;
}
