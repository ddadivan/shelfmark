import { toVectorLiteral } from './embedding-sql';

describe('toVectorLiteral', () => {
  it('writes 1,024 finite numbers as a pgvector literal', () => {
    const vector = Array.from({ length: 1024 }, (_, i) => (i === 0 ? 0.5 : i === 1 ? -1 : 0));
    const literal = toVectorLiteral(vector);
    expect(literal.startsWith('[0.5,-1,0,')).toBe(true);
    expect(literal.endsWith(',0]')).toBe(true);
  });

  it('refuses the wrong length and non-finite values', () => {
    expect(() => toVectorLiteral([1, 2, 3])).toThrow(/dimensions/);
    const bad = new Array<number>(1024).fill(0);
    bad[5] = Number.NaN;
    expect(() => toVectorLiteral(bad)).toThrow(/non-finite/);
    bad[5] = Number.POSITIVE_INFINITY;
    expect(() => toVectorLiteral(bad)).toThrow(/non-finite/);
  });
});
