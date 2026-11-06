import type { KEYBOARD_KEY } from './keyboard-key.const';

export type KeyboardKey = (typeof KEYBOARD_KEY)[keyof typeof KEYBOARD_KEY];
