import type { Locator } from '@playwright/test';

/**
 * Opens the ⋯ menu of a card (or list row). On a device with a mouse the ⋯ opens out of the star's
 * glass pill only on hover or keyboard focus, so the card is hovered first; on touch it is always
 * there and the hover is a no-op.
 */
export async function openCardMenu(
  card: Locator,
  name: string | RegExp = /^Actions for /,
): Promise<void> {
  await card.hover();
  await card.getByRole('button', { name }).click();
}
