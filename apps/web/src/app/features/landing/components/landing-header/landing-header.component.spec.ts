import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthStore } from '../../../../core/auth/auth.store';
import { ViewportService } from '../../../../core/layout/viewport.service';
import { axeViolations } from '../../../../../testing/axe';
import { createTranslated } from '../../../../../testing/create-translated';
import { LandingHeaderComponent } from './landing-header.component';

describe('LandingHeaderComponent', () => {
  it('leaves the section links and "Get started" out of the DOM on a phone; sign-in stays', async () => {
    TestBed.configureTestingModule({
      providers: [{ provide: ViewportService, useValue: { phone: signal(true) } }],
    });
    const fixture = await createTranslated(LandingHeaderComponent);
    const root = fixture.nativeElement as HTMLElement;

    expect(root.querySelectorAll('.landing-header__link')).toHaveLength(0);
    expect(root.querySelector('nav')).toBeNull();
    const signIn = Array.from(root.querySelectorAll('a[href="/sign-in"]'));
    expect(signIn.map((link) => link.textContent?.trim())).toEqual(['Sign in']);
  });

  it('links to "How it works" and "Privacy", then "Sign in" and "Get started"', async () => {
    const fixture = await createTranslated(LandingHeaderComponent);
    const root = fixture.nativeElement as HTMLElement;

    expect(root.querySelector('header')).not.toBeNull();
    expect(root.querySelector('nav')?.getAttribute('aria-label')).toBe('Main');
    expect(root.querySelector('a[href="#works"]')?.textContent).toContain('How it works');
    expect(root.querySelector('a[href="/privacy"]')?.textContent).toContain('Privacy');
    const signIn = Array.from(root.querySelectorAll('a[href="/sign-in"]'));
    expect(signIn.map((link) => link.textContent?.trim())).toEqual(['Sign in', 'Get started']);
    expect(root.querySelector('a[href="https://github.com/ddadivan/shelfmark"]')).toBeNull();
  });

  it('asks the page for "How it works" instead of following the anchor', async () => {
    const fixture = await createTranslated(LandingHeaderComponent);
    const requested = vi.fn();
    fixture.componentInstance.howItWorksRequested.subscribe(requested);
    const link = (fixture.nativeElement as HTMLElement).querySelector<HTMLAnchorElement>(
      'a[href="#works"]',
    );
    const click = new MouseEvent('click', { bubbles: true, cancelable: true });

    link?.dispatchEvent(click);

    expect(requested).toHaveBeenCalledTimes(1);
    expect(click.defaultPrevented).toBe(true);
  });

  it.each([
    ['ctrl', { ctrlKey: true }],
    ['meta', { metaKey: true }],
    ['shift', { shiftKey: true }],
    ['middle button', { button: 1 }],
  ])('keeps the plain link for %s-click', async (_name, init) => {
    const fixture = await createTranslated(LandingHeaderComponent);
    const requested = vi.fn();
    fixture.componentInstance.howItWorksRequested.subscribe(requested);
    const link = (fixture.nativeElement as HTMLElement).querySelector<HTMLAnchorElement>(
      'a[href="#works"]',
    );
    const click = new MouseEvent('click', { bubbles: true, cancelable: true, ...init });

    link?.dispatchEvent(click);

    expect(requested).not.toHaveBeenCalled();
    expect(click.defaultPrevented).toBe(false);
  });

  it('has no axe violations', async () => {
    const fixture = await createTranslated(LandingHeaderComponent);

    expect(await axeViolations(fixture.nativeElement)).toEqual([]);
  });

  it('offers "Back to my shelf" and no demo or sign-in to a signed-in person (/about)', async () => {
    TestBed.configureTestingModule({
      providers: [{ provide: AuthStore, useValue: { user: signal({ id: 'u' }) } }],
    });
    const fixture = await createTranslated(LandingHeaderComponent);
    const root = fixture.nativeElement as HTMLElement;

    expect(root.querySelector('a[href="/links"]')?.textContent).toContain('Back to my shelf');
    expect(root.querySelector('a[href="/sign-in"]')).toBeNull();
    expect(root.querySelector('a[href="/demo"]')).toBeNull();
  });
});
