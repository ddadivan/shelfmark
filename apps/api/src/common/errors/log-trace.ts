const FRAME = /^\s+at /;

/**
 * What the log gets for an unexpected error: the class name and the stack frames, never the
 * message. A Prisma error message quotes the query arguments (a link address, title or note), so
 * the message would put user content into the logs.
 */
export function logTrace(exception: unknown): string {
  if (!(exception instanceof Error)) return 'non-Error exception';
  const frames = (exception.stack ?? '').split('\n').filter((line) => FRAME.test(line));
  return [exception.constructor.name, ...frames].join('\n');
}
