import { DOCUMENT } from '@angular/common';
import { inject, Service, signal } from '@angular/core';

/** Whether the browser says it is online, from `navigator.onLine` and the `online` / `offline` events. */
@Service()
export class OnlineService {
  private readonly win = inject(DOCUMENT).defaultView;
  private readonly state = signal(this.win?.navigator.onLine ?? true);

  readonly online = this.state.asReadonly();

  constructor() {
    this.win?.addEventListener('online', () => this.state.set(true));
    this.win?.addEventListener('offline', () => this.state.set(false));
  }
}
