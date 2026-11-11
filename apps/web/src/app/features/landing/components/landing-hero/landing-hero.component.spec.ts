import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthStore } from '../../../../core/auth/auth.store';
import { axeViolations } from '../../../../../testing/axe';
import { stubReducedMotion } from '../../../../../testing/mock-intersection-observer';
import { createTranslated } from '../../../../../testing/create-translated';
import { LandingHeroComponent } from './landing-hero.component';

describe('LandingHeroComponent', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('carries the readable copy of the animated chat itself, before the chat loads', async () => {
    stubReducedMotion(false);

    const fixture = await createTranslated(LandingHeroComponent);
    const root = fixture.nativeElement as HTMLElement;

    const list = root.querySelector('.landing-hero__sr');
    expect(list?.getAttribute('aria-label')).toBe('Saved Messages');
    expect(list?.querySelectorAll('li')).toHaveLength(5);
    expect(list?.textContent).toContain('youtube.com/watch?v=ng22-signal-forms');
    expect(root.querySelector('.landing-hero__demo-placeholder')).not.toBeNull();
  });

  it('leaves the text to the visible static frame under reduced motion', async () => {
    stubReducedMotion(true);

    const fixture = await createTranslated(LandingHeroComponent);

    expect((fixture.nativeElement as HTMLElement).querySelector('.landing-hero__sr')).toBeNull();
  });

  it('renders the headline as the page h1', async () => {
    stubReducedMotion(false);

    const fixture = await createTranslated(LandingHeroComponent);
    const root = fixture.nativeElement as HTMLElement;

    const heading = root.querySelector('h1');
    expect(heading?.textContent?.replace(/\s+/g, ' ').trim()).toBe(
      'Paste a link. Find it again. Even in a year.',
    );
    expect(root.querySelectorAll('h1')).toHaveLength(1);
    expect(root.textContent).toContain('For everything you send to Saved Messages');
  });

  it('has no axe violations', async () => {
    stubReducedMotion(false);

    const fixture = await createTranslated(LandingHeroComponent);

    expect(await axeViolations(fixture.nativeElement)).toEqual([]);
  });

  it('offers "Back to my shelf" and no demo or sign-in to a signed-in person (/about)', async () => {
    TestBed.configureTestingModule({
      providers: [{ provide: AuthStore, useValue: { user: signal({ id: 'u' }) } }],
    });
    const fixture = await createTranslated(LandingHeroComponent);
    const root = fixture.nativeElement as HTMLElement;

    expect(root.querySelector('a[href="/links"]')?.textContent).toContain('Back to my shelf');
    expect(root.querySelector('a[href="/sign-in"]')).toBeNull();
    expect(root.querySelector('a[href="/demo"]')).toBeNull();
  });
});
