import { Dialog } from '@angular/cdk/dialog';
import { TestBed } from '@angular/core/testing';
import { DIALOG_SIZE, DialogService } from '@shelfmark/ui';
import { ExportDialogComponent } from '../components/export-dialog/export-dialog.component';
import { ExportDialogService } from './export-dialog.service';

function setup(openDialogs: number) {
  const open = vi.fn();
  TestBed.configureTestingModule({
    providers: [
      { provide: DialogService, useValue: { open } },
      { provide: Dialog, useValue: { openDialogs: Array.from({ length: openDialogs }) } },
    ],
  });
  return { open, service: TestBed.inject(ExportDialogService) };
}

describe('ExportDialogService', () => {
  it('opens the export dialog as a small dialog', () => {
    const { open, service } = setup(0);

    service.open();

    expect(open).toHaveBeenCalledWith(ExportDialogComponent, { size: DIALOG_SIZE.Sm });
  });

  it('does nothing while another dialog is open', () => {
    const { open, service } = setup(1);

    service.open();

    expect(open).not.toHaveBeenCalled();
  });
});
