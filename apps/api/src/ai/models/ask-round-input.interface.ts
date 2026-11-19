import type { AskMessage } from './ask-message.type';
import type { AskModelProfile } from './ask-model-profile.interface';
import type { AskToolChoice } from './ask-tool-choice.type';
import type { AskToolDefinition } from './ask-tool-definition.interface';

/** One model call of the Ask loop (provider-neutral; ADR 0055 points 5 and 9). */
export interface AskRoundInput {
  profile: AskModelProfile;
  /** The fixed system prompt of the profile (cached with the tools). */
  system: string;
  /** The profile's tools in their fixed order (also sent with `tool_choice: none`). */
  tools: AskToolDefinition[];
  messages: AskMessage[];
  /** Index of the last history message (the follow-up cache breakpoint), `null` without history. */
  historyEnd: number | null;
  toolChoice: AskToolChoice;
  /** What is left of the request budget for this call. */
  timeoutMs: number;
}
