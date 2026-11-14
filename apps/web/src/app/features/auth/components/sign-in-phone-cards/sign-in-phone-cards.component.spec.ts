import { TestBed } from '@angular/core/testing';
import { provideTransloco, TranslocoService } from '@jsverse/transloco';
import axe from 'axe-core';
import { firstValueFrom } from 'rxjs';
import { AppTranslocoLoader } from '../../../../core/i18n/app-transloco.loader';
import { APP_LANG } from '../../../../core/i18n/models/app-lang.const';
import { translocoConfig } from '../../../../core/i18n/transloco.config';
import { SignInPhoneCardsComponent } from './sign-in-phone-cards.component';

async function setup() {
  TestBed.configureTestingModule({
    providers: [provideTransloco({ config: translocoConfig, loader: AppTranslocoLoader })],
  });
  await firstValueFrom(TestBed.inject(TranslocoService).load(APP_LANG.En));
  const fixture = TestBed.createComponent(SignInPhoneCardsComponent);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('SignInPhoneCardsComponent', () => {
  it('is decorative: hidden from assistive technology and inert, nothing in it can take focus', async () => {
    const root = await setup();

    expect(root.getAttribute('aria-hidden')).toBe('true');
    expect(root.hasAttribute('inert')).toBe(true);
    for (const control of root.querySelectorAll('button, a, input, [tabindex]')) {
      expect(control.closest('[inert]'), control.outerHTML).not.toBeNull();
    }
  });

  it('draws six library cards in three depth layers, each with its own float', async () => {
    const root = await setup();

    expect(root.querySelectorAll('.pc-card')).toHaveLength(6);
    expect(root.querySelectorAll('ui-card .ui-card__placeholder')).toHaveLength(6);
    expect(root.querySelectorAll('.pc-float')).toHaveLength(6);
    for (const layer of ['far', 'mid', 'near']) {
      expect(root.querySelectorAll(`.pc-card--${layer}`).length).toBeGreaterThan(0);
    }
    expect(root.textContent).toContain('Signal Forms in 20 minutes');
  });

  it('has no axe violations', async () => {
    const root = await setup();
    const results = await axe.run(root, { rules: { 'color-contrast': { enabled: false } } });

    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});
