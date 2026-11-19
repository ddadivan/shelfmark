/** A link as the mock model reads it from a tool result. */
export interface MockAskItem {
  ref: number;
  title: string;
  site: string;
  tags: string[];
  summary: string | null;
}
