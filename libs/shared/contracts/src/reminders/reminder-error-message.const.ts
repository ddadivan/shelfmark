/** Error messages of the reminders API, one place so the service, the mock and the tests agree. */
export const REMINDER_ERROR_MESSAGE = {
  NotInFuture: 'The reminder time must be in the future',
  TooFarAhead: 'The reminder time is too far ahead',
} as const;
