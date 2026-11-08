import { firstValueFrom } from 'rxjs';
import { UNAVAILABLE_MESSAGE } from '../models/unavailable-message.const';
import { UnavailableFoldersApi } from './unavailable-folders.api';
import { UnavailableLinksApi } from './unavailable-links.api';
import { UnavailableTagsApi } from './unavailable-tags.api';

// `provideLinksApi()` itself is not imported here: the unit build replaces that file with the
// mock provider (`fileReplacements`), so the placeholders are tested directly.
describe('production placeholder APIs', () => {
  it('reject every call with the "not available yet" error', async () => {
    const folders = new UnavailableFoldersApi();
    const calls = [
      new UnavailableLinksApi().preview(),
      new UnavailableLinksApi().create(),
      new UnavailableLinksApi().list(),
      new UnavailableLinksApi().recent(),
      new UnavailableLinksApi().get(),
      new UnavailableLinksApi().update(),
      new UnavailableLinksApi().remove(),
      new UnavailableLinksApi().open(),
      folders.list(),
      folders.create(),
      folders.update(),
      folders.remove(),
      new UnavailableTagsApi().list(),
    ];
    for (const call of calls) {
      await expect(firstValueFrom(call)).rejects.toThrow(UNAVAILABLE_MESSAGE);
    }
  });
});
