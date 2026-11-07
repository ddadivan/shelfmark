/** True when `error` carries the given Prisma error `code` (checked by shape, not by class). */
export function hasPrismaCode(error: unknown, code: string): boolean {
  return typeof error === 'object' && error !== null && Reflect.get(error, 'code') === code;
}
