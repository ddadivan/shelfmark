import { LiveAnnouncer } from '@angular/cdk/a11y';
import { TestBed } from '@angular/core/testing';
import { loadEnglish, provideTranslocoForTest } from '../../testing/transloco-testing';
import { ReorderAnnouncer } from './reorder-announcer.service';

describe('ReorderAnnouncer', () => {
  async function setup() {
    const announce = vi.fn().mockResolvedValue(undefined);
    TestBed.configureTestingModule({
      providers: [provideTranslocoForTest(), { provide: LiveAnnouncer, useValue: { announce } }],
    });
    await loadEnglish();
    return { announcer: TestBed.inject(ReorderAnnouncer), announce };
  }

  it('says the new place politely, counted from 1', async () => {
    const { announcer, announce } = await setup();
    announcer.announce(2, 1, 5);
    expect(announce).toHaveBeenLastCalledWith('Moved up, position 2 of 5', 'polite');
    announcer.announce(0, 1, 3);
    expect(announce).toHaveBeenLastCalledWith('Moved down, position 2 of 3', 'polite');
  });

  it('says nothing when the row stays', async () => {
    const { announcer, announce } = await setup();
    announcer.announce(1, 1, 3);
    expect(announce).not.toHaveBeenCalled();
  });
});
