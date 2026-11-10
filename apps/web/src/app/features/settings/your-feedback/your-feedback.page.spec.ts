import { TestBed } from '@angular/core/testing';
import type { FeedbackMessage } from '@shelfmark/contracts';
import { axeViolations } from '../../../../testing/axe';
import { feedbackMessage } from '../../../../testing/feedback-message';
import { buttonWith, setupSettingsPage } from '../../../../testing/settings-page-testbed';
import { FEEDBACK_API } from '../../feedback/models/feedback-api.const';
import type { FeedbackApi } from '../../feedback/models/feedback-api.interface';
import YourFeedbackPage from './your-feedback.page';

async function setup(list: FeedbackApi['list'] = () => Promise.resolve([])) {
  const api = { list: vi.fn(list), send: vi.fn() } satisfies FeedbackApi;
  TestBed.configureTestingModule({ providers: [{ provide: FEEDBACK_API, useValue: api }] });
  const page = await setupSettingsPage(YourFeedbackPage, 'feedback');
  await page.harness.fixture.whenStable();
  return { ...page, api };
}

function text(root: HTMLElement): string {
  return root.textContent?.replace(/\s+/g, ' ') ?? '';
}

describe('YourFeedbackPage', () => {
  afterEach(() => {
    document.querySelectorAll('.cdk-overlay-container').forEach((element) => {
      element.replaceChildren();
    });
  });

  it('has the title, a Send feedback button and the empty state without messages', async () => {
    const { root } = await setup();

    expect(root.querySelector('h1')?.textContent).toContain('Your feedback');
    expect(text(root)).toContain('Ideas, problems and the answers we sent.');
    expect(buttonWith(root, 'Send feedback')).toBeDefined();
    expect(text(root)).toContain('No messages yet');
    expect(root.querySelector('ul')).toBeNull();
  });

  it('opens the send dialog from the button', async () => {
    const { root } = await setup();

    buttonWith(root, 'Send feedback')?.click();

    await vi.waitFor(() => {
      expect(document.querySelector('.cdk-dialog-container h2')?.textContent).toContain(
        'Send feedback',
      );
    });
  });

  it('lists kind, text, sent date, reply and status badge of each message', async () => {
    const messages: FeedbackMessage[] = [
      feedbackMessage({
        id: 'a',
        text: 'Preview does not load',
        kind: 'problem',
        status: 'in-progress',
        reply: 'Fixed in the next update, thanks!',
        createdAt: '2020-11-03T12:00:00.000Z',
      }),
      feedbackMessage({
        id: 'b',
        text: 'Dark theme should follow the system',
        status: 'done',
        createdAt: new Date().toISOString(),
      }),
      feedbackMessage({ id: 'c', text: 'Sync', status: 'not-planned' }),
    ];
    const { root } = await setup(() => Promise.resolve(messages));
    const items = Array.from(root.querySelectorAll('li'));

    expect(items).toHaveLength(3);
    const first = text(items[0] ?? root);
    expect(first).toContain('Problem');
    expect(first).toContain('Preview does not load');
    expect(first).toContain('Sent 3 Nov 2020');
    expect(first).toContain('Reply: Fixed in the next update, thanks!');
    expect(first).toContain('In progress');
    const second = text(items[1] ?? root);
    expect(second).toContain('Idea');
    expect(second).toContain('Sent today');
    expect(second).toContain('Done');
    expect(second).not.toContain('Reply:');
    expect(text(items[2] ?? root)).toContain('Not planned');
  });

  it('renders the text as text, never as markup', async () => {
    const { root } = await setup(() =>
      Promise.resolve([feedbackMessage({ text: '<img src=x onerror=alert(1)>' })]),
    );

    expect(root.querySelector('li img')).toBeNull();
    expect(text(root)).toContain('<img src=x onerror=alert(1)>');
  });

  it('shows an error with Try again that loads again', async () => {
    const list = vi
      .fn<FeedbackApi['list']>()
      .mockRejectedValueOnce(new Error('down'))
      .mockResolvedValueOnce([feedbackMessage({ text: 'Back again' })]);
    const { root, harness } = await setup(list);

    expect(root.querySelector('[role="alert"]')?.textContent).toContain(
      "Couldn't load your messages.",
    );
    buttonWith(root, 'Try again')?.click();
    await vi.waitFor(() => {
      expect(text(root)).toContain('Back again');
    });
    await harness.fixture.whenStable();
  });

  it('has no axe violations (empty and with messages)', async () => {
    const { root } = await setup(() =>
      Promise.resolve([feedbackMessage({ reply: 'Thanks', status: 'done' })]),
    );

    expect(await axeViolations(root)).toEqual([]);
  });
});
