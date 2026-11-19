import type { AskActivity } from '@shelfmark/contracts';
import type { AskToolContext } from './ask-tool-context.interface';
import type { AskToolDefinition } from './ask-tool-definition.interface';
import type { AskToolOutcome } from './ask-tool-outcome.interface';

/**
 * One Ask tool (ADR 0055 point 2): it parses the model's arguments itself (unknown keys, wrong types
 * and out-of-range values are an `is_error` outcome) and runs on the session user only. Never throws
 * for bad arguments.
 */
export interface AskTool {
  readonly definition: AskToolDefinition;
  /** The status shown while it runs, `null` for tools that show nothing. */
  readonly activity: AskActivity | null;
  call(context: AskToolContext, input: unknown): Promise<AskToolOutcome>;
}
