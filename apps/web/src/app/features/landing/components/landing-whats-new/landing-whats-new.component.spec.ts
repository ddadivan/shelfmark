import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { createTranslated } from '../../../../../testing/create-translated';
import { LandingWhatsNewComponent } from './landing-whats-new.component';

describe('LandingWhatsNewComponent', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideRouter([])] }));

  it('lists the newest highlights of the changelog and links to all changes', async () => {
    const root = (await createTranslated(LandingWhatsNewComponent)).nativeElement as HTMLElement;
    const names = [...root.querySelectorAll('h3')].map((h) => h.textContent?.trim());

    expect(names).toEqual([
      'Related links, next to what you read',
      'Read links right here',
      'Import your browser bookmarks',
      'Build a view by hand or in words',
    ]);
    expect(root.querySelector('a')?.getAttribute('href')).toBe('/changelog');
    expect(root.querySelector('a')?.textContent?.trim()).toBe('See all changes');
  });
});
