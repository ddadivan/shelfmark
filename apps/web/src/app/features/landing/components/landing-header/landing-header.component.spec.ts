import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ViewportService } from '../../../../core/layout/viewport.service';
import { axeViolations } from '../../../../../testing/axe';
import { createTranslated } from '../../../../../testing/create-translated';
import { LandingHeaderComponent } from './landing-header.component';

describe('LandingHeaderComponent', () => {
  it('leaves the anchor and GitHub links out of the DOM on a phone; sign-in stays', async () => {
    TestBed.configureTestingModule({
      providers: [{ provide: ViewportService, useValue: { phone: signal(true) } }],
    });
    const fixture = await createTranslated(LandingHeaderComponent);
    const root = fixture.nativeElement as HTMLElement;

    expect(root.querySelectorAll('.landing-header__link')).toHaveLength(0);
    expect(root.querySelector('a[href="/sign-in"]')).not.toBeNull();
  });

  it('links to the anchor, the repository and sign-in', async () => {
    const fixture = await createTranslated(LandingHeaderComponent);
    const root = fixture.nativeElement as HTMLElement;

    expect(root.querySelector('header')).not.toBeNull();
    expect(root.querySelector('nav')?.getAttribute('aria-label')).toBe('Main');
    expect(root.querySelector('a[href="#how"]')?.textContent).toContain("How it's built");
    expect(root.querySelector('a[href="/sign-in"]')?.textContent).toContain('Sign in');
  });

  it('asks the page for "How it\'s built" instead of following the anchor', async () => {
    const fixture = await createTranslated(LandingHeaderComponent);
    const requested = vi.fn();
    fixture.componentInstance.howItsBuiltRequested.subscribe(requested);
    const link = (fixture.nativeElement as HTMLElement).querySelector<HTMLAnchorElement>(
      'a[href="#how"]',
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
    fixture.componentInstance.howItsBuiltRequested.subscribe(requested);
    const link = (fixture.nativeElement as HTMLElement).querySelector<HTMLAnchorElement>(
      'a[href="#how"]',
    );
    const click = new MouseEvent('click', { bubbles: true, cancelable: true, ...init });

    link?.dispatchEvent(click);

    expect(requested).not.toHaveBeenCalled();
    expect(click.defaultPrevented).toBe(false);
  });

  it('opens GitHub in a new tab with noopener', async () => {
    const fixture = await createTranslated(LandingHeaderComponent);
    const link = (fixture.nativeElement as HTMLElement).querySelector<HTMLAnchorElement>(
      'a[href="https://github.com/ddadivan/shelfmark"]',
    );

    expect(link?.target).toBe('_blank');
    expect(link?.rel).toContain('noopener');
  });

  it('has no axe violations', async () => {
    const fixture = await createTranslated(LandingHeaderComponent);

    expect(await axeViolations(fixture.nativeElement)).toEqual([]);
  });
});
