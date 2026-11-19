import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { IMPORT_LIMIT, IMPORT_SOURCE, type AiUsage } from '@shelfmark/contracts';
import { of, throwError } from 'rxjs';
import { loadEnglish, provideTranslocoForTest } from '../../../testing/transloco-testing';
import { IMPORT_API } from '../models/import-api.const';
import type { ImportApi } from '../models/import-api.interface';
import { IMPORT_FILE_PROBLEM } from '../models/import-file-problem.const';
import { IMPORT_NEW_FOLDER } from '../models/import-new-folder.const';
import { IMPORT_STEP } from '../models/import-step.const';
import type { ImportRunRequest } from '../models/import-run-request.interface';
import { FoldersStore } from '../../../stores/folders.store';
import { AiSettingsStore } from '../../ai/services/ai-settings.store';
import { IMPORT_FOLDERS_MODE } from '../models/import-folders-mode.const';
import { ImportFlowService } from './import-flow.service';
import { ImportGroupsService } from './import-groups.service';
import { ImportRunService } from './import-run.service';

function html(body: string): string {
  return `<!DOCTYPE NETSCAPE-Bookmark-file-1>\n<TITLE>Bookmarks</TITLE>\n<H1>Bookmarks</H1>\n<DL><p>\n${body}\n</DL><p>`;
}

function anchors(count: number, from = 0): string {
  return Array.from(
    { length: count },
    (_, index) => `<DT><A HREF="https://site${from + index}.example/page">Link ${from + index}</A>`,
  ).join('\n');
}

const SMALL = html(
  `<DT><H3>Dev</H3>\n<DL><p>\n${anchors(2)}\n</DL><p>\n<DT><A HREF="https://site0.example/page">Again</A>\n<DT><A HREF="https://top.example/">Top</A>`,
);

function file(text: string, name = 'bookmarks.html'): File {
  return new File([text], name, { type: 'text/html' });
}

async function setup(running = false) {
  const api = {
    list: vi.fn(),
    get: vi.fn(),
    groups: vi.fn<ImportApi['groups']>(),
    check: vi.fn<ImportApi['check']>(() => of({ saved: [], room: 10_000 })),
    start: vi.fn(),
    addLinks: vi.fn(),
    finish: vi.fn(),
    undo: vi.fn(),
  };
  const ai = {
    load: vi.fn(() => Promise.resolve()),
    isOn: signal(false),
    providerUnavailable: signal(false),
    usage: signal<AiUsage | null>(null),
  };
  const folders = {
    load: vi.fn(() => Promise.resolve()),
    entityMap: signal<Record<string, { name: string }>>({ 'folder-1': { name: 'Reading' } }),
  };
  const runner = {
    running: signal(running),
    start: vi.fn<(request: ImportRunRequest) => Promise<void>>(() => Promise.resolve()),
  };
  TestBed.configureTestingModule({
    providers: [
      provideTranslocoForTest(),
      { provide: IMPORT_API, useValue: api },
      { provide: ImportRunService, useValue: runner },
      { provide: AiSettingsStore, useValue: ai },
      { provide: FoldersStore, useValue: folders },
      ImportGroupsService,
      ImportFlowService,
    ],
  });
  await loadEnglish();
  return { api, runner, ai, folders, flow: TestBed.inject(ImportFlowService) };
}

