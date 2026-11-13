import type { ListPinsResponse, PinRef } from '@shelfmark/contracts';

/** The sidebar pin endpoints (`/api/pins`) as the scenarios call them. */
export interface ContractPinsApi {
  list(): Promise<ListPinsResponse>;
  create(ref: PinRef): Promise<ListPinsResponse>;
  remove(ref: PinRef): Promise<void>;
  reorder(refs: readonly PinRef[]): Promise<ListPinsResponse>;
}
