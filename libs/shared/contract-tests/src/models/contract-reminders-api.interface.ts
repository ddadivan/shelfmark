import type {
  LinkResponse,
  ListRemindersResponse,
  ReminderCountResponse,
  SetRemindersBatchRequest,
  SetRemindersBatchResponse,
} from '@shelfmark/contracts';

/** The reminder endpoints (`/api/reminders`, #275) as the scenarios call them. */
export interface ContractRemindersApi {
  list(): Promise<ListRemindersResponse>;
  count(): Promise<ReminderCountResponse>;
  set(linkId: string, remindAt: string): Promise<LinkResponse>;
  clear(linkId: string): Promise<void>;
  setMany(request: SetRemindersBatchRequest): Promise<SetRemindersBatchResponse>;
}
