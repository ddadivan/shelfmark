/**
 * How AI helps with the folder and with tags (Settings › AI, #390): `suggest` shows chips the user
 * taps (default), `auto` applies the top suggestion only to what the user left empty (Unsorted, no
 * tags), always with Undo, `off` asks nothing for that part.
 */
export const AI_FEATURE_MODE = {
  Suggest: 'suggest',
  Auto: 'auto',
  Off: 'off',
} as const;
