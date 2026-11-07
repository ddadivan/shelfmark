import { Logger } from '@nestjs/common';
import { logAuthError, logAuthMessage } from './auth-logger';

describe('logAuthMessage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each([
    ['debug', 'debug'],
    ['info', 'log'],
    ['warn', 'warn'],
    ['error', 'error'],
  ] as const)('maps %s to Logger.%s with the message only', (level, method) => {
    const spy = vi.spyOn(Logger.prototype, method).mockImplementation(() => undefined);
    logAuthMessage(level, 'something happened');
    expect(spy).toHaveBeenCalledExactlyOnceWith('something happened');
  });
});

describe('logAuthMessage sanitising', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('removes line breaks and control characters and bounds the length', () => {
    const spy = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    logAuthMessage('warn', `Invalid callbackURL: a\r\nFAKE LINE\u0000${'x'.repeat(1000)}`);
    const logged = String(spy.mock.calls[0][0]);
    for (const control of [13, 10, 0].map((code) => String.fromCharCode(code))) {
      expect(logged).not.toContain(control);
    }
    expect(logged.length).toBeLessThanOrEqual(300);
    expect(logged).toContain('FAKE LINE');
  });
});

describe('logAuthError', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('logs client errors as warnings with status and message only', () => {
    const warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    logAuthError({
      status: 'FORBIDDEN',
      statusCode: 403,
      message: 'Invalid callbackURL',
      body: { secret: 'x' },
    });
    expect(warn).toHaveBeenCalledExactlyOnceWith('FORBIDDEN: Invalid callbackURL');
  });

  it('logs server errors as errors', () => {
    const error = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    logAuthError({ status: 'INTERNAL_SERVER_ERROR', statusCode: 500, message: 'boom' });
    expect(error).toHaveBeenCalledExactlyOnceWith('INTERNAL_SERVER_ERROR: boom');
  });

  it('logs only the class name of unexpected errors, never the message', () => {
    const error = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    logAuthError(new TypeError('password=hunter2 near column "x"'));
    logAuthError('a string with a secret');
    expect(error.mock.calls).toEqual([['Unexpected TypeError'], ['Unexpected error']]);
  });
});

describe('log redaction', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('redacts URLs in messages and logs the error code', () => {
    const warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    logAuthError({
      status: 'FORBIDDEN',
      statusCode: 403,
      message: 'Invalid callbackURL: https://evil.example/path?token=abc and more',
      body: { code: 'INVALID_CALLBACK_URL' },
    });
    expect(warn).toHaveBeenCalledExactlyOnceWith(
      'FORBIDDEN INVALID_CALLBACK_URL: Invalid callbackURL: <redacted> and more',
    );
  });

  it('ignores a malformed code', () => {
    const warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    logAuthError({ status: 'BAD_REQUEST', statusCode: 400, message: 'x', body: { code: 'a b\n' } });
    expect(warn).toHaveBeenCalledExactlyOnceWith('BAD_REQUEST: x');
  });
});
