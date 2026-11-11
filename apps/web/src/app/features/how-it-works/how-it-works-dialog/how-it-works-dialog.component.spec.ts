import { TestBed } from '@angular/core/testing';
import { UiDialogRef } from '@shelfmark/ui';
import { axeViolations } from '../../../../testing/axe';
import { createTranslated } from '../../../../testing/create-translated';
import { HowItWorksDialogComponent } from './how-it-works-dialog.component';

describe('HowItWorksDialogComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: UiDialogRef, useValue: { close: vi.fn() } }],
    });
  });

  it('lists the three chapters with their start times and says the video is on its way', async () => {
    const fixture = await createTranslated(HowItWorksDialogComponent);
    const root = fixture.nativeElement as HTMLElement;

    expect(
      Array.from(root.querySelectorAll('.how-it-works__chapters li')).map((li) =>
        li.textContent?.replace(/\s+/g, ' ').trim(),
      ),
    ).toEqual(['Save a link 0:00', 'Folders and tags 0:18', 'Find it again 0:41']);
    expect(root.querySelector('video')).toBeNull();
    expect(root.textContent).toContain('The video is on its way');
    expect(await axeViolations(root)).toEqual([]);
  });
});
