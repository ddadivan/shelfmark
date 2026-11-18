/**
 * Why an Ask stream ended with an `error` event (ADR 0052): AI or the Ask switch is `off`, the
 * day or month `quota` is used, another question of the user is still running (`busy`), the
 * provider failed or was too slow before any text (`unavailable`), or the model refused (`rejected`).
 */
export const ASK_ERROR_REASON = {
  Off: 'off',
  Quota: 'quota',
  Busy: 'busy',
  Unavailable: 'unavailable',
  Rejected: 'rejected',
} as const;
