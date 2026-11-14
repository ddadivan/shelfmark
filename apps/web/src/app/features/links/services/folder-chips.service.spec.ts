import { TestBed } from '@angular/core/testing';
import { MOCK_FOLDERS, MOCK_ID, MOCK_LIBRARY_COUNTS } from '@shelfmark/contracts/testing';
import { of } from 'rxjs';
import { FoldersStore } from '../../../stores/folders.store';
import { UserSettingsStore } from '../../../stores/user-settings.store';
import { FOLDERS_API } from '../models/folders-api.const';
import { LINKS_API } from '../models/links-api.const';
import { FolderChipsService } from './folder-chips.service';

describe('FolderChipsService', () => {
  async function setup(coloursOn = true) {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: FOLDERS_API,
          useValue: {
            list: () =>
              of({
                items: [{ ...MOCK_FOLDERS[0], colour: 'rose', icon: '🍋' }],
                counts: MOCK_LIBRARY_COUNTS,
              }),
          },
        },
        { provide: LINKS_API, useValue: {} },
        {
          provide: UserSettingsStore,
          useValue: { shownColour: (colour: string) => (coloursOn ? colour : 'graphite') },
        },
      ],
    });
    await TestBed.inject(FoldersStore).load();
    return TestBed.inject(FolderChipsService);
  }

  it('gives the name, icon and shown colour of a link folder', async () => {
    const chips = await setup();
    expect(chips.of(MOCK_ID.FolderReading)).toEqual({
      name: MOCK_FOLDERS[0].name,
      icon: '🍋',
      colour: 'rose',
    });
  });

  it('has no chip for an unsorted link, an unknown folder, and graphite when colours are off', async () => {
    const chips = await setup(false);
    expect(chips.of(null)).toBeNull();
    expect(chips.of('missing')).toBeNull();
    expect(chips.of(MOCK_ID.FolderReading)?.colour).toBe('graphite');
  });
});
