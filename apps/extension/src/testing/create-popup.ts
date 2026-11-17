import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideTransloco, TranslocoService } from '@jsverse/transloco';
import { firstValueFrom } from 'rxjs';
import { App } from '../app/app';
import { ExtTranslocoLoader } from '../app/core/i18n/ext-transloco.loader';
import { EXT_LANG } from '../app/core/i18n/models/ext-lang.const';
import { fakeData, fakePopupDeps, type FakeData, type FakePopupDeps } from './fake-popup-deps';

/** Creates the popup `App` with the real `en` translations, fake API and tabs, and settles the flow. */
export interface PopupHarness extends FakePopupDeps {
  fixture: ComponentFixture<App>;
}

export async function createPopup(overrides: Partial<FakeData> = {}): Promise<PopupHarness> {
  const deps = fakePopupDeps(fakeData(overrides));
  await TestBed.configureTestingModule({
    imports: [App],
    providers: [
      ...deps.providers,
      provideTransloco({
        config: {
          availableLangs: Object.values(EXT_LANG),
          defaultLang: EXT_LANG.En,
          fallbackLang: EXT_LANG.En,
          reRenderOnLangChange: false,
          failedRetries: 0,
          prodMode: true,
        },
        loader: ExtTranslocoLoader,
      }),
    ],
  }).compileComponents();
  await firstValueFrom(TestBed.inject(TranslocoService).load(EXT_LANG.En));
  const fixture = TestBed.createComponent(App);
  await settle(fixture);
  return { fixture, ...deps };
}

/** Lets pending promises and renders run until the view stops changing. */
export async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  for (let i = 0; i < 4; i++) {
    fixture.detectChanges();
    await fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}
