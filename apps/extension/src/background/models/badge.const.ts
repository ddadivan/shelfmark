/**
 * The toolbar badge after a right-click save: a short mark on the colour of its meaning (the
 * `success` / `danger` tokens, light values, where white text keeps 4.5:1); the words are in the
 * button's tooltip. Cleared after `ClearMs`.
 */
export const BADGE = {
  SuccessText: '✓',
  ErrorText: '!',
  SuccessColor: '#2E7A3A',
  ErrorColor: '#C0352B',
  TextColor: '#FFFFFF',
  ClearMs: 6000,
} as const;
