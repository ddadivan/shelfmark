import { ForbiddenException, UnsupportedMediaTypeException } from '@nestjs/common';
import type { ExtensionConfig } from '../../config/models/extension-config.interface';
import { CsrfGuard } from './csrf.guard';

const TRUSTED = 'https://app.example.test';

function run(method: string, headers: Record<string, string>, path = '/api/links'): boolean {
  const context = {
    switchToHttp: () => ({ getRequest: () => ({ method, headers, path }) }),
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

  describe('the Sentry tunnel exemption', () => {
    const TUNNEL = '/api/monitoring/tunnel';
    const text = { 'content-length': '5', 'content-type': 'text/plain;charset=UTF-8' };

    it('lets text/plain through with the trusted Origin', () => {
      expect(run('POST', { ...text, origin: TRUSTED }, TUNNEL)).toBe(true);
    });

    it('still rejects a foreign Origin and cross-site fetches', () => {
      expect(() => run('POST', { ...text, origin: 'https://evil.test' }, TUNNEL)).toThrow(
        ForbiddenException,
      );
      expect(() => run('POST', { ...text, 'sec-fetch-site': 'cross-site' }, TUNNEL)).toThrow(
        ForbiddenException,
      );
    });

    it('still rejects text/plain on any other route', () => {
      expect(() => run('POST', { ...text, origin: TRUSTED }, '/api/links')).toThrow(
        UnsupportedMediaTypeException,
      );
      expect(() => run('POST', text, `${TUNNEL}/x`)).toThrow(UnsupportedMediaTypeException);
      expect(() => run('POST', text, `${TUNNEL}/`)).toThrow(UnsupportedMediaTypeException);
    });

    it('does not exempt another method on the tunnel path', () => {
      expect(() => run('PUT', text, TUNNEL)).toThrow(UnsupportedMediaTypeException);
      expect(() => run('DELETE', text, TUNNEL)).toThrow(UnsupportedMediaTypeException);
      expect(() => run('PUT', { ...text, origin: 'https://evil.test' }, TUNNEL)).toThrow(
        ForbiddenException,
      );
    });
  });

  describe('browser extension origins', () => {
    const ID = 'abcdefghijklmnopabcdefghijklmnop';
    const OTHER = 'ponmlkjihgfedcbaponmlkjihgfedcba';
    const EXT = `chrome-extension://${ID}`;
    const JSON_BODY = { 'content-length': '5', 'content-type': 'application/json' };

    function runExt(
      extension: ExtensionConfig,
      headers: Record<string, string>,
      method = 'POST',
    ): boolean {
      const context = {
        switchToHttp: () => ({ getRequest: () => ({ method, headers, path: '/api/links' }) }),
      } as never;
      return new CsrfGuard([TRUSTED], extension).canActivate(context);
    }

    const production: ExtensionConfig = { origins: [EXT], allowAny: false };
    const development: ExtensionConfig = { origins: [], allowAny: true };

    it('passes a configured origin whatever Sec-Fetch-Site says', () => {
      for (const site of [undefined, 'same-site', 'same-origin', 'cross-site', 'none']) {
        const headers = { origin: EXT, ...JSON_BODY, ...(site ? { 'sec-fetch-site': site } : {}) };
        expect(runExt(production, headers)).toBe(true);
      }
    });

    it('rejects another extension id and a malformed one in production', () => {
      for (const origin of [`chrome-extension://${OTHER}`, 'chrome-extension://short', 'null']) {
        expect(() => runExt(production, { origin, ...JSON_BODY })).toThrow(ForbiddenException);
      }
    });

    it('trusts no extension without configuration', () => {
      expect(() => runExt({ origins: [], allowAny: false }, { origin: EXT })).toThrow(
        ForbiddenException,
      );
      expect(() => run('POST', { origin: EXT })).toThrow(ForbiddenException);
    });

    it('still requires JSON for a body', () => {
      expect(() =>
        runExt(production, { origin: EXT, 'content-length': '5', 'content-type': 'text/plain' }),
      ).toThrow(UnsupportedMediaTypeException);
    });

    it('accepts any well-formed extension origin in development, rejects malformed ones', () => {
      expect(runExt(development, { origin: `chrome-extension://${OTHER}`, ...JSON_BODY })).toBe(
        true,
      );
      expect(() => runExt(development, { origin: 'chrome-extension://nope' })).toThrow(
        ForbiddenException,
      );
      expect(() => runExt(development, { origin: `chrome-extension://${ID}/x` })).toThrow(
        ForbiddenException,
      );
    });

    it('keeps the web origin working', () => {
      expect(runExt(production, { origin: TRUSTED, ...JSON_BODY })).toBe(true);
    });
  });
});

describe('CsrfGuard on the MCP server (ADR 0054: no exemption)', () => {
  const MCP = '/api/mcp';
  const json = { 'content-length': '40', 'content-type': 'application/json' };

  it('lets header-less desktop and CLI clients through', () => {
    expect(run('POST', json, MCP)).toBe(true);
  });

  it('refuses a foreign browser Origin and a cross-site fetch', () => {
    expect(() => run('POST', { ...json, origin: 'https://evil.test' }, MCP)).toThrow(
      ForbiddenException,
    );
    expect(() => run('POST', { ...json, 'sec-fetch-site': 'cross-site' }, MCP)).toThrow(
      ForbiddenException,
    );
    expect(() => run('DELETE', { origin: 'https://evil.test' }, MCP)).toThrow(ForbiddenException);
  });

  it('requires a JSON body', () => {
    expect(() =>
      run('POST', { 'content-length': '40', 'content-type': 'text/plain' }, MCP),
    ).toThrow(UnsupportedMediaTypeException);
  });
});
