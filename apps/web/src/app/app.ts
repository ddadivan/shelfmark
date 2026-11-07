import { ApplicationRef, ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  private readonly appRef = inject(ApplicationRef);

  /**
   * The outlet inserts a routed page into the document as soon as it is created, but its bindings
   * (translated text, `@if`, inputs) are filled in by the next change detection, which a zoneless
   * app schedules for a later task. A frame painted in between shows the page without its text
   * and everything below it then shifts (CLS). Rendering right here, in the task of the
   * activation, leaves no frame in between.
   */
  protected renderActivatedPage(): void {
    this.appRef.tick();
  }
}
