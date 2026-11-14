import { layoutDriftLane } from '../sign-in-drift/drift-layout';
import { SIGN_IN_DRIFT_CARDS } from '../sign-in-drift/models/sign-in-drift-cards.const';
import type { SignInDriftCard } from '../sign-in-drift/models/sign-in-drift-card.interface';
import { SIGN_IN_PHONE_CARD_IDS } from './models/sign-in-phone-card-ids.const';
import { SIGN_IN_PHONE_FRAME } from './models/sign-in-phone-frame.const';
import type { SignInPhoneItem } from './models/sign-in-phone-item.interface';
import { SIGN_IN_PHONE_SIZE } from './models/sign-in-phone-size.const';

/** The desktop's cards the strip shows, in the order of `SIGN_IN_PHONE_CARD_IDS`. */
export function phoneCards(): SignInDriftCard[] {
  return SIGN_IN_PHONE_CARD_IDS.map((id) => {
    const card = SIGN_IN_DRIFT_CARDS.find((candidate) => candidate.id === id);
    if (!card) {
      throw new Error(`unknown sign-in card ${id}`);
    }
    return card;
  });
}

/** The cards of the strip with their seeded spots: the desktop's scatter, in a small frame. Always the same. */
export function layoutPhoneCards(): SignInPhoneItem[] {
  const cards = phoneCards();
  const places = layoutDriftLane(
    cards.map((card) => card.layer),
    SIGN_IN_PHONE_FRAME,
    SIGN_IN_PHONE_FRAME.seeds[0],
    SIGN_IN_PHONE_SIZE,
  );
  return cards.map((card, i) => ({ card, place: places[i] }));
}
