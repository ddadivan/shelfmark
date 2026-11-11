import { PIN_LIMIT } from './pin-limit.const';

/** Error messages of the pins API. */
export const PIN_ERROR_MESSAGE = {
  NotFound: 'Item not found',
  LimitReached: `At most ${PIN_LIMIT.Max} items can be pinned`,
  OrderMismatch: 'The order must list every pinned item exactly once',
} as const;
