import { TestBed } from '@angular/core/testing';
import { provideTransloco, TranslocoService } from '@jsverse/transloco';
import { MOCK_LINKS } from '@shelfmark/contracts/testing';
import { UI_DIALOG_DATA } from '@shelfmark/ui';
import { AppTranslocoLoader } from '../../../core/i18n/app-transloco.loader';
import { APP_LANG } from '../../../core/i18n/models/app-lang.const';
import { translocoConfig } from '../../../core/i18n/transloco.config';
import type { AddLinkData } from '../models/add-link-data.interface';
import { AddLinkFormService } from './add-link-form.service';
import { AddSeveralLinksService } from './add-several-links.service';

async function setup(data: AddLinkData = {}): Promise<AddSeveralLinksService> {
  TestBed.configureTestingModule({
    providers: [
      provideTransloco({ config: translocoConfig, loader: AppTranslocoLoader }),
      { provide: UI_DIALOG_DATA, useValue: data },
      AddLinkFormService,
      AddSeveralLinksService,
    ],
  });
  await new Promise<void>((resolve) => {
    TestBed.inject(TranslocoService)
      .load(APP_LANG.En)
      .subscribe(() => {
        resolve();
      });
  });
  return TestBed.inject(AddSeveralLinksService);
}

function pasteEvent(text: string): ClipboardEvent {
  const event = new Event('paste', { cancelable: true }) as ClipboardEvent;
  Object.defineProperty(event, 'clipboardData', { value: { getData: () => text } });
  return event;
}

describe('AddSeveralLinksService', () => {
  it('opens the list when the paste holds several links and keeps the paste from the field', async () => {
    const several = await setup();
    const event = pasteEvent('https://example.org/a https://example.org/b');
    several.onUrlPaste(event);
    expect(event.defaultPrevented).toBe(true);
    expect(several.pasted()?.links).toHaveLength(2);
  });

  it('lets a single link paste as usual', async () => {
    const several = await setup();
    const event = pasteEvent('https://example.org/a');
    several.onUrlPaste(event);
    expect(event.defaultPrevented).toBe(false);
    expect(several.pasted()).toBeNull();
  });

  it('ignores the paste when editing', async () => {
    const several = await setup({ link: MOCK_LINKS[0] });
    const event = pasteEvent('https://example.org/a https://example.org/b');
    several.onUrlPaste(event);
    expect(event.defaultPrevented).toBe(false);
    expect(several.pasted()).toBeNull();
  });

  it('starts with the list open when the handed-over text holds several links', async () => {
    const several = await setup({ text: 'https://example.org/a\nhttps://example.org/b' });
    expect(several.pasted()?.links).toHaveLength(2);
  });

  it('flags text without a link as invalid and opens the list for valid text', async () => {
    const several = await setup();
    several.severalForm.text().value.set('no links here');
    expect(several.severalForm.text().valid()).toBe(false);
    several.severalForm.text().value.set('https://example.org/a');
    expect(several.severalForm.text().valid()).toBe(true);
  });
});
