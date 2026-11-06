import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastStore } from './toast-store';
import { ToastComponent } from './toast.component';

/**
 * The one persistent, polite live region that holds the toasts (internal; `ToastService`
 * attaches it to the overlay once and never removes it, so a toast added later is announced).
 * Only additions are announced, a leaving toast is not read again.
 */
@Component({
  selector: 'ui-toast-region',
  imports: [ToastComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'ui-toast-region', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'false' },
  templateUrl: './toast-region.component.html',
  styleUrl: './toast-region.component.scss',
})
export class ToastRegionComponent {
  protected readonly store = inject(ToastStore);
}
