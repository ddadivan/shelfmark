import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { axeViolations } from '../../../../../testing/axe';
import { createTranslated } from '../../../../../testing/create-translated';
import { HELP_ARTICLES } from '../../models/help-articles.const';
import { HelpSidebarComponent } from './help-sidebar.component';

describe('HelpSidebarComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
  });

  it('lists every topic with its articles as tree rows under a heading', async () => {
    const root = (await createTranslated(HelpSidebarComponent)).nativeElement as HTMLElement;

    expect([...root.querySelectorAll('h2')].map((h) => h.textContent?.trim())).toEqual([
      'Getting started',
      'Organise',
      'Find',
      'Come back',
      'Read',
      'AI',
      'Account and data',
    ]);
    expect(root.querySelectorAll('[role="treeitem"]')).toHaveLength(HELP_ARTICLES.length);
    expect(root.querySelector('a[href="/help"]')?.textContent).toContain('Help');
  });

  it('marks the article that is open', async () => {
    const fixture = await createTranslated(HelpSidebarComponent);
    fixture.componentRef.setInput('currentId', 'rules');
    await fixture.whenStable();

    const current = (fixture.nativeElement as HTMLElement).querySelector('[aria-current]');
    expect(current?.textContent).toContain('Rules: file links automatically');
  });

  it('opens an article through the router when a row is chosen', async () => {
    const fixture = await createTranslated(HelpSidebarComponent);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    const row = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(
      '[role="treeitem"]',
    );

    row?.click();
    await fixture.whenStable();

    expect(navigate).toHaveBeenCalledWith('/help/save-first-link');
  });

  it('has no axe violations', async () => {
    const fixture = await createTranslated(HelpSidebarComponent);

    expect(await axeViolations(fixture.nativeElement)).toEqual([]);
  });
});
