import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MeterComponent } from '@shelfmark/ui';
import type { AdminShareRow } from '../../models/admin-share-row.interface';

/** One share on the stats page: the label and its text on one line, the meter under them. */
@Component({
  selector: 'app-admin-share-row',
  imports: [MeterComponent],
  templateUrl: './admin-share-row.component.html',
  styleUrl: './admin-share-row.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminShareRowComponent {
  readonly row = input.required<AdminShareRow>();
}
