/** A tool call the mock model makes. */
export interface MockAskCall {
  name: string;
  input: Record<string, unknown>;
}
