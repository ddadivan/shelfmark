import { Dialog } from '@angular/cdk/dialog';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import type { FolderResponse } from '@shelfmark/contracts';
import { DIALOG_SIZE, DialogService } from '@shelfmark/ui';
import { FoldersStore } from '../../../stores/folders.store';
import { ExportDialogComponent } from '../components/export-dialog/export-dialog.component';
import { ExportDialogService } from './export-dialog.service';

const folder = (id: string, parentId: string | null, linkCount: number): FolderResponse =>
  ({ id, name: id, parentId, linkCount }) as FolderResponse;

function setup(openDialogs: number) {
  const open = vi.fn();
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: '**', children: [] }]),
      { provide: DialogService, useValue: { open } },
      { provide: Dialog, useValue: { openDialogs: Array.from({ length: openDialogs }) } },
      {
        provide: FoldersStore,
        useValue: {
          entities: () => [folder('a', null, 3), folder('b', 'a', 4), folder('c', null, 9)],
        },
      },
    ],
  });
  return { open, service: TestBed.inject(ExportDialogService) };
}

describe('ExportDialogService', () => {
  it('opens the export dialog as a small dialog, without a folder outside a folder page', () => {
    const { open, service } = setup(0);

    service.open();

    expect(open).toHaveBeenCalledWith(ExportDialogComponent, {
      size: DIALOG_SIZE.Sm,
      data: null,
    });
  });

  it('offers the folder of the page with the links of its subfolders', async () => {
    const { open, service } = setup(0);
    await TestBed.inject(Router).navigateByUrl('/folders/a');

    service.open();

    expect(open).toHaveBeenCalledWith(ExportDialogComponent, {
      size: DIALOG_SIZE.Sm,
      data: { id: 'a', name: 'a', count: 7 },
    });
  });

  it('does nothing while another dialog is open', () => {
    const { open, service } = setup(1);

    service.open();

    expect(open).not.toHaveBeenCalled();
  });
});
