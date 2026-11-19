/** The answer to one tool call: JSON text (free text escaped) or a fixed error message. */
export interface AskToolResultBlock {
  type: 'tool_result';
  toolCallId: string;
  content: string;
  isError: boolean;
}
