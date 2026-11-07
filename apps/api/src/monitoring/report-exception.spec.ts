import { captureException, flush, isInitialized } from '@sentry/node';
import { FLUSH_TIMEOUT_MS } from './models/flush-timeout-ms.const';
import { reportException } from './report-exception';

vi.mock('@sentry/node', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@sentry/node')>()),
  isInitialized: vi.fn(),
  captureException: vi.fn(),
  flush: vi.fn(),
}));

describe('reportException', () => {
  beforeEach(() => {
    vi.mocked(flush).mockReset().mockResolvedValue(true);
    vi.mocked(captureException).mockReset();
  });

  it('is a no-op when the SDK is not started', async () => {
    vi.mocked(isInitialized).mockReturnValue(false);
    await reportException(new Error('x'), 'rid');
    expect(captureException).not.toHaveBeenCalled();
    expect(flush).not.toHaveBeenCalled();
  });

  it('captures the exception and waits (bounded) for delivery', async () => {
    vi.mocked(isInitialized).mockReturnValue(true);
    const failure = new Error('x');
    await reportException(failure, 'rid');
    expect(captureException).toHaveBeenCalledWith(failure);
    expect(flush).toHaveBeenCalledWith(FLUSH_TIMEOUT_MS);
  });

  it('never throws, even when the SDK does', async () => {
    vi.mocked(isInitialized).mockReturnValue(true);
    vi.mocked(flush).mockRejectedValue(new Error('network'));
    await expect(reportException(new Error('x'), 'rid')).resolves.toBeUndefined();
    vi.mocked(captureException).mockImplementation(() => {
      throw new Error('sdk');
    });
    await expect(reportException(new Error('x'), 'rid')).resolves.toBeUndefined();
  });
});
