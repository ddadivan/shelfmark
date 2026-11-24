import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideTransloco, TranslocoService } from '@jsverse/transloco';
import { firstValueFrom } from 'rxjs';
import { axeViolations } from '../../../../../testing/axe';
import { BrowserExtensionService } from '../../../../core/browser-extension/browser-extension.service';
import { AppTranslocoLoader } from '../../../../core/i18n/app-transloco.loader';
import { APP_LANG } from '../../../../core/i18n/models/app-lang.const';
import { translocoConfig } from '../../../../core/i18n/transloco.config';
import { ImportDialogService } from '../../../import/services/import-dialog.service';
import { LinkActionsService } from '../../../links/services/link-actions.service';
import { FirstRunComponent } from './first-run.component';

async function setup(offered = true) {
  const actions = { addLink: vi.fn().mockResolvedValue(undefined) };
  const importer = { open: vi.fn() };
  const extensionOffered = signal(offered);
  TestBed.configureTestingModule({
    providers: [
      provideTransloco({ config: translocoConfig, loader: AppTranslocoLoader }),
      { provide: LinkActionsService, useValue: actions },
      { provide: ImportDialogService, useValue: importer },
      {
        provide: BrowserExtensionService,
        useValue: {
          storeUrl: 'https://chromewebstore.google.com/detail/shelfmark/x',
          offered: computed(() => extensionOffered()),
        },
      },
    ],
  });
  await firstValueFrom(TestBed.inject(TranslocoService).load(APP_LANG.En));
  const fixture = TestBed.createComponent(FirstRunComponent);
  fixture.detectChanges();
  await fixture.whenStable();
  return { host: fixture.nativeElement as HTMLElement, actions, importer, fixture };
}

describe('FirstRunComponent (Shelf 10-first-run)', () => {
  it('shows the scene, the heading and three numbered ways', async () => {
    const { host } = await setup();
    expect(host.querySelector('h2')?.textContent?.trim()).toBe('Your shelf is empty');
    const titles = [...host.querySelectorAll('.first-run__title')].map((title) =>
      title.textContent?.trim(),
    );
    expect(titles).toEqual(['Paste a link', 'Get the extension', 'Import bookmarks']);
    expect(host.querySelector('a[href^="https://chromewebstore"]')?.textContent).toContain(
      'Add to Chrome',
    );
    expect(await axeViolations(host)).toEqual([]);
  });

  it('leaves the extension out where it is not offered and numbers on', async () => {
    const { host } = await setup(false);
    expect(host.querySelectorAll('.first-run__way').length).toBe(2);
    expect(host.querySelectorAll('.first-run__n')[1].textContent?.trim()).toBe('2');
  });

  it('opens Add link with a pasted or typed link, and the import page', async () => {
    const { host, actions, importer } = await setup();
    const field = host.querySelector('input') as HTMLInputElement;
    const paste = new Event('paste', { bubbles: true, cancelable: true }) as ClipboardEvent;
    Object.defineProperty(paste, 'clipboardData', {
      value: { getData: () => ' https://example.com/a ' },
    });
    field.dispatchEvent(paste);
    expect(actions.addLink).toHaveBeenCalledWith({ text: 'https://example.com/a' });
    field.value = 'https://example.com/b';
    field.dispatchEvent(new Event('input'));
    field.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(actions.addLink).toHaveBeenLastCalledWith({ text: 'https://example.com/b' });
    const importButton = [...host.querySelectorAll('button')].find((button) =>
      button.textContent?.includes('Import'),
    );
    importButton?.click();
    expect(importer.open).toHaveBeenCalled();
  });
});
