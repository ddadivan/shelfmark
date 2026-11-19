import type { AskTool } from './ask-tool.interface';
import type { AskToolDefinition } from './ask-tool-definition.interface';

/** The tools a loop can call (`AskToolRegistry`; a fake in specs). */
export interface AskToolbox {
  /** The tool of a name the model called, `undefined` for any other name. */
  find(name: string, withEscalation: boolean): AskTool | undefined;
  /** The definitions in their fixed order, with or without `request_deeper_answer`. */
  definitions(withEscalation: boolean): AskToolDefinition[];
}
