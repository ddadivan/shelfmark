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
