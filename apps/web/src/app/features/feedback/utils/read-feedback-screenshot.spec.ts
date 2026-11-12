import { FEEDBACK_SCREENSHOT_ERROR } from '../models/feedback-screenshot-error.const';
import { readFeedbackScreenshot } from './read-feedback-screenshot';

describe('readFeedbackScreenshot', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reads an image as the contract upload (base64) and a data URL preview', async () => {
    const file = new File(['hello'], 'shot.png', { type: 'image/png' });

    const result = await readFeedbackScreenshot(file);

    expect(result).toEqual({
      upload: { type: 'image/png', data: btoa('hello') },
      name: 'shot.png',
      size: 5,
      previewUrl: `data:image/png;base64,${btoa('hello')}`,
    });
  });

  it('answers the reason for a wrong type without reading the file', async () => {
    const file = new File(['x'], 'doc.pdf', { type: 'application/pdf' });

    expect(await readFeedbackScreenshot(file)).toBe(FEEDBACK_SCREENSHOT_ERROR.Type);
  });

  it('answers the reason for a file over 2 MB', async () => {
    const file = new File([new Uint8Array(2 * 1024 * 1024 + 1)], 'big.jpg', {
      type: 'image/jpeg',
    });

    expect(await readFeedbackScreenshot(file)).toBe(FEEDBACK_SCREENSHOT_ERROR.Size);
  });

  it('answers Read when the browser cannot read the file', async () => {
    const file = new File(['x'], 'a.png', { type: 'image/png' });
    vi.spyOn(FileReader.prototype, 'readAsDataURL').mockImplementation(function (this: FileReader) {
      queueMicrotask(() => {
        this.onerror?.(new ProgressEvent('error') as ProgressEvent<FileReader>);
      });
    });

    expect(await readFeedbackScreenshot(file)).toBe(FEEDBACK_SCREENSHOT_ERROR.Read);
  });
});
