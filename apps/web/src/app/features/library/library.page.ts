import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

/** Placeholder for `/links` until the library feature lands. */
@Component({
  selector: 'app-library-page',
  imports: [TranslocoPipe],
  templateUrl: './library.page.html',
  styleUrl: './library.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class LibraryPage {}
