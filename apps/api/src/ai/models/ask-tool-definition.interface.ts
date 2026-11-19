import type { AskToolName } from './ask-tool-name.type';

/** A tool as the provider sends it to the model (provider-neutral; JSON Schema arguments). */
export interface AskToolDefinition {
  name: AskToolName;
  /** Ends with `ASK_UNTRUSTED_CONTENT_NOTE` for the library tools. */
  description: string;
  /** JSON Schema of the arguments, `additionalProperties: false`. */
  inputSchema: Record<string, unknown>;
}
