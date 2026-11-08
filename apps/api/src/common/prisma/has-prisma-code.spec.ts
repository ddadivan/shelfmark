import { describe, expect, it } from 'vitest';
import { hasPrismaCode } from './has-prisma-code';
import { PRISMA_ERROR_CODE } from './prisma-error-code.const';

describe('hasPrismaCode', () => {
  it('matches the code of an error-like object', () => {
    expect(hasPrismaCode({ code: 'P2002' }, PRISMA_ERROR_CODE.UniqueViolation)).toBe(true);
    expect(hasPrismaCode(Object.assign(new Error('x'), { code: 'P2025' }), 'P2025')).toBe(true);
  });

  it('rejects other codes and non-objects', () => {
    expect(hasPrismaCode({ code: 'P2003' }, PRISMA_ERROR_CODE.UniqueViolation)).toBe(false);
    expect(hasPrismaCode(null, 'P2002')).toBe(false);
    expect(hasPrismaCode('P2002', 'P2002')).toBe(false);
    expect(hasPrismaCode({}, 'P2002')).toBe(false);
  });
});
