/** Endpoints of the link images that are not plain reads; `:id` is the link id. */
export const LINK_IMAGES_ENDPOINT = {
  /** `POST`: re-captures the images of a link whose page changed (ADR 0027 note). */
  Capture: '/api/links/:id/images/capture',
} as const;
