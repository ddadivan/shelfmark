/** Screenshot bytes stored on one feedback message, with the message's time (daily limit). */
export interface ScreenshotBytesRow {
  readonly createdAt: Date;
  /** `bigint` from `sum(octet_length(...))`. */
  readonly bytes: bigint;
}
