import { TestBed } from '@angular/core/testing';
import { provideTransloco, TranslocoService } from '@jsverse/transloco';
import { ASK_PERIOD, type AskEvent } from '@shelfmark/contracts';
import { firstValueFrom, Subject } from 'rxjs';
import { aiSettingsResponse, fakeAiApi } from '../../../../../testing/fake-ai-api';
import { AppTranslocoLoader } from '../../../../core/i18n/app-transloco.loader';
import { APP_LANG } from '../../../../core/i18n/models/app-lang.const';
import { translocoConfig } from '../../../../core/i18n/transloco.config';
import { AI_API } from '../../models/ai-api.const';
import { AiSettingsStore } from '../../services/ai-settings.store';
import { AskStore } from '../../services/ask.store';
import { AskComposerComponent } from './ask-composer.component';

const ALLOWANCE = { questionsLeft: 11, period: ASK_PERIOD.Day, resetsOn: '2026-11-19' };

async function setup() {
  const api = fakeAiApi(aiSettingsResponse());
  const stream = new Subject<AskEvent>();
  api.ask.mockReturnValue(stream);
  TestBed.configureTestingModule({
    providers: [
      AskStore,
      { provide: AI_API, useValue: api },
      provideTransloco({ config: translocoConfig, loader: AppTranslocoLoader }),
    ],
  });
  await firstValueFrom(TestBed.inject(TranslocoService).load(APP_LANG.En));
  await TestBed.inject(AiSettingsStore).load();
  const fixture = TestBed.createComponent(AskComposerComponent);
  document.body.appendChild(fixture.nativeElement as HTMLElement);
  await fixture.whenStable();
  const host = fixture.nativeElement as HTMLElement;
  const field = (): HTMLTextAreaElement => host.querySelector('textarea')!;
  const type = async (text: string): Promise<void> => {
    field().value = text;
    field().dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();
  };
  const pressEnter = async (): Promise<void> => {
    field().dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }),
    );
    await fixture.whenStable();
  };
  return { api, stream, fixture, field, type, pressEnter };
}

function finish(stream: Subject<AskEvent>): void {
  stream.next({
    type: 'done',
    sources: [],
    notFound: true,
    truncated: false,
    allowance: ALLOWANCE,
  });
  stream.complete();
}

describe('AskComposerComponent', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it('puts focus back into the field when the answer ends, if it had focus when sent', async () => {
    const { api, stream, fixture, field, type, pressEnter } = await setup();
    field().focus();
    await type('What did I save about ramen?');
    await pressEnter();
    expect(api.ask).toHaveBeenCalledWith('What did I save about ramen?');
    expect(field().disabled).toBe(true);
    // A browser drops focus from a disabled field; jsdom does not.
    field().blur();

    finish(stream);
    await fixture.whenStable();
    expect(field().disabled).toBe(false);
    expect(document.activeElement).toBe(field());
  });

  it('puts focus back after an error and after Stop too', async () => {
    const { stream, fixture, field, type, pressEnter } = await setup();
    field().focus();
    await type('What did I save about ramen?');
    await pressEnter();
    field().blur();
    stream.error(new Error('offline'));
    await fixture.whenStable();
    expect(document.activeElement).toBe(field());

    const next = new Subject<AskEvent>();
    const api = TestBed.inject(AI_API) as ReturnType<typeof fakeAiApi>;
    api.ask.mockReturnValue(next);
    await type('And about sourdough?');
    await pressEnter();
    expect(field().disabled).toBe(true);
    field().blur();
    TestBed.inject(AskStore).stop();
    await fixture.whenStable();
    expect(document.activeElement).toBe(field());
  });

  it('leaves focus alone when the field did not have it when the question was sent', async () => {
    const { stream, fixture, field, type } = await setup();
    await type('What did I save about ramen?');
    const outside = document.createElement('button');
    document.body.appendChild(outside);
    outside.focus();
    (fixture.nativeElement as HTMLElement)
      .querySelector('form')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await fixture.whenStable();
    expect(field().disabled).toBe(true);

    finish(stream);
    await fixture.whenStable();
    expect(document.activeElement).toBe(outside);
  });
});
