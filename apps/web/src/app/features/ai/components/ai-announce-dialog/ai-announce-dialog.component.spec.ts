import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideTransloco, TranslocoService } from '@jsverse/transloco';
import { DIALOG_SIZE, DialogService } from '@shelfmark/ui';
import { UiButtonHarness, UiDialogHarness } from '@shelfmark/ui/testing';
import { firstValueFrom } from 'rxjs';
import { axeViolations } from '../../../../../testing/axe';
import { AppTranslocoLoader } from '../../../../core/i18n/app-transloco.loader';
import { APP_LANG } from '../../../../core/i18n/models/app-lang.const';
import { translocoConfig } from '../../../../core/i18n/transloco.config';
import { ViewportService } from '../../../../core/layout/viewport.service';
import { AiAnnounceDialogComponent } from './ai-announce-dialog.component';

@Component({ template: '', changeDetection: ChangeDetectionStrategy.OnPush })
class HostComponent {}

async function setup() {
  TestBed.configureTestingModule({
    providers: [
      provideTransloco({ config: translocoConfig, loader: AppTranslocoLoader }),
      {
        provide: ViewportService,
        useValue: { phone: signal(false), compact: signal(false), desktop: signal(true) },
      },
    ],
  });
  await firstValueFrom(TestBed.inject(TranslocoService).load(APP_LANG.En));
  const fixture = TestBed.createComponent(HostComponent);
  const ref = TestBed.inject(DialogService).open<AiAnnounceDialogComponent, boolean>(
    AiAnnounceDialogComponent,
    { size: DIALOG_SIZE.Md },
  );
  const result = vi.fn();
  void ref.result.then(result);
  const loader = TestbedHarnessEnvironment.documentRootLoader(fixture);
  const dialog = await loader.getHarness(UiDialogHarness);
  return { loader, dialog, result };
}

describe('AiAnnounceDialogComponent (#507)', () => {
  afterEach(() => {
    document.querySelectorAll('.cdk-overlay-container').forEach((element) => {
      element.replaceChildren();
    });
  });

  it('names the news, shows the four features and has no axe violations', async () => {
    const { dialog } = await setup();

    expect(await dialog.getTitle()).toBe('Shelfmark can now help with AI');
    const body = await dialog.getBodyText();
    for (const text of [
      'Folder and tags',
      'Short summaries',
      'Search by meaning',
      'Ask your shelf',
    ]) {
      expect(body).toContain(text);
    }
    expect(body).toContain('Settings › AI');
    expect(await axeViolations(document.querySelector('.cdk-dialog-container') as Element)).toEqual(
      [],
    );
  });

  it('"Turn on AI…" closes with true', async () => {
    const { loader, result } = await setup();
    await (await loader.getHarness(UiButtonHarness.with({ text: 'Turn on AI…' }))).click();
    await vi.waitFor(() => expect(result).toHaveBeenCalledWith(true));
  });

  it.each(['Not now', 'Close'])('%s closes with false', async (name) => {
    const { loader, result } = await setup();
    await (await loader.getHarness(UiButtonHarness.with({ name }))).click();
    await vi.waitFor(() => expect(result).toHaveBeenCalledWith(false));
  });
});
