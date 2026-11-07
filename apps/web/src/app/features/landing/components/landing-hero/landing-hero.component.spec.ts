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
});
