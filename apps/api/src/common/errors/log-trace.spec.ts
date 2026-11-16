import { logTrace } from './log-trace';

describe('logTrace', () => {
  it('keeps the class name and the frames, drops the message', () => {
    class QueryFailed extends Error {}
    const trace = logTrace(new QueryFailed('url: https://example.test/a, title: "My note"'));
    expect(trace.startsWith('QueryFailed\n')).toBe(true);
    expect(trace).toContain('    at ');
    expect(trace).not.toContain('example.test');
    expect(trace).not.toContain('My note');
  });

  it('adds a Prisma error code, but no other code value', () => {
    class KnownRequestError extends Error {
      constructor(
        message: string,
        readonly code: string,
      ) {
        super(message);
      }
    }
    expect(logTrace(new KnownRequestError('Unique failed on url', 'P2002'))).toMatch(
      /^KnownRequestError P2002\n/,
    );
    expect(logTrace(new KnownRequestError('x', 'https://example.test'))).not.toContain(
      'example.test',
    );
  });

  it('does not print a value that is not an Error', () => {
    expect(logTrace('https://example.test/a')).toBe('non-Error exception');
  });
});
