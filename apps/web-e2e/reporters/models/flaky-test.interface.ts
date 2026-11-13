/** A test that failed first and passed on a retry, as written by `FlakyReporter` (#362). */
export interface FlakyTest {
  /** Playwright project: desktop, tablet or phone. */
  project: string;
  /** Spec file relative to the test directory, for example `smoke.spec.ts`. */
  file: string;
  line: number;
  /** Describe blocks and the test title, joined with ` › `. */
  title: string;
  /** Failed attempts before the passing one. */
  retries: number;
}
