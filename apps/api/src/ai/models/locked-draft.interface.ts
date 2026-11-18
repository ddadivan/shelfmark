/** A draft job locked (`FOR UPDATE`) by the create transaction that is about to attach it. */
export interface LockedDraft {
  id: string;
  status: string;
  reason: string | null;
  parts: string[];
  result: unknown;
}
