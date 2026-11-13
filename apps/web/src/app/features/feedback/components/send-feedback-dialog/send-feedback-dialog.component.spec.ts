import { TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';
import { DIALOG_SIZE, DialogService } from '@shelfmark/ui';
import { feedbackMessage } from '../../../../../testing/feedback-message';
import { axeViolations } from '../../../../../testing/axe';
import { loadEnglish, provideTranslocoForTest } from '../../../../testing/transloco-testing';
import { FeedbackSendError } from '../../utils/feedback-send-error';
import { FEEDBACK_API } from '../../models/feedback-api.const';
import type { FeedbackApi } from '../../models/feedback-api.interface';
import { FEEDBACK_SEND_ERROR_REASON } from '../../models/feedback-send-error-reason.const';
import { SendFeedbackDialogComponent } from './send-feedback-dialog.component';

async function setup(
  send: FeedbackApi['send'] = () => Promise.resolve(feedbackMessage()),
  attachScreenshot: FeedbackApi['attachScreenshot'] = (id) =>
    Promise.resolve(feedbackMessage({ id })),
) {
  const api = {
    list: vi.fn(() => Promise.resolve([])),
    send: vi.fn(send),
    attachScreenshot: vi.fn(attachScreenshot),
  } satisfies FeedbackApi;
  TestBed.configureTestingModule({
    providers: [provideTranslocoForTest(), { provide: FEEDBACK_API, useValue: api }],
  });
  await loadEnglish();
  const ref = TestBed.inject(DialogService).open(SendFeedbackDialogComponent, {
    size: DIALOG_SIZE.Md,
    autoFocus: 'textarea',
  });
  const closed = vi.fn();
  void ref.result.then(closed);
  await vi.waitFor(() => {
    TestBed.tick();
    expect(container()).not.toBeNull();
  });
  return { api, closed, transloco: TestBed.inject(TranslocoService) };
}

function container(): HTMLElement | null {
  return document.querySelector<HTMLElement>('.cdk-dialog-container');
}

function textarea(): HTMLTextAreaElement {
  const field = container()?.querySelector('textarea');
  if (!field) {
    throw new Error('No textarea');
  }
  return field;
}

function buttonByText(text: string): HTMLButtonElement | undefined {
  return Array.from(container()?.querySelectorAll('button') ?? []).find((button) =>
    button.textContent?.trim().includes(text),
  );
}

async function flush(): Promise<void> {
  TestBed.tick();
  await Promise.resolve();
  await new Promise((resolve) => setTimeout(resolve));
  TestBed.tick();
}

async function type(text: string): Promise<void> {
  const field = textarea();
  field.value = text;
  field.dispatchEvent(new Event('input', { bubbles: true }));
  await flush();
}

async function click(button: HTMLButtonElement | undefined): Promise<void> {
  button?.click();
  await flush();
}

/** A `FileList` stand-in with `files`. */
function fileList(files: readonly File[]): Record<number, File> & { length: number } {
  return Object.assign({ length: files.length }, files);
}

/** Puts `files` into the hidden file input as the browser's file chooser would. */
async function chooseFile(...files: File[]): Promise<void> {
  const input = container()?.querySelector<HTMLInputElement>('input[type="file"]');
  if (!input) {
    throw new Error('No file input');
  }
  Object.defineProperty(input, 'files', { configurable: true, value: fileList(files) });
  input.dispatchEvent(new Event('change', { bubbles: true }));
  await vi.waitFor(async () => {
    await flush();
    expect(
      container()?.querySelector('[class*="feedback-dialog__file"], ui-notice'),
    ).not.toBeNull();
  });
}

const PNG = new File(['hello'], 'shot.png', { type: 'image/png' });
const png = (name: string): File => new File(['hello'], name, { type: 'image/png' });

function removeButtons(): HTMLButtonElement[] {
  return Array.from(
    container()?.querySelectorAll<HTMLButtonElement>('button[aria-label^="Remove image"]') ?? [],
  );
}

describe('SendFeedbackDialogComponent', () => {
  afterEach(() => {
    document.querySelectorAll('.cdk-overlay-container').forEach((element) => {
      element.replaceChildren();
    });
  });

  it('shows the kinds, the counter, the screenshot area and the version box (checked)', async () => {
    await setup();

    expect(container()?.querySelector('h2')?.textContent?.trim()).toBe('Send feedback');
    expect(
      Array.from(container()?.querySelectorAll('input[type="radio"]') ?? []).map((radio) =>
        radio.closest('label')?.textContent?.trim(),
      ),
    ).toEqual(['Idea', 'Problem', 'Other']);
    expect(container()?.textContent).toContain('What would make Shelfmark better?');
    expect(container()?.textContent).toContain('0 / 2000');
    expect(container()?.textContent).toContain('Screenshots (optional)');
    expect(buttonByText('choose files')).toBeDefined();
    expect(container()?.textContent).toContain('PNG, JPEG or WebP, up to 3 images, 2 MB each.');
    expect(container()?.querySelector<HTMLInputElement>('input[type="file"]')?.multiple).toBe(true);
    const attach = container()?.querySelector<HTMLInputElement>('input[type="checkbox"]');
    expect(attach?.checked).toBe(true);
    expect(container()?.textContent).toContain('Attach browser and app version');
  });

  it('changes the question and the placeholder with the kind', async () => {
    await setup();

    const problem = Array.from(
      container()?.querySelectorAll<HTMLInputElement>('input[type="radio"]') ?? [],
    )[1];
    problem?.click();
    await flush();

    expect(container()?.textContent).toContain('What went wrong?');
    expect(textarea().placeholder).toBe('What you did, and what happened instead');
  });

  it('counts the characters', async () => {
    await setup();

    await type('Hello');

    expect(container()?.textContent).toContain('5 / 2000');
  });

  it('does not send an empty or blank message and says why', async () => {
    const { api } = await setup();

    await click(buttonByText('Send'));
    expect(container()?.textContent).toContain('Write a message first.');

    await type('   ');
    await click(buttonByText('Send'));
    expect(api.send).not.toHaveBeenCalled();
  });

  it('sends the kind, the trimmed text and the client info, then thanks with Done', async () => {
    const { api, closed } = await setup();

    await type('  Sort by last opened  ');
    await click(buttonByText('Send'));

    expect(api.send).toHaveBeenCalledWith({
      kind: 'idea',
      text: 'Sort by last opened',
      client: { appVersion: '1.0', userAgent: navigator.userAgent.slice(0, 300) },
    });
    await vi.waitFor(() => {
      expect(container()?.textContent).toContain("We read every message. You'll see its status");
    });
    expect(buttonByText('Done')).toBeDefined();
    expect(container()?.querySelector('textarea')).toBeNull();

    await click(buttonByText('Done'));
    await vi.waitFor(() => {
      expect(closed).toHaveBeenCalled();
    });
  });

  it('leaves the client info out when the box is unchecked', async () => {
    const { api } = await setup();

    await type('Hello');
    container()?.querySelector<HTMLInputElement>('input[type="checkbox"]')?.click();
    await flush();
    await click(buttonByText('Send'));

    expect(api.send).toHaveBeenCalledWith({ kind: 'idea', text: 'Hello' });
  });

  it('explains what the version box sends: a focusable info button, the text as its description, a tap opens it (#350)', async () => {
    await setup();
    const text =
      'Helps us reproduce problems. Only the app version and your browser name and version are sent.';
    const info = container()?.querySelector<HTMLButtonElement>(
      'button[aria-label="What is sent?"]',
    );

    expect(info).toBeTruthy();
    expect(info?.tabIndex).toBe(0);
    expect(info?.getAttribute('aria-expanded')).toBe('false');
    expect(container()?.textContent).not.toContain(text);

    await click(info ?? undefined);

    expect(info?.getAttribute('aria-expanded')).toBe('true');
    const hint = container()?.querySelector('#feedback-attach-info');
    expect(hint?.textContent?.trim()).toBe(text);
    expect(info?.getAttribute('aria-controls')).toBe('feedback-attach-info');

    await click(info ?? undefined);
    expect(container()?.querySelector('#feedback-attach-info')).toBeNull();
  });

  it('shows Sending… on the button while the request runs', async () => {
    let resolve: () => void = () => undefined;
    await setup(() => new Promise((res) => (resolve = () => res(feedbackMessage()))));

    await type('Hello');
    await click(buttonByText('Send'));

    expect(buttonByText('Sending…')?.getAttribute('aria-busy')).toBe('true');
    resolve();
    await flush();
  });

  it('keeps the text and shows the notice when the send fails', async () => {
    await setup(() => Promise.reject(new FeedbackSendError(FEEDBACK_SEND_ERROR_REASON.Failed)));

    await type('Do not lose me');
    await click(buttonByText('Send'));

    expect(container()?.querySelector('[role="alert"]')?.textContent).toContain(
      "Couldn't send. Your text is kept — try again in a moment.",
    );
    expect(textarea().value).toBe('Do not lose me');
    expect(buttonByText('Send')).toBeDefined();
  });

  it('has its own message for a 429', async () => {
    await setup(() =>
      Promise.reject(new FeedbackSendError(FEEDBACK_SEND_ERROR_REASON.RateLimited)),
    );

    await type('Hello');
    await click(buttonByText('Send'));

    expect(container()?.querySelector('[role="alert"]')?.textContent).toContain(
      'You have sent a lot of messages in the last hour.',
    );
    expect(textarea().value).toBe('Hello');
  });

  it('takes a PNG: shows its name, size and a thumbnail, and attaches it as base64 after the message', async () => {
    const { api } = await setup(() => Promise.resolve(feedbackMessage({ id: 'sent' })));

    await chooseFile(PNG);

    expect(container()?.textContent).toContain('shot.png');
    expect(container()?.textContent).toContain('1 KB');
    expect(container()?.querySelector('img')?.getAttribute('src')).toBe(
      `data:image/png;base64,${btoa('hello')}`,
    );
    await type('With picture');
    await click(buttonByText('Send'));

    expect(api.send).toHaveBeenCalledWith(
      expect.not.objectContaining({ screenshot: expect.anything() }),
    );
    await vi.waitFor(() => {
      expect(api.attachScreenshot).toHaveBeenCalledWith('sent', {
        type: 'image/png',
        data: btoa('hello'),
      });
    });
  });

  it('takes up to three images from one pick, in order, then hides the drop area', async () => {
    const { api } = await setup(() => Promise.resolve(feedbackMessage({ id: 'sent' })));

    await chooseFile(png('a.png'), png('b.png'));
    await chooseFile(png('c.png'));

    expect(
      Array.from(container()?.querySelectorAll('.feedback-dialog__file-name') ?? []).map(
        (n) => n.textContent,
      ),
    ).toEqual(['a.png', 'b.png', 'c.png']);
    expect(removeButtons().map((button) => button.getAttribute('aria-label'))).toEqual([
      'Remove image 1 of 3: a.png',
      'Remove image 2 of 3: b.png',
      'Remove image 3 of 3: c.png',
    ]);
    expect(container()?.querySelector('.feedback-dialog__drop')).toBeNull();
    expect(container()?.textContent).toContain('3 images added, the most one message can have.');

    await type('Three pictures');
    await click(buttonByText('Send'));
    await vi.waitFor(() => {
      expect(api.attachScreenshot).toHaveBeenCalledTimes(3);
    });
  });

  it('says so when a pick has more files than places left, and keeps the first ones', async () => {
    await setup();

    await chooseFile(png('a.png'), png('b.png'), png('c.png'), png('d.png'));

    expect(removeButtons()).toHaveLength(3);
    expect(container()?.querySelector('[role="alert"]')?.textContent).toContain(
      'You can add up to 3 images.',
    );
  });

  it('removes one image, moves focus to the next remove button, and shows the drop area again', async () => {
    await setup();
    await chooseFile(png('a.png'), png('b.png'), png('c.png'));

    removeButtons()[0]?.click();
    await flush();

    expect(removeButtons().map((button) => button.getAttribute('aria-label'))).toEqual([
      'Remove image 1 of 2: b.png',
      'Remove image 2 of 2: c.png',
    ]);
    expect(document.activeElement).toBe(removeButtons()[0]);
    expect(buttonByText('choose files')).toBeDefined();

    removeButtons()[1]?.click();
    await flush();
    removeButtons()[0]?.click();
    await flush();
    expect(container()?.querySelector('img')).toBeNull();
    expect(document.activeElement).toBe(buttonByText('choose files'));
  });

  it('thanks with a warning when an image could not be attached', async () => {
    await setup(undefined, () => Promise.reject(new Error('400')));
    await chooseFile(PNG);
    await type('With picture');
    await click(buttonByText('Send'));

    await vi.waitFor(() => {
      expect(buttonByText('Done')).toBeDefined();
    });
    expect(container()?.textContent).toContain(
      "Some images couldn't be attached. Your message was sent without them.",
    );
  });

  it('rejects a wrong type in the browser with clear copy and keeps no screenshot', async () => {
    await setup();

    await chooseFile(new File(['x'], 'notes.pdf', { type: 'application/pdf' }));

    expect(container()?.querySelector('[role="alert"]')?.textContent).toContain(
      'That file is not a PNG, JPEG or WebP image.',
    );
    expect(container()?.querySelector('img')).toBeNull();
  });

  it('rejects an image over 2 MB', async () => {
    await setup();

    await chooseFile(
      new File([new Uint8Array(2 * 1024 * 1024 + 1)], 'big.png', { type: 'image/png' }),
    );

    expect(container()?.querySelector('[role="alert"]')?.textContent).toContain(
      'That image is larger than 2 MB. Choose a smaller one.',
    );
  });

  it('accepts dropped images (the drop is a shortcut for "choose files")', async () => {
    await setup();
    const area = container()?.querySelector('.feedback-dialog__drop');
    const event = new Event('drop', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'dataTransfer', {
      value: { files: fileList([PNG, png('two.png')]) },
    });

    area?.dispatchEvent(event);
    await vi.waitFor(async () => {
      await flush();
      expect(container()?.textContent).toContain('shot.png');
      expect(container()?.textContent).toContain('two.png');
    });
  });

  it('Cancel closes without sending', async () => {
    const { api, closed } = await setup();

    await click(buttonByText('Cancel'));

    await vi.waitFor(() => {
      expect(closed).toHaveBeenCalled();
    });
    expect(api.send).not.toHaveBeenCalled();
  });

  it('has no axe violations in the form and in the thank-you state', async () => {
    await setup();
    expect(await axeViolations(container() ?? document.body)).toEqual([]);

    await chooseFile(png('a.png'), png('b.png'), png('c.png'));
    expect(await axeViolations(container() ?? document.body)).toEqual([]);

    await type('Hello');
    await click(buttonByText('Send'));
    await vi.waitFor(() => {
      expect(buttonByText('Done')).toBeDefined();
    });
    expect(await axeViolations(container() ?? document.body)).toEqual([]);
  });
});
