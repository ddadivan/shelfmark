import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { createTranslated } from '../../../../../testing/create-translated';
import { LandingWhatsNewComponent } from './landing-whats-new.component';

describe('LandingWhatsNewComponent', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideRouter([])] }));

  it('lists the newest highlights of the changelog and links to all changes', async () => {
    const root = (await createTranslated(LandingWhatsNewComponent)).nativeElement as HTMLElement;
    const names = [...root.querySelectorAll('h3')].map((h) => h.textContent?.trim());

    expect(names).toEqual(['Side by side', 'Folder styling', 'Rules by site', 'Reminders']);
    expect(root.querySelector('a')?.getAttribute('href')).toBe('/changelog');
    expect(root.querySelector('a')?.textContent?.trim()).toBe('See all changes');
  });
});
