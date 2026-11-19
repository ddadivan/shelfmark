/** A tool call of the model in an Ask transcript; `input` is narrowed by the tool's parser. */
export interface AskToolCallBlock {
  type: 'tool_call';
  id: string;
  name: string;
  input: unknown;
}
