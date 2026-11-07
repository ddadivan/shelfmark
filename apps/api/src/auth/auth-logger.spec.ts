import { Logger } from '@nestjs/common';
import { logAuthMessage } from './auth-logger';

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
