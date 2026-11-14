import { applyDecorators } from '@nestjs/common';
import { IsISO8601, IsString, Matches, MaxLength } from 'class-validator';

/** Longest ISO 8601 time accepted (`2026-11-16T09:00:00.000+05:30` is 29 characters). */
const REMIND_AT_MAX_LENGTH = 40;

/**
 * An ISO 8601 date and time with an explicit offset (`Z` or `±hh:mm`): a time without one would be
 * read in the server's time zone. Whether it lies in the future is the service's check
 * (`remindAtProblem`), so its message is one contract string.
 */
export function IsRemindAt(): PropertyDecorator {
  return applyDecorators(
    IsString(),
    MaxLength(REMIND_AT_MAX_LENGTH),
    IsISO8601({ strict: true, strictSeparator: true }),
    Matches(/T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/, {
      message: 'remindAt must be a date and time with an offset',
    }),
  );
}
