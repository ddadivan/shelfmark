import { Transform } from 'class-transformer';

/** Trims string values before validation, so a blank name fails `MinLength(1)`. */
export const TrimString = (): PropertyDecorator =>
  Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value));
