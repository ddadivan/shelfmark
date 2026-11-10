import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideTransloco, TranslocoService } from '@jsverse/transloco';
import type { FeedbackMilestone } from '@shelfmark/contracts';
import { DIALOG_SIZE, DialogService } from '@shelfmark/ui';
import axe from 'axe-core';
import { firstValueFrom } from 'rxjs';
import { AppTranslocoLoader } from '../../core/i18n/app-transloco.loader';
import { APP_LANG } from '../../core/i18n/models/app-lang.const';
import { translocoConfig } from '../../core/i18n/transloco.config';
import { RATING_API } from './models/rating-api.const';
import type { RatingApi } from './models/rating-api.interface';
import { RATING_DELAY } from './models/rating-delay.const';
import type { RatingDialogData } from './models/rating-dialog-data.interface';
import { RatingDialogComponent } from './rating-dialog.component';

async function setup(record: RatingApi['record'] = () => Promise.resolve()) {
  const api = {
    prompt: vi.fn(() => Promise.resolve<FeedbackMilestone | null>(null)),
    record: vi.fn(record),
  } satisfies RatingApi;
  TestBed.configureTestingModule({
    providers: [
      provideTransloco({ config: translocoConfig, loader: AppTranslocoLoader }),
      { provide: RATING_API, useValue: api },
    ],
  });
  await firstValueFrom(TestBed.inject(TranslocoService).load(APP_LANG.En));
  const scored = signal(false);
  const data: RatingDialogData = { milestone: 'week1', scored };
  const ref = TestBed.inject(DialogService).open<
    RatingDialogComponent,
    undefined,
    RatingDialogData
  >(RatingDialogComponent, { size: DIALOG_SIZE.Md, data, autoFocus: 'dialog' });
  const closed = vi.fn();
  void ref.result.then(closed);
  await vi.waitFor(() => {
    TestBed.tick();
    expect(container()).not.toBeNull();
  });
  return { api, scored, closed };
}

function container(): HTMLElement | null {
  return document.querySelector<HTMLElement>('.cdk-dialog-container');
}

function title(): string {
  return container()?.querySelector('h2')?.textContent?.trim() ?? '';
}

function buttonByText(text: string): HTMLButtonElement | undefined {
  return Array.from(container()?.querySelectorAll('button') ?? []).find(
    (button) => button.textContent?.trim() === text,
  );
}

async function click(button: HTMLButtonElement | undefined): Promise<void> {
  button?.click();
  TestBed.tick();
  await Promise.resolve();
  TestBed.tick();
}

function press(key: string): void {
  document.activeElement?.dispatchEvent(
    new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }),
  );
  TestBed.tick();
}

