import type { PHONE_TAB } from './phone-tab.const';

export type PhoneTab = (typeof PHONE_TAB)[keyof typeof PHONE_TAB];
