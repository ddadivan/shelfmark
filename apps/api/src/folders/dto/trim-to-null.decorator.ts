import { Transform } from 'class-transformer';

/** Trims string values and turns a blank one into `null` (an optional text that can be removed). */
export const TrimToNull = (): PropertyDecorator =>
  Transform(({ value }: { value: unknown }) => {
    if (typeof value !== 'string') return value;
    const text = value.trim();
    return text === '' ? null : text;
  });
