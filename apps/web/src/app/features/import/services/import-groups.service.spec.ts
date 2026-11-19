import { TestBed } from '@angular/core/testing';
import {
  IMPORT_ERROR_MESSAGE,
  type ImportGroupsRequest,
  type ImportGroupsResponse,
} from '@shelfmark/contracts';
import { Subject, of, throwError } from 'rxjs';
import { mockHttpError } from '../../../core/api/mock-http-error';
import { IMPORT_API } from '../models/import-api.const';
import type { ImportApi } from '../models/import-api.interface';
import { IMPORT_GROUPS_ERROR } from '../models/import-groups-error.const';
import { ImportGroupsService } from './import-groups.service';

const REQUEST: ImportGroupsRequest = {
  links: ['a', 'b', 'c', 'd'].map((name) => ({ title: name, url: `https://${name}.example/` })),
  folderNames: [],
};

const RESPONSE: ImportGroupsResponse = {
  groups: [
    { key: 'g1', name: 'Dev', folderId: null, linkIndexes: [0, 1] },
    { key: 'g2', name: 'Reading', folderId: 'folder-1', linkIndexes: [2] },
  ],
  rest: [3],
  charged: 4,
};

function setup() {
  const groups = vi.fn<ImportApi['groups']>(() => of(RESPONSE));
  const releaseGroups = vi.fn<ImportApi['releaseGroups']>(() => of(undefined));
  TestBed.configureTestingModule({
    providers: [{ provide: IMPORT_API, useValue: { groups, releaseGroups } }, ImportGroupsService],
  });
  return { groups, releaseGroups, service: TestBed.inject(ImportGroupsService) };
}

describe('ImportGroupsService', () => {
  it('loads the groups ticked, with the rest as "Other"', async () => {
    const { service, groups } = setup();

    await service.load(REQUEST);

    expect(groups).toHaveBeenCalledWith(REQUEST);
    expect(service.loading()).toBe(false);
    expect(service.error()).toBeNull();
    expect(service.groups().map((group) => [group.key, group.included])).toEqual([
      ['g1', true],
      ['g2', true],
    ]);
    expect(service.rest()).toEqual([3]);
    expect(service.groupCount()).toBe(2);
    expect(service.linkCount()).toBe(4);
  });

  it('is loading until the answer comes', async () => {
    const { service, groups } = setup();
    const answer = new Subject<ImportGroupsResponse>();
    groups.mockReturnValue(answer);

    const loading = service.load(REQUEST);
    expect(service.loading()).toBe(true);
    answer.next(RESPONSE);
    answer.complete();
    await loading;

    expect(service.loading()).toBe(false);
  });

  it('reports a short allowance (409) and any other failure separately', async () => {
    const { service, groups } = setup();
    groups.mockReturnValue(throwError(() => mockHttpError(409)));
    await service.load(REQUEST);
    expect(service.error()).toBe(IMPORT_GROUPS_ERROR.Allowance);

    groups.mockReturnValue(throwError(() => mockHttpError(503)));
    await service.load(REQUEST);
    expect(service.error()).toBe(IMPORT_GROUPS_ERROR.Failed);
    expect(service.groups()).toEqual([]);
  });

  it('drops an answer that arrives after reset', async () => {
    const { service, groups } = setup();
    const answer = new Subject<ImportGroupsResponse>();
    groups.mockReturnValue(answer);

    const loading = service.load(REQUEST);
    service.reset();
    answer.next(RESPONSE);
    answer.complete();
    await loading;

    expect(service.groups()).toEqual([]);
    expect(service.loading()).toBe(false);
  });

  it('renames (cut to the folder name limit), unticks and reports the ticked new folders', async () => {
    const { service } = setup();
    await service.load(REQUEST);

    service.rename('g1', 'x'.repeat(300));
    expect(service.groups()[0].name).toHaveLength(100);
    service.rename('g1', ' Tools ');
    expect(service.newFolders().map((group) => group.key)).toEqual(['g1']);
    expect(service.assignment().folders).toEqual([{ key: 'g1', parentKey: null, name: 'Tools' }]);

    service.setIncluded('g1', false);
    expect(service.newFolders()).toEqual([]);
    expect(service.assignment().folders).toEqual([]);
    expect(service.assignment().places.has(0)).toBe(false);
  });

  it('files the links of a ticked existing group into that folder', async () => {
    const { service } = setup();
    await service.load(REQUEST);

    expect(service.assignment().places.get(2)).toEqual({ folderId: 'folder-1' });
    expect(service.assignment().places.get(0)).toEqual({ folderKey: 'g1' });
    // "Other" has no place: it goes to the target.
    expect(service.assignment().places.has(3)).toBe(false);
  });

  it('needs a name for a ticked new group, and not for an unticked one', async () => {
    const { service } = setup();
    await service.load(REQUEST);

    service.rename('g1', '   ');
    expect(service.valid()).toBe(false);
    service.setIncluded('g1', false);
    expect(service.valid()).toBe(true);
  });

  it('moves a link into another group or out to "Other"', async () => {
    const { service } = setup();
    await service.load(REQUEST);

    service.move(0, 'g2');
    expect(service.placeOf(0)).toBe('g2');
    expect(service.groups()[1].linkIndexes).toEqual([0, 2]);
    expect(service.groups()[0].linkIndexes).toEqual([1]);

    service.move(1, null);
    expect(service.placeOf(1)).toBeNull();
    expect(service.rest()).toEqual([1, 3]);

    service.move(3, 'g1');
    expect(service.rest()).toEqual([1]);
    expect(service.groups()[0].linkIndexes).toEqual([3]);
  });

  it('does not create a folder for a group that lost all its links', async () => {
    const { service } = setup();
    await service.load(REQUEST);

    service.move(0, null);
    service.move(1, null);

    expect(service.newFolders()).toEqual([]);
    expect(service.groupCount()).toBe(1);
  });

  it('reports the monthly cap (409 with its message) as its own error', async () => {
    const { service, groups, releaseGroups } = setup();
    groups.mockReturnValue(
      throwError(() => mockHttpError(409, IMPORT_ERROR_MESSAGE.GroupsMonthly)),
    );

    await service.load(REQUEST);

    expect(service.error()).toBe(IMPORT_GROUPS_ERROR.Monthly);
    service.reset();
    expect(releaseGroups).not.toHaveBeenCalled();
  });

  describe('release', () => {
    it('gives the units back once when a grouping is dropped (Back)', async () => {
      const { service, releaseGroups } = setup();
      await service.load(REQUEST);

      service.reset();
      service.reset();

      expect(releaseGroups).toHaveBeenCalledTimes(1);
    });

    it('gives nothing back before a grouping, after a refused one, or once an import took it', async () => {
      const { service, groups, releaseGroups } = setup();
      service.release();
      groups.mockReturnValueOnce(throwError(() => mockHttpError(409)));
      await service.load(REQUEST);
      service.release();
      await service.load(REQUEST);
      service.consumed();
      service.release();

      expect(releaseGroups).not.toHaveBeenCalled();
    });

    it('releases after a failed grouping and ignores a failing release', async () => {
      const { service, groups, releaseGroups } = setup();
      groups.mockReturnValue(throwError(() => mockHttpError(503)));
      releaseGroups.mockReturnValue(throwError(() => mockHttpError(500)));
      await service.load(REQUEST);

      expect(() => service.release()).not.toThrow();
      expect(releaseGroups).toHaveBeenCalledTimes(1);
    });
  });
});