describe('RatingDialogComponent', () => {
  afterEach(() => {
    vi.useRealTimers();
    document.querySelectorAll('.cdk-overlay-container').forEach((element) => {
      element.replaceChildren();
    });
  });

  it('shows the question, ten scores, the edge labels and Not now; focus starts on the dialog', async () => {
    await setup();

    expect(title()).toBe('How do you like Shelfmark so far?');
    expect(container()?.querySelectorAll('ui-rating-scale button')).toHaveLength(10);
    expect(container()?.textContent).toContain('Not really');
    expect(container()?.textContent).toContain('Love it');
    expect(buttonByText('Not now')).toBeDefined();
    expect(document.activeElement).toBe(container());
  });

  it('has no axe violations on any step', async () => {
    await setup();
    const first = await axe.run(container() as HTMLElement);
    expect(
      first.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical'),
    ).toEqual([]);
  });

  it('digits move focus (0 is 10) and never pick; Enter picks', async () => {
    const { api } = await setup();

    press('7');
    expect(document.activeElement?.textContent?.trim()).toBe('7');
    press('0');
    expect(document.activeElement?.textContent?.trim()).toBe('10');
    expect(api.record).not.toHaveBeenCalled();
    expect(title()).toBe('How do you like Shelfmark so far?');
  });

  it('arrows enter the scale from the dialog and move inside it, wrapping at the ends', async () => {
    await setup();

    press('ArrowRight');
    expect(document.activeElement?.textContent?.trim()).toBe('1');
    press('ArrowLeft');
    expect(document.activeElement?.textContent?.trim()).toBe('10');
    press('ArrowRight');
    expect(document.activeElement?.textContent?.trim()).toBe('1');
    press('End');
    expect(document.activeElement?.textContent?.trim()).toBe('10');
    press('Home');
    expect(document.activeElement?.textContent?.trim()).toBe('1');
  });

  it('keeps one tab stop on the scale', async () => {
    await setup();
    press('4');

    const stops = Array.from(container()?.querySelectorAll('ui-rating-scale button') ?? []).filter(
      (button) => button.getAttribute('tabindex') === '0',
    );
    expect(stops.map((button) => button.textContent?.trim())).toEqual(['4']);
  });

  it('a score of 8 to 10 is saved at once and goes to thanks, which closes after 4 s', async () => {
    const { api, scored, closed } = await setup();

    await click(buttonByText('9'));

    expect(api.record).toHaveBeenCalledWith({ milestone: 'week1', score: 9 });
    expect(scored()).toBe(true);
    expect(title()).toBe('Thank you');
    expect(container()?.textContent).toContain('Your rating helps us make Shelfmark better.');
    await vi.waitFor(() => {
      expect(document.activeElement).toBe(buttonByText('Close'));
    });

    expect(closed).not.toHaveBeenCalled();
  });

  it('the thanks step closes by itself once the delay has passed', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const { closed } = await setup();

    await click(buttonByText('10'));
    await vi.advanceTimersByTimeAsync(RATING_DELAY.ThanksClose - 1);
    expect(closed).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    await vi.waitFor(() => {
      expect(closed).toHaveBeenCalled();
    });
  });

  it('a score of 1 to 7 asks for feedback; Send is off while it is blank', async () => {
    const { api } = await setup();

    await click(buttonByText('7'));

    expect(api.record).toHaveBeenCalledWith({ milestone: 'week1', score: 7 });
    expect(title()).toBe('What would make it better?');
    expect(buttonByText('Send')?.disabled).toBe(true);
    await vi.waitFor(() => {
      expect(document.activeElement?.tagName).toBe('TEXTAREA');
    });
  });

  it('Send adds the comment to the same score and says "We read every message"', async () => {
    const { api } = await setup();
    await click(buttonByText('3'));

    const field = container()?.querySelector('textarea') as HTMLTextAreaElement;
    field.value = '  More folders, please  ';
    field.dispatchEvent(new Event('input', { bubbles: true }));
    TestBed.tick();
    await click(buttonByText('Send'));
    await vi.waitFor(() => {
      TestBed.tick();
      expect(title()).toBe('Thank you');
    });

    expect(api.record).toHaveBeenLastCalledWith({
      milestone: 'week1',
      score: 3,
      comment: 'More folders, please',
    });
    expect(container()?.textContent).toContain('We read every message.');
  });

  it('stays on the feedback step with an error when sending fails', async () => {
    let calls = 0;
    await setup(() => (++calls === 1 ? Promise.resolve() : Promise.reject(new Error('down'))));
    await click(buttonByText('3'));

    const field = container()?.querySelector('textarea') as HTMLTextAreaElement;
    field.value = 'Slow';
    field.dispatchEvent(new Event('input', { bubbles: true }));
    TestBed.tick();
    await click(buttonByText('Send'));
    await vi.waitFor(() => {
      TestBed.tick();
      expect(container()?.textContent).toContain("Couldn't send your feedback. Try again.");
    });

    expect(title()).toBe('What would make it better?');
  });

  it('Skip closes the feedback step and keeps the score', async () => {
    const { api, scored, closed } = await setup();
    await click(buttonByText('2'));

    await click(buttonByText('Skip'));
    await vi.waitFor(() => {
      expect(closed).toHaveBeenCalled();
    });

    expect(scored()).toBe(true);
    expect(api.record).toHaveBeenCalledTimes(1);
  });

  it('Not now closes without a score, so the store records the skip', async () => {
    const { api, scored, closed } = await setup();

    await click(buttonByText('Not now'));
    await vi.waitFor(() => {
      expect(closed).toHaveBeenCalled();
    });

    expect(scored()).toBe(false);
    expect(api.record).not.toHaveBeenCalled();
  });

  it('forgets the score when saving it fails, so closing records a skip instead', async () => {
    const { scored } = await setup(() => Promise.reject(new Error('down')));

    await click(buttonByText('9'));
    await vi.waitFor(() => {
      expect(scored()).toBe(false);
    });
  });
});
