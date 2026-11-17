import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthStore } from '../../../../core/auth/auth.store';
import { axeViolations } from '../../../../../testing/axe';
import { createTranslated } from '../../../../../testing/create-translated';
import { LandingFinaleComponent } from './landing-finale.component';

describe('LandingFinaleComponent', () => {
  it('renders the heading and both calls to action', async () => {
    const fixture = await createTranslated(LandingFinaleComponent);
    const root = fixture.nativeElement as HTMLElement;

    expect(root.querySelector('h2')?.textContent?.trim()).toBe('Empty your Saved Messages.');
    expect(root.querySelector('.landing-finale__lead')?.textContent).toContain(
      'Everything you save from now on lands on one shelf',
    );
    expect(root.querySelector('a[href="/sign-in"]')).not.toBeNull();
    const labels = Array.from(root.querySelectorAll('a')).map((a) => a.textContent?.trim());
    expect(labels).toEqual(['Open the demo', 'Sign in']);
  });

  it('has no axe violations', async () => {
    const fixture = await createTranslated(LandingFinaleComponent);

    expect(await axeViolations(fixture.nativeElement)).toEqual([]);
  });

  it('offers "Back to my shelf" and no demo or sign-in to a signed-in person (/about)', async () => {
    TestBed.configureTestingModule({
      providers: [{ provide: AuthStore, useValue: { user: signal({ id: 'u' }) } }],
    });
    const fixture = await createTranslated(LandingFinaleComponent);
    const root = fixture.nativeElement as HTMLElement;

    expect(root.querySelector('a[href="/links"]')?.textContent).toContain('Back to my shelf');
    expect(root.querySelector('a[href="/sign-in"]')).toBeNull();
    expect(root.querySelector('a[href="/demo"]')).toBeNull();
  });
});
