import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { axeViolations } from '../../../testing/axe';
import { createTranslated } from '../../../testing/create-translated';
import { APP_VERSION } from '../../models/app-version.const';
import ChangelogPage from './changelog.page';
import { CHANGELOG } from './models/changelog.const';
import { releasedChangelog } from './utils/changelog-highlights';

describe('ChangelogPage', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    document.title = 'Shelfmark';
  });

  it('lists the shipped releases newest first', async () => {
    const root = (await createTranslated(ChangelogPage)).nativeElement as HTMLElement;
    const headings = [...root.querySelectorAll('h2')].map((h) => h.textContent?.trim());

    expect(root.querySelector('h1')?.textContent).toBe("What's new");
    expect(headings).toEqual(
      releasedChangelog(CHANGELOG).map((release) => `Shelfmark ${release.version}`),
    );
    expect(headings[0]).toBe('Shelfmark 2.3.1');
  });

  it('shows the current version, the dates and a release heading per shipped release', async () => {
    const root = (await createTranslated(ChangelogPage)).nativeElement as HTMLElement;

    expect(root.textContent).toContain(`You're using Shelfmark ${APP_VERSION}.`);
    expect(root.querySelector('time')?.getAttribute('datetime')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(root.textContent).not.toMatch(/changelog\.(items|sections)/);
  });

  it('groups a release into New, Improved and Fixed, leaving empty sections out', async () => {
    const root = (await createTranslated(ChangelogPage)).nativeElement as HTMLElement;
    const releases = [...root.querySelectorAll('section.release')];
    const sectionsOf = (heading: string) =>
      [
        ...(releases
          .find((release) => release.querySelector('h2')?.textContent?.includes(heading))
          ?.querySelectorAll('h3') ?? []),
      ].map((h) => h.textContent?.trim());

    // 2.0.0 brought features only; 2.0.5 is one fix; no release shows an empty section.
    expect(sectionsOf('Shelfmark 2.0.0')).toEqual(['New']);
    expect(sectionsOf('Shelfmark 2.0.5')).toEqual(['Fixed']);
    const fixOnly = releases.find((release) =>
      release.querySelector('h2')?.textContent?.includes('2.0.5'),
    );
    expect(fixOnly?.querySelectorAll('h4')).toHaveLength(0);
    expect(fixOnly?.textContent).toContain('Own colors');
    for (const release of releases) {
      for (const list of release.querySelectorAll('.group__list')) {
        expect(list.children.length).toBeGreaterThan(0);
      }
    }
  });

  it('shows a feature as a title and a text under a heading level 4', async () => {
    const root = (await createTranslated(ChangelogPage)).nativeElement as HTMLElement;

    expect(root.querySelector('h4')?.textContent).toBe('Ask your shelf is now a chat');
  });

  it('sets the document title and puts it back on leave', async () => {
    const fixture = await createTranslated(ChangelogPage);
    const title = TestBed.inject(Title);

    expect(title.getTitle()).toBe("What's new · Shelfmark");
    fixture.destroy();
    expect(title.getTitle()).toBe('Shelfmark');
  });

  it('has no axe violations', async () => {
    const fixture = await createTranslated(ChangelogPage);

    expect(await axeViolations(fixture.nativeElement)).toEqual([]);
  });
});
