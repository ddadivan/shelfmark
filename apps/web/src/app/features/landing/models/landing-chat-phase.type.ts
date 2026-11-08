import type { LANDING_CHAT_PHASE } from './landing-chat-phase.const';

export type LandingChatPhase = (typeof LANDING_CHAT_PHASE)[keyof typeof LANDING_CHAT_PHASE];
