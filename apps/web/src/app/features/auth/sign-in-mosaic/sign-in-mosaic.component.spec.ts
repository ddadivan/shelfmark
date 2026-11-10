import { TestBed } from '@angular/core/testing';
import { provideTransloco, TranslocoService } from '@jsverse/transloco';
import axe from 'axe-core';
import { firstValueFrom } from 'rxjs';
import { AppTranslocoLoader } from '../../../core/i18n/app-transloco.loader';
import { APP_LANG } from '../../../core/i18n/models/app-lang.const';
import { translocoConfig } from '../../../core/i18n/transloco.config';
import { SignInMosaicComponent } from './sign-in-mosaic.component';

async function setup() {
  TestBed.configureTestingModule({
    providers: [provideTransloco({ config: translocoConfig, loader: AppTranslocoLoader })],
  });
  await firstValueFrom(TestBed.inject(TranslocoService).load(APP_LANG.En));
  const fixture = TestBed.createComponent(SignInMosaicComponent);
  fixture.detectChanges();
  return { fixture, root: fixture.nativeElement as HTMLElement };
}

describe('SignInMosaicComponent', () => {
  it('is decorative: hidden from assistive technology with nothing focusable', async () => {
    const { root } = await setup();

    expect(root.getAttribute('aria-hidden')).toBe('true');
    expect(root.querySelectorAll('button, a, input, [tabindex]')).toHaveLength(0);
  });

  it('renders the eight tiles, each with its own landing ring', async () => {
    const { root } = await setup();

    expect(root.querySelectorAll('.mz-tile')).toHaveLength(8);
    expect(root.querySelectorAll('.mz-ring')).toHaveLength(8);
  });

  it('has no axe violations', async () => {
    const { root } = await setup();
    const results = await axe.run(root, { rules: { 'color-contrast': { enabled: false } } });

    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});
