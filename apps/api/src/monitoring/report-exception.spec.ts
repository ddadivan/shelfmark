import { captureException, isInitialized } from '@sentry/node';
import { reportException } from './report-exception';

vi.mock('@sentry/node', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@sentry/node')>()),
  isInitialized: vi.fn(),
  captureException: vi.fn(),
}));

describe('reportException', () => {
  it('is a no-op when the SDK is not started', () => {
    vi.mocked(isInitialized).mockReturnValue(false);
    reportException(new Error('x'), 'rid');
    expect(captureException).not.toHaveBeenCalled();
  });

  it('captures the exception when the SDK is started', () => {
    vi.mocked(isInitialized).mockReturnValue(true);
    const failure = new Error('x');
    reportException(failure, 'rid');
    expect(captureException).toHaveBeenCalledWith(failure);
  });
});
