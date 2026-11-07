import { axeViolations } from '../../../../../testing/axe';
import { createTranslated } from '../../../../../testing/create-translated';
import { LandingBeforeSceneComponent } from './landing-before-scene.component';

describe('LandingBeforeSceneComponent', () => {
  it('describes the scattered links as one named image', async () => {
    const fixture = await createTranslated(LandingBeforeSceneComponent);
    const board = (fixture.nativeElement as HTMLElement).querySelector('[role="img"]');

    expect(board?.getAttribute('aria-label')).toContain('scattered across Saved Messages');
    expect(board?.textContent).toContain('Bookmarks bar (91)');
  });

  it('has no axe violations', async () => {
    const fixture = await createTranslated(LandingBeforeSceneComponent);

    expect(await axeViolations(fixture.nativeElement)).toEqual([]);
  });
});
