import { Directive, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { preloadAppChunks } from '../../core/routing/preload-app-chunks';

/**
 * A landing button that is a link (`ui-button [href]`) and navigates through the router: a plain
 * left click is routed (no page reload, so the app shell mounts at once) while modified clicks keep
 * the browser's own link. Hover and focus start loading the app chunks.
 */
@Directive({
  selector: 'ui-button[appAppLink]',
  host: {
    '(linkClick)': 'navigate($event)',
    '(pointerenter)': 'preload()',
    '(focusin)': 'preload()',
  },
})
export class AppLinkDirective {
  private readonly router = inject(Router);

  /** The path to open (the same value as the button's `href`). */
  readonly appAppLink = input.required<string>();

  protected navigate(event: Event): void {
    event.preventDefault();
    void this.router.navigateByUrl(this.appAppLink());
  }

  protected preload(): void {
    preloadAppChunks();
  }
}
