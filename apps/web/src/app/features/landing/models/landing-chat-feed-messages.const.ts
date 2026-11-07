import { LANDING_CHAT_MESSAGES } from './landing-chat-messages.const';
import type { LandingChatMessage } from './landing-chat-message.interface';

/**
 * The messages of the endless feed: the five links of the static frame plus three that only
 * scroll past, so a tall chat never shows the same message twice at once.
 */
export const LANDING_CHAT_FEED_MESSAGES: readonly LandingChatMessage[] = [
  ...LANDING_CHAT_MESSAGES,
  {
    id: 'lisbon',
    textKey: 'landing.chat.messages.lisbon.text',
    timeKey: 'landing.chat.messages.lisbon.time',
    letter: 'L',
    url: 'cntraveler.com/lisbon-in-three-days',
  },
  {
    id: 'icons',
    textKey: 'landing.chat.messages.icons.text',
    timeKey: 'landing.chat.messages.icons.time',
    letter: 'T',
    url: 'tabler.io/icons',
  },
  {
    id: 'react',
    textKey: 'landing.chat.messages.react.text',
    timeKey: 'landing.chat.messages.react.time',
    letter: 'O',
    url: 'overreacted.io/the-two-reacts',
  },
];
