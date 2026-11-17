const FRAME = /^\s+at /;
const PRISMA_CODE = /^P\d{4}$/;

/**
 * What the log gets for an unexpected error: the class name (with a Prisma error code such as
 * P2002, which holds no user data) and the stack frames, never the message. A Prisma error message
 * quotes the query arguments (a link address, title or note), so the message would put user
 * content into the logs.
 */
export function logTrace(exception: unknown): string {
  if (!(exception instanceof Error)) return 'non-Error exception';
  const frames = (exception.stack ?? '').split('\n').filter((line) => FRAME.test(line));
  const code: unknown = (exception as { code?: unknown }).code;
  const name =
    typeof code === 'string' && PRISMA_CODE.test(code)
      ? `${exception.constructor.name} ${code}`
      : exception.constructor.name;
  return [name, ...frames].join('\n');
}
