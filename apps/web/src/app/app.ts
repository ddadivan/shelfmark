import { DOCUMENT } from '@angular/common';
import { ApplicationRef, ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { BootHandover } from './core/routing/boot-handover.service';
import { removeBootSkeleton } from './core/routing/boot-skeleton';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  private readonly appRef = inject(ApplicationRef);
  private readonly document = inject(DOCUMENT);
  // Created here, while the static skeleton is still up (the pages ask it later).
  private readonly bootHandover = inject(BootHandover);

  /**
   * The outlet inserts a routed page into the document as soon as it is created, but its bindings
   * (translated text, `@if`, inputs) are filled in by the next change detection, which a zoneless
   * app schedules for a later task. A frame painted in between shows the page without its text
   * and everything below it then shifts (CLS). Rendering right here, in the task of the
   * activation, leaves no frame in between.
   *
   * This assumes the activation happens outside a change detection run (a navigation started by
   * the user or the router after bootstrap). `ApplicationRef.tick()` inside a running tick throws,
   * so revisit it for a blocking initial navigation or SSR, where the first activation can happen
   * during bootstrap.
   *
   * The static skeleton of `index.html` (#410) covers the app until here and goes away right after
   * that render, so every frame shows the skeleton or a page. A route that only forwards (`/demo`)
   * keeps it until the page it forwards to.
   */
  protected renderActivatedPage(): void {
    this.appRef.tick();
    removeBootSkeleton(this.document);
  }
}
