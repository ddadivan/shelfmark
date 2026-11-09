import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { DeferBlockState } from '@angular/core/testing';
import { axeViolations } from '../../../testing/axe';
import { createTranslated } from '../../../testing/create-translated';
import LandingPage from './landing.page';

async function createLoaded() {
  const fixture = await createTranslated(LandingPage);
  // The sections below the hero are deferred (on idle); render them for the assertions.
  for (const block of await fixture.getDeferBlocks()) {
    await block.render(DeferBlockState.Complete);
  }
  return fixture;
}

describe('LandingPage', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideRouter([])] }));

  afterEach(() => {
    Reflect.deleteProperty(HTMLElement.prototype, 'scrollIntoView');
    history.replaceState(null, '', '/');
    vi.restoreAllMocks();
  });

  it('opened with #how, loads the sections and focuses that section', async () => {
    history.replaceState(null, '', '/#how');
    const focus = vi.spyOn(HTMLElement.prototype, 'focus');

    const fixture = await createLoaded();
    await fixture.whenStable();

    const target = (fixture.nativeElement as HTMLElement).querySelector('#how');
    expect(target).not.toBeNull();
    expect(focus.mock.contexts).toContain(target);
  });

  it('opened with #how, loads every deferred block and scrolls once, after the section above exists', async () => {
    history.replaceState(null, '', '/#how');
    const seen: boolean[] = [];
    const scrollIntoView = vi.fn(function (this: HTMLElement) {
      seen.push(
        document.body.contains(this) &&
          this.closest('app-landing-page')?.querySelector('app-landing-before-after') !== null,
      );
    });
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoView,
    });

    const fixture = await createTranslated(LandingPage);
    const root = fixture.nativeElement as HTMLElement;
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(root.querySelector('app-landing-before-after')).not.toBeNull();
      expect(root.querySelector('app-landing-why')).not.toBeNull();
      expect(root.querySelector('app-landing-finale')).not.toBeNull();
      expect(root.querySelector('footer')).not.toBeNull();
    });

    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(seen).toEqual([true]);
    expect(root.querySelector('.landing__placeholder')).toBeNull();
  });

  it('composes the sections under landmarks with one h1', async () => {
    const fixture = await createLoaded();
    const root = fixture.nativeElement as HTMLElement;

    expect(root.querySelector('header')).not.toBeNull();
    expect(root.querySelectorAll('main')).toHaveLength(1);
    expect(root.querySelector('footer')).not.toBeNull();
    expect(root.querySelectorAll('h1')).toHaveLength(1);
    const h2 = Array.from(root.querySelectorAll('h2')).map((h) => h.textContent?.trim());
    expect(h2).toEqual([
      'The same links, before and after',
      'Why this exists',
      "How it's built",
      'Empty your Saved Messages.',
    ]);
  });

  it('has no axe violations', async () => {
    const fixture = await createTranslated(LandingPage);

    expect(await axeViolations(fixture.nativeElement)).toEqual([]);
  });
});
