import { normalizeTagName } from '@shelfmark/contracts';
import { Transform } from 'class-transformer';

/** Applies the shared tag name rule before validation; non-strings pass through to `@IsString`. */
export const NormalizeTagName = (): PropertyDecorator =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? normalizeTagName(value) : value,
  );