describe('ImportFlowService', () => {
  it('starts on the source step, or on the progress step while a run is running', async () => {
    expect((await setup()).flow.step()).toBe(IMPORT_STEP.Source);
    TestBed.resetTestingModule();

    expect((await setup(true)).flow.step()).toBe(IMPORT_STEP.Progress);
  });

  it('offers the browser source first', async () => {
    const { flow } = await setup();

    expect(flow.sourceId()).toBe(IMPORT_SOURCE.Browser);
    expect(flow.source().id).toBe(IMPORT_SOURCE.Browser);
  });

  describe('chooseFile', () => {
    it('reads, checks and moves to the review step with the file name and counts', async () => {
      const { flow, api } = await setup();
      api.check.mockReturnValue(of({ saved: [1], room: 10_000 }));

      await flow.chooseFile(file(SMALL));

      expect(flow.step()).toBe(IMPORT_STEP.Review);
      expect(flow.problem()).toBeNull();
      expect(flow.reading()).toBe(false);
      expect(flow.fileName()).toBe('bookmarks.html');
      expect(api.check).toHaveBeenCalledWith([
        'https://site0.example/page',
        'https://site1.example/page',
        'https://site0.example/page',
        'https://top.example/',
      ]);
      expect(flow.counts()).toEqual({ links: 4, folders: 1, saved: 1, repeats: 1 });
      expect(flow.duplicates()).toBe(2);
      expect(flow.importCount()).toBe(2);
    });

    it('cuts a long file name to the limit', async () => {
      const { flow } = await setup();

      await flow.chooseFile(file(SMALL, `${'a'.repeat(300)}.html`));

      expect(flow.fileName()).toHaveLength(IMPORT_LIMIT.FileNameMax);
    });

    it('rejects a file larger than the limit before reading it', async () => {
      const { flow, api } = await setup();
      const big = file(SMALL);
      Object.defineProperty(big, 'size', { value: IMPORT_LIMIT.FileBytesMax + 1 });

      await flow.chooseFile(big);

      expect(flow.problem()).toBe(IMPORT_FILE_PROBLEM.TooBig);
      expect(flow.step()).toBe(IMPORT_STEP.Source);
      expect(api.check).not.toHaveBeenCalled();
    });

    it('says a file that is not a bookmarks file is not bookmarks', async () => {
      const { flow } = await setup();

      await flow.chooseFile(file('{"not":"html bookmarks"}'));

      expect(flow.problem()).toBe(IMPORT_FILE_PROBLEM.NotBookmarks);
      expect(flow.step()).toBe(IMPORT_STEP.Source);
    });

    it('says a file that cannot be read is unreadable', async () => {
      const { flow } = await setup();
      const broken = file(SMALL);
      vi.spyOn(broken, 'text').mockRejectedValue(new Error('read failed'));

      await flow.chooseFile(broken);

      expect(flow.problem()).toBe(IMPORT_FILE_PROBLEM.Unreadable);
    });

    it('says a bookmarks file without web links is empty', async () => {
      const { flow } = await setup();

      await flow.chooseFile(file(html('<DT><A HREF="javascript:alert(1)">x</A>')));

      expect(flow.problem()).toBe(IMPORT_FILE_PROBLEM.Empty);
      expect(flow.step()).toBe(IMPORT_STEP.Source);
    });

    it('rejects a file with more links than the limit', async () => {
      const { flow, api } = await setup();

      await flow.chooseFile(file(html(anchors(IMPORT_LIMIT.LinksMax + 1))));

      expect(flow.problem()).toBe(IMPORT_FILE_PROBLEM.TooManyLinks);
      expect(api.check).not.toHaveBeenCalled();
    });

    it('reports a failed duplicate check and stays on the source step', async () => {
      const { flow, api } = await setup();
      api.check.mockReturnValue(throwError(() => new Error('offline')));

      await flow.chooseFile(file(SMALL));

      expect(flow.problem()).toBe(IMPORT_FILE_PROBLEM.CheckFailed);
      expect(flow.step()).toBe(IMPORT_STEP.Source);
      expect(flow.parsed()).toBeNull();
      expect(flow.reading()).toBe(false);
    });

    it('asks the check in chunks and shifts the saved indexes by the chunk offset', async () => {
      const { flow, api } = await setup();
      const total = IMPORT_LIMIT.CheckBatchMax + 20;
      api.check.mockImplementation((urls) =>
        of({ saved: urls.length > 100 ? [0, 3] : [5], room: 10_000 }),
      );

      await flow.chooseFile(file(html(anchors(total))));

      expect(api.check.mock.calls.map(([urls]) => urls.length)).toEqual([
        IMPORT_LIMIT.CheckBatchMax,
        20,
      ]);
      expect([...flow.saved()].sort((a, b) => a - b)).toEqual([
        0,
        3,
        IMPORT_LIMIT.CheckBatchMax + 5,
      ]);
    });

    it('clears an earlier problem when a good file is chosen', async () => {
      const { flow } = await setup();
      await flow.chooseFile(file('nothing'));
      expect(flow.problem()).not.toBeNull();

      await flow.chooseFile(file(SMALL));

      expect(flow.problem()).toBeNull();
    });

    it('ignores a second file while one is being read', async () => {
      const { flow, api } = await setup();

      const first = flow.chooseFile(file(SMALL));
      await flow.chooseFile(file(SMALL, 'other.html'));
      await first;

      expect(api.check).toHaveBeenCalledTimes(1);
      expect(flow.fileName()).toBe('bookmarks.html');
    });
  });

  describe('review choices', () => {
    it('counts every link when duplicates are kept and drops them when skipped', async () => {
      const { flow, api } = await setup();
      api.check.mockReturnValue(of({ saved: [1], room: 10_000 }));
      await flow.chooseFile(file(SMALL));

      expect(flow.importCount()).toBe(2);
      flow.skipDuplicates.set(false);

      expect(flow.importCount()).toBe(4);
    });

    it('is zero without a file', async () => {
      const { flow } = await setup();

      expect(flow.counts()).toBeNull();
      expect(flow.duplicates()).toBe(0);
      expect(flow.importCount()).toBe(0);
    });

    it('goes back to the source step and forgets the file', async () => {
      const { flow } = await setup();
      await flow.chooseFile(file(SMALL));

      flow.back();

      expect(flow.step()).toBe(IMPORT_STEP.Source);
      expect(flow.parsed()).toBeNull();
      expect(flow.saved().size).toBe(0);
    });

    it('resets the choices when another file is chosen', async () => {
      const { flow } = await setup();
      await flow.chooseFile(file(SMALL));
      flow.skipDuplicates.set(false);
      flow.setFoldersMode(IMPORT_FOLDERS_MODE.None);

      await flow.chooseFile(file(SMALL));

      expect(flow.skipDuplicates()).toBe(true);
      expect(flow.foldersMode()).toBe(IMPORT_FOLDERS_MODE.File);
    });
  });

  describe('startImport', () => {
    it('imports into a new folder named from the translation', async () => {
      const { flow, runner } = await setup();
      await flow.chooseFile(file(SMALL));

      flow.startImport();

      expect(flow.step()).toBe(IMPORT_STEP.Progress);
      expect(runner.start).toHaveBeenCalledTimes(1);
      const [request] = runner.start.mock.calls[0];
      expect(request.start).toEqual({
        source: IMPORT_SOURCE.Browser,
        fileName: 'bookmarks.html',
        newFolderName: 'Imported bookmarks',
      });
      expect(request.targetName).toBe('Imported bookmarks');
      expect(request.plan.folders).toHaveLength(1);
      expect(request.plan.links).toHaveLength(3);
      expect(request.plan.skipped).toBe(1);
    });

    it('imports into an existing folder by its id', async () => {
      const { flow, runner } = await setup();
      await flow.chooseFile(file(SMALL));
      flow.target.set('folder-1');

      flow.startImport();

      const [request] = runner.start.mock.calls[0];
      expect(request.start).toEqual({
        source: IMPORT_SOURCE.Browser,
        fileName: 'bookmarks.html',
        targetFolderId: 'folder-1',
      });
      expect(request.targetName).toBeNull();
    });

    it('imports into Unsorted without a target', async () => {
      const { flow, runner } = await setup();
      await flow.chooseFile(file(SMALL));
      flow.target.set(null);

      flow.startImport();

      const [request] = runner.start.mock.calls[0];
      expect(request.start).toEqual({ source: IMPORT_SOURCE.Browser, fileName: 'bookmarks.html' });
      expect(request.targetName).toBeNull();
    });

    it('flattens the folders when the structure is not kept and keeps duplicates when asked', async () => {
      const { flow, runner } = await setup();
      await flow.chooseFile(file(SMALL));
      flow.setFoldersMode(IMPORT_FOLDERS_MODE.None);
      flow.skipDuplicates.set(false);

      flow.startImport();

      const [request] = runner.start.mock.calls[0];
      expect(request.plan.folders).toEqual([]);
      expect(request.plan.links).toHaveLength(4);
    });

    it('does nothing without a file, with nothing to import, or while a run is running', async () => {
      const { flow, runner, api } = await setup();
      flow.startImport();
      expect(runner.start).not.toHaveBeenCalled();

      api.check.mockReturnValue(of({ saved: [0, 1, 2, 3], room: 10_000 }));
      await flow.chooseFile(file(SMALL));
      expect(flow.importCount()).toBe(0);
      flow.startImport();
      expect(runner.start).not.toHaveBeenCalled();

      flow.skipDuplicates.set(false);
      runner.running.set(true);
      flow.startImport();
      expect(runner.start).not.toHaveBeenCalled();
      expect(flow.target()).toBe(IMPORT_NEW_FOLDER);
    });
  });

  describe('folders inside and the link limit', () => {
    const FLAT = html(anchors(3));
    const USAGE: AiUsage = {
      linksUsed: 0,
      linksLimit: 100,
      resetsOn: '2026-12-01',
      backfillUsed: 100,
      backfillLimit: 5_000,
    };

    it('defaults to the file for a file with folders and to none without AI', async () => {
      const { flow } = await setup();
      await flow.chooseFile(file(SMALL));
      expect(flow.foldersMode()).toBe(IMPORT_FOLDERS_MODE.File);

      await flow.chooseFile(file(FLAT));
      expect(flow.hasFolders()).toBe(false);
      expect(flow.foldersMode()).toBe(IMPORT_FOLDERS_MODE.None);
      expect(flow.aiOffer()).toBeNull();
    });

    it('offers AI only with AI on, an allowance with room for every link and a groupable count', async () => {
      const { flow, ai } = await setup();
      await flow.chooseFile(file(FLAT));
      ai.isOn.set(true);
      expect(flow.aiOffer()).toBeNull();

      ai.usage.set(USAGE);
      expect(flow.aiOffer()).toEqual({ left: 4_900 });

      ai.usage.set({ ...USAGE, backfillUsed: 4_999 });
      expect(flow.aiOffer()).toBeNull();
      ai.usage.set({ ...USAGE, backfillLimit: 0, backfillUsed: 0 });
      expect(flow.aiOffer()).toBeNull();
      ai.usage.set(USAGE);
      ai.providerUnavailable.set(true);
      expect(flow.aiOffer()).toBeNull();

      ai.providerUnavailable.set(false);
      await flow.chooseFile(file(html(anchors(IMPORT_LIMIT.GroupLinksMax + 1))));
      expect(flow.aiOffer()).toBeNull();
    });

    it('preselects AI for a flat file when it is offered, and falls back when it stops being possible', async () => {
      const { flow, ai } = await setup();
      ai.isOn.set(true);
      ai.usage.set(USAGE);

      await flow.chooseFile(file(FLAT));
      expect(flow.foldersMode()).toBe(IMPORT_FOLDERS_MODE.Ai);

      ai.isOn.set(false);
      expect(flow.foldersMode()).toBe(IMPORT_FOLDERS_MODE.None);
    });

    it('imports only what the link limit has room for and says how many are left out', async () => {
      const { flow, api, runner } = await setup();
      api.check.mockReturnValue(of({ saved: [], room: 2 }));
      await flow.chooseFile(file(FLAT));

      expect(flow.importCount()).toBe(2);
      expect(flow.overRoom()).toBe(1);
      flow.startImport();

      const [request] = runner.start.mock.calls[0];
      expect(request.plan.links).toHaveLength(2);
    });

    it('cannot import anything when there is no room', async () => {
      const { flow, api, runner } = await setup();
      api.check.mockReturnValue(of({ saved: [], room: 0 }));
      await flow.chooseFile(file(FLAT));

      expect(flow.importCount()).toBe(0);
      flow.startImport();
      expect(runner.start).not.toHaveBeenCalled();
    });

    it('names where the links go for the "no folders" choice', async () => {
      const { flow } = await setup();
      await flow.chooseFile(file(FLAT));
      expect(flow.targetName()).toBe('Imported bookmarks');
      flow.target.set(null);
      expect(flow.targetName()).toBe('Unsorted');
      flow.target.set('folder-1');
      expect(flow.targetName()).toBe('Reading');
    });
  });

  describe('AI groups (step 2a)', () => {
    const FLAT = html(anchors(3));
    const USAGE: AiUsage = {
      linksUsed: 0,
      linksLimit: 100,
      resetsOn: '2026-12-01',
      backfillUsed: 0,
      backfillLimit: 5_000,
    };

    async function grouped() {
      const ctx = await setup();
      ctx.ai.isOn.set(true);
      ctx.ai.usage.set(USAGE);
      ctx.api.groups.mockReturnValue(
        of({
          groups: [
            { key: 'g1', name: 'Dev', folderId: null, linkIndexes: [0, 1] },
            { key: 'g2', name: 'Reading', folderId: 'folder-1', linkIndexes: [2] },
          ],
          rest: [],
          charged: 3,
        }),
      );
      await ctx.flow.chooseFile(file(FLAT));
      return ctx;
    }

    it('asks for groups of the links the import would send, with the file folder names as hints', async () => {
      const { flow, api } = await grouped();
      await flow.chooseFile(file(SMALL));
      await flow.requestGroups();

      expect(flow.step()).toBe(IMPORT_STEP.Groups);
      // The repeat inside the file is left out, the file's folder only hints.
      expect(api.groups).toHaveBeenCalledWith({
        links: [
          { title: 'Link 0', url: 'https://site0.example/page' },
          { title: 'Link 1', url: 'https://site1.example/page' },
          { title: 'Top', url: 'https://top.example/' },
        ],
        folderNames: ['Dev'],
      });
      expect(flow.groups.groupCount()).toBe(2);
    });

    it('starts the import with the ticked new groups as folders and the AI pass', async () => {
      const { flow, runner } = await grouped();
      await flow.requestGroups();
      flow.groups.rename('g1', '  Dev tools ');

      flow.startImport();

      const [request] = runner.start.mock.calls[0];
      expect(request.start.aiPass).toBe(true);
      expect(request.plan.folders).toEqual([{ key: 'g1', parentKey: null, name: 'Dev tools' }]);
      expect(request.plan.links.map((link) => [link.folderKey, link.folderId])).toEqual([
        ['g1', undefined],
        ['g1', undefined],
        [null, 'folder-1'],
      ]);
      expect(request.grouped).toEqual({ folders: 2, created: 1 });
    });

    it('sends an unticked group to the target and no folder when nothing is ticked', async () => {
      const { flow, runner } = await grouped();
      await flow.requestGroups();
      flow.groups.setIncluded('g1', false);
      flow.groups.setIncluded('g2', false);

      flow.startImport();

      const [request] = runner.start.mock.calls[0];
      expect(request.plan.folders).toEqual([]);
      expect(request.plan.links.every((link) => link.folderKey === null && !link.folderId)).toBe(
        true,
      );
      expect(request.grouped).toEqual({ folders: 0, created: 0 });
    });

    it('goes back to the check and drops the groups', async () => {
      const { flow } = await grouped();
      await flow.requestGroups();

      flow.back();

      expect(flow.step()).toBe(IMPORT_STEP.Review);
      expect(flow.groups.groups()).toEqual([]);
    });

    it('imports as the file has it after a failed grouping, without the AI pass', async () => {
      const { flow, api, runner } = await grouped();
      api.groups.mockReturnValue(throwError(() => new Error('503')));
      await flow.requestGroups();
      expect(flow.groups.error()).not.toBeNull();

      flow.importAsFile();
      flow.startImport();

      const [request] = runner.start.mock.calls[0];
      expect(request.start.aiPass).toBeUndefined();
      expect(request.grouped).toBeUndefined();
      expect(request.plan.folders).toEqual([]);
    });
  });
});
