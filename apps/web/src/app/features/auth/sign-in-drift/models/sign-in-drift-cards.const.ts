import { SIGN_IN_DRIFT_MEDIA } from './sign-in-drift-media.const';
import type { SignInDriftCard } from './sign-in-drift-card.interface';

/**
 * The four cards of docs/design/screens/SignIn.dc.html, top left, bottom left, top right and
 * bottom right. Position, tilt and the drift timing are classes in the stylesheet.
 */
export const SIGN_IN_DRIFT_CARDS: readonly SignInDriftCard[] = [
  { id: 'signalForms', domain: 'youtube.com', letter: 'Y', media: SIGN_IN_DRIFT_MEDIA.AccentSoft },
  { id: 'ramen', domain: 'seriouseats.com', letter: 'R', media: SIGN_IN_DRIFT_MEDIA.Pressed },
  { id: 'woolCoat', domain: 'cos.com', letter: 'C', media: SIGN_IN_DRIFT_MEDIA.Hover },
  { id: 'nestjs', domain: 'stepik.org', letter: 'S', media: SIGN_IN_DRIFT_MEDIA.AccentSoft },
];
