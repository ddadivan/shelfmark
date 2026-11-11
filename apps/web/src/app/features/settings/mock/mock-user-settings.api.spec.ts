import { Injector, runInInjectionContext } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { MockLibraryData } from '../../links/mock/mock-library-data';
import { MockUserSettingsApi } from './mock-user-settings.api';

function create() {
  const injector = Injector.create({ providers: [MockLibraryData] });
  return runInInjectionContext(injector, () => ({
    api: new MockUserSettingsApi(),
    data: injector.get(MockLibraryData),
  }));
}

describe('MockUserSettingsApi', () => {
  it('starts with the default retention of 30 days', async () => {
    const { api } = create();

    expect(await firstValueFrom(api.get())).toEqual({
      trashRetentionDays: 30,
      folderColours: true,
    });
  });

  it('changes the retention and answers the settings as they are', async () => {
    const { api, data } = create();

    expect(await firstValueFrom(api.update({ trashRetentionDays: 90 }))).toEqual({
      trashRetentionDays: 90,
      folderColours: true,
    });
    expect(data.trashRetentionDays).toBe(90);
    expect(await firstValueFrom(api.get())).toEqual({
      trashRetentionDays: 90,
      folderColours: true,
    });
  });

  it('keeps what is not sent', async () => {
    const { api } = create();

    expect(await firstValueFrom(api.update({}))).toEqual({
      trashRetentionDays: 30,
      folderColours: true,
    });
  });
});
