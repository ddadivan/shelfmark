import { inject, Service } from '@angular/core';
import { SessionScope } from '../../../core/auth/session-scope.service';

/**
 * "Search by meaning is getting ready" shows at most once per session (AiSearch state 3): the first
 * search answer that may show it claims it; later searches, a reopened dialog included, do not.
 * The session end forgets it.
 */
@Service()
export class MeaningHintService {
  private used = false;

  constructor() {
    inject(SessionScope).onEnd(() => (this.used = false));
  }

  /** True for the first caller of the session only. */
  claim(): boolean {
    if (this.used) {
      return false;
    }
    this.used = true;
    return true;
  }
}
