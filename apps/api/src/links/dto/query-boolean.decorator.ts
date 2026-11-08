import { Transform } from 'class-transformer';

/** Query strings carry `true` / `false` as text; anything else is left for `@IsBoolean` to reject. */
export const QueryBoolean = (): PropertyDecorator =>
  Transform(({ value }: { value: unknown }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  });
