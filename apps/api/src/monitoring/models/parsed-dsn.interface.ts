/** A validated Sentry DSN, split into the parts the tunnel compares and posts to. */
export interface ParsedDsn {
  /** Normalised DSN string, handed to the SDK. */
  dsn: string;
  publicKey: string;
  /** Host including the port, for example `o1.ingest.de.sentry.io`. */
  host: string;
  projectId: string;
}
