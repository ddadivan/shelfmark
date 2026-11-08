import { parseDsn } from './parse-dsn';

describe('parseDsn', () => {
  it('parses a well-formed DSN', () => {
    expect(parseDsn('https://abc123@o42.ingest.de.sentry.io/4510')).toEqual({
      dsn: 'https://abc123@o42.ingest.de.sentry.io/4510',
      publicKey: 'abc123',
      host: 'o42.ingest.de.sentry.io',
      projectId: '4510',
    });
  });

  it.each([
    undefined,
    '',
    '   ',
    'not a url',
    'http://k@host/1',
    'https://host/1',
    'https://k:secret@host/1',
    'https://k@host/abc',
    'https://k@host/1?x=1',
    'https://k@host/1#frag',
  ])('rejects %j', (raw) => {
    expect(parseDsn(raw)).toBeUndefined();
  });
});
