import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { axeViolations } from '../../../../../testing/axe';
import { loadEnglish, provideTranslocoForTest } from '../../../../testing/transloco-testing';
import { IMPORT_RUN_IDLE } from '../../models/import-run-idle.const';
import { IMPORT_RUN_PHASE } from '../../models/import-run-phase.const';
import type { ImportRunState } from '../../models/import-run-state.interface';
import { ImportRunService } from '../../services/import-run.service';
import { ImportProgressComponent } from './import-progress.component';

async function setup(state: Partial<ImportRunState>) {
  const run = signal<ImportRunState>({ ...IMPORT_RUN_IDLE, ...state });
  TestBed.configureTestingModule({
    providers: [
      provideTranslocoForTest(),
      {
        provide: ImportRunService,
        useValue: {
          run,
          percent: () => {
            const { total, processed } = run();
            return total === 0 ? 100 : Math.round((processed / total) * 100);
          },
        },
      },
    ],
  });
  await loadEnglish();
  const fixture = TestBed.createComponent(ImportProgressComponent);
  await fixture.whenStable();
  const root = fixture.nativeElement as HTMLElement;
  return { run, fixture, root };
}

const DONE = {
  phase: IMPORT_RUN_PHASE.Done,
  importId: 'imp1',
  total: 375,
  processed: 375,
  created: 320,
  targetName: 'Imported bookmarks',
  targetFolderId: 'f1',
} satisfies Partial<ImportRunState>;

describe('ImportProgressComponent', () => {
  it('shows the running count with locale grouping and the meter', async () => {
    const { root } = await setup({
      phase: IMPORT_RUN_PHASE.Running,
      total: 1234,
      processed: 212,
    });

    expect(root.textContent).toContain('Importing links');
    expect(root.querySelector('.import-progress__count')?.textContent).toBe('212 of 1,234');
    expect(root.querySelector('ui-meter')).not.toBeNull();
    expect(root.textContent).toContain('You can keep working.');
  });

  it('updates the count while the run goes on', async () => {
    const { root, run, fixture } = await setup({
      phase: IMPORT_RUN_PHASE.Running,
      total: 10,
      processed: 0,
    });

    run.update((state) => ({ ...state, processed: 7 }));
    await fixture.whenStable();

    expect(root.querySelector('.import-progress__count')?.textContent).toBe('7 of 10');
  });

  it('summarises a finished run with every part of the line', async () => {
    const { root } = await setup({ ...DONE, folders: 18, skipped: 37, failed: 4 });

    expect(root.querySelector('.import-progress__title')?.textContent).toBe('320 links imported');
    expect(root.querySelector('.import-progress__text')?.textContent).toBe(
      'In “Imported bookmarks”. 18 folders. 37 skipped: already saved, repeated or not a web page. 4 could not be saved.',
    );
  });

  it('leaves out folders, skipped and failed when they are zero, and uses the singular', async () => {
    const { root } = await setup({ ...DONE, created: 1, folders: 1 });

    expect(root.querySelector('.import-progress__title')?.textContent).toBe('1 link imported');
    expect(root.querySelector('.import-progress__text')?.textContent).toBe(
      'In “Imported bookmarks”. 1 folder.',
    );
  });

  it('names Unsorted or the chosen folder when there is no new folder', async () => {
    const unsorted = await setup({ ...DONE, targetName: null, targetFolderId: null });
    expect(unsorted.root.querySelector('.import-progress__text')?.textContent).toBe('In Unsorted.');
    TestBed.resetTestingModule();

    const chosen = await setup({ ...DONE, targetName: null, targetFolderId: 'f9' });
    expect(chosen.root.querySelector('.import-progress__text')?.textContent).toBe(
      'In the folder you chose.',
    );
  });

  it('shows a failed notice with the message of the run error', async () => {
    const { root } = await setup({
      phase: IMPORT_RUN_PHASE.Failed,
      errorKey: 'import.progress.startFailed',
    });

    expect(root.textContent).toContain('The import could not start, nothing was saved.');
    expect(root.querySelector('.import-progress__done')).toBeNull();
  });

  it('has no axe violations while running, when done and when failed', async () => {
    const running = await setup({ phase: IMPORT_RUN_PHASE.Running, total: 10, processed: 3 });
    expect(await axeViolations(running.root)).toEqual([]);
    TestBed.resetTestingModule();

    const done = await setup({ ...DONE, folders: 2, skipped: 1, failed: 1 });
    expect(await axeViolations(done.root)).toEqual([]);
    TestBed.resetTestingModule();

    const failed = await setup({
      phase: IMPORT_RUN_PHASE.Failed,
      errorKey: 'import.progress.foldersLimit',
    });
    expect(await axeViolations(failed.root)).toEqual([]);
  });
});
