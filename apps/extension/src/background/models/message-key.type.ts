import type { MESSAGE_KEY } from './message-key.const';

export type MessageKey = (typeof MESSAGE_KEY)[keyof typeof MESSAGE_KEY];
