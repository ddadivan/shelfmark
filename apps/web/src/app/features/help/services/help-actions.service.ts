import { inject, Service } from '@angular/core';
import { Router } from '@angular/router';
import { AuthStore } from '../../../core/auth/auth.store';
import { FeedbackDialogService } from '../../feedback/services/feedback-dialog.service';
import { HowItWorksService } from '../../how-it-works/services/how-it-works.service';
import { LANDING_LINKS } from '../../landing/models/landing-links.const';

/** What the Help center's cards and buttons do beyond navigating: feedback and the video tour. */
@Service()
export class HelpActionsService {
  private readonly auth = inject(AuthStore);
  private readonly router = inject(Router);
  private readonly feedback = inject(FeedbackDialogService);
  private readonly howItWorks = inject(HowItWorksService);

  /** Opens "Send feedback" for a signed-in person; a guest is led to sign-in first. */
  sendFeedback(): void {
    if (this.auth.isSignedIn()) {
      this.feedback.open();
    } else {
      void this.router.navigateByUrl(LANDING_LINKS.SignIn);
    }
  }

  /** Opens the 3-minute video tour. */
  openHowItWorks(): void {
    void this.howItWorks.open();
  }
}
