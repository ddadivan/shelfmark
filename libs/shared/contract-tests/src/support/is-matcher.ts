import type { Matcher } from '../models/matcher.interface';

export function isMatcher(value: unknown): value is Matcher {
  return (
    typeof value === 'object' &&
    value !== null &&
    Reflect.get(value, 'matcher') === true &&
    typeof Reflect.get(value, 'test') === 'function'
  );
}
