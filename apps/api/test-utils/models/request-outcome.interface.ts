/** Status and parsed body of a finished supertest request. */
export interface RequestOutcome {
  status: number;
  body: unknown;
}
