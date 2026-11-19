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
      'Ask your shelf is now a chat',
      'Fill in with AI',
      'Ask your shelf',
      'Search by meaning',
    ]);
    expect(root.querySelector('a')?.getAttribute('href')).toBe('/changelog');
    expect(root.querySelector('a')?.textContent?.trim()).toBe('See all changes');
  });
});
