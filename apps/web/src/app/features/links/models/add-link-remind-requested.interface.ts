import type { LinkResponse } from '@shelfmark/contracts';
import type { ADD_LINK_ACTION } from './add-link-action.const';

/** Edit mode: the user asked for a reminder (#275); the caller opens the reminder dialog. */
export interface AddLinkRemindRequested {
  readonly action: typeof ADD_LINK_ACTION.Remind;
  readonly link: LinkResponse;
}
