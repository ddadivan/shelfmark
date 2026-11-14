import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * The app skeleton of `index.html` as a component (#410): the same markup and classes, styled by
 * the global `_boot-skeleton.scss`, so a page that leads into the app (the demo start) shows one
 * continuous skeleton from the first paint to the library. Decorative: the page announces itself.
 */
@Component({
  selector: 'app-boot-skeleton',
  templateUrl: './boot-skeleton.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BootSkeletonComponent {
  protected readonly cards = [0, 1, 2, 3, 4, 5, 6, 7];
}
