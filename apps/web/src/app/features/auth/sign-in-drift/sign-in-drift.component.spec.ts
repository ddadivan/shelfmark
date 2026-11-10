import { TestBed } from '@angular/core/testing';
import { provideTransloco, TranslocoService } from '@jsverse/transloco';
import axe from 'axe-core';
import { firstValueFrom } from 'rxjs';
import { AppTranslocoLoader } from '../../../core/i18n/app-transloco.loader';
import { APP_LANG } from '../../../core/i18n/models/app-lang.const';
import { translocoConfig } from '../../../core/i18n/transloco.config';
import { SignInDriftComponent } from './sign-in-drift.component';

async function setup() {
  TestBed.configureTestingModule({
    providers: [provideTransloco({ config: translocoConfig, loader: AppTranslocoLoader })],
  });
  await firstValueFrom(TestBed.inject(TranslocoService).load(APP_LANG.En));
  const fixture = TestBed.createComponent(SignInDriftComponent);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('SignInDriftComponent', () => {
  it('is decorative: hidden from assistive technology with nothing focusable', async () => {
    const root = await setup();

    expect(root.getAttribute('aria-hidden')).toBe('true');
    expect(root.querySelectorAll('button, a, input, [tabindex]')).toHaveLength(0);
  });

  it('renders the four translated example links, each with a landing ring', async () => {
    const root = await setup();
    const text = root.textContent ?? '';

    expect(root.querySelectorAll('.sd-card')).toHaveLength(4);
    expect(root.querySelectorAll('.sd-ring')).toHaveLength(4);
    expect(text).toContain('youtube.com');
    expect(text).toContain('Signal Forms in 20 minutes');
    expect(text).toContain('NestJS for frontend developers');
  });

  it('has no axe violations', async () => {
    const root = await setup();
    const results = await axe.run(root, { rules: { 'color-contrast': { enabled: false } } });

    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});
