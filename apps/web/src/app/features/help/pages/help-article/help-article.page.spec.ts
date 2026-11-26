import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { axeViolations } from '../../../../../testing/axe';
import { createTranslated } from '../../../../../testing/create-translated';
import HelpArticlePage from './help-article.page';

function provideArticle(id: string): void {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ articleId: id })) } },
    ],
  });
  document.title = 'Shelfmark';
}

describe('HelpArticlePage', () => {
  it('shows the article: title, lead, read time, sections, related and previous / next', async () => {
    provideArticle('rules');
    const root = (await createTranslated(HelpArticlePage)).nativeElement as HTMLElement;

    expect(root.querySelector('h1')?.textContent).toBe('Rules: file links automatically');
    expect(root.querySelector('.doc__meta')?.textContent).toContain('3 min read');
    expect(root.querySelector('.doc__meta')?.textContent).toContain('Updated');
    expect(root.querySelectorAll('.body__section h2')).toHaveLength(4);
    expect(root.querySelectorAll('.body__step')).toHaveLength(3);
    expect(root.querySelector('app-help-rule-mock')).not.toBeNull();
    expect(root.querySelectorAll('.doc__related a')).toHaveLength(4);
    const pager = [...root.querySelectorAll('.doc__pager a')].map((a) => a.getAttribute('href'));
    expect(pager).toEqual(['/help/tags', '/help/favorites-pins']);
    expect(root.textContent).not.toMatch(/help\.(articles|categories)/);
  });

  it('marks the open article in the topics nav and lists "On this page"', async () => {
    provideArticle('rules');
    const root = (await createTranslated(HelpArticlePage)).nativeElement as HTMLElement;
    const open = root.querySelector('app-help-sidebar [aria-current="page"]');

    expect(open?.textContent).toContain('Rules: file links automatically');
    expect(root.querySelectorAll('.help-toc__link')).toHaveLength(4);
  });

  it('draws control names and key caps without markers', async () => {
    provideArticle('rules');
    const root = (await createTranslated(HelpArticlePage)).nativeElement as HTMLElement;

    expect(root.querySelector('.body__step')?.textContent).not.toContain('**');
    expect(root.querySelector('.help-text__key')?.textContent).toBe('taylorstitch.com');
  });

  it('asks again for a new article and thanks after an answer', async () => {
    provideArticle('tags');
    const root = (await createTranslated(HelpArticlePage)).nativeElement as HTMLElement;
    const yes = [...root.querySelectorAll('app-help-feedback button')].find(
      (button) => button.textContent?.trim() === 'Yes',
    );
    yes?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    TestBed.tick();

    expect(root.querySelector('app-help-feedback')?.textContent).toContain('Thanks for telling us');
  });

  it('offers "Go there" links to the places of the article, from the route constants', async () => {
    provideArticle('reminders');
    const root = (await createTranslated(HelpArticlePage)).nativeElement as HTMLElement;
    const links = [...root.querySelectorAll('.doc__links a')];

    expect(links.map((a) => a.getAttribute('href'))).toEqual([
      '/reminders',
      '/settings/notifications',
    ]);
    expect(links.map((a) => a.textContent?.trim())).toEqual([
      'Open Reminders',
      'Settings › Notifications',
    ]);
    expect(root.textContent).not.toMatch(/help\.links/);
  });

  it('has no "Go there" block for an article without a place', async () => {
    provideArticle('use-on-phone');
    const root = (await createTranslated(HelpArticlePage)).nativeElement as HTMLElement;

    expect(root.querySelector('.doc__links')).toBeNull();
  });

  it('shows a screenshot with its alt text for the theme in use', async () => {
    provideArticle('themes');
    const root = (await createTranslated(HelpArticlePage)).nativeElement as HTMLElement;
    const image = root.querySelector('img.body__image');

    expect(image?.getAttribute('src')).toMatch(
      /^\/media\/help\/settings-appearance-(light|dark)\.webp$/,
    );
    expect(image?.getAttribute('alt')).toMatch(/^Settings, Appearance/);
  });

  it('sets the document title to the article', async () => {
    provideArticle('tags');
    await createTranslated(HelpArticlePage);

    expect(TestBed.inject(Title).getTitle()).toBe('Tags · Shelfmark');
  });

  it('shows "Article not found" with the way back for an unknown id', async () => {
    provideArticle('does-not-exist');
    const root = (await createTranslated(HelpArticlePage)).nativeElement as HTMLElement;

    expect(root.querySelector('h1')?.textContent).toContain('Article not found');
    expect(root.querySelector('.doc')).toBeNull();
    expect(root.querySelector('main a[href="/help"]')).not.toBeNull();
  });

  it('has no axe violations', async () => {
    provideArticle('rules');
    const fixture = await createTranslated(HelpArticlePage);

    expect(await axeViolations(fixture.nativeElement)).toEqual([]);
  });
});
