import type { AskAssistantBlock } from './ask-assistant-block.type';
import type { AskUserBlock } from './ask-user-block.type';

/** One message of the provider-neutral Ask transcript (server-only, never stored or logged). */
export type AskMessage =
  { role: 'user'; content: AskUserBlock[] } | { role: 'assistant'; content: AskAssistantBlock[] };
