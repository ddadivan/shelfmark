/** The job row the apply step holds `FOR UPDATE`. */
export interface LockedJobRow {
  linkId: string | null;
  source: string;
  parts: string[];
  status: string;
}
