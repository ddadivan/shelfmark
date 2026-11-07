import { TestBed } from '@angular/core/testing';
import { provideTransloco, TranslocoService } from '@jsverse/transloco';
import { firstValueFrom } from 'rxjs';
import { AppTranslocoLoader } from '../core/i18n/app-transloco.loader';
import { APP_LANG } from '../core/i18n/models/app-lang.const';
import { translocoConfig } from '../core/i18n/transloco.config';

/** Real English translations in specs, so assertions read like the UI. */
export function provideTranslocoForTest() {
  return provideTransloco({ config: translocoConfig, loader: AppTranslocoLoader });
}

/** Waits for the English file; call after `configureTestingModule`. */
export async function loadEnglish(): Promise<void> {
  await firstValueFrom(TestBed.inject(TranslocoService).load(APP_LANG.En));
}
