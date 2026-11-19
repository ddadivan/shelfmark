/**
 * How a phrase request ended (#535): `done` with a draft; `quota` when the Ask allowance is used
 * up; `unavailable` when the model failed, refused or answered nothing usable (not counted).
 */
export const VIEW_DRAFT_OUTCOME = {
  Done: 'done',
  Quota: 'quota',
  Unavailable: 'unavailable',
} as const;
