/** How one extraction pass walks the page. */
export interface ReaderWalkOptions {
  /** Skip elements whose class or id marks page chrome (`READER_CLASS_PATTERN`). */
  skipUnlikely: boolean;
}
