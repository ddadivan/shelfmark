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

  it('renders the headline as the page h1', async () => {
    stubReducedMotion(false);

    const fixture = await createTranslated(LandingHeroComponent);
    const root = fixture.nativeElement as HTMLElement;

    const heading = root.querySelector('h1');
    expect(heading?.textContent?.replace(/\s+/g, ' ').trim()).toBe(
      'Paste a link. Find it again. Even in a year.',
    );
    expect(root.querySelectorAll('h1')).toHaveLength(1);
    expect(root.textContent).toContain(
      'Videos, articles, things to buy, courses — on one calm shelf instead of chats and open tabs.',
    );
  });

  it('offers "Start your shelf" and "Open the demo" with the sign-in note to a guest', async () => {
    stubReducedMotion(false);

    const fixture = await createTranslated(LandingHeroComponent);
    const root = fixture.nativeElement as HTMLElement;

    expect(root.querySelector('a[href="/sign-in"]')?.textContent).toContain('Start your shelf');
    expect(root.querySelector('a[href="/demo"]')?.textContent).toContain('Open the demo');
    expect(root.querySelector('.landing-hero__note')?.textContent).toContain(
      'Sign in with Google or GitHub.',
    );
  });

  it('shows the app preview next to the copy and no chat', async () => {
    stubReducedMotion(false);

    const fixture = await createTranslated(LandingHeroComponent);
    const root = fixture.nativeElement as HTMLElement;

    expect(root.querySelector('app-landing-hero-preview')).not.toBeNull();
    expect(root.querySelector('app-landing-chat')).toBeNull();
    expect(root.textContent).not.toContain('Saved Messages');
  });

  it('has no axe violations', async () => {
    stubReducedMotion(false);

    const fixture = await createTranslated(LandingHeroComponent);

    expect(await axeViolations(fixture.nativeElement)).toEqual([]);
  });

  it('offers "Back to my shelf" and no start, demo or sign-in note to a signed-in person (/about)', async () => {
    TestBed.configureTestingModule({
      providers: [{ provide: AuthStore, useValue: { user: signal({ id: 'u' }) } }],
    });
    const fixture = await createTranslated(LandingHeroComponent);
    const root = fixture.nativeElement as HTMLElement;

    expect(root.querySelector('a[href="/links"]')?.textContent).toContain('Back to my shelf');
    expect(root.querySelector('a[href="/sign-in"]')).toBeNull();
    expect(root.querySelector('a[href="/demo"]')).toBeNull();
    expect(root.querySelector('.landing-hero__note')).toBeNull();
    expect(root.querySelector('app-landing-hero-preview')).not.toBeNull();
  });
});
