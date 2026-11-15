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

  it('lists the shipped releases newest first, without the draft of the next one', async () => {
    const root = (await createTranslated(ChangelogPage)).nativeElement as HTMLElement;
    const headings = [...root.querySelectorAll('h2')].map((h) => h.textContent?.trim());

    expect(root.querySelector('h1')?.textContent).toBe("What's new");
    expect(headings).toEqual(
      releasedChangelog(CHANGELOG).map((release) => `Shelfmark ${release.version}`),
    );
    expect(headings).not.toContain('Shelfmark 2.1.0');
    expect(root.textContent).not.toContain('Side by side');
  });

  it('shows features with a title, fixes as one line, the dates and the current version', async () => {
    const root = (await createTranslated(ChangelogPage)).nativeElement as HTMLElement;

    expect(root.textContent).toContain(`You're using Shelfmark ${APP_VERSION}.`);
    expect(root.querySelector('h3')?.textContent).toBe('A fresh look');
    expect(root.querySelector('.release__fix')?.textContent).toContain('Own colors');
    expect(root.querySelector('time')?.getAttribute('datetime')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(root.textContent).not.toMatch(/changelog\.items/);
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
