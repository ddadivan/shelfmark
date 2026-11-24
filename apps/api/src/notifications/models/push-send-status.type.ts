import type { PUSH_SEND_STATUS } from './push-send-status.const';

export type PushSendStatus = (typeof PUSH_SEND_STATUS)[keyof typeof PUSH_SEND_STATUS];
