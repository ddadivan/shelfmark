import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { IMPORT_LIMIT, IMPORT_SOURCE } from '@shelfmark/contracts';
import { of, throwError } from 'rxjs';
import { loadEnglish, provideTranslocoForTest } from '../../../testing/transloco-testing';
import { IMPORT_API } from '../models/import-api.const';
import type { ImportApi } from '../models/import-api.interface';
import { IMPORT_FILE_PROBLEM } from '../models/import-file-problem.const';
import { IMPORT_NEW_FOLDER } from '../models/import-new-folder.const';
import { IMPORT_STEP } from '../models/import-step.const';
import type { ImportRunRequest } from '../models/import-run-request.interface';
import { ImportFlowService } from './import-flow.service';
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
    check: vi.fn<ImportApi['check']>(() => of({ saved: [] })),
    start: vi.fn(),
    addLinks: vi.fn(),
    finish: vi.fn(),
    undo: vi.fn(),
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
      ImportFlowService,
    ],
  });
  await loadEnglish();
  return { api, runner, flow: TestBed.inject(ImportFlowService) };
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
      api.check.mockReturnValue(of({ saved: [1] }));

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
      api.check.mockImplementation((urls) => of({ saved: urls.length > 100 ? [0, 3] : [5] }));

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
      api.check.mockReturnValue(of({ saved: [1] }));
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
      flow.keepStructure.set(false);

      await flow.chooseFile(file(SMALL));

      expect(flow.skipDuplicates()).toBe(true);
      expect(flow.keepStructure()).toBe(true);
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
      flow.keepStructure.set(false);
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

      api.check.mockReturnValue(of({ saved: [0, 1, 2, 3] }));
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
});
