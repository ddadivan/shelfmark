import type { AddLinkData } from './add-link-data.interface';
import type { AddLinkSession } from './add-link-session.interface';

/** What the service hands to the dialog component. */
export interface AddLinkDialogData extends AddLinkData {
  readonly session: AddLinkSession;
}
