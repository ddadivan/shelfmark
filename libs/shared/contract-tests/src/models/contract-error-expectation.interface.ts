/** What `expectError` demands of a failed call. */
export interface ContractErrorExpectation {
  status: number;
  /** The contract message (`LINK_ERROR_MESSAGE.NotFound`, ...) when the API names one. */
  code?: string;
}
