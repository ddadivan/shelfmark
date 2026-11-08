import type { AddLinkDeleteRequested } from './add-link-delete-requested.interface';
import type { AddLinkOpenExisting } from './add-link-open-existing.interface';
import type { AddLinkSaved } from './add-link-saved.interface';

/** Result of the add-link dialog; `undefined` (not this type) when it was dismissed. */
export type AddLinkResult = AddLinkSaved | AddLinkOpenExisting | AddLinkDeleteRequested;
