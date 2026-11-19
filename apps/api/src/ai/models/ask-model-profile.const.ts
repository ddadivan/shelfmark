import { ASK_DEPTH } from '@shelfmark/contracts';
import { AI_EFFORT, AI_MODEL } from './ai-model.const';
import { ASK_THINKING } from './ask-thinking.const';
import type { AskModelProfile } from './ask-model-profile.interface';

/**
 * The Ask profiles (ADR 0055 point 1): Quick (Haiku 5.5) answers first and may escalate once; Deep
 * (Sonnet 5.5) never gets the control tool. Flipping the default to Sonnet is a change of `Quick`.
 */
export const ASK_MODEL_PROFILE = {
  Quick: {
    depth: ASK_DEPTH.Quick,
    model: AI_MODEL.AskQuick,
    effort: AI_EFFORT.AskQuick,
    thinking: ASK_THINKING.Disabled,
    roundMaxTokens: 1024,
    finalMaxTokens: 1500,
    escalation: true,
  },
  Deep: {
    depth: ASK_DEPTH.Deep,
    model: AI_MODEL.AskDeep,
    effort: AI_EFFORT.AskDeep,
    thinking: ASK_THINKING.BetweenTools,
    roundMaxTokens: 2048,
    finalMaxTokens: 2500,
    escalation: false,
  },
} as const satisfies Record<string, AskModelProfile>;
