import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { axeViolations } from '../../../testing/axe';
import { createTranslated } from '../../../testing/create-translated';
import { HELP_ARTICLES } from './models/help-articles.const';
import HelpPage from './help.page';

function provideQuery(q: string | null): void {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      {
        provide: ActivatedRoute,
        useValue: { queryParamMap: of(convertToParamMap(q === null ? {} : { q })) },
      },
    ],
  });
}

describe('HelpPage', () => {
  it('shows the home: the heading, the search, popular articles, six topics and three help tiles', async () => {
    provideQuery(null);
    const root = (await createTranslated(HelpPage)).nativeElement as HTMLElement;

    expect(root.querySelector('h1')?.textContent).toContain('How can we help?');
    expect(root.querySelector('input[type="search"]')).not.toBeNull();
    expect(root.querySelectorAll('.popular ui-button')).toHaveLength(5);
    expect(root.querySelectorAll('app-help-topic-card')).toHaveLength(6);
    expect(root.querySelectorAll('.bar ui-link-tile')).toHaveLength(3);
    expect(root.textContent).toContain('4 articles');
    expect(root.textContent).not.toMatch(/help\.(hero|categories|articles)/);
  });

  it('lists three articles in a topic card with the article count', async () => {
    provideQuery(null);
    const root = (await createTranslated(HelpPage)).nativeElement as HTMLElement;
    const card = root.querySelector('app-help-topic-card') as HTMLElement;

    expect(card.querySelectorAll('[role="treeitem"]')).toHaveLength(3);
    expect(card.textContent).toContain('Save your first link');
    expect(card.querySelector('.topic__count')?.textContent?.trim()).toBe('4 articles');
  });

  it('shows the topics and articles in the sidebar of the shell', async () => {
    provideQuery(null);
    const root = (await createTranslated(HelpPage)).nativeElement as HTMLElement;

    expect(root.querySelectorAll('app-help-sidebar .side__heading')).toHaveLength(7);
  });

  it('lists the matching articles with the words marked while searching', async () => {
    provideQuery('remind');
    const root = (await createTranslated(HelpPage)).nativeElement as HTMLElement;
    const titles = [...root.querySelectorAll('.results__list [slot="heading"]')].map((el) =>
      el.textContent?.trim(),
    );

    expect(root.querySelector('.hero__title')).toBeNull();
    expect(titles[0]).toBe('Reminders');
    expect(root.querySelector('.results__count')?.textContent?.trim()).toBe('4 articles');
    expect(root.querySelector('.results__list mark')).not.toBeNull();
    expect(root.querySelector('.results__empty')).not.toBeNull();
  });

  it('lists every article for an empty search', async () => {
    provideQuery('');
    const root = (await createTranslated(HelpPage)).nativeElement as HTMLElement;

    expect(root.querySelectorAll('.results__list ui-link-tile')).toHaveLength(HELP_ARTICLES.length);
  });

  it('says so when nothing matches', async () => {
    provideQuery('zzzqqq');
    const root = (await createTranslated(HelpPage)).nativeElement as HTMLElement;

    expect(root.querySelectorAll('.results__list ui-link-tile')).toHaveLength(0);
    expect(root.querySelector('.results__count')?.textContent).toContain('Nothing found for');
    expect(root.querySelector('.results__count')?.textContent).toContain('zzzqqq');
  });

  it('has no axe violations on the home and on the results', async () => {
    provideQuery(null);
    const home = await createTranslated(HelpPage);
    expect(await axeViolations(home.nativeElement)).toEqual([]);
  });
});
