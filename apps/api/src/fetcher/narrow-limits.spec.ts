import { describe, expect, it } from 'vitest';
import type { FetchLimits } from './models/fetch-limits.interface';
import { narrowLimits } from './narrow-limits';

const BASE: FetchLimits = {
  maxRedirects: 5,
  connectTimeoutMs: 3_000,
  totalTimeoutMs: 8_000,
  maxBodyBytes: 2_000_000,
  maxUrlLength: 2_048,
};

describe('narrowLimits', () => {
  it('keeps the base without overrides', () => {
    expect(narrowLimits(BASE)).toEqual(BASE);
    expect(narrowLimits(BASE, {})).toEqual(BASE);
  });

  it('tightens a limit', () => {
    expect(narrowLimits(BASE, { totalTimeoutMs: 6_000, maxRedirects: 3 })).toEqual({
      ...BASE,
      totalTimeoutMs: 6_000,
      maxRedirects: 3,
    });
  });

  it('never loosens a limit', () => {
    expect(
      narrowLimits(BASE, { totalTimeoutMs: 60_000, maxBodyBytes: 1e9, maxRedirects: 50 }),
    ).toEqual(BASE);
  });

  it('ignores undefined values and does not change the base', () => {
    const copy = { ...BASE };
    expect(narrowLimits(BASE, { totalTimeoutMs: undefined })).toEqual(BASE);
    expect(BASE).toEqual(copy);
  });

  it('ignores overrides that are NaN, negative, zero or infinite', () => {
    expect(
      narrowLimits(BASE, {
        totalTimeoutMs: Number.NaN,
        maxRedirects: -1,
        maxBodyBytes: 0,
        connectTimeoutMs: Number.POSITIVE_INFINITY,
        maxUrlLength: Number.NEGATIVE_INFINITY,
      }),
    ).toEqual(BASE);
  });
});
