import { ForbiddenException, UnsupportedMediaTypeException } from '@nestjs/common';
import { CsrfGuard } from './csrf.guard';

const TRUSTED = 'https://app.example.test';

function run(method: string, headers: Record<string, string>): boolean {
  const context = {
    switchToHttp: () => ({ getRequest: () => ({ method, headers }) }),
  } as never;
  return new CsrfGuard([TRUSTED]).canActivate(context);
}

describe('CsrfGuard', () => {
  it.each(['GET', 'HEAD', 'OPTIONS'])('does not check %s', (method) => {
    expect(run(method, { origin: 'https://evil.test', 'content-type': 'text/plain' })).toBe(true);
  });

  it.each(['POST', 'PUT', 'PATCH', 'DELETE'])(
    'rejects a foreign Origin on %s with 403',
    (method) => {
      expect(() => run(method, { origin: 'https://evil.test' })).toThrow(ForbiddenException);
    },
  );

  it('rejects the opaque "null" Origin', () => {
    expect(() => run('POST', { origin: 'null' })).toThrow(ForbiddenException);
  });

  it('allows a trusted Origin and a missing Origin on a bodyless request', () => {
    expect(run('DELETE', { origin: TRUSTED })).toBe(true);
    expect(run('POST', {})).toBe(true);
  });

  it('rejects a non-JSON body with 415', () => {
    expect(() => run('POST', { 'content-length': '5', 'content-type': 'text/plain' })).toThrow(
      UnsupportedMediaTypeException,
    );
    expect(() => run('POST', { 'content-length': '5' })).toThrow(UnsupportedMediaTypeException);
    expect(() => run('POST', { 'transfer-encoding': 'chunked' })).toThrow(
      UnsupportedMediaTypeException,
    );
  });

  it('accepts a JSON body, with a charset and any case', () => {
    expect(run('POST', { 'content-length': '5', 'content-type': 'application/json' })).toBe(true);
    expect(
      run('PATCH', { 'content-length': '5', 'content-type': 'Application/JSON; charset=utf-8' }),
    ).toBe(true);
  });

  it('rejects Sec-Fetch-Site cross-site, even with a trusted Origin', () => {
    expect(() => run('POST', { 'sec-fetch-site': 'cross-site' })).toThrow(ForbiddenException);
    expect(() => run('DELETE', { origin: TRUSTED, 'sec-fetch-site': 'cross-site' })).toThrow(
      ForbiddenException,
    );
  });

  it.each(['same-origin', 'none'])('accepts Sec-Fetch-Site %s without an Origin', (site) => {
    expect(run('POST', { 'sec-fetch-site': site })).toBe(true);
  });

  it('rejects same-site (or an unknown value) without an Origin, accepts it with a trusted one', () => {
    expect(() => run('POST', { 'sec-fetch-site': 'same-site' })).toThrow(ForbiddenException);
    expect(() => run('POST', { 'sec-fetch-site': 'weird' })).toThrow(ForbiddenException);
    expect(run('POST', { origin: TRUSTED, 'sec-fetch-site': 'same-site' })).toBe(true);
  });

  it('does not check Sec-Fetch-Site on safe methods', () => {
    expect(run('GET', { 'sec-fetch-site': 'cross-site' })).toBe(true);
  });

  it('ignores an explicit zero-length body', () => {
    expect(run('POST', { 'content-length': '0', 'content-type': 'text/plain' })).toBe(true);
  });
});
