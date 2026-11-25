import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import type { HelpSection } from '../../models/help-section.interface';

/** "On this page" (Shelf 17-help `.toc`): anchor links to the sections; the one in view is marked. */
@Component({
  selector: 'app-help-toc',
  imports: [TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './help-toc.component.html',
  styleUrl: './help-toc.component.scss',
})
export class HelpTocComponent {
  readonly articleId = input.required<string>();
  readonly sections = input.required<readonly HelpSection[]>();
  /** The id of the section in view. */
  readonly activeId = input<string>();
  /** A link was pressed with a plain click: the page scrolls to the section. */
  readonly selected = output<string>();

  protected jump(event: MouseEvent, id: string): void {
    // Open-in-new-tab gestures keep the plain link.
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) {
      return;
    }
    event.preventDefault();
    this.selected.emit(id);
  }
}
