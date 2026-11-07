import { Type } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTransloco, TranslocoService } from '@jsverse/transloco';
import { firstValueFrom } from 'rxjs';
import { AppTranslocoLoader } from '../app/core/i18n/app-transloco.loader';
import { APP_LANG } from '../app/core/i18n/models/app-lang.const';
import { translocoConfig } from '../app/core/i18n/transloco.config';

/** Creates a component with the real `en` translations loaded and the first render settled. */
export async function createTranslated<T>(component: Type<T>): Promise<ComponentFixture<T>> {
  await TestBed.configureTestingModule({
    imports: [component],
    providers: [provideTransloco({ config: translocoConfig, loader: AppTranslocoLoader })],
  }).compileComponents();
  await firstValueFrom(TestBed.inject(TranslocoService).load(APP_LANG.En));
  const fixture = TestBed.createComponent(component);
  await fixture.whenStable();
  return fixture;
}
